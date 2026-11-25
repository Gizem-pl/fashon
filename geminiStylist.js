/* geminiStylist.js — optional AI features, using Google's Gemini API:
   - reviewOutfit: feedback on an outfit-diary photo
   - chat: the Stylist tab (what to wear, closet gaps on request, trip packing)
   - readProductLink / readProductImages: pull name, fabric and size chart from a product page or screenshots
   - adviseOnPiece: a mindful buy / skip / wait opinion for the Checker
   - describePiece: auto-fill category, type, fabric etc. from a closet photo
   The API key is the user's own and lives only on this device; requests go straight from the browser to Google.
   No DOM and no storage here: data in, advice out. */

import { WEAR_TAGS, isTogetherTag, CATEGORIES, FABRICS, THICKNESS, SILHOUETTES, SLEEVES, VIBES, SCENT_MOODS, COLOUR_RULES, scentsOf, perfumeMoodsOf } from './stylistEngine.js';

const API = 'https://generativelanguage.googleapis.com/v1beta/models/';
export const DEFAULT_MODEL = 'gemini-flash-latest';
const ALL_TAGS = [...WEAR_TAGS.good, ...WEAR_TAGS.bad];

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    score:   { type: 'INTEGER', description: 'Overall 1-10. Private: used only for learning, never shown to the person.' },
    summary: { type: 'STRING',  description: 'One warm, honest sentence about the outfit as worn.' },
    works:   { type: 'ARRAY', items: { type: 'STRING' }, description: '1-3 short points on what works.' },
    change:  { type: 'ARRAY', items: { type: 'STRING' }, description: '1-3 concrete, kind suggestions for next time.' },
    tags:    { type: 'ARRAY', items: { type: 'STRING', enum: ALL_TAGS } }
  },
  required: ['score', 'summary', 'works', 'change', 'tags'],
  propertyOrdering: ['score', 'summary', 'works', 'change', 'tags']
};

function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1] || '');
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}
async function imagePart(blob) {
  return { inline_data: { mime_type: blob.type || 'image/jpeg', data: await blobToBase64(blob) } };
}

function describe(p) {
  return [p.subtype || p.category, p.color?.name, p.fabric, p.silhouette, p.thickness].filter(Boolean).join(', ');
}

function fail(status, text) { const e = new Error(text); e.status = status; return e; }

async function call(url, key, init = {}) {
  let res;
  try {
    res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key, ...(init.headers || {}) } });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw fail(0, 'Could not reach Gemini — check your internet connection.');
  }
  let body = null;
  try { body = await res.json(); } catch {}
  if (!res.ok) {
    const msg = body?.error?.message || '';
    if (res.status === 400 && /api key/i.test(msg)) throw fail(400, 'That Gemini key was not accepted. Check it in Profile.');
    if (res.status === 401 || res.status === 403) throw fail(res.status, 'That Gemini key was not accepted. Check it in Profile.');
    if (res.status === 404) throw fail(404, 'That Gemini model was not found. Check the model name in Profile.');
    if (res.status === 429) throw fail(429, /day|daily|PerDay/i.test(msg)
      ? 'You have used today’s free Gemini requests. They reset tomorrow.'
      : 'Too many requests in a row — wait a minute, then try again.');
    if (res.status === 503) throw fail(503, 'Google’s Gemini servers are overloaded right now (not your key or the app). Try again in a few minutes.');
    if (res.status >= 500) throw fail(res.status, `Gemini had an error on Google’s side (${res.status}${msg ? `: ${msg}` : ''}). Try again in a minute.`);
    throw fail(res.status, msg ? `Gemini: ${msg}` : `Gemini error ${res.status}.`);
  }
  return body;
}

const wait = (ms, signal) => new Promise((res, rej) => {
  const t = setTimeout(res, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Stopped', 'AbortError')); }, { once: true });
});
const BUSY = new Set([500, 502, 503, 504]);
const FALLBACK_MODEL = 'gemini-flash-lite-latest';

/**
 * POST generateContent and return { text, candidate }.
 * Google's servers are often briefly overloaded (503), so busy errors are retried twice with a pause,
 * then tried once on the lighter Flash-Lite model before giving up.
 */
async function generate(key, model, body, signal) {
  const post = m => call(API + encodeURIComponent(m) + ':generateContent', key, { method: 'POST', body: JSON.stringify(body), signal });
  const primary = model || DEFAULT_MODEL;
  let data, lastErr;
  for (let attempt = 0; attempt < 3 && !data; attempt++) {
    try { data = await post(primary); }
    catch (err) {
      if (err?.name === 'AbortError' || !BUSY.has(err.status)) throw err;
      lastErr = err;
      if (attempt < 2) await wait(1500 * 2 ** attempt, signal);
    }
  }
  if (!data && primary !== FALLBACK_MODEL) {
    try { data = await post(FALLBACK_MODEL); }
    catch (err) { if (err?.name === 'AbortError') throw err; throw lastErr; }
  }
  if (!data) throw lastErr;
  const cand = data?.candidates?.[0];
  const text = (cand?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
  if (data?.promptFeedback?.blockReason) throw new Error('Gemini declined to answer that one. Try rephrasing.');
  return { text, candidate: cand };
}

function parseJSON(text, what = 'reply') {
  if (!text) throw new Error(`Gemini did not return a ${what}. Try again.`);
  try { return JSON.parse(text); } catch {}
  // tool-using calls cannot use JSON mode, so the JSON may come wrapped in prose or a ```json fence
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  try { return JSON.parse(raw); } catch { throw new Error(`Gemini’s ${what} could not be read. Try again.`); }
}

const strs = (a, n = 3) => (Array.isArray(a) ? a : []).map(x => String(x ?? '').trim()).filter(Boolean).slice(0, n);
const str = v => String(v ?? '').trim();

/** Check that the key works and the model exists. Resolves true or throws a friendly error. */
export async function testKey(key, model = DEFAULT_MODEL) {
  await call(API + encodeURIComponent(model), key, { method: 'GET' });
  return true;
}

/* ======================================================================
   Shared context: the closet, the person, the rules
   ====================================================================== */

/** One line per piece, with the id the AI must use to refer to it. */
export function closetLines(items) {
  return items.map(i => [
    i.id, i.name, [i.category, i.subtype].filter(Boolean).join('/'), i.color?.name, i.fabric, i.thickness && `${i.thickness.toLowerCase()} weight`,
    i.silhouette && i.silhouette.toLowerCase(), i.sleeves && i.sleeves.toLowerCase(), (i.vibe || []).join('+'), scentsOf(i).length && `scent: ${scentsOf(i).join(', ').toLowerCase()}`, i.category === 'perfume' && perfumeMoodsOf(i).length && `feels: ${perfumeMoodsOf(i).join(', ').toLowerCase()}`
  ].filter(Boolean).join(' · ')).join('\n');
}

function profileLines(p = {}) {
  return [
    `Height ${p.height} cm, bust ${p.bust}, waist ${p.waist}, hips ${p.hips}, shoulder ${p.shoulder} cm. Usual sizes: top ${p.topSize}, bottom ${p.bottomSize}, coat ${p.coatSize}, shoes EU ${p.shoeSize}.`,
    p.guidelines ? `Personal style guidelines: ${p.guidelines}` : ''
  ].filter(Boolean).join('\n');
}

const RULES = `Styling rules this app follows (keep to them):
- A complete outfit is a top + bottom, or a dress, plus shoes; add outerwear when it is cold.
- Never layer two sleeved knits. Never put a thick piece under another top. A thinner piece cannot go over a thicker one (jackets and coats excepted).
- A sleeveless knit or vest goes over a thin sleeved base such as a blouse or tee.
- Keep volume to one half of the outfit; define the waist when it helps.
- Balance light/medium pieces against dark ones, softly: navy, charcoal or chocolate against cream reads richer than black against white.
${COLOUR_RULES}`;

const MINDFUL = `This person is a mindful buyer: they rarely shop and want to change their closet slowly so it becomes more their own style.
Never suggest buying anything unless they explicitly ask about gaps, what is missing, or shopping.`;

function todayLine() {
  const d = new Date();
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch {}
  return `Today is ${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}${tz ? ` (time zone ${tz}, so think about the season and climate there)` : ''}.`;
}

/** Quick 👍 / 👎 on looks the Studio suggested, with the reasons they gave. */
function voteLines(votes = [], byId) {
  return votes.slice().sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 15).map(v => {
    const names = (v.pieceIds || []).map(id => byId.get(id)?.name).filter(Boolean).join(', ');
    const off = (v.off || []).map(id => byId.get(id)?.name).filter(Boolean);
    // two or more picked: the problem is those pieces together (worn together, or one inside the other), not each one on its own
    const together = off.length >= 2 && (!v.tags?.length || v.tags.some(isTogetherTag));
    const problem = together ? ` — the problem: ${off.join(' with ')} together (each is fine on its own)` : off.length ? ` — the problem: ${off.join(', ')}` : '';
    // a reason the note seems to say but they switched off: the note does not mean that
    const muted = v.note && v.muted?.length ? ` (they said this is not about: ${v.muted.join(', ').toLowerCase()})` : '';
    return `- ${new Date(v.at).toLocaleDateString('en-GB')}: ${v.vote > 0 ? 'would wear' : 'not for them'}: ${names}${v.tags?.length ? ` — why: ${v.tags.join(', ').toLowerCase()}` : ''}${problem}${v.note ? ` — note: ${v.note}${muted}` : ''}`;
  }).join('\n');
}
const VOTES_HEAD = 'THEIR QUICK FEEDBACK ON OUTFITS THE APP SUGGESTED (respect it: never send them out in something they turned down for the same reason — e.g. something just as thin in similar weather)';

function diaryLines(wears = [], byId) {
  return wears.slice(0, 12).map(w => {
    const names = (w.itemIds || w.pieceIds || []).map(id => byId.get(id)?.name).filter(Boolean).join(', ');
    return `- ${new Date(w.wornAt).toLocaleDateString('en-GB')}: ${names || w.title}${w.feel ? ` — felt: ${w.feel}` : ''}${w.tags?.length ? ` — noticed: ${w.tags.join(', ')}` : ''}${w.notes ? ` — note: ${w.notes}` : ''}${w.ai?.summary ? ` — stylist said: ${w.ai.summary}` : ''}`;
  }).join('\n');
}

/* ======================================================================
   Diary photo review
   ====================================================================== */

/**
 * Ask Gemini to review a worn outfit.
 * Returns { score, summary, works[], change[], tags[], model, at } — score is for learning only, never display it.
 */
export async function reviewOutfit({ key, model = DEFAULT_MODEL, photo, pieces, mood, profile, closet = [], feel, tags = [], notes = '' }) {
  if (!key) throw new Error('Add your Gemini key in Profile first.');
  if (!photo) throw new Error('Add a photo first.');
  const worn = pieces.map(p => `- ${p.name} (${describe(p)})`).join('\n') || '- (pieces not recorded)';
  const wornIds = new Set(pieces.map(p => p.id));
  const others = closet.filter(i => !wornIds.has(i.id)).slice(0, 80).map(i => `${i.name} [${i.category}]`).join('; ');
  const prompt = [
    'You are my warm, honest personal stylist. The photo shows me wearing this outfit:',
    worn,
    '',
    `Mood I was going for: ${mood || 'not specified'}.`,
    profile?.height ? `I am ${profile.height} cm tall.` : '',
    profile?.guidelines ? `My style guidelines: ${profile.guidelines}` : '',
    feel ? `How it felt to me: ${feel}.` : '',
    tags.length ? `What I noticed: ${tags.join(', ')}.` : '',
    notes ? `My note: ${notes}` : '',
    '',
    `Other pieces I own: ${others || 'none listed'}.`,
    '',
    'Look at how the outfit actually sits on me in the photo — fit, proportions, colours, and how well it suits the mood.',
    'Give a private overall score from 1 to 10 in "score". Never mention a score, number or rating in any text field.',
    'In "change", be specific and kind: a tuck, a roll, a different length, or a swap for a named piece I own.',
    'In "tags", include only tags from the allowed list that clearly apply.'
  ].filter(Boolean).join('\n');

  const { text } = await generate(key, model, {
    contents: [{ role: 'user', parts: [await imagePart(photo), { text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.6 }
  });
  const out = parseJSON(text, 'feedback');
  const score = Math.round(Number(out.score));
  return {
    score: Number.isFinite(score) ? Math.max(1, Math.min(10, score)) : null,
    summary: str(out.summary),
    works: strs(out.works),
    change: strs(out.change),
    tags: (Array.isArray(out.tags) ? out.tags : []).filter(t => ALL_TAGS.includes(t)),
    model, at: Date.now()
  };
}

/* ======================================================================
   Stylist chat
   ====================================================================== */

const CHAT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING', description: 'Your answer in a warm, concise, editorial voice. Plain text: short paragraphs, "- " bullets allowed, **bold** sparingly. Refer to pieces by their name.' },
    outfits: {
      type: 'ARRAY', description: 'Complete outfits from the closet, when the answer suggests what to wear. Empty otherwise.',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING', description: 'A short evocative name, e.g. "Gallery Sunday".' },
          itemIds: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Exact ids from the closet list.' },
          note: { type: 'STRING', description: 'One or two sentences on why it works and how to wear it (tuck, roll, accessories).' }
        },
        required: ['title', 'itemIds', 'note'], propertyOrdering: ['title', 'itemIds', 'note']
      }
    },
    packing: {
      type: 'OBJECT', description: 'Only when asked to pack for a trip: the capsule to pack.',
      properties: {
        title: { type: 'STRING' },
        itemIds: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Exact ids from the closet list.' },
        tips: { type: 'ARRAY', items: { type: 'STRING' } }
      },
      required: ['title', 'itemIds'], propertyOrdering: ['title', 'itemIds', 'tips']
    },
    gaps: {
      type: 'ARRAY', description: 'Only when the person explicitly asks what is missing from their closet or what to buy.',
      items: {
        type: 'OBJECT',
        properties: {
          piece: { type: 'STRING', description: 'A specific, versatile piece, e.g. "Fine merino crew-neck in oatmeal".' },
          why: { type: 'STRING' },
          unlocks: { type: 'INTEGER', description: 'Roughly how many new outfits it makes with what they already own.' }
        },
        required: ['piece', 'why', 'unlocks'], propertyOrdering: ['piece', 'why', 'unlocks']
      }
    }
  },
  required: ['reply'],
  propertyOrdering: ['reply', 'outfits', 'packing', 'gaps']
};

/**
 * One chat turn.
 * messages: [{ role: 'user'|'model', text, outfits?, packing?, photo? }] — the whole history, newest last.
 * photo: Blob attached to the newest user message (older photos are not re-sent).
 * Returns { reply, outfits: [{title, itemIds, note}], packing: {title, itemIds, tips}|null, gaps: [{piece, why, unlocks}] }.
 */
export async function chat({ key, model = DEFAULT_MODEL, messages, photo = null, closet = [], profile, wears = [], looks = [], votes = [], signal }) {
  if (!key) throw new Error('Add your Gemini key in Profile first.');
  const byId = new Map(closet.map(i => [i.id, i]));
  const names = ids => (ids || []).map(id => byId.get(id)?.name).filter(Boolean).join(', ');

  const system = [
    'You are the personal stylist inside Fashon, a private wardrobe app. You are warm, honest, specific and quietly elegant — like a great editor, never pushy.',
    todayLine(),
    '',
    'ABOUT THE PERSON', profileLines(profile), MINDFUL,
    '',
    'THEIR CLOSET (id · name · category/type · colour · fabric · weight · silhouette · sleeves · vibe)',
    closetLines(closet) || '(the closet is empty — encourage them to add pieces in the Closet tab)',
    '',
    wears.length ? 'RECENT OUTFIT DIARY (what they wore and how it went — learn from it)\n' + diaryLines(wears, byId) + '\n' : '',
    votes.length ? VOTES_HEAD + '\n' + voteLines(votes, byId) + '\n' : '',
    looks.length ? `Looks they saved: ${looks.slice(0, 15).map(l => l.title).join('; ')}.\n` : '',
    RULES,
    '',
    'HOW TO ANSWER',
    '- When they ask what to wear, suggest 1–3 complete outfits in "outfits", using only exact ids from the closet list. Do not repeat the outfit in "reply" piece by piece; the app shows the pieces with photos. Use "reply" for the idea and any questions.',
    '- If something important is unknown (occasion, weather, dress code), make a sensible assumption, say it in one line, and still suggest outfits.',
    '- For trips, fill "packing" with a compact mix-and-match capsule from the closet, plus 2–4 "outfits" built only from that capsule, and a few packing "tips".',
    '- Only fill "gaps" when they explicitly ask what is missing or what to buy. Then suggest 3–5 versatile, quality pieces that move them toward their style, ordered by how much they unlock. Prefer natural fibres and timeless shapes. Say plainly when they need nothing.',
    '- If they attach a photo, look at it closely (fit, proportion, colour) and answer about it.',
    '- Keep replies short: usually under 120 words.'
  ].filter(s => s !== '').join('\n');

  const recent = messages.slice(-14);
  const contents = [];
  for (let i = 0; i < recent.length; i++) {
    const m = recent[i];
    const last = i === recent.length - 1;
    let text = m.text || '';
    if (m.role === 'model') {
      (m.outfits || []).forEach(o => { text += `\n[Outfit suggested — ${o.title}: ${names(o.itemIds)}]`; });
      if (m.packing) text += `\n[Packing list — ${names(m.packing.itemIds)}]`;
    } else if (m.photo && !(last && photo)) text += '\n[I attached a photo here earlier]';
    const parts = [];
    if (last && photo && m.role === 'user') parts.push(await imagePart(photo));
    parts.push({ text: text || '(photo)' });
    const role = m.role === 'model' ? 'model' : 'user';
    if (contents.length && contents[contents.length - 1].role === role) contents[contents.length - 1].parts.push(...parts);
    else contents.push({ role, parts });
  }
  if (!contents.length || contents[0].role !== 'user') contents.unshift({ role: 'user', parts: [{ text: 'Hello' }] });

  const { text } = await generate(key, model, {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { responseMimeType: 'application/json', responseSchema: CHAT_SCHEMA, temperature: 0.8 }
  }, signal);
  const out = parseJSON(text);
  const valid = ids => [...new Set((Array.isArray(ids) ? ids : []).map(String).filter(id => byId.has(id)))];
  const outfits = (Array.isArray(out.outfits) ? out.outfits : [])
    .map(o => ({ title: str(o.title) || 'Look', itemIds: valid(o.itemIds), note: str(o.note) }))
    .filter(o => o.itemIds.length >= 2).slice(0, 4);
  const packIds = valid(out.packing?.itemIds);
  return {
    reply: str(out.reply) || (outfits.length ? 'Here is what I would wear.' : '…'),
    outfits,
    packing: packIds.length ? { title: str(out.packing.title) || 'Packing list', itemIds: packIds, tips: strs(out.packing.tips, 6) } : null,
    gaps: (Array.isArray(out.gaps) ? out.gaps : []).map(g => ({ piece: str(g.piece), why: str(g.why), unlocks: Math.max(0, Math.round(+g.unlocks || 0)) })).filter(g => g.piece).slice(0, 6)
  };
}

/* ======================================================================
   Checker: read a product from its link, or from screenshots
   ====================================================================== */

const PRODUCT_FIELDS = `{
  "found": true or false (could you see the actual product?),
  "name": "product name",
  "brand": "brand",
  "price": "price with currency, or empty",
  "colour": "colour name",
  "composition": "e.g. 70% wool, 30% polyamide — exactly as listed, or empty",
  "description": "2–4 sentences: cut, fit, length, details",
  "garment": "top" | "bottom" | "dress" | "outer",
  "fit": "fitted" | "regular" | "relaxed" | "oversized",
  "chartKind": "garment" (measurements of the piece itself) | "body" (body measurements the size fits) | "unknown",
  "chartSource": "where the size chart came from: this page, the brand size guide, a screenshot, or empty",
  "sizes": [ { "size": "S", "bust": 98, "waist": 84, "hips": 100, "shoulder": 40, "length": 62, "sleeve": 60, "inseam": 0 } ],
  "missing": ["what you could not find, e.g. size chart, composition"]
}`;
const PRODUCT_RULES = `Size chart rules: every number in centimetres. Give full circumference for bust, waist and hips — if the chart shows flat / half / pit-to-pit measurements, double them. Use 0 for a measurement the chart does not have. Copy numbers exactly; never guess or invent a size chart. If there is no chart, return "sizes": [] and list "size chart" in "missing".`;

const PRODUCT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    found: { type: 'BOOLEAN' }, name: { type: 'STRING' }, brand: { type: 'STRING' }, price: { type: 'STRING' }, colour: { type: 'STRING' },
    composition: { type: 'STRING' }, description: { type: 'STRING' },
    garment: { type: 'STRING', enum: ['top', 'bottom', 'dress', 'outer'] },
    fit: { type: 'STRING', enum: ['fitted', 'regular', 'relaxed', 'oversized'] },
    chartKind: { type: 'STRING', enum: ['garment', 'body', 'unknown'] },
    chartSource: { type: 'STRING' },
    sizes: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      size: { type: 'STRING' }, bust: { type: 'NUMBER' }, waist: { type: 'NUMBER' }, hips: { type: 'NUMBER' }, shoulder: { type: 'NUMBER' },
      length: { type: 'NUMBER' }, sleeve: { type: 'NUMBER' }, inseam: { type: 'NUMBER' } }, required: ['size'] } },
    missing: { type: 'ARRAY', items: { type: 'STRING' } }
  },
  required: ['found', 'name', 'composition', 'garment', 'fit', 'chartKind', 'sizes', 'missing']
};

const MEASURE_KEYS = ['bust', 'waist', 'hips', 'shoulder', 'length', 'sleeve', 'inseam'];

function cleanProduct(o, source) {
  const sizes = (Array.isArray(o.sizes) ? o.sizes : []).map(r => {
    const row = { size: str(r.size).toUpperCase().replace(/^SIZE\s*/, '') };
    MEASURE_KEYS.forEach(k => { const v = +r[k]; if (v > 0 && v < 400) row[k] = Math.round(v * 10) / 10; });
    return row;
  }).filter(r => r.size && Object.keys(r).length > 1);
  return {
    found: !!o.found, name: str(o.name), brand: str(o.brand), price: str(o.price), colour: str(o.colour), composition: str(o.composition),
    description: str(o.description),
    garment: ['top', 'bottom', 'dress', 'outer'].includes(o.garment) ? o.garment : '',
    fit: ['fitted', 'regular', 'relaxed', 'oversized'].includes(o.fit) ? o.fit : '',
    chartKind: ['garment', 'body'].includes(o.chartKind) ? o.chartKind : 'auto',
    chartSource: str(o.chartSource), sizes, missing: strs(o.missing, 6), source
  };
}

/**
 * Turn a read product into the plain text the Checker's own parsers understand.
 * Only columns every size has are written, so values can never slide into the wrong column.
 */
export function productToText(p) {
  const cols = MEASURE_KEYS.filter(k => p.sizes.length && p.sizes.every(r => r[k]));
  const chart = cols.length
    ? ['Size chart (cm, full circumference):', ['Size', ...cols.map(k => k[0].toUpperCase() + k.slice(1))].join(' '), ...p.sizes.map(r => [r.size, ...cols.map(k => r[k])].join(' '))].join('\n')
    : '';
  return [
    p.description, p.colour && `Colour: ${p.colour}`, p.composition && `Composition: ${p.composition}`,
    p.fit && `Fit: ${p.fit}`, chart
  ].filter(Boolean).join('\n');
}

/** Ask Gemini to open the product page itself (URL context), searching for the brand size guide if the page has none. */
export async function readProductLink({ key, model = DEFAULT_MODEL, url }) {
  if (!key) throw new Error('Add your Gemini key in Profile first.');
  const prompt = [
    `Open this product page and read it: ${url}`,
    'Extract the product details. If the size chart is not on the page itself, look up this brand’s official size guide for this kind of garment and say so in "chartSource".',
    PRODUCT_RULES,
    'If you cannot open the page or cannot see the product, set "found": false.',
    'Reply with ONLY one JSON object in this exact shape, nothing else:',
    PRODUCT_FIELDS
  ].join('\n\n');
  const { text, candidate } = await generate(key, model, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ url_context: {} }, { google_search: {} }],
    generationConfig: { temperature: 0.1 }
  });
  const meta = candidate?.urlContextMetadata?.urlMetadata || candidate?.url_context_metadata?.url_metadata || [];
  const opened = meta.some(m => /SUCCESS/.test(m.urlRetrievalStatus || m.url_retrieval_status || ''));
  let out;
  try { out = parseJSON(text, 'product details'); } catch { out = { found: false }; }
  const p = cleanProduct(out, 'link');
  p.blocked = !opened && meta.length > 0;
  if (p.blocked) p.found = p.found && !!p.composition && p.sizes.length > 0;
  return p;
}

/** Read product details from 1–4 screenshots (product page, size chart, composition label). */
export async function readProductImages({ key, model = DEFAULT_MODEL, images, url = '' }) {
  if (!key) throw new Error('Add your Gemini key in Profile first.');
  if (!images?.length) throw new Error('Add a screenshot first.');
  const parts = [];
  for (const b of images.slice(0, 4)) parts.push(await imagePart(b));
  parts.push({ text: [
    `These are screenshots of a clothing product${url ? ` (${url})` : ''}: the product page and/or its size chart.`,
    'Read every detail you can see. Size charts are often tables — read every row.',
    PRODUCT_RULES
  ].join('\n') });
  const { text } = await generate(key, model, {
    contents: [{ role: 'user', parts }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: PRODUCT_SCHEMA, temperature: 0.1 }
  });
  return cleanProduct(parseJSON(text, 'product details'), 'screenshots');
}

/* ======================================================================
   Checker: a mindful second opinion
   ====================================================================== */

const ADVICE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    verdict: { type: 'STRING', enum: ['buy', 'wait', 'skip'], description: 'buy = clearly earns its place; wait = sleep on it / only if…; skip = not for this closet.' },
    headline: { type: 'STRING', description: 'One honest sentence.' },
    size: { type: 'STRING', description: 'Your check of the size advice: agree, or what the Checker may have missed.' },
    quality: { type: 'STRING', description: 'Fabric and value: will it last, pill, breathe, keep its shape?' },
    style: { type: 'STRING', description: 'Does it move their closet toward their style, or duplicate something they own?' },
    pairWith: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Exact ids of closet pieces it would be worn with most.' },
    outfits: { type: 'INTEGER', description: 'Roughly how many outfits it makes with what they own.' },
    instead: { type: 'STRING', description: 'If wait or skip: what they could wear from their closet instead, or what to look for. Empty if buy.' }
  },
  required: ['verdict', 'headline', 'size', 'quality', 'style', 'pairWith', 'outfits'],
  propertyOrdering: ['verdict', 'headline', 'size', 'quality', 'style', 'pairWith', 'outfits', 'instead']
};

/** report: the Checker's own analysis (size, fabric, verdict). Returns the AI's second opinion. */
export async function adviseOnPiece({ key, model = DEFAULT_MODEL, piece, report, closet = [], profile, images = [] }) {
  if (!key) throw new Error('Add your Gemini key in Profile first.');
  const byId = new Map(closet.map(i => [i.id, i]));
  const s = report.size, f = report.fabric;
  const prompt = [
    'You are the honest personal stylist inside Fashon. Give a second opinion on a piece the person is considering buying.',
    MINDFUL.replace('Never suggest buying anything unless they explicitly ask about gaps, what is missing, or shopping.',
      'Judge it like a thoughtful friend would: cost per wear, how many outfits it makes, whether it duplicates something owned, and whether it moves them toward their style. "wait" and "skip" are good answers when deserved.'),
    '',
    'THE PIECE', `Name: ${piece.name || '(unnamed)'}`, piece.url ? `Link: ${piece.url}` : '', piece.price ? `Price: ${piece.price}` : '',
    `Details:\n${piece.text || '(none)'}`,
    '',
    'WHAT THE APP’S CHECKER FOUND (double-check it)',
    s.ok ? `Size: recommends ${s.size}${s.alt ? ` (also consider ${s.alt})` : ''}, ${s.confident ? 'confident' : 'a compromise'}. Notes: ${s.notes.join(' ')}` : `Size: ${s.message}`,
    f.ok ? `Fabric: ${f.score}/10 — ${f.verdict}. ${f.flags.join(' ')}` : `Fabric: ${f.message}`,
    `Read as: ${report.type}, ${report.fit} fit${report.color ? `, ${report.color.name}` : ''}. Overall: ${report.verdict.label} (${report.verdict.summary}).`,
    '',
    'ABOUT THE PERSON', profileLines(profile),
    '',
    'THEIR CLOSET (id · name · category/type · colour · fabric · weight · silhouette · sleeves · vibe)', closetLines(closet) || '(empty)',
    '',
    RULES,
    'Be specific and brief: each text field one or two sentences.'
  ].filter(Boolean).join('\n');
  const parts = [];
  for (const b of images.slice(0, 2)) parts.push(await imagePart(b));
  parts.push({ text: prompt });
  const { text } = await generate(key, model, {
    contents: [{ role: 'user', parts }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: ADVICE_SCHEMA, temperature: 0.4 }
  });
  const o = parseJSON(text, 'opinion');
  return {
    verdict: ['buy', 'wait', 'skip'].includes(o.verdict) ? o.verdict : 'wait',
    headline: str(o.headline), size: str(o.size), quality: str(o.quality), style: str(o.style), instead: str(o.instead),
    pairWith: [...new Set((o.pairWith || []).map(String).filter(id => byId.has(id)))].slice(0, 6),
    outfits: Math.max(0, Math.round(+o.outfits || 0)), at: Date.now()
  };
}

/* ======================================================================
   Closet: auto-fill a new piece from its photo
   ====================================================================== */

const CLOTHING = CATEGORIES.map(c => c.id);
const SUBTYPES = [...new Set(CATEGORIES.flatMap(c => c.subtypes))];
const PIECE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', description: 'Short, specific name in lower case after the first word, e.g. "Cream cable-knit sweater".' },
    category: { type: 'STRING', enum: CLOTHING },
    subtype: { type: 'STRING', enum: [...SUBTYPES, 'none'] },
    fabric: { type: 'STRING', enum: [...FABRICS.map(f => f.label), 'Unknown'], description: 'Best guess from texture; Unknown if you cannot tell.' },
    thickness: { type: 'STRING', enum: THICKNESS },
    silhouette: { type: 'STRING', enum: [...SILHOUETTES, 'none'] },
    sleeves: { type: 'STRING', enum: [...SLEEVES, 'none'] },
    vibe: { type: 'ARRAY', items: { type: 'STRING', enum: VIBES } },
    scents: { type: 'ARRAY', items: { type: 'STRING', enum: SCENT_MOODS }, description: 'Perfume only: its 2-4 main accords as listed on Fragrantica. Empty for anything else.' }
  },
  required: ['name', 'category', 'subtype', 'fabric', 'thickness', 'silhouette', 'sleeves', 'vibe', 'scents']
};

/** Returns { name, category, subtype, fabric, thickness, silhouette, sleeves, vibe[] } — '' for anything unknown. */
export async function describePiece({ key, model = DEFAULT_MODEL, photo }) {
  if (!key) throw new Error('Add your Gemini key in Profile first.');
  const { text } = await generate(key, model, {
    contents: [{ role: 'user', parts: [await imagePart(photo), { text: [
      'This is a photo of one piece from my wardrobe (clothing, shoes, an accessory, makeup, nail polish or perfume).',
      'Identify it for my closet app. Choose the subtype only from those that belong to the category:',
      CATEGORIES.map(c => `${c.id}: ${c.subtypes.join(', ') || 'none'}`).join('\n'),
      'Silhouette and sleeves are "none" when they do not apply. Pick 1–2 vibes.',
      'For a perfume: read the brand and name from the bottle (e.g. "Byredo Gypsy Water"), fill "scents" with its main accords as Fragrantica lists them, fabric "Unknown", thickness "Light", vibe empty.'
    ].join('\n') }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: PIECE_SCHEMA, temperature: 0.2 }
  });
  const o = parseJSON(text, 'description');
  const cat = CATEGORIES.find(c => c.id === o.category);
  return {
    name: str(o.name), category: cat ? cat.id : '',
    subtype: cat && cat.subtypes.includes(o.subtype) ? o.subtype : '',
    fabric: FABRICS.some(f => f.label === o.fabric) ? o.fabric : '',
    thickness: THICKNESS.includes(o.thickness) ? o.thickness : '',
    silhouette: SILHOUETTES.includes(o.silhouette) ? o.silhouette : '',
    sleeves: SLEEVES.includes(o.sleeves) ? o.sleeves : '',
    vibe: (o.vibe || []).filter(v => VIBES.includes(v)).slice(0, 2),
    scents: scentsOf({ scentMood: o.scents || [] }).slice(0, 5)
  };
}

/* ======================================================================
   Studio judge — the app builds the best few complete outfits by its own rules; the AI picks the one a stylist would choose
   ====================================================================== */

const PICK = { type: 'OBJECT', properties: { id: { type: 'STRING' }, why: { type: 'STRING', description: 'One or two sentences: why this one works best today.' } }, required: ['id', 'why'] };
const JUDGE_SCHEMA = { type: 'OBJECT', properties: { classic: PICK, editorial: PICK }, required: ['classic', 'editorial'] };

/** alternatives: { classic: [look], editorial: [look] } with look.pieceIds. Returns { classic: { id, why }, editorial: { id, why } }. */
export async function judgeLooks({ key, model = DEFAULT_MODEL, alternatives, closet = [], profile, mood, feeling, occasion, season, votes = [], recentlySeen = [], signal }) {
  if (!key) throw new Error('Add your Gemini key in Profile first.');
  const byId = new Map(closet.map(i => [i.id, i]));
  const list = looks => looks.map(l => `${l.id}:\n${closetLines(l.pieceIds.map(id => byId.get(id)).filter(Boolean)).replace(/^/gm, '  ')}`).join('\n');
  const seenNames = recentlySeen.map(id => byId.get(id)?.name).filter(Boolean);
  const prompt = [
    'You are the personal stylist inside Fashon. The app has already built complete outfits from the person\'s own closet, following its rules.',
    'Choose the one outfit from each list that a good stylist would actually send them out in today — judge each outfit as a whole:',
    'does it look intentional, are the pieces at the same level of dressiness, is there a clear colour story, is it right for the season and occasion?',
    todayLine(),
    `Mood: ${mood} (${feeling}). ${occasion ? `Occasion: ${occasion}.` : 'No occasion given.'} Season: ${season}.`,
    'ABOUT THE PERSON', profileLines(profile),
    votes.length ? '\n' + VOTES_HEAD + '\n' + voteLines(votes, byId) : '',
    seenNames.length ? `\nThe app has shown them these pieces a lot in the last few days: ${seenNames.join(', ')}. When two outfits are about equally good, choose the one that gives them something fresher.` : '',
    '',
    'LIST A — "The Polished Classic" (balanced, defined, a soft light-to-dark contrast):', list(alternatives.classic),
    '',
    'LIST B — "The Effortless Editorial" (cooler, more undone):', list(alternatives.editorial),
    '',
    RULES,
    'Answer with the exact ids. "why" speaks to the person directly, warm and specific, no more than two sentences.'
  ].join('\n');
  const { text } = await generate(key, model, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: JUDGE_SCHEMA, temperature: 0.3 }
  }, signal);
  const o = parseJSON(text, 'choice');
  const pick = (p, looks) => looks.some(l => l.id === p?.id) ? { id: p.id, why: str(p.why) } : null;
  return { classic: pick(o.classic, alternatives.classic), editorial: pick(o.editorial, alternatives.editorial) };
}
