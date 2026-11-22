/* geminiStylist.js — optional AI feedback on an outfit-diary photo, using Google's Gemini API.
   The API key is the user's own and lives only on this device; requests go straight from the browser to Google.
   No DOM and no storage here: data in, advice out. */

import { WEAR_TAGS } from './stylistEngine.js';

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

function describe(p) {
  return [p.subtype || p.category, p.color?.name, p.fabric, p.silhouette, p.thickness].filter(Boolean).join(', ');
}

async function call(url, key, init = {}) {
  let res;
  try {
    res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key, ...(init.headers || {}) } });
  } catch {
    throw new Error('Could not reach Gemini — check your internet connection.');
  }
  let body = null;
  try { body = await res.json(); } catch {}
  if (!res.ok) {
    const msg = body?.error?.message || '';
    if (res.status === 400 && /api key/i.test(msg)) throw new Error('That Gemini key was not accepted. Check it in Profile.');
    if (res.status === 401 || res.status === 403) throw new Error('That Gemini key was not accepted. Check it in Profile.');
    if (res.status === 404) throw new Error('That Gemini model was not found. Check the model name in Profile.');
    if (res.status === 429) throw new Error('Gemini’s free limit is used up for now — try again later.');
    if (res.status >= 500) throw new Error('Gemini is busy right now — try again in a minute.');
    throw new Error(msg ? `Gemini: ${msg}` : `Gemini error ${res.status}.`);
  }
  return body;
}

/** Check that the key works and the model exists. Resolves true or throws a friendly error. */
export async function testKey(key, model = DEFAULT_MODEL) {
  await call(API + encodeURIComponent(model), key, { method: 'GET' });
  return true;
}

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

  const body = {
    contents: [{ role: 'user', parts: [
      { inline_data: { mime_type: photo.type || 'image/jpeg', data: await blobToBase64(photo) } },
      { text: prompt }
    ] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.6 }
  };
  const data = await call(API + encodeURIComponent(model) + ':generateContent', key, { method: 'POST', body: JSON.stringify(body) });
  const text = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
  if (!text) throw new Error('Gemini did not return feedback for this photo. Try a different photo.');
  let out;
  try { out = JSON.parse(text); } catch { throw new Error('Gemini’s reply could not be read. Try again.'); }
  const strs = a => (Array.isArray(a) ? a : []).map(x => String(x).trim()).filter(Boolean).slice(0, 3);
  const score = Math.round(Number(out.score));
  return {
    score: Number.isFinite(score) ? Math.max(1, Math.min(10, score)) : null,
    summary: String(out.summary || '').trim(),
    works: strs(out.works),
    change: strs(out.change),
    tags: (Array.isArray(out.tags) ? out.tags : []).filter(t => ALL_TAGS.includes(t)),
    model, at: Date.now()
  };
}
