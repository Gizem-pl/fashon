/* stylistEngine.js — pure logic. No DOM, no storage. Everything takes data in and returns data out. */

/* ---------- Taxonomy ---------- */

export const CATEGORIES = [
  { id: 'tops',     label: 'Tops & Knitwear',          slot: 'top',     subtypes: ['Sweater / Knit', 'Sleeveless Sweater / Vest', 'Turtleneck', 'Blouse / Shirt', 'Tee / Tank', 'Bodysuit', 'Corset / Bustier', 'Cardigan', 'Blazer / Jacket'] },
  { id: 'bottoms',  label: 'Bottoms (Skirts & Trousers)', slot: 'bottom', subtypes: ['Skirt', 'Trousers', 'Jeans', 'Shorts', 'Leggings', 'Culottes', 'Cargo / Utility'] },
  { id: 'dresses',  label: 'Dresses',                  slot: 'dress',   subtypes: ['Mini', 'Midi', 'Maxi', 'Slip', 'Wrap', 'Shirt dress', 'Knit dress'] },
  { id: 'outerwear',label: 'Outerwear',                slot: 'outer',   subtypes: ['Coat', 'Trench', 'Puffer', 'Jacket', 'Leather jacket', 'Cape / Poncho', 'Gilet'] },
  { id: 'shoes',    label: 'Shoes',                    slot: 'shoes',   subtypes: ['Boots', 'Ankle boots', 'Loafers', 'Heels', 'Flats', 'Sneakers', 'Sandals', 'Mules'] },
  { id: 'legwear',  label: 'Tights & Socks',           slot: 'legwear', subtypes: ['Tights', 'Socks', 'Stockings'] },
  { id: 'belts',    label: 'Belts',                    slot: 'belt',    subtypes: [] },
  { id: 'jewelry',  label: 'Jewelry & Accessories',    slot: 'jewelry', subtypes: ['Earrings', 'Necklace', 'Bracelet / Watch', 'Ring', 'Scarf', 'Bag'] },
  { id: 'hair',     label: 'Hair Accessories',         slot: 'hair',    subtypes: [] },
  { id: 'nails',    label: 'Nail Polish',              slot: 'nails',   subtypes: [] },
  { id: 'makeup',   label: 'Makeup',                   slot: 'makeup',  subtypes: ['Lipstick', 'Blush', 'Eyeshadow', 'Full look'] },
  { id: 'perfume',  label: 'Perfumes',                 slot: 'perfume', subtypes: [] }
];

export const SILHOUETTES = ['Fitted', 'Relaxed', 'Voluminous'];
export const VIBES = ['Old-Money', 'Effortless Chic', 'Cozy', 'Elevated', 'Minimal', 'Romantic', 'Edgy', 'Preppy', 'Bohemian', 'Sporty-Luxe', 'Evening', 'Casual',
  'Classic', 'Office', 'Vintage', 'Streetwear', 'Glam'];
export const THICKNESS = ['Light', 'Medium', 'Thick'];
export const SLEEVES = ['Sleeved', 'Sleeveless'];
/** Fragrance accords, following Fragrantica's main accords (the most common ones), grouped by family for the picker.
    A perfume can have several. */
export const SCENT_GROUPS = [
  ['Fresh',            ['Citrus', 'Fresh', 'Aquatic', 'Ozonic', 'Salty', 'Green', 'Aromatic', 'Herbal', 'Lavender']],
  ['Fruity',           ['Fruity', 'Cherry', 'Tropical', 'Coconut']],
  ['Floral',           ['Floral', 'White Floral', 'Tuberose', 'Yellow Floral', 'Rose', 'Violet', 'Powdery', 'Iris', 'Aldehydic', 'Soapy']],
  ['Sweet & gourmand', ['Sweet', 'Vanilla', 'Caramel', 'Gourmand', 'Honey', 'Pistachio', 'Almond', 'Nutty', 'Lactonic', 'Cacao', 'Coffee', 'Rum']],
  ['Spicy & warm',     ['Warm Spicy', 'Soft Spicy', 'Fresh Spicy', 'Cinnamon', 'Amber', 'Balsamic', 'Tobacco']],
  ['Woody & deep',     ['Woody', 'Oud', 'Patchouli', 'Leather', 'Animalic', 'Musky', 'Earthy', 'Smoky', 'Mossy']],
  ['Classic families', ['Chypre', 'Fougère']]
];
export const SCENT_MOODS = SCENT_GROUPS.flatMap(([, list]) => list);

/** How a perfume makes you feel — used to match it to the mood picked in the Studio. */
export const PERFUME_MOODS = ['Clean', 'Fresh & Sunny', 'Calm', 'Cozy', 'Romantic', 'Playful', 'Elegant', 'Confident', 'Sensual', 'Mysterious'];
const ACCORD_FEEL = [
  [/Citrus|Aquatic|Ozonic|Salty|Green|Fresh$|Tropical/, 'Fresh & Sunny'],
  [/Fresh$|Musky|Soapy|Aldehydic|Aromatic|Lavender|Fougère/, 'Clean'],
  [/Herbal|Lavender|Lactonic|Iris|Powdery/, 'Calm'],
  [/Vanilla|Caramel|Gourmand|Honey|Pistachio|Almond|Nutty|Cacao|Coffee|Sweet|Cinnamon|Soft Spicy|Warm Spicy/, 'Cozy'],
  [/Floral|Rose|Violet|Powdery/, 'Romantic'],
  [/Fruity|Cherry|Coconut|Sweet|Tropical/, 'Playful'],
  [/Iris|Chypre|Aldehydic|Woody|Rose/, 'Elegant'],
  [/Leather|Woody|Fresh Spicy|Tobacco|Chypre/, 'Confident'],
  [/Tuberose|White Floral|Amber|Animalic|Vanilla|Rum|Balsamic|Musky/, 'Sensual'],
  [/Oud|Smoky|Patchouli|Earthy|Balsamic|Tobacco|Leather|Mossy/, 'Mysterious']
];
/** Moods suggested from a list of accords: the ones most of its accords point to (2-3). */
export function moodsFromAccords(accords = []) {
  const n = {};
  accords.forEach((a, idx) => ACCORD_FEEL.forEach(([re, m]) => { if (re.test(a)) n[m] = (n[m] || 0) + (idx < 2 ? 1.5 : 1); }));
  return Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => m);
}
/** A perfume's moods: the ones set by the user, or ones suggested from its accords. */
export function perfumeMoodsOf(item) {
  const own = (item?.perfumeMoods || []).filter(m => PERFUME_MOODS.includes(m));
  return own.length ? own : moodsFromAccords(scentsOf(item));
}
const LEGACY_SCENTS = { 'Warm & Spicy': 'Warm Spicy', 'Bold Floral': 'Floral', 'Fresh & Clean': 'Fresh' };
/** A perfume's accords as an array — older pieces stored a single string. */
export function scentsOf(item) {
  const v = item?.scentMood;
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  return [...new Set(arr.map(x => LEGACY_SCENTS[x] || x).filter(x => SCENT_MOODS.includes(x)))];
}
export const CONTRASTS = ['Light', 'Medium', 'Dark'];
export const MOODS = ['Quiet Luxury', 'Cozy & Polished', 'Effortless Chic', 'Sharp & Confident', 'Soft & Romantic'];

const SILHOUETTE_CATS = new Set(['tops', 'bottoms', 'dresses', 'outerwear']);

export function categoryById(id) { return CATEGORIES.find(c => c.id === id); }
export function usesSilhouette(catId) { return SILHOUETTE_CATS.has(catId); }

/** Smart default tags pre-filled when a category is chosen. */
export function defaultTags(catId) {
  switch (catId) {
    case 'tops':      return { silhouette: 'Fitted',    vibe: ['Elevated'], scentMood: [] };
    case 'bottoms':   return { silhouette: 'Relaxed',   vibe: ['Effortless Chic'], scentMood: [] };
    case 'dresses':   return { silhouette: 'Fitted',    vibe: ['Elevated'], scentMood: [] };
    case 'outerwear': return { silhouette: 'Relaxed',   vibe: ['Old-Money'], scentMood: [] };
    case 'perfume':   return { silhouette: '',          vibe: [], scentMood: [] };
    case 'shoes':     return { silhouette: '',          vibe: ['Elevated'], scentMood: [] };
    default:          return { silhouette: '',          vibe: ['Effortless Chic'], scentMood: [] };
  }
}

/* ---------- Fabric knowledge ---------- */
/* thick: 1 light · 2 medium · 3 thick.  sheen: matte | soft | shiny.  Order matters: the first matching rule wins,
   so specific fabrics (satin, cashmere) sit before generic ones. */

export const FABRICS = [
  { label: 'Cashmere',  re: /cashmere/i,                         thick: 2, sheen: 'matte', drape: 'soft',       warmth: 'warm', note: 'soft, matte and very warm' },
  { label: 'Satin',     re: /satin|charmeuse/i,                  thick: 1, sheen: 'shiny', drape: 'fluid',      warmth: 'mild', note: 'shiny, fluid and light — it catches the light and shows every crease' },
  { label: 'Silk',      re: /silk/i,                             thick: 1, sheen: 'soft',  drape: 'fluid',      warmth: 'mild', note: 'a soft glow, very fluid and light' },
  { label: 'Chiffon',   re: /chiffon|georgette|organza/i,        thick: 1, sheen: 'matte', drape: 'fluid',      warmth: 'cool', note: 'sheer, airy and floaty' },
  { label: 'Lace',      re: /lace/i,                             thick: 1, sheen: 'matte', drape: 'delicate',   warmth: 'cool', note: 'delicate and see-through — layer it over something plain' },
  { label: 'Velvet',    re: /velvet|velour/i,                    thick: 2, sheen: 'soft',  drape: 'fluid',      warmth: 'warm', note: 'plush with a deep sheen that shifts in the light' },
  { label: 'Corduroy',  re: /corduroy|cord\b/i,                  thick: 2, sheen: 'matte', drape: 'structured', warmth: 'warm', note: 'ribbed, matte and sturdy' },
  { label: 'Tweed',     re: /tweed|bouclé|boucle/i,              thick: 2, sheen: 'matte', drape: 'structured', warmth: 'warm', note: 'nubbly, matte and structured' },
  { label: 'Denim',     re: /denim/i,                            thick: 2, sheen: 'matte', drape: 'structured', warmth: 'mild', note: 'sturdy, matte and casual' },
  { label: 'Faux leather', re: /faux leather|vegan leather|pleather|\bpu\b|polyurethane/i, thick: 2, sheen: 'shiny', drape: 'structured', warmth: 'warm', note: 'a smooth, shiny leather look that does not breathe' },
  { label: 'Leather',   re: /leather/i,                          thick: 2, sheen: 'soft',  drape: 'structured', warmth: 'warm', note: 'structured with a soft sheen; blocks wind' },
  { label: 'Suede',     re: /suede|nubuck/i,                     thick: 2, sheen: 'matte', drape: 'soft',       warmth: 'warm', note: 'velvety, matte and soft' },
  { label: 'Faux fur',  re: /faux fur|shearling|sherpa|\bfur\b/i, thick: 3, sheen: 'soft', drape: 'soft',       warmth: 'warm', note: 'bulky, fluffy and very warm' },
  { label: 'Fleece',    re: /fleece/i,                           thick: 3, sheen: 'matte', drape: 'soft',       warmth: 'warm', note: 'thick, soft and cosy' },
  { label: 'Padded / Down', re: /\bdown (jacket|coat|fill|filled|feather)|padded|quilted|puffer/i,   thick: 3, sheen: 'soft',  drape: 'structured', warmth: 'warm', note: 'puffy, insulating and bulky' },
  { label: 'Linen',     re: /linen/i,                            thick: 1, sheen: 'matte', drape: 'crisp',      warmth: 'cool', note: 'crisp, matte and cooling; it creases naturally' },
  { label: 'Wool',      re: /wool|merino|lambswool|alpaca|mohair/i, thick: 2, sheen: 'matte', drape: 'structured', warmth: 'warm', note: 'matte, warm and breathable' },
  { label: 'Cotton',    re: /cotton|poplin|chambray/i,           thick: 1, sheen: 'matte', drape: 'crisp',      warmth: 'mild', note: 'matte, breathable and easy to wear' },
  { label: 'Jersey / Knit', re: /jersey|ribbed|rib knit|stretch knit/i, thick: 1, sheen: 'matte', drape: 'stretchy', warmth: 'mild', note: 'matte, stretchy and clingy' },
  { label: 'Viscose',   re: /viscose|rayon|modal|lyocell|tencel/i, thick: 1, sheen: 'soft', drape: 'fluid',     warmth: 'cool', note: 'fluid with a gentle sheen; drapes like silk' },
  { label: 'Polyester', re: /polyester|polyamide|nylon|synthetic/i, thick: 1, sheen: 'soft', drape: 'fluid',    warmth: 'mild', note: 'smooth and wrinkle-resistant; it does not breathe well' },
  { label: 'Acrylic',   re: /acrylic/i,                          thick: 2, sheen: 'matte', drape: 'soft',       warmth: 'warm', note: 'a budget wool-style knit that can pill' },
  { label: 'Canvas',    re: /canvas|twill/i,                     thick: 2, sheen: 'matte', drape: 'structured', warmth: 'mild', note: 'sturdy, matte and casual' },
  { label: 'Sequin / Metallic', re: /sequin|metallic|lurex|glitter/i, thick: 2, sheen: 'shiny', drape: 'structured', warmth: 'mild', note: 'very shiny and attention-grabbing' }
];

/** Knowledge entry for a fabric label or any free text that mentions one (e.g. "80% merino wool"). */
export function fabricInfo(text) {
  const t = (text || '').trim();
  if (!t) return null;
  // several fabrics ("Wool, Cashmere" or "80% wool, 20% polyamide"): the first one listed is the main one
  for (const part of t.split(',')) { const f = FABRICS.find(x => x.re.test(part)); if (f) return f; }
  return null;
}

/** All fabric labels in a piece's fabric field. Several are stored comma-separated ("Wool, Cashmere"). */
export function fabricList(text) {
  return [...new Set((text || '').split(',').map(fabricInfo).filter(Boolean).map(f => f.label))];
}
/** Fabric labels as readable text: "wool and cashmere". */
export function fabricText(text) {
  const l = fabricList(text).map(x => x.toLowerCase());
  return l.length ? listText(l) : (text || '').toLowerCase();
}

const T_RANK = { Light: 1, Medium: 2, Thick: 3 };
const T_NAME = ['', 'Light', 'Medium', 'Thick'];
const FORCE_THICK = { 'Tee / Tank': 1, 'Blouse / Shirt': 1, 'Bodysuit': 1, 'Corset / Bustier': 1, 'Slip': 1, 'Leggings': 1, 'Shorts': 1,
  'Tights': 1, 'Socks': 1, 'Stockings': 1, 'Coat': 3, 'Puffer': 3, 'Trench': 2, 'Gilet': 2, 'Cape / Poncho': 2 };
const MIN_THICK = { 'Sweater / Knit': 2, 'Turtleneck': 2, 'Cardigan': 2, 'Knit dress': 2 };

/** Light / Medium / Thick suggested from the fabric and the type of piece. */
export function defaultThickness(catId, subtype, fabricText) {
  if (FORCE_THICK[subtype]) return T_NAME[FORCE_THICK[subtype]];
  const fi = fabricInfo(fabricText);
  let n = fi ? fi.thick : (catId === 'outerwear' ? 2 : catId === 'tops' ? 2 : 2);
  if (MIN_THICK[subtype]) n = Math.max(n, MIN_THICK[subtype]);
  return T_NAME[n];
}
export function thicknessOf(item) {
  return T_RANK[item?.thickness] || T_RANK[defaultThickness(item?.category, item?.subtype, item?.fabric)] || 2;
}
export function isSleeveless(item) {
  if (item?.sleeves === 'Sleeveless') return true;
  if (item?.sleeves === 'Sleeved') return false;
  const sub = item?.subtype || '';
  if (/(sleeveless|vest|corset|bustier)/i.test(sub)) return true;
  return /(sleeveless|\btank\b|\bcami\b|camisole|\bvest\b)/i.test(item?.name || '');
}
/** Where a top sits in a stack: 0 base (blouse, tee, thin turtleneck), 1 knit (sweater, vest), 2 cardigan, 3 blazer / jacket. */
function layerLevel(item) {
  const s = `${item?.subtype || ''} ${item?.name || ''}`;
  if (/(blazer|jacket)/i.test(s)) return 3;
  if (/cardigan/i.test(s)) return 2;
  if (/(turtle|roll ?neck|mock neck)/i.test(s)) return thicknessOf(item) === 1 ? 0 : 1;
  if (/\b(tee|t-shirt|tank|blouse|shirt|bodysuit|corset|bustier|cami|camisole)\b/i.test(s)) return 0;
  return 1;
}
const LEVEL_WORD = ['base tops', 'sweaters', 'cardigans', 'blazers'];
const isHighNeck = i => /(turtle|roll ?neck|polo neck|mock neck)/i.test(`${i?.subtype || ''} ${i?.name || ''}`);

/**
 * Can two tops be worn one over the other? Returns { ok, inner, outer, penalty, reason }.
 * Everyday logic: a blouse or tee goes under a sweater, cardigan or blazer; a cardigan goes over a sweater
 * only when that sweater is thin; never two of the same kind; nothing thick underneath; nothing thin on top of thick.
 */
export function layerPair(a, b) {
  const la = layerLevel(a), lb = layerLevel(b);
  let inner = a, outer = b;
  if (la > lb || (la === lb && (isSleeveless(a) !== isSleeveless(b) ? isSleeveless(a) : thicknessOf(a) > thicknessOf(b)))) { inner = b; outer = a; }
  const li = layerLevel(inner), lo = layerLevel(outer), ti = thicknessOf(inner), to = thicknessOf(outer);
  const no = reason => ({ ok: false, inner, outer, penalty: 0, reason });
  // a sleeveless knit over a thin sleeved knit is the one same-level pairing that works
  const vestOver = li === 1 && lo === 1 && isSleeveless(outer) && !isSleeveless(inner) && ti === 1;
  if (li === lo && !vestOver)
    return no(li === 0 ? `${inner.name} and ${outer.name} are both base tops — wear one of them under a sweater or cardigan instead.`
      : `${inner.name} and ${outer.name} are both ${LEVEL_WORD[li]} — two of the same kind do not go on top of each other.`);
  if (isHighNeck(outer) && lo <= 1) return no(`Nothing shows under ${outer.name}'s high neck — wear it on its own, or with a cardigan or blazer over it.`);
  if (li === 1 && isSleeveless(inner) && lo === 2) return no(`A cardigan over ${inner.name} hides the vest — wear the vest over a blouse or tee instead.`);
  if (li === 1 && lo === 2 && ti > 1) return no(`${inner.name} is too thick to go under ${outer.name} — a cardigan only sits over a thin knit (thickness Light) or a blouse or tee.`);
  if (li === 2 && lo === 3) return no(`${inner.name} under ${outer.name} is one layer too many — pick one of the two.`);
  if (ti === 3) return no(`${inner.name} is too thick to wear under another top — let it be the outer piece, with a thin blouse or tee underneath.`);
  if (to < ti && lo < 3) return no(`${outer.name} is thinner than ${inner.name}, so it will not sit over it. Layer it over a thin base such as a blouse or tee instead.`);
  let penalty = 0;
  if (li === 0 && lo >= 1) penalty += 0.8;                      // blouse or tee under a knit, cardigan or blazer: the everyday classic
  if (isSleeveless(outer) && ti === 1) penalty += 1.2;          // sleeveless knit over a thin sleeved base
  if (ti >= 2 && to === ti && lo < 3) penalty -= 1.5;           // same medium weight twice: bulky
  if (outer.silhouette === 'Fitted' && ti >= 2) penalty -= 1.5; // fitted outer over a substantial base
  return { ok: true, inner, outer, penalty, reason: '' };
}

/** Order up to three tops from the inside out; every pair must be wearable together. */
const stackKey = t => layerLevel(t) * 10 + (isSleeveless(t) ? 5 : 0) + thicknessOf(t);
function orderStack(tops) {
  const s = tops.slice().sort((a, b) => stackKey(a) - stackKey(b));
  if (s.length > 3) return { ok: false, reason: 'Three tops is the most that can be layered.' };
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) {
    const lp = layerPair(s[i], s[j]);
    if (!lp.ok) return { ok: false, reason: lp.reason };
  }
  return { ok: true, tops: s };
}

/** Soft penalty for a coat/jacket over what is underneath it. */
function outerLayerPenalty(under, outer) {
  if (!under.length) return 0;
  const ti = Math.max(...under.map(thicknessOf)), to = thicknessOf(outer);
  let p = 0;
  if (to < ti) p -= 8;                                         // thin trench over a chunky knit: stronger than the "vary the looks" nudge
  if (ti === 3 && outer.silhouette === 'Fitted') p -= 2;
  return p;
}

/* ---------- Auto-suggest a category (no ML: keywords + photo shape) ---------- */

const KEYWORD_RULES = [
  [/\b(tights|pantyhose|stockings?|socks?)\b/, 'legwear', m => /stocking/.test(m[0]) ? 'Stockings' : /sock/.test(m[0]) ? 'Socks' : 'Tights'],
  [/\b(ankle boots?|chelsea boots?)\b/, 'shoes', () => 'Ankle boots'], [/\bboots?\b/, 'shoes', () => 'Boots'],
  [/\bloafers?\b/, 'shoes', () => 'Loafers'], [/\b(heels?|pumps?|stilettos?)\b/, 'shoes', () => 'Heels'],
  [/\b(flats?|ballet|ballerinas?)\b/, 'shoes', () => 'Flats'], [/\b(sneakers?|trainers?)\b/, 'shoes', () => 'Sneakers'],
  [/\bsandals?\b/, 'shoes', () => 'Sandals'], [/\bmules?\b/, 'shoes', () => 'Mules'],
  [/\b(earrings?|studs|hoops)\b/, 'jewelry', () => 'Earrings'], [/\b(necklace|pendant|chain)\b/, 'jewelry', () => 'Necklace'],
  [/\b(bracelet|watch|bangle|cuff)\b/, 'jewelry', () => 'Bracelet / Watch'], [/\bring\b/, 'jewelry', () => 'Ring'],
  [/\b(scarf|shawl)\b/, 'jewelry', () => 'Scarf'], [/\b(bag|handbag|tote|purse|clutch)\b/, 'jewelry', () => 'Bag'],
  [/\bbelt\b/, 'belts', () => ''],
  [/\b(hair ?clip|claw clip|scrunchie|headband|barrette|hair ribbon|hair tie)\b/, 'hair', () => ''],
  [/\b(nail polish|nail varnish|nail lacquer)\b/, 'nails', () => ''],
  [/\b(lipstick|lip gloss|blush|eyeshadow|eye shadow|mascara|foundation|makeup)\b/, 'makeup', m => /lip/.test(m[0]) ? 'Lipstick' : /blush/.test(m[0]) ? 'Blush' : /eye/.test(m[0]) ? 'Eyeshadow' : ''],
  [/\b(perfume|parfum|eau de|fragrance|cologne)\b/, 'perfume', () => ''],
  [/\bslip dress\b/, 'dresses', () => 'Slip'], [/\bwrap dress\b/, 'dresses', () => 'Wrap'], [/\bshirt ?dress\b/, 'dresses', () => 'Shirt dress'],
  [/\b(knit|sweater|jumper) dress\b/, 'dresses', () => 'Knit dress'], [/\bmini dress\b/, 'dresses', () => 'Mini'],
  [/\bmidi dress\b/, 'dresses', () => 'Midi'], [/\b(maxi dress|gown)\b/, 'dresses', () => 'Maxi'], [/\b(dress|jumpsuit)\b/, 'dresses', () => ''],
  [/\bleggings?\b/, 'bottoms', () => 'Leggings'], [/\bjeans\b/, 'bottoms', () => 'Jeans'], [/\bskirt\b/, 'bottoms', () => 'Skirt'],
  [/\bculottes?\b/, 'bottoms', () => 'Culottes'], [/\bcargo\b/, 'bottoms', () => 'Cargo / Utility'], [/\bshorts\b/, 'bottoms', () => 'Shorts'],
  [/\b(trousers?|pants|slacks|chinos|palazzo)\b/, 'bottoms', () => 'Trousers'],
  [/\b(puffer|down jacket|padded jacket)\b/, 'outerwear', () => 'Puffer'], [/\btrench\b/, 'outerwear', () => 'Trench'],
  [/\b(leather jacket|biker jacket)\b/, 'outerwear', () => 'Leather jacket'], [/\b(gilet|body warmer)\b/, 'outerwear', () => 'Gilet'],
  [/\b(cape|poncho)\b/, 'outerwear', () => 'Cape / Poncho'], [/\b(overcoat|coat|parka|peacoat)\b/, 'outerwear', () => 'Coat'],
  [/\bblazer\b/, 'tops', () => 'Blazer / Jacket'], [/\bjacket\b/, 'outerwear', () => 'Jacket'],
  [/\bcardigan\b/, 'tops', () => 'Cardigan'], [/\b(turtle ?neck|roll ?neck|polo neck|mock neck)\b/, 'tops', () => 'Turtleneck'],
  [/\b(sleeveless (sweater|knit|jumper)|(sweater|knit) vest|waistcoat|vest)\b/, 'tops', () => 'Sleeveless Sweater / Vest'],
  [/\b(sweater|jumper|pullover|knitwear|knit|sweatshirt|hoodie)\b/, 'tops', () => 'Sweater / Knit'],
  [/\bbodysuit\b/, 'tops', () => 'Bodysuit'], [/\b(corset|bustier)\b/, 'tops', () => 'Corset / Bustier'],
  [/\b(blouse|shirt|button[- ]?up|button[- ]?down)\b/, 'tops', () => 'Blouse / Shirt'],
  [/\b(t-?shirt|tee|tank|camisole|cami|top)\b/, 'tops', () => 'Tee / Tank']
];

/** Guess category, type, fabric, thickness and sleeves from words the user typed (name / notes). */
export function suggestFromText(text) {
  const t = lc(text).replace(/boot[- ]?cut/g, 'bootcut');
  if (!t.trim()) return null;
  let hit = null;
  for (const [re, cat, sub] of KEYWORD_RULES) {
    const m = t.match(re);
    if (m) { hit = { category: cat, subtype: sub(m) || '' }; break; }
  }
  const fab = fabricInfo(t);
  const thickness = /(chunky|thick|heavy|bulky|cable[- ]?knit|fleece|puffer)/.test(t) ? 'Thick'
    : /(thin|fine[- ]?knit|lightweight|light[- ]?weight|sheer|delicate|gauzy)/.test(t) ? 'Light' : '';
  const sleeves = /(sleeveless|\btank\b|camisole|\bcami\b|\bvest\b)/.test(t) ? 'Sleeveless' : '';
  if (!hit && !fab && !thickness && !sleeves) return null;
  return { ...(hit || {}), fabric: fab ? fab.label : '', thickness, sleeves };
}

/* ---------- Colour helpers ---------- */

export function hexToRgb(hex) {
  const h = (hex || '#808080').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}
export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
/** Light / Medium / Dark from a hex colour (perceptual lightness). */
export function contrastFromHex(hex) {
  const { r, g, b } = hexToRgb(hex);
  const l = rgbToHsl(r, g, b).l;
  const lum = luminance(hex);
  // blend perceptual luminance and HSL lightness for a stable call on photos
  const v = 0.6 * Math.pow(lum, 1 / 2.2) + 0.4 * l;
  if (v >= 0.62) return 'Light';
  if (v >= 0.33) return 'Medium';
  return 'Dark';
}

export const COLOR_NAMES = [
  ['Ivory', '#F5F0E6'], ['Cream', '#EDE3CF'], ['White', '#FAFAFA'], ['Oatmeal', '#D7C9B1'], ['Beige', '#C9B79C'],
  ['Camel', '#B98B58'], ['Tan', '#A67C52'], ['Sand', '#D9C7A3'], ['Taupe', '#8B7D6F'], ['Chocolate', '#4A3226'],
  ['Brown', '#6B4A33'], ['Espresso', '#2E211B'], ['Black', '#151515'], ['Charcoal', '#3A3B3D'], ['Grey', '#8A8A8A'],
  ['Light Grey', '#C4C4C4'], ['Navy', '#1F2A44'], ['Denim Blue', '#4B6A8F'], ['Sky Blue', '#9DBBD8'], ['Teal', '#2F6B6B'],
  ['Forest Green', '#2F4A3A'], ['Olive', '#6B6B3A'], ['Sage', '#A3B08F'], ['Burgundy', '#5E1F2B'], ['Wine', '#7A2E3F'],
  ['Red', '#B3262E'], ['Rust', '#A4502D'], ['Terracotta', '#B8664A'], ['Orange', '#D67A2B'], ['Mustard', '#C49A2C'],
  ['Gold', '#B89A52'], ['Blush', '#E8C9C2'], ['Dusty Rose', '#C58F94'], ['Pink', '#E39AB0'], ['Fuchsia', '#B8326F'],
  ['Lilac', '#B7A5CF'], ['Plum', '#5B2E55'], ['Silver', '#BFC1C4'],
  ['Stone', '#B5AC9E'], ['Khaki', '#9C8F62'], ['Mocha', '#8A6A55'], ['Light Blue', '#BBD0E6'], ['Cobalt', '#2C4FA3'],
  ['Emerald', '#1F6E4E'], ['Mint', '#B6D8C3'], ['Lavender', '#CFC3E3'], ['Coral', '#E07A63'], ['Peach', '#F1C3A3'],
  ['Butter Yellow', '#F0DE9A'], ['Pale Grey', '#E0E0DE']
];
/** sRGB → CIELAB, so colour distances match what the eye sees. */
export function rgbToLab(r, g, b) {
  const lin = v => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; };
  const R = lin(r), G = lin(g), B = lin(b);
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047);
  const y = f(R * 0.2126 + G * 0.7152 + B * 0.0722);
  const z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const NAME_LAB = new Map();
export function colorName(hex) {
  const { r, g, b } = hexToRgb(hex);
  const [L, A, B] = rgbToLab(r, g, b);
  let best = COLOR_NAMES[0], bd = Infinity;
  for (const c of COLOR_NAMES) {
    if (!NAME_LAB.has(c[1])) { const o = hexToRgb(c[1]); NAME_LAB.set(c[1], rgbToLab(o.r, o.g, o.b)); }
    const [l2, a2, b2] = NAME_LAB.get(c[1]);
    // lightness counts a little less than hue/chroma, so a shadowed navy still reads as navy
    const d = 0.7 * (L - l2) ** 2 + (A - a2) ** 2 + (B - b2) ** 2;
    if (d < bd) { bd = d; best = c; }
  }
  return best[0];
}
function isNeutral(hex) {
  const { r, g, b } = hexToRgb(hex);
  const { s, l } = rgbToHsl(r, g, b);
  return s < 0.2 || l < 0.12 || l > 0.92;
}
function hueOf(hex) { const { r, g, b } = hexToRgb(hex); return rgbToHsl(r, g, b).h; }
function hueDiff(a, b) { const d = Math.abs(hueOf(a) - hueOf(b)); return Math.min(d, 360 - d); }

/** Harmony score between two colours: neutrals pair with anything, analogous works, clashing saturated pairs lose. */
export function harmony(hexA, hexB) {
  if (!hexA || !hexB) return 0;
  const na = isNeutral(hexA), nb = isNeutral(hexB);
  if (na && nb) return 1.2;
  if (na || nb) return 1;
  const d = hueDiff(hexA, hexB);
  if (d < 40) return 1;
  if (d > 150) return 0.4;       // complementary: strong but fine
  return -1.2;                    // awkward mid-angle clash
}

/* ---------- Naming ---------- */

export function autoName(catId, colorNm, subtype) {
  const cat = categoryById(catId);
  const base = subtype || (cat ? cat.label.replace(/ \(.*\)| & .*/g, '').replace(/s$/, '') : 'Piece');
  return `${colorNm ? colorNm + ' ' : ''}${base}`.trim();
}

/* ---------- Mood interpretation ---------- */

const MOOD_PROFILES = {
  'Quiet Luxury': {
    level: 3.4,
    perfume: ['Elegant', 'Clean', 'Calm'],
    feeling: 'composed, expensive-feeling and calm',
    vibes: ['Old-Money', 'Elevated', 'Minimal', 'Classic'], tonal: true,
    hair: ['a low, sleek chignon with a soft centre part', 'smooth, brushed-back hair tucked behind the ears'],
    makeup: 'skin-first: sheer base, soft taupe lids, a barely-there rosy-nude lip',
    nails: 'a sheer milky nude or soft ballet pink, short and rounded',
    jewelry: 'small gold studs or a single fine chain — nothing that competes with the fabric',
    texture: 'fine wool, cashmere and crisp tailoring'
  },
  'Cozy & Polished': {
    level: 2.9,
    perfume: ['Cozy', 'Calm', 'Elegant'],
    feeling: 'warm, held and effortlessly put-together',
    vibes: ['Cozy', 'Elevated', 'Casual', 'Preppy', 'Classic'], tonal: true,
    hair: ['loose, soft waves tucked behind one ear', 'a low ponytail with a few face-framing strands left out'],
    makeup: 'a warm, cream-based glow: peachy blush, brown mascara, a satin balm',
    nails: 'a soft oat or café-au-lait cream, glossy',
    jewelry: 'chunky-but-smooth gold hoops or a warm-toned bracelet stack',
    texture: 'brushed knits, wool and soft suede'
  },
  'Effortless Chic': {
    level: 2.6,
    perfume: ['Fresh & Sunny', 'Clean', 'Playful'],
    feeling: 'relaxed, a little undone and quietly cool',
    vibes: ['Effortless Chic', 'Old-Money', 'Casual', 'Bohemian', 'Sporty-Luxe', 'Vintage', 'Streetwear'], tonal: false,
    hair: ['a slightly undone low bun with loose pieces', 'a tousled half-up twist'],
    makeup: 'a bare face with a blurred brown-red lip and groomed brows',
    nails: 'bare natural nails with a clear gloss, or a pale greige',
    jewelry: 'a mix of one chain and one hoop — deliberately unmatched',
    texture: 'washed cotton, linen and draped jersey'
  },
  'Sharp & Confident': {
    level: 3.8,
    perfume: ['Confident', 'Mysterious', 'Sensual'],
    feeling: 'precise, powerful and in charge',
    vibes: ['Elevated', 'Old-Money', 'Edgy', 'Evening', 'Preppy', 'Office', 'Glam'], tonal: false,
    hair: ['a high, polished ponytail pulled tight', 'a sleek, side-parted blowout tucked behind the ear'],
    makeup: 'defined brows, a crisp winged liner and a deep berry or classic red lip',
    nails: 'a deep oxblood, espresso or crisp milky white — short, squared',
    jewelry: 'structured gold cuffs or sharp geometric earrings',
    texture: 'structured wool, leather and sharp tailoring'
  },
  'Soft & Romantic': {
    level: 3.2,
    perfume: ['Romantic', 'Sensual', 'Playful'],
    feeling: 'tender, graceful and quietly romantic',
    vibes: ['Effortless Chic', 'Cozy', 'Romantic', 'Bohemian', 'Evening', 'Vintage'], tonal: true,
    hair: ['soft waves pinned half-up with a ribbon or clip', 'a loose, low side braid with face-framing pieces'],
    makeup: 'rosy cheeks, dewy skin, soft pink lids and a stained petal lip',
    nails: 'a sheer blush pink or soft rosé, glossy and rounded',
    jewelry: 'delicate pearls or a fine gold chain with a small drop pendant',
    texture: 'silk, soft knits and fluid fabrics'
  }
};

/**
 * Blend any number of moods. `chips` is a name, or an array of names / { name, base } (custom moods
 * inherit the profile of their `base` built-in mood). Words in `text` can add more moods.
 */
export function interpretMood(text = '', chips = []) {
  const list = Array.isArray(chips) ? chips : [chips];
  const picks = list.filter(Boolean)
    .map(c => typeof c === 'string' ? { label: c, base: c } : { label: c.name, base: c.base })
    .filter(p => MOOD_PROFILES[p.base]);
  const t = (text || '').toLowerCase();
  const rules = [
    ['Cozy & Polished', /(cosy|cozy|warm|snug|soft knit|comfort)/],
    ['Sharp & Confident', /(sharp|confident|power|bold|strong|boss|meeting|focused)/],
    ['Soft & Romantic', /(romantic|soft|gentle|tender|feminine|dreamy|delicate)/],
    ['Effortless Chic', /(effortless|easy|relaxed|casual|undone|chill|cool)/],
    ['Quiet Luxury', /(quiet|luxur|classic|timeless|elegant|polished|refined|calm)/]
  ];
  for (const [k, re] of rules) if (re.test(t) && !picks.some(p => p.base === k)) picks.push({ label: k, base: k });
  if (!picks.length) picks.push({ label: 'Quiet Luxury', base: 'Quiet Luxury' });
  const use = picks.slice(0, 3);
  const profs = use.map(p => MOOD_PROFILES[p.base]);
  const uniq = arr => [...new Set(arr)];
  return {
    key: use.map(p => p.label).join(' + '),
    feeling: profs.length > 1 ? `${profs[0].feeling} — with notes of ${profs.slice(1).map(p => p.feeling).join(' and ')}` : profs[0].feeling,
    vibes: uniq(profs.flatMap(p => p.vibes)),
    perfume: uniq(profs.flatMap(p => p.perfume)),
    level: profs.reduce((t, p) => t + p.level, 0) / profs.length,
    tonal: profs.some(p => p.tonal),
    hair: uniq(profs.flatMap(p => p.hair)),
    makeup: profs[0].makeup,
    nails: profs[profs.length - 1].nails,
    jewelry: profs[0].jewelry,
    texture: uniq(profs.map(p => p.texture)).join(', plus '),
    text: (text || '').trim()
  };
}

/* ---------- Scoring ---------- */

const CONTRAST_RANK = { Light: 0, Medium: 1, Dark: 2 };
function contrastGap(a, b) { return Math.abs(CONTRAST_RANK[a?.contrast] - CONTRAST_RANK[b?.contrast]); }

/** Proportion score between an upper and lower garment. Higher = better balance. */
function proportionScore(top, bottom, intent) {
  const t = top?.silhouette, b = bottom?.silhouette;
  if (!t || !b) return 0;
  const table = {
    'Voluminous|Fitted': 3,  'Voluminous|Relaxed': -1, 'Voluminous|Voluminous': -3,
    'Relaxed|Fitted': 2.6,   'Relaxed|Relaxed': intent === 'editorial' ? 1.2 : -0.2, 'Relaxed|Voluminous': -0.5,
    'Fitted|Fitted': 1,      'Fitted|Relaxed': 2.2,  'Fitted|Voluminous': 1.6
  };
  // keys are top|bottom? Our table reads bottom|top for readability, so flip:
  const key = `${b}|${t}`;
  return table[key] ?? 0;
}

function contrastScore(a, b, intent) {
  const gap = contrastGap(a, b);
  if (intent === 'editorial') return gap === 0 ? 1.6 : gap === 1 ? 1.4 : 1.2; // tonal is welcome
  return gap === 0 ? 0.3 : gap === 1 ? 1.8 : 2.2;                              // classic wants light/medium vs dark
}

function vibeScore(item, mood) {
  if (!item?.vibe) return 0;
  return item.vibe.filter(v => mood.vibes.includes(v)).length * 0.8;
}

/** Two shiny fabrics compete; one shiny piece against matte reads richer. */
function sheenScore(a, b) {
  const fa = fabricInfo(a?.fabric), fb = fabricInfo(b?.fabric);
  if (!fa || !fb) return 0;
  if (fa.sheen === 'shiny' && fb.sheen === 'shiny') return -1.2;
  if ((fa.sheen === 'shiny' && fb.sheen === 'matte') || (fb.sheen === 'shiny' && fa.sheen === 'matte')) return 0.4;
  return 0;
}

function pairScore(a, b, mood, intent) {
  return contrastScore(a, b, intent) + harmony(a.color?.hex, b.color?.hex) + vibeScore(b, mood) + sheenScore(a, b) + learnedPair(a, b);
}

/* ---------- Learning: the outfit diary and the quick 👍 / 👎 on suggested looks ----------
   A reason teaches the thing it is about, and only that:
   - warmth ("too thin", "too cold", "too bulky", "too warm") sets a lower or upper limit on how warm the clothes are, for that time of year.
     A "too thin" from November still holds in colder weather and fades as it gets milder; a "too bulky" works the other way round.
   - dressiness ("too casual", "too dressy", "right for the occasion") sets the level for that occasion. With a piece picked, only
     that kind of piece has to change: "these sneakers are too casual for work" asks for dressier shoes for work, nothing else.
   - colours: which colours (and colour families) to keep apart or put together, and how many go in one look.
   - shape: which silhouette combinations work.
   - a piece singled out takes the blame together with the pieces it was paired with; the rest of the look is not blamed.
   A dislike that warmth or dressiness explains does not count against the combination: it may be right in another month or for another occasion.
   When two reasons contradict each other, the newer one wins. Everything fades slowly (half after a year), so taste can change.
   The person's own verdict always weighs more than the AI's. */

export const WEAR_FEELS = [
  { id: 'love', label: 'Loved it',    w: 1.6 },
  { id: 'fine', label: 'It was fine', w: 0.3 },
  { id: 'no',   label: 'Not for me',  w: -1.6 }
];
export const WEAR_TAGS = {
  good: ['Great proportions', 'Flattering fit', 'Colours work', 'Felt confident', 'Comfortable', 'Right for the occasion'],
  bad:  ['Too boxy', 'Too much volume', 'Too tight', 'Colours clash', 'Too many colours', 'Too warm', 'Too cold', 'Too casual', 'Too dressy', 'Uncomfortable']
};
/** Optional reasons on a quick 👍 / 👎 in the Studio. Same words as the diary where they mean the same thing. */
export const VOTE_TAGS = {
  good: ['Colours work', 'Great proportions', 'Right for the occasion', 'Very me'],
  bad:  ['Too thin', 'Too bulky', 'Colours clash', 'Too many colours', 'Too boxy', 'Too tight', 'Too casual', 'Too dressy', 'Not my style']
};
/** What each reason is about. dir: +1 wants more of it (warmer, dressier) or likes it, −1 wants less of it or dislikes it. */
const REASONS = {
  'Too thin':   { kind: 'warmth', dir: 1 },  'Too cold':  { kind: 'warmth', dir: 1 },
  'Too bulky':  { kind: 'warmth', dir: -1, bulk: true }, 'Too warm': { kind: 'warmth', dir: -1 },
  'Too casual': { kind: 'dress', dir: 1 },   'Too dressy': { kind: 'dress', dir: -1 }, 'Right for the occasion': { kind: 'dress', dir: 0 },
  'Colours clash': { kind: 'colour', dir: -1 }, 'Colours work': { kind: 'colour', dir: 1 }, 'Too many colours': { kind: 'count', dir: -1 },
  'Too boxy': { kind: 'shape', dir: -1 }, 'Too much volume': { kind: 'shape', dir: -1 }, 'Too tight': { kind: 'shape', dir: -1 },
  'Great proportions': { kind: 'shape', dir: 1 }, 'Flattering fit': { kind: 'shape', dir: 1 },
  'Not my style': { kind: 'style', dir: -1 }, 'Very me': { kind: 'style', dir: 1 }
};

/** What a reason will change, in a few words, to confirm it was understood. */
export function reasonNote(tag, occasion = '') {
  const occ = OCCASIONS.find(o => o.id === occasion)?.label;
  const forOcc = occ ? ` for ${occ.toLowerCase()}` : '';
  return {
    'Too thin': 'warmer looks at this time of year', 'Too bulky': 'lighter, less bulky looks',
    'Too casual': `dressier looks${forOcc}`, 'Too dressy': `more relaxed looks${forOcc}`, 'Right for the occasion': `this level of dressiness${forOcc}`,
    'Colours clash': 'these colours kept apart', 'Colours work': 'these colours together more often', 'Too many colours': 'fewer colours in one look',
    'Too boxy': 'less volume with these shapes', 'Too tight': 'an easier fit with these shapes', 'Great proportions': 'more of these proportions',
    'Not my style': 'fewer looks like this', 'Very me': 'more looks like this'
  }[tag] || '';
}

/** Words in a free note that mean one of the reasons ("two thin things", "the colours don't go together"), unless negated ("not too thin"). */
const NOTE_HINTS = [
  ['Too thin',         /\b(?:thin|flimsy|sheer|see[- ]?through|chilly|cold|freezing|summery)\b|not warm enough|too light\b(?!\s*(?:in\s+)?(?:colou?r|tone|shade))/],
  ['Too bulky',        /\b(?:bulky|puffy|stuffy|sweaty|overheat\w*)\b|too (?:thick|heavy|chunky|warm|hot)\b|too many layers/],
  ['Too many colours', /too many colou?rs|too (?:colou?rful|busy|loud)\b/],
  ['Colours clash',    /\bclash\w*|\b(?:wrong|bad|ugly|weird|odd|awful|strange) colou?rs?\b|colou?rs? (?:are |is |look |looks )?(?:off|wrong|weird|odd|bad|awful|ugly)\b|(?:don'?t|doesn'?t|do not|does not|didn'?t) (?:go|match|work) together|(?:don'?t|doesn'?t|do not|does not) match\b/],
  ['Too boxy',         /\b(?:boxy|baggy|shapeless|frumpy|sacky|swamp\w*)\b|too (?:loose|big|wide|oversized|much volume)\b|no waist\b/],
  ['Too tight',        /\b(?:tight|clingy|restrictive)\b|too (?:fitted|small)\b/],
  ['Too casual',       /\btoo (?:casual|relaxed|sporty|plain|basic|simple)\b|\b(?:sloppy|underdressed|under-dressed)\b|not (?:dressy|smart|formal|polished|elegant) enough/],
  ['Too dressy',       /\btoo (?:dressy|formal|fancy|smart|elegant|much for)\b|\bover-?dressed\b|not (?:casual|relaxed) enough/],
  ['Not my style',     /\bnot (?:my style|really me|me)\b|\bisn'?t (?:really )?me\b|doesn'?t feel like me/],
  ['Colours work',     /\b(?:love|like|great|nice|beautiful|good|lovely|gorgeous|perfect) colou?rs?\b|\b(?:love|like) the colou?rs?\b|colou?rs? (?:work|go together|are (?:great|nice|perfect|lovely))/],
  ['Great proportions', /\bproportions? (?:are |is )?(?:great|good|nice|perfect|right)\b|\bflattering\b|great (?:shape|proportions?)/],
  ['Right for the occasion', /\b(?:perfect|right|great|ideal|good) for (?:work|the office|dinner|a date|the event|today|errands)\b/],
  ['Very me',          /\b(?:so|very|totally|really|exactly) me\b|\bmy style\b/]
];
const NEGATED = /\b(?:not|never|no|isn'?t|wasn'?t|aren'?t|weren'?t|don'?t|doesn'?t|didn'?t|wouldn'?t|without)\s+(?:\w+\s+)?$/i;
export function noteTags(text = '') {
  const t = String(text || ''), out = [];
  for (const [tag, re] of NOTE_HINTS)
    for (const m of t.matchAll(new RegExp(re.source, 'gi')))
      if (!NEGATED.test(t.slice(Math.max(0, m.index - 24), m.index))) { out.push(tag); break; }
  return out;
}

/* Warmth, part by part. About 1 = summer-light, 2 = a knit or jeans, 3+ = winter-warm.
   The coat is its own part: it comes off indoors, so "too thin" about the outfit is about what is under it,
   and "this trench is too thin" is about the coat alone. */
const COLD_MONTHS = [9, 10, 11, 0, 1, 2, 3];
const COLDNESS = [1, 0.95, 0.75, 0.5, 0.25, 0.08, 0, 0.05, 0.25, 0.5, 0.8, 0.95];   // Jan … Dec
/** 0 = high summer … 1 = deep winter, from the date (northern hemisphere, as the season rules assume). */
export function coldnessAt(ts = Date.now()) {
  const d = new Date(ts), m = d.getMonth(), f = (d.getDate() - 15) / 30;
  const n = f >= 0 ? (m + 1) % 12 : (m + 11) % 12;
  return COLDNESS[m] + Math.abs(f) * (COLDNESS[n] - COLDNESS[m]);
}
const isTights = i => i?.category === 'legwear' && /tights/i.test(`${i.subtype || ''} ${i.name || ''}`);
const pieceWarmth = p => thicknessOf(p) + ({ warm: 0.4, cool: -0.4 }[fabricInfo(p.fabric)?.warmth] || 0);
const LEG_OPEN = { Skirt: 0.5, Culottes: 0.3, Shorts: 1.2, Mini: 0.8, Midi: 0.5, Maxi: 0.2, Slip: 0.6, Wrap: 0.5, 'Shirt dress': 0.6, 'Knit dress': 0.4 };
const SHOE_WARMTH = { Sandals: 0.2, Mules: 0.6, Flats: 0.7, Heels: 0.7, Loafers: 1.2, Sneakers: 1.3, 'Ankle boots': 2.2, Boots: 2.6 };
/** { torso, legs, feet, outer }: layers add up with diminishing returns; bare legs under a skirt or dress count as colder, unless with tights. */
function warmthParts(pieces, tights = false) {
  const tops = pieces.filter(p => slotOf(p) === 'top'), dress = pieces.find(p => slotOf(p) === 'dress'), bottom = pieces.find(p => slotOf(p) === 'bottom');
  const layers = dress ? [...tops, dress] : tops;
  const w = layers.map(p => pieceWarmth(p) - (layers.length === 1 && isSleeveless(p) ? 0.5 : 0)).sort((a, b) => b - a);
  const leg = bottom || dress, open = LEG_OPEN[leg?.subtype] || 0;
  const shoes = pieces.find(p => slotOf(p) === 'shoes'), outer = pieces.find(p => slotOf(p) === 'outer');
  return {
    torso: w.length ? w[0] + 0.5 * (w[1] || 0) + 0.3 * (w[2] || 0) : null,
    legs: leg ? pieceWarmth(leg) - open + (open && tights ? 0.6 : 0) : null,
    feet: shoes ? SHOE_WARMTH[shoes.subtype] ?? 1.2 : null,
    outer: outer ? pieceWarmth(outer) : null
  };
}
const partsOf = p => ({ top: ['torso'], bottom: ['legs'], dress: ['torso', 'legs'], shoes: ['feet'], outer: ['outer'] })[slotOf(p)] || [];
/** How dressy the outfit is: the mean of everything but the coat (as the mirror check judges it). */
function dressLevel(pieces) {
  const inner = pieces.filter(p => slotOf(p) !== 'outer');
  return inner.length ? inner.reduce((t, p) => t + dressinessOf(p), 0) / inner.length : 3;
}

/* Colour families, so "navy with brown clashes" also covers navy with chocolate. */
const COLOUR_FAMILY = {
  ivory: 'light', cream: 'light', white: 'light', oatmeal: 'light', beige: 'light', sand: 'light', stone: 'light', 'pale grey': 'light', 'light grey': 'light', silver: 'light',
  grey: 'grey', charcoal: 'grey', black: 'black', espresso: 'brown', chocolate: 'brown', brown: 'brown', mocha: 'brown', taupe: 'brown',
  camel: 'camel', tan: 'camel', khaki: 'camel', navy: 'navy', 'denim blue': 'blue', 'sky blue': 'blue', 'light blue': 'blue', cobalt: 'blue',
  teal: 'green', 'forest green': 'green', olive: 'green', sage: 'green', emerald: 'green', mint: 'green',
  burgundy: 'red', wine: 'red', red: 'red', rust: 'orange', terracotta: 'orange', orange: 'orange', coral: 'orange', peach: 'orange',
  mustard: 'yellow', gold: 'yellow', 'butter yellow': 'yellow', blush: 'pink', 'dusty rose': 'pink', pink: 'pink', fuchsia: 'pink',
  lilac: 'purple', plum: 'purple', lavender: 'purple'
};
function familyOf(p) {
  const n = lc(p?.color?.name);
  return COLOUR_FAMILY[n] || (p?.color?.hex ? COLOUR_FAMILY[lc(colorName(p.color.hex))] || '' : '');
}
const colourCount = pieces => new Set(pieces.filter(p => CLOTHING_SLOTS.has(slotOf(p))).map(familyOf).filter(Boolean)).size;

const GOOD_TAGS = new Set(WEAR_TAGS.good), BAD_TAGS = new Set(WEAR_TAGS.bad), COMPLAINTS = new Set([...WEAR_TAGS.bad, ...VOTE_TAGS.bad]);
const tagWeight = t => GOOD_TAGS.has(t) ? 0.5 : BAD_TAGS.has(t) ? -0.6 : 0;
const pairKey = (a, b) => a < b ? a + '|' + b : b + '|' + a;
const clampAbs = (v, m) => Math.max(-m, Math.min(m, v));
const slotOf = i => categoryById(i?.category)?.slot;
const addTo = (map, k, v) => map.set(k, (map.get(k) || 0) + v);
const RECENT_MS = 5 * 864e5;
const fade = at => 0.5 ** (Math.max(0, Date.now() - (at || 0)) / 3.156e10);   // half after a year

/** The combination: every pair, or with pieces singled out only the pairs they are in. */
function addCombo(m, pieces, w, blamed = new Set()) {
  const n = pieces.length;
  for (let i = 0; i < n; i++) {
    if (!blamed.size) addTo(m.item, pieces[i].id, w / n / 2);
    for (let j = i + 1; j < n; j++) {
      if (blamed.size && !blamed.has(pieces[i].id) && !blamed.has(pieces[j].id)) continue;
      addTo(m.pair, pairKey(pieces[i].id, pieces[j].id), w * 2 / n * (blamed.size ? 1.3 : 1));
    }
  }
  blamed.forEach(id => addTo(m.item, id, w * 0.4));
}
function learnShape(m, pieces, w) {
  const tops = pieces.filter(p => slotOf(p) === 'top'), top = tops[tops.length - 1], bottom = pieces.find(p => slotOf(p) === 'bottom');
  if (top?.silhouette && bottom?.silhouette) addTo(m.shape, `${top.silhouette}|${bottom.silhouette}`, w);
}
/** Colour pairs (by name, and more gently by family). With accents in the look, two neutrals are rarely the clash. */
function learnColours(m, pieces, w, blamed = new Set()) {
  const cp = pieces.filter(p => CLOTHING_SLOTS.has(slotOf(p)) && (p.color?.name || p.color?.hex));
  const accents = cp.some(p => !isNeutralPiece(p));
  for (let i = 0; i < cp.length; i++) for (let j = i + 1; j < cp.length; j++) {
    const a = cp[i], b = cp[j];
    if (blamed.size && !blamed.has(a.id) && !blamed.has(b.id)) continue;
    const f = !blamed.size && accents && isNeutralPiece(a) && isNeutralPiece(b) ? 0.4 : 1;
    const na = lc(a.color?.name), nb = lc(b.color?.name), fa = familyOf(a), fb = familyOf(b);
    if (na && nb && na !== nb) addTo(m.colour, pairKey(na, nb), w * f);
    if (fa && fb) addTo(m.colourFam, pairKey(fa, fb), w * f * 0.5);
  }
}

/**
 * Learn from one reason. ctx: { pieces, at, occ (null = unknown), tights, blamed: Set of piece ids }.
 * Returns true when the reason explains a dislike without blaming the combination (warmth, dressiness).
 * May add to ctx.blamed when the reason points at one piece (a bulky coat).
 */
function absorbReason(m, ev, tag, ctx, s) {
  const r = REASONS[tag], w = s * fade(ctx.at);
  if (!r || !w) return false;
  const { pieces, at, occ, blamed } = ctx;
  switch (r.kind) {
    case 'warmth': {
      if (blamed.size) {                                                  // "the trench is too thin", "those flats are too cold": that part only
        const which = [...new Set([...blamed].flatMap(id => partsOf(pieces.find(p => p.id === id))))];
        if (!which.length) return false;
        const parts = warmthParts(pieces, ctx.tights);
        which.filter(k => parts[k] != null).forEach(k => ev.warmth.push({ at, part: k, kind: r.dir > 0 ? 'floor' : 'ceil', v: parts[k] + 0.5 * r.dir, c: coldnessAt(at), w }));
        return true;
      }
      const parts = warmthParts(pieces, ctx.tights), have = (r.dir > 0 ? ['torso', 'legs', 'feet'] : ['torso', 'legs']).filter(k => parts[k] != null);
      if (!have.length) return false;
      const vals = have.map(k => parts[k]);
      if (r.bulk) {   // "too bulky": heavy fabrics, a lot of volume, or a big coat — learn whichever it was
        const base = pieces.filter(p => ['top', 'bottom', 'dress'].includes(slotOf(p)));
        const volume = base.some(p => p.silhouette === 'Voluminous');
        const heavy = base.some(p => thicknessOf(p) === 3) || Math.max(...vals) >= 2.6;
        if (volume) learnShape(m, pieces, -0.5 * w);
        if (!heavy) {
          const coat = pieces.find(p => slotOf(p) === 'outer' && thicknessOf(p) === 3);
          if (coat) { ev.warmth.push({ at, part: 'outer', kind: 'ceil', v: parts.outer - 0.5, c: coldnessAt(at), w }); return true; }
          if (volume) return true;
        }
      }
      const edge = r.dir > 0 ? Math.min(...vals) : Math.max(...vals);
      have.filter(k => Math.abs(parts[k] - edge) <= 0.5)
        .forEach(k => ev.warmth.push({ at, part: k, kind: r.dir > 0 ? 'floor' : 'ceil', v: parts[k] + 0.5 * r.dir, c: coldnessAt(at), w }));
      return true;
    }
    case 'dress': {
      if (occ == null || s < 0.75) return false;                         // unknown occasion, or only the AI said so
      const off = pieces.filter(p => blamed.has(p.id));
      if (r.dir && off.length) off.forEach(p => ev.slot.push({ at, key: `${occ}|${slotOf(p)}`, kind: r.dir > 0 ? 'floor' : 'ceil', v: dressinessOf(p) + 0.3 * r.dir, w }));
      else if (r.dir || occ) { const d = dressLevel(pieces); ev.dress.push({ at, key: occ, kind: r.dir > 0 ? 'floor' : r.dir < 0 ? 'ceil' : 'ok', v: d + 0.25 * r.dir, d, w }); }
      return true;
    }
    case 'colour': learnColours(m, pieces, r.dir * (r.dir > 0 ? 0.5 : 0.6) * w, blamed); return r.dir > 0;
    case 'count':
      m.colourCap.push({ cap: Math.max(2, colourCount(pieces) - 1), w });
      if (blamed.size) learnColours(m, pieces, -0.4 * w, blamed);
      return false;
    case 'shape': learnShape(m, pieces, (r.dir > 0 ? 0.5 : -0.6) * w); return r.dir > 0;
    default: return r.dir > 0;
  }
}

/** A newer warmth limit replaces an older one it contradicts (same part, similar time of year). */
function resolveWarmth(list) {
  const out = [];
  for (const e of list.sort((a, b) => (a.at || 0) - (b.at || 0))) {
    for (let i = out.length - 1; i >= 0; i--) {
      const o = out[i];
      if (o.part !== e.part || o.kind === e.kind || Math.abs(o.c - e.c) > 0.3) continue;
      const lo = e.kind === 'floor' ? e.v : o.v, hi = e.kind === 'floor' ? o.v : e.v;
      if (lo > hi - 0.2) out.splice(i, 1);
    }
    out.push(e);
  }
  return out;
}
/** Dressiness limits per occasion (or per occasion and slot), newest last: a newer limit or a liked look overrides an older one it contradicts. */
function resolveBands(list) {
  const map = new Map();
  for (const e of list.sort((a, b) => (a.at || 0) - (b.at || 0))) {
    if (fade(e.at) < 0.25) continue;                                      // more than two years old
    const b = map.get(e.key) || { lo: -Infinity, hi: Infinity, sum: 0, wsum: 0 };
    if (e.kind === 'floor') { b.lo = Math.max(b.lo, e.v); if (b.hi < b.lo + 0.2) b.hi = Infinity; }
    else if (e.kind === 'ceil') { b.hi = Math.min(b.hi, e.v); if (b.lo > b.hi - 0.2) b.lo = -Infinity; }
    else { b.sum += e.w * e.d; b.wsum += e.w; if (e.d < b.lo) b.lo = e.d - 0.1; if (e.d > b.hi) b.hi = e.d + 0.1; }
    map.set(e.key, b);
  }
  return map;
}

const hasTights = (ids, byId) => (ids || []).some(id => isTights(byId.get(id)));

/** Turn the outfit diary and the quick votes into a scoring model. wears: diary records; items: the closet; votes: 👍 / 👎 with optional reasons. */
export function learnFromWears(wears = [], items = [], votes = []) {
  const byId = new Map(items.map(i => [i.id, i]));
  const m = { pair: new Map(), item: new Map(), shape: new Map(), colour: new Map(), colourFam: new Map(), colourCap: [],
    warmth: [], dress: new Map(), slotDress: new Map(), recent: new Set(), lastWorn: new Map(), wears: [] };
  const ev = { warmth: [], dress: [], slot: [] };
  const now = Date.now();
  for (const w of wears) {
    const pieces = (w.pieceIds || []).map(id => byId.get(id)).filter(Boolean);
    if (!pieces.length) continue;
    const userTags = w.tags || [], aiTags = w.ai?.tags || [];
    const aiScore = typeof w.ai?.score === 'number' ? (w.ai.score - 5.5) / 4.5 : 0;       // roughly −1…+1, never shown
    const overall = (WEAR_FEELS.find(f => f.id === w.feel)?.w || 0)
      + userTags.reduce((s, t) => s + tagWeight(t), 0)
      + 0.5 * (aiScore + aiTags.reduce((s, t) => s + tagWeight(t), 0));
    // it went wrong only because it was too cold or too dressy that day: the pairing itself is barely to blame
    const userBad = userTags.filter(t => BAD_TAGS.has(t));
    const pairW = (overall < 0 && userBad.length && userBad.every(t => ['warmth', 'dress'].includes(REASONS[t]?.kind)) ? overall * 0.3 : overall) * fade(w.wornAt);
    const recent = now - (w.wornAt || 0) < RECENT_MS;
    pieces.forEach(p => { if ((w.wornAt || 0) > (m.lastWorn.get(p.id) || 0)) m.lastWorn.set(p.id, w.wornAt || 0); });
    for (let i = 0; i < pieces.length; i++) {
      addTo(m.item, pieces[i].id, pairW / pieces.length);
      for (let j = i + 1; j < pieces.length; j++) {
        const k = pairKey(pieces[i].id, pieces[j].id);
        addTo(m.pair, k, pairW);
        if (recent) m.recent.add(k);
      }
    }
    const ctx = { pieces, at: w.wornAt, occ: 'occasion' in w ? (w.occasion || '') : null, tights: hasTights(w.itemIds, byId), blamed: new Set() };
    userTags.forEach(t => absorbReason(m, ev, t, ctx, 1));
    aiTags.forEach(t => absorbReason(m, ev, t, ctx, 0.5));
    m.wears.push({ w, pieces, overall });
  }
  for (const v of votes) {
    const pieces = (v.pieceIds || []).map(id => byId.get(id)).filter(Boolean);
    if (pieces.length < 2 || !v.vote) continue;
    const ids = new Set(pieces.map(p => p.id)), w = fade(v.at);
    const ctx = { pieces, at: v.at, occ: v.occasion ?? null, tights: hasTights(v.itemIds, byId), blamed: new Set((v.off || []).filter(id => ids.has(id))) };
    const tags = [...new Set(v.tags || [])].filter(t => REASONS[t]);
    const explained = tags.map(t => absorbReason(m, ev, t, ctx, 1));
    if (v.vote > 0) {
      addCombo(m, pieces, 0.9 * w * (tags.includes('Very me') ? 1.5 : 1));
      if (ctx.occ && !tags.includes('Right for the occasion')) ev.dress.push({ at: v.at, key: ctx.occ, kind: 'ok', d: dressLevel(pieces), w: 0.4 * w });
      continue;
    }
    // a dislike counts against the combination unless every reason given explains it another way
    const negative = tags.map(t => COMPLAINTS.has(t));
    if (!negative.some(Boolean) || negative.some((n, i) => n && !explained[i])) addCombo(m, pieces, -1.4 * w, ctx.blamed);
    if (tags.includes('Not my style')) ctx.blamed.forEach(id => addTo(m.item, id, -0.6 * w));
  }
  m.warmth = resolveWarmth(ev.warmth);
  m.dress = resolveBands(ev.dress);
  m.slotDress = resolveBands(ev.slot);
  m.wears.sort((a, b) => (b.w.wornAt || 0) - (a.w.wornAt || 0));
  return m;
}

let LEARN = null;   // set for the duration of buildLooks
let JIT = 1;        // how much randomness pickBest adds: 0 = the single best choice, higher = more variety
let WARM = false;
let CORE_IDS = new Set();
let SHOWN = new Map();    // Restyle: piece id → how many looks already shown used it (core pieces excluded)
let OCC = '';             // the occasion of the looks being built
let CNOW = coldnessAt();  // how cold it is, 0 … 1 (see coldnessAt); set again by every buildLooks
let TIGHTS = false;       // tights picked under Finishing touches

/** Restyle: a piece already shown is pushed back — more for the main clothes than for the coat or shoes, so a new look really is new. */
function shownPenalty(c) {
  const n = SHOWN.get(c?.id) || 0; if (!n) return 0;
  return n * (['outer', 'shoes'].includes(slotOf(c)) ? 0.7 : 1.6);
}

/** Like a person skipping what they wore a day or two ago: pieces worn very recently are pushed back (not the chosen core). */
function rotation(c) {
  if (!LEARN || !c || CORE_IDS.has(c.id)) return 0;
  const t = LEARN.lastWorn.get(c.id); if (!t) return 0;
  const days = (Date.now() - t) / 864e5;
  return days < 2.5 ? -2 : days < 5 ? -0.8 : 0;
}

function learnedPair(a, b) {
  if (!LEARN || !a || !b) return 0;
  const k = pairKey(a.id, b.id);
  let s = clampAbs(LEARN.pair.get(k) || 0, 4);
  if (LEARN.recent.has(k)) s -= 1.2;                                       // worn together a few days ago: vary it
  const top = slotOf(a) === 'top' ? a : slotOf(b) === 'top' ? b : null;
  const bottom = slotOf(a) === 'bottom' ? a : slotOf(b) === 'bottom' ? b : null;
  if (top && bottom) s += clampAbs(LEARN.shape.get(`${top.silhouette}|${bottom.silhouette}`) || 0, 3);
  const ca = lc(a.color?.name), cb = lc(b.color?.name);
  if (ca && cb && ca !== cb) s += clampAbs(LEARN.colour.get(pairKey(ca, cb)) || 0, 3);
  const fa = familyOf(a), fb = familyOf(b);
  if (fa && fb) s += clampAbs(LEARN.colourFam.get(pairKey(fa, fb)) || 0, 1.5);
  return s;
}
function learnedItem(c) { return LEARN && c ? clampAbs(LEARN.item.get(c.id) || 0, 2) + slotDressFit(c) : 0; }

/** "Those sneakers are too casual for work": shoes for work have to be dressier than that, other occasions are untouched. */
function slotDressFit(c) {
  const b = LEARN?.slotDress?.get(`${OCC}|${slotOf(c)}`); if (!b) return 0;
  const d = dressinessOf(c);
  return -(Math.max(0, b.lo - d) + Math.max(0, d - b.hi)) * 2;
}
/** How much a warmth limit counts today: a "too thin" holds fully in the same or colder weather and fades as it gets milder; a "too bulky" the other way round. */
function seasonWeight(k) {
  const d = k.kind === 'floor' ? k.c - CNOW : CNOW - k.c;
  return Math.max(0, Math.min(1, 1 - d / 0.3));
}
function learnedWarmth(part, val) {
  let pen = 0;
  for (const k of LEARN?.warmth || []) {
    if (k.part !== part || val == null) continue;
    const s = seasonWeight(k); if (!s) continue;
    const gap = k.kind === 'floor' ? k.v - val : val - k.v;
    if (gap > 0) pen += gap * 3.5 * s * k.w;
  }
  return Math.min(5, pen);
}
/** The default band for the time of year, moved wherever what they taught disagrees with it. */
function warmthBand(lo, hi, part = null) {
  for (const k of LEARN?.warmth || []) {
    if ((part && k.part !== part) || seasonWeight(k) < 0.5) continue;
    if (k.kind === 'ceil') lo = Math.min(lo, k.v - 0.1); else hi = Math.max(hi, k.v + 0.1);
  }
  return [lo, hi];
}
/* What a person reaches for at each time of year, for the top half and for the legs on their own (a warm knit does not make
   linen trousers right for November): floor = a + b·cold, ceiling = c + d·cold. In deep winter a sweater or two layers on top,
   jeans or wool on the legs; in high summer nothing heavier than a light knit or jeans. */
const DEFAULT_WARMTH = { torso: [0.6, 1.5, 2.2, 1.8], legs: [0.4, 1.4, 1.8, 1.2], feet: [0.2, 1.0, 2.0, 1.0] };
const DEFAULT_WEIGHT = { torso: 1.2, legs: 1.2, feet: 0.6 };
const PARTS = ['torso', 'legs', 'feet', 'outer'];
function defaultMiss(part, val) {
  if (!DEFAULT_WARMTH[part] || val == null) return 0;
  const [a, b, c, d] = DEFAULT_WARMTH[part];
  const [F, G] = warmthBand(a + b * CNOW, c + d * CNOW, part);
  return Math.max(0, F - val) + Math.max(0, val - G);
}
/** Whole outfit: each part warm enough for the time of year (but not too warm), and within every limit they taught.
    For the default, a skirt or dress in the cold is assumed to be worn with tights, as most people would. */
function warmthScore(pieces) {
  const p = warmthParts(pieces, TIGHTS), worn = CNOW >= 0.5 && !TIGHTS ? warmthParts(pieces, true) : p;
  let s = 0;
  for (const part of PARTS) if (p[part] != null) s -= defaultMiss(part, worn[part]) * (DEFAULT_WEIGHT[part] || 0) + learnedWarmth(part, p[part]);
  return s;
}
/** The same for one part while picking pieces: a bottom on its own, or the stack of tops so far. */
function partFit(part, pieces) {
  const p = warmthParts(pieces, TIGHTS)[part];
  if (p == null) return 0;
  const worn = CNOW >= 0.5 && !TIGHTS ? warmthParts(pieces, true)[part] : p;
  return -(learnedWarmth(part, p) + defaultMiss(part, worn) * (DEFAULT_WEIGHT[part] || 0) * 0.7);
}
function dressBandPenalty(mean) {
  const b = LEARN?.dress?.get(OCC); if (!b) return 0;
  return -(Math.max(0, b.lo - mean) + Math.max(0, mean - b.hi)) * 2;
}
function colourCapPenalty(pieces) {
  const caps = LEARN?.colourCap; if (!caps?.length) return 0;
  const n = colourCount(pieces);
  return -Math.min(3, caps.reduce((t, c) => t + Math.max(0, n - c.cap) * 1.2 * c.w, 0));
}

/* ---------- Look building ---------- */

const CLOTHING_SLOTS = new Set(['top', 'bottom', 'dress', 'outer', 'shoes']);

function emptyOutfit() { return { top: [], bottom: null, dress: null, outer: null, shoes: null, jewelry: [], warnings: [] }; }

function placeCore(outfit, item) {
  const slot = categoryById(item.category)?.slot;
  if (slot === 'top') {
    const st = orderStack([...outfit.top, item]);
    if (st.ok) outfit.top = st.tops; else outfit.warnings.push(st.reason);
  }
  else if (slot === 'bottom' || slot === 'dress' || slot === 'outer' || slot === 'shoes') { if (!outfit[slot]) outfit[slot] = item; }
}

function outfitPieces(o) {
  return [...o.top, o.bottom, o.dress, o.outer, o.shoes].filter(Boolean);
}

/** The second look avoids the first look's pieces — but the same coat or shoes is how people really dress, so those only count a little. */
const REUSED = new Set(['outer', 'shoes']);
function pickBest(cands, scoreFn, avoid, jitter = 0.5) {
  let best = null, bs = -Infinity;
  for (const c of cands) {
    let s = scoreFn(c) + learnedItem(c) + rotation(c) - shownPenalty(c) + Math.random() * jitter * JIT;
    if (avoid.has(c.id)) s -= REUSED.has(slotOf(c)) ? 2 : 6;
    if (s > bs) { bs = s; best = c; }
  }
  return best;
}

/** Pick a random but sensible core: a dress, or top + bottom. */
export function pickSurpriseCore(items) {
  const by = c => items.filter(i => i.category === c);
  const dresses = by('dresses'), tops = by('tops'), bottoms = by('bottoms');
  const options = [];
  if (dresses.length) options.push('dress');
  if (tops.length && bottoms.length) options.push('pair');
  if (!options.length) {
    const any = [...tops, ...bottoms, ...dresses, ...by('outerwear')];
    return any.length ? [any[Math.floor(Math.random() * any.length)].id] : [];
  }
  const choice = options[Math.floor(Math.random() * options.length)];
  const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
  if (choice === 'dress') return [rnd(dresses).id];
  // choose a pair with decent proportions rather than a pure coin flip
  const mood = interpretMood();
  let best = null, bs = -Infinity;
  for (let n = 0; n < 12; n++) {
    const t = rnd(tops), b = rnd(bottoms);
    const s = proportionScore(t, b, 'classic') + pairScore(t, b, mood, 'classic') + partFit('legs', [b]) + 0.5 * partFit('torso', [t]) + Math.random();
    if (s > bs) { bs = s; best = [t.id, b.id]; }
  }
  return best;
}

/** Cold months (October–April) favour knitwear and an extra layer. Set per buildLooks call. */
let COLD = false;

/** When the stylist picks the main top itself: in the cold months reach for a sleeved knit, ideally a warm fabric. */
function mainTopBonus(t) {
  if (!COLD) return 0;
  const lvl = layerLevel(t);
  return (lvl === 1 && !isSleeveless(t) ? 1.2 : 0) + (fabricInfo(t.fabric)?.warmth === 'warm' ? 0.5 : 0);
}

/* ---------- Jewelry ---------- */
const JEWEL_KINDS = [['Earrings', /earring|\bstuds?\b|hoops?\b/i], ['Necklace', /necklace|pendant|chain|pearls?\b/i],
  ['Bracelet / Watch', /bracelet|watch|bangle|cuff/i], ['Ring', /\brings?\b/i]];
function jewelKind(i) {
  if (JEWEL_KINDS.some(([k]) => k === i.subtype)) return i.subtype;
  if (/scarf|bag/i.test(i.subtype || '')) return null;
  const s = `${i.subtype || ''} ${i.name || ''}`;
  return JEWEL_KINDS.find(([, re]) => re.test(s))?.[0] || null;
}
function metalOf(i) {
  const s = lc(`${i.name || ''} ${i.color?.name || ''} ${i.fabric || ''}`);
  if (/silver|white gold|steel|platinum|chrome/.test(s)) return 'silver';
  if (/gold|brass|bronze/.test(s)) return 'gold';
  return '';
}

/** One or two pieces from the closet: earrings first, then a necklace (not with a high neck) or a bracelet — same metal. */
function pickJewelry(o, items, mood, intent, avoid) {
  const neck = o.dress || o.top[0];
  const high = isHighNeck(neck);
  const anchor = o.top[o.top.length - 1] || o.dress || o.bottom;
  const cands = items.filter(i => i.category === 'jewelry' && jewelKind(i) && !(high && jewelKind(i) === 'Necklace'));
  if (!cands.length) return [];
  const base = j => vibeScore(j, mood) + (anchor ? harmony(j.color?.hex, anchor.color?.hex) * 0.5 : 0);
  const kindPref = { Earrings: 1, Necklace: intent === 'classic' ? 0.6 : 0.8, 'Bracelet / Watch': 0.4, Ring: 0.2 };
  const first = pickBest(cands, j => base(j) + kindPref[jewelKind(j)], avoid, 0.8);
  if (!first) return [];
  const m = metalOf(first), unmatched = /Effortless/.test(mood.key);
  const second = pickBest(cands.filter(j => jewelKind(j) !== jewelKind(first) && (unmatched || !m || !metalOf(j) || metalOf(j) === m)),
    j => base(j), avoid, 0.8);
  return second ? [first, second] : [first];
}

function completeOutfit(core, items, mood, intent, avoid) {
  const o = emptyOutfit();
  core.forEach(c => placeCore(o, c));
  const pool = slot => items.filter(i => categoryById(i.category)?.slot === slot);
  const hasCoreIds = new Set(core.map(c => c.id));
  const notCore = arr => arr.filter(i => !hasCoreIds.has(i.id));

  if (!o.dress) {
    if (o.top.length && !o.bottom) {
      o.bottom = pickBest(notCore(pool('bottom')), b => proportionScore(o.top[0], b, intent) * 1.3 + pairScore(o.top[0], b, mood, intent) + partFit('legs', [b]), avoid);
    } else if (o.bottom && !o.top.length) {
      const t = pickBest(notCore(pool('top')), t => proportionScore(t, o.bottom, intent) * 1.3 + pairScore(t, o.bottom, mood, intent) + mainTopBonus(t) + 0.5 * partFit('torso', [t]), avoid);
      if (t) o.top.push(t);
    } else if (!o.top.length && !o.bottom) {
      const dresses = pool('dress'), tops = pool('top'), bottoms = pool('bottom');
      const dressFit = d => vibeScore(d, mood) + 0.5 * (partFit('torso', [d]) + partFit('legs', [d]));
      if (dresses.length && (!(tops.length && bottoms.length) || intent === 'editorial')) {
        o.dress = pickBest(dresses, dressFit, avoid);
      } else if (tops.length && bottoms.length) {
        const pair = pickSurpriseCore(items.filter(i => ['tops', 'bottoms'].includes(i.category)));
        pair.forEach(id => placeCore(o, items.find(i => i.id === id)));
      } else if (dresses.length) {
        o.dress = pickBest(dresses, dressFit, avoid);
      }
    }
  }

  const base = o.dress || o.bottom || o.top[0];
  const anchor = o.bottom || o.dress || o.top[0];

  // Layering: a blouse under a knit, a knit or cardigan over a blouse, or blouse → thin sweater → cardigan.
  // The classic look adds one layer in the cold months (or over a sleeveless base); the editorial one goes up to three.
  if (!o.dress && o.top.length && o.bottom) {
    const torsoFit = tops => partFit('torso', tops);
    const needLayer = torsoFit(o.top) < -0.5;                    // too thin on its own for the time of year, or for what they taught
    const maxTops = intent === 'editorial' ? (COLD ? 3 : 2) : (COLD || needLayer || isSleeveless(o.top[0]) ? 2 : 1);
    while (o.top.length < maxTops) {
      const visible = o.top[o.top.length - 1];
      const layer = pickBest(
        notCore(pool('top')).filter(t => !o.top.some(x => x.id === t.id) && orderStack([...o.top, t]).ok),
        t => pairScore(t, visible, mood, intent) + o.top.reduce((n, x) => n + layerPair(x, t).penalty, 0)
          + (COLD && fabricInfo(t.fabric)?.warmth === 'warm' ? 0.6 : 0)
          + (intent === 'editorial' && (t.silhouette === 'Relaxed' || t.silhouette === 'Voluminous') ? 0.8 : 0)
          + torsoFit([...o.top, t]),
        avoid, 0.8
      );
      if (!layer || torsoFit([...o.top, layer]) < torsoFit(o.top) - 1) break;   // every layer would be too bulky for them: stop here
      o.top = orderStack([...o.top, layer]).tops;
    }
  }

  if (!o.outer && pool('outer').length && base) {
    const under = o.dress ? [o.dress] : o.top;
    o.outer = pickBest(pool('outer'), c => pairScore(c, anchor, mood, intent) + outerLayerPenalty(under, c) + (intent === 'classic' && c.silhouette === 'Relaxed' ? 0.5 : 0) + partFit('outer', [c]), avoid, 0.7);
    if (o.outer && outerLayerPenalty(under, o.outer) <= -8) o.outer = null;   // would not sit over what is underneath: skip it
  }
  if (!o.shoes && pool('shoes').length && base) {
    o.shoes = pickBest(pool('shoes'), s => harmony(s.color?.hex, anchor.color?.hex) + (intent === 'classic' && s.contrast === 'Dark' ? 1 : 0) + vibeScore(s, mood) + learnedPair(s, anchor) + partFit('feet', [s]), avoid, 0.7);
  }
  o.jewelry = pickJewelry(o, items, mood, intent, avoid);
  return o;
}

/* ---------- Styling notes ---------- */

const PERFUME_TIES = {
  'Citrus':       { tex: 'crisp cotton and linen',                          mood: 'bright citrus keeps a look sharp and daytime-easy' },
  'Fresh':        { tex: 'crisp cotton and lightweight knits',              mood: 'a clean, airy scent keeps a polished outfit feeling light and modern' },
  'Aquatic':      { tex: 'light cotton and breezy linen',                   mood: 'a watery, airy scent suits relaxed, pared-back pieces' },
  'Green':        { tex: 'natural cotton and linen',                        mood: 'crushed-leaf freshness feels quietly outdoorsy and unfussy' },
  'Aromatic':     { tex: 'crisp shirting and fine knits',                   mood: 'lavender-and-herb aromatics feel clean and composed' },
  'Herbal':       { tex: 'natural linen and cotton',                        mood: 'herbal notes feel calm, grounded and natural' },
  'Fruity':       { tex: 'soft jersey and light knits',                     mood: 'a juicy fruity scent adds playfulness to simple pieces' },
  'Floral':       { tex: 'fluid, soft fabrics like silk or fine jersey',    mood: 'a floral adds the romance a minimal palette leaves out' },
  'White Floral': { tex: 'silk, satin and fluid drape',                     mood: 'creamy white flowers feel lush and evening-ready' },
  'Rose':         { tex: 'silk, fine knits and soft tailoring',             mood: 'rose reads classic and feminine without trying too hard' },
  'Powdery':      { tex: 'cashmere and soft, matte knits',                  mood: 'a powdery, soft-focus scent feels gentle and refined' },
  'Iris':         { tex: 'cashmere and clean tailoring',                    mood: 'cool, buttery iris is the scent of quiet luxury' },
  'Sweet':        { tex: 'soft knits and cosy textures',                    mood: 'a sweet scent feels warm and approachable' },
  'Vanilla':      { tex: 'the softness of cashmere and brushed knits',      mood: 'vanilla wraps a cosy outfit in warmth' },
  'Gourmand':     { tex: 'chunky knits and soft wool',                      mood: 'an edible, gourmand scent makes cosy layers feel even cosier' },
  'Honey':        { tex: 'warm wool and suede',                             mood: 'golden honey adds a rich, sunny warmth' },
  'Warm Spicy':   { tex: 'the warmth of wool, cashmere and brushed knits',  mood: 'amber and spice make cosy textures feel intimate' },
  'Fresh Spicy':  { tex: 'crisp shirting and tailoring',                    mood: 'peppery, fresh spice adds snap to a clean outfit' },
  'Amber':        { tex: 'wool, velvet and cashmere',                       mood: 'resinous amber gives a look depth and glow' },
  'Balsamic':     { tex: 'velvet, wool and deep-toned knits',               mood: 'balsamic resins feel warm, deep and enveloping' },
  'Woody':        { tex: 'structured tailoring and smooth leather',         mood: 'dry woods give clean lines depth and quiet authority' },
  'Oud':          { tex: 'leather, velvet and dark tailoring',              mood: 'oud is dense and dramatic — let it carry an evening look' },
  'Leather':      { tex: 'leather, suede and sharp tailoring',              mood: 'a leathery scent echoes edgy, structured pieces' },
  'Musky':        { tex: 'soft cotton and second-skin knits',               mood: 'clean musk feels like your skin, only better' },
  'Earthy':       { tex: 'raw linen, suede and textured wool',              mood: 'earthy patchouli and roots ground a look' },
  'Smoky':        { tex: 'leather, dark wool and velvet',                   mood: 'incense and smoke add mystery to a dark palette' },
  'Mossy':        { tex: 'tweed and textured wool',                         mood: 'mossy notes feel vintage and quietly elegant' },
  'Chypre':       { tex: 'tailoring, silk blouses and polished leather',    mood: 'a chypre is classic, polished and grown-up' },
  'Fougère':      { tex: 'crisp shirting and fine wool',                    mood: 'a fougère feels clean-shaven, crisp and classic' },
  'Ozonic':       { tex: 'crisp cotton and airy linen',                     mood: 'an ozonic, fresh-air scent keeps a look light and open' },
  'Salty':        { tex: 'washed linen and relaxed cotton',                 mood: 'a salty, sea-skin scent feels sunny and undone' },
  'Lavender':     { tex: 'crisp shirting and soft knits',                   mood: 'lavender feels clean, calm and gently classic' },
  'Cherry':       { tex: 'soft knits and glossy fabrics',                   mood: 'a dark, juicy cherry adds a playful, flirty edge' },
  'Tropical':     { tex: 'light cotton and breezy linen',                   mood: 'tropical fruit feels sunny and holiday-easy' },
  'Coconut':      { tex: 'soft jersey and light linen',                     mood: 'creamy coconut feels warm, sunny and relaxed' },
  'Tuberose':     { tex: 'silk, satin and velvet',                          mood: 'tuberose is lush and heady — a scent for an evening look' },
  'Yellow Floral':{ tex: 'silk and fluid, sunny fabrics',                   mood: 'golden yellow flowers feel bright and radiant' },
  'Violet':       { tex: 'cashmere and soft, powdery knits',                mood: 'violet feels delicate, a little vintage and very soft' },
  'Aldehydic':    { tex: 'tailoring, silk blouses and fine knits',          mood: 'a sparkling aldehydic scent feels classic and polished, like old glamour' },
  'Soapy':        { tex: 'crisp white cotton and fresh shirting',           mood: 'a soapy, just-showered scent is the cleanest thing you can wear' },
  'Caramel':      { tex: 'brushed knits and soft suede',                    mood: 'burnt-sugar caramel makes cosy layers feel warm and indulgent' },
  'Pistachio':    { tex: 'soft cashmere and creamy knits',                  mood: 'nutty, creamy pistachio is cosy without being too sweet' },
  'Almond':       { tex: 'soft knits and smooth cotton',                    mood: 'soft almond feels comforting and gently sweet' },
  'Nutty':        { tex: 'warm wool and soft suede',                        mood: 'roasted nutty notes feel warm and grounded' },
  'Lactonic':     { tex: 'cashmere and soft, matte knits',                  mood: 'a milky, lactonic scent feels soft, calm and skin-close' },
  'Cacao':        { tex: 'velvet, chunky knits and dark wool',              mood: 'dark cacao is rich and cosy with a grown-up edge' },
  'Coffee':       { tex: 'wool, suede and darker tones',                    mood: 'roasted coffee feels warm, awake and a little dark' },
  'Rum':          { tex: 'velvet and warm, deep-toned knits',               mood: 'boozy rum adds a warm, after-dark richness' },
  'Soft Spicy':   { tex: 'cashmere and brushed knits',                      mood: 'a soft, rounded spice feels warm without being loud' },
  'Cinnamon':     { tex: 'chunky knits and warm wool',                      mood: 'cinnamon feels warm, festive and cosy' },
  'Tobacco':      { tex: 'tweed, suede and leather',                        mood: 'sweet tobacco feels warm, confident and a bit vintage' },
  'Patchouli':    { tex: 'velvet, suede and earthy textures',               mood: 'patchouli is earthy and deep — a little bohemian, a little dark' },
  'Animalic':     { tex: 'leather, velvet and silk',                        mood: 'an animalic scent is sensual and skin-warm — wear it close' }
};

function nm(i) { return i ? i.name : ''; }
function lc(s) { return (s || '').toLowerCase(); }

function proportionNote(o, intent) {
  const tops = o.top, bottom = o.bottom, dress = o.dress;
  // the piece that meets the waistband: the outermost top that is not an open cardigan or blazer
  const top = [...tops].reverse().find(t => layerLevel(t) < 2) || tops[tops.length - 1];
  const lines = [];
  if (dress) {
    lines.push(dress.silhouette === 'Fitted'
      ? `${nm(dress)} already skims the body, so keep everything else simple and let your 70 cm waist stay the focal point.`
      : `${nm(dress)} has ease through the body — define the waist (a belt, or a small gather of fabric at the back) so the shape reads intentional rather than shapeless.`);
  } else if (top && bottom) {
    const t = top.silhouette, b = bottom.silhouette;
    if (b === 'Voluminous' && t === 'Fitted')
      lines.push(`Tuck ${nm(top)} in fully so the fitted line meets the waist, then let ${nm(bottom)} fall in its volume — fitted on top, full below is the most flattering balance on your frame.`);
    else if (b === 'Voluminous')
      lines.push(`${nm(bottom)} carries a lot of volume, so keep ${nm(top)} neat: tuck the front and pull the sides taut, or fold the hem once to stop the top from adding bulk.`);
    else if (b === 'Fitted' && t !== 'Fitted')
      lines.push(`Do a loose half-tuck of ${nm(top)} — front only — over the fitted ${lc(nm(bottom))}, so the waist is hinted at and the top keeps its ease.`);
    else if (b === 'Relaxed' && t === 'Fitted')
      lines.push(`Fully tuck ${nm(top)} into ${nm(bottom)} to show the waist and keep the long line from the hip down; the relaxed leg does the rest.`);
    else
      lines.push(intent === 'editorial'
        ? `Both pieces are relaxed, so create a point of definition: a deliberate half-tuck, rolled cuffs or sleeves pushed to the elbow.`
        : `Tuck ${nm(top)} just at the centre front to mark the waist without losing the ease of ${lc(nm(bottom))}.`);
  } else if (top) {
    lines.push(`Build around ${nm(top)}: keep the lower half slim or tonal so the piece stays the focus.`);
  } else if (bottom) {
    lines.push(`Build around ${nm(bottom)}: a fitted or neatly tucked top keeps the proportions clean.`);
  }
  if (tops.length > 1) lines.push(layeringLine(tops));
  return lines.join(' ');
}

function layeringLine(tops) {
  const inner = tops[0], outer = tops[tops.length - 1];
  const lvl = layerLevel(outer);
  if (tops.length === 3)
    return `Build it in three: ${nm(inner)} as the base with the collar and cuffs pulled out, ${nm(tops[1])} over it, then ${nm(outer)} worn open on top.`;
  if (lvl === 2) return `Wear ${nm(outer)} open or loosely buttoned over ${nm(inner)}, so the piece underneath still shows at the neckline.`;
  if (lvl === 3) return `Put ${nm(outer)} over ${nm(inner)} and push the sleeves up a little so the layer underneath peeks out.`;
  if (isSleeveless(outer)) return `${nm(outer)} goes over ${nm(inner)} — the sleeves and collar of the base piece do the work.`;
  return `Wear ${nm(inner)} under ${nm(outer)} and let the collar and cuffs peek out at the neck and wrists.`;
}

function contrastNote(o) {
  const a = o.dress || o.top[0], b = o.bottom;
  if (a && b) {
    const gap = contrastGap(a, b);
    if (gap === 2) return `${a.contrast} ${lc(nm(a))} against ${b.contrast.toLowerCase()} ${lc(nm(b))} gives a crisp light-to-dark balance.`;
    if (gap === 1) return `${a.contrast}-to-${b.contrast.toLowerCase()} contrast keeps the look balanced without feeling heavy.`;
    return `Both pieces sit in the ${a.contrast.toLowerCase()} range, so the outfit reads tonal and seamless — lift it with texture and one contrasting accessory.`;
  }
  return '';
}

function fabricNote(o) {
  const fp = outfitPieces(o).map(i => ({ i, f: fabricInfo(i.fabric) })).filter(x => x.f);
  if (!fp.length) return '';
  const shiny = fp.filter(x => x.f.sheen === 'shiny'), matte = fp.filter(x => x.f.sheen === 'matte');
  const lines = [];
  if (shiny.length >= 2) lines.push(`${shiny.map(x => `${nm(x.i)} (${lc(x.f.label)})`).join(' and ')} both catch the light — let one lead and keep the other quiet, or break them up with something matte.`);
  else if (shiny.length === 1) {
    const s = shiny[0];
    lines.push(`${nm(s.i)} is ${lc(s.f.label)} — ${s.f.note}. ${matte.length ? `Its sheen reads richer against the matte ${[...new Set(matte.slice(0, 2).map(x => lc(x.f.label)))].join(' and ')}.` : 'Keep everything else matte so it stays the focus.'}`);
  } else if (matte.length >= 2) {
    lines.push(`Everything here is matte (${[...new Set(matte.map(x => lc(x.f.label)))].join(', ')}), so texture does the work. One touch of sheen — silk, satin or leather — would lift it.`);
  }
  const heavy = fp.filter(x => thicknessOf(x.i) === 3);
  if (heavy.length) lines.push(`${heavy.map(x => nm(x.i)).join(' and ')} ${heavy.length > 1 ? 'are' : 'is'} the thick piece${heavy.length > 1 ? 's' : ''} — keep the rest of the layers thin so the look does not feel heavy.`);
  return lines.join(' ');
}

function layerNote(o, mood) {
  if (!o.outer) return '';
  return `Finish with ${nm(o.outer)}: ${o.outer.silhouette === 'Relaxed' || o.outer.silhouette === 'Voluminous' ? 'worn open, collar slightly turned, so the volume frames the outfit rather than swallowing it' : 'buttoned or belted to stay close to the waist'}. It keeps you warm without breaking the ${mood.key.toLowerCase()} line.`;
}

function perfumeNote(finish, o, mood, intent) {
  const p = finish.perfume;
  const pieces = outfitPieces(o);
  const fabric = pieces.find(i => i.fabric)?.fabric;
  if (p) {
    const sc = scentsOf(p);
    const tie = PERFUME_TIES[sc[0]] || PERFUME_TIES['Fresh'];
    const fits = perfumeMoodsOf(p).filter(m => mood.perfume.includes(m)).map(lc);
    const why = finish.perfumeAuto ? ` Picked from your shelf${fits.length ? ` because it feels ${listText(fits)}, like today's mood` : ''}.` : '';
    return `${nm(p)}${sc.length ? ` (${sc.slice(0, 3).join(', ').toLowerCase()})` : ''} — ${tie.mood}. It echoes ${fabric ? fabricText(fabric) : tie.tex} here; spray on the pulse points and behind the knees, not on the knit, so the fibres stay clean.${why}`;
  }
  const pick = intent === 'classic' ? 'Woody' : 'Fresh';
  const tie = PERFUME_TIES[pick];
  return `If you reach for perfume, try something ${pick.toLowerCase()} — ${tie.mood}.`;
}

const WARM_ACCORDS = /Vanilla|Amber|Oud|Warm Spicy|Soft Spicy|Cinnamon|Balsamic|Tobacco|Caramel|Cacao|Coffee|Rum|Gourmand|Smoky|Leather|Patchouli|Pistachio|Honey/;
const LIGHT_ACCORDS = /Citrus|Fresh$|Aquatic|Ozonic|Salty|Green|Tropical|Coconut|Herbal/;

/** A perfume from the closet that suits the mood (its own moods, or ones read from its accords) and the season. */
function pickPerfume(items, mood, avoid) {
  const cands = items.filter(i => i.category === 'perfume');
  if (!cands.length) return null;
  return pickBest(cands, p => {
    const feels = perfumeMoodsOf(p), acc = scentsOf(p);
    const fit = mood.perfume.reduce((n, m, idx) => n + (feels.includes(m) ? 2 - idx * 0.3 : 0), 0);
    const season = acc.filter(a => (COLD ? WARM_ACCORDS : LIGHT_ACCORDS).test(a)).length * 0.4;
    return fit + Math.min(season, 1.2);
  }, avoid, 0.5);
}

function beltNote(finish, o, intent) {
  const b = finish.belt;
  if (b) return `Wear ${nm(b)} at your natural waist (around 70 cm) ${o.top.length && !o.dress ? 'over the tucked top' : 'over the dress or knit'} — ${intent === 'classic' ? 'snug, centred and exact' : 'a little lower and looser for an undone line'}.`;
  return intent === 'classic'
    ? 'Optional: a slim belt at the natural waist would sharpen the line; the look also works without one.'
    : 'No belt needed — let the drape and the half-tuck define you.';
}

function jewelryNote(mood, o) {
  const js = o.jewelry || [];
  const neckItem = o.dress || o.top[0];
  const neck = neckItem?.subtype || '';
  if (js.length) {
    const m = metalOf(js[0]);
    let t = js.length > 1
      ? `${listText(js.map(nm))}${m && js.every(j => metalOf(j) === m) ? ` — all ${m}, so they read as a set` : ' — one is the focal piece, the other stays quiet'}.`
      : `${nm(js[0])} as the single accent; keep every other metal quiet.`;
    if (isHighNeck(neckItem)) t += ' With a high neckline, skip the necklace.';
    else if (js.some(j => jewelKind(j) === 'Necklace') && /sweater|knit|cardigan/i.test(neck)) t += ' Wear the necklace over the knit, not tucked under it.';
    return t;
  }
  return `${mood.jewelry.charAt(0).toUpperCase() + mood.jewelry.slice(1)}${/sweater|knit/i.test(neck) ? '. Keep pieces short so they sit above a knit neckline' : ''}.`;
}

function hairNote(finish, mood, intent) {
  const h = finish.hair;
  const style = mood.hair[intent === 'classic' ? 0 : 1];
  if (h) return `Wear ${nm(h)} with ${style}.`;
  return `${style.charAt(0).toUpperCase() + style.slice(1)}.`;
}

function nailsNote(finish, mood, intent) {
  const n = finish.nails;
  if (n) return `${nm(n)} on short, tidy nails — it ties back to the ${n.color?.name ? n.color.name.toLowerCase() : 'palette'} of the look.`;
  return `${mood.nails.charAt(0).toUpperCase() + mood.nails.slice(1)}.`;
}

function makeupNote(finish, mood) {
  const m = finish.makeup;
  if (m) return `${nm(m)} as the focus — keep everything else soft so it reads deliberate.`;
  return `${mood.makeup.charAt(0).toUpperCase() + mood.makeup.slice(1)}.`;
}

function agoText(ts) {
  const d = Math.floor((Date.now() - (ts || 0)) / 864e5);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d} days ago`;
  if (d < 30) { const wk = Math.round(d / 7); return `${wk} week${wk > 1 ? 's' : ''} ago`; }
  return 'on ' + new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
function listText(names) { return names.length <= 1 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]; }

/** Recall the most recent diary entry that shares at least two pieces with this look. */
function diaryNote(pieces) {
  if (!LEARN?.wears.length) return '';
  const ids = new Set(pieces.map(p => p.id));
  const hit = LEARN.wears.find(x => x.pieces.filter(p => ids.has(p.id)).length >= 2);
  if (!hit) return '';
  const shared = hit.pieces.filter(p => ids.has(p.id)).map(nm);
  const feel = { love: 'you loved it', fine: 'it felt fine', no: 'it did not feel right' }[hit.w.feel] || '';
  const tags = (hit.w.tags || []).slice(0, 2).map(lc);
  let t = `You wore the ${listText(shared)} together ${agoText(hit.w.wornAt)}${feel ? ` and ${feel}` : ''}${tags.length ? ` (${tags.join(', ')})` : ''}.`;
  const tip = hit.w.ai?.change?.[0];
  if (tip && hit.overall < 1.5) t += ` Advice from that day: ${tip}`;
  else if (hit.overall >= 1.5) t += ' A proven pairing for you.';
  return t;
}

function buildLookObject(title, tagline, outfit, finish, mood, intent, occasion = '') {
  const pieces = outfitPieces(outfit);
  const accessories = [...['legwear', 'belt'].map(k => finish[k]), ...(outfit.jewelry || []), ...['hair', 'nails', 'makeup', 'perfume'].map(k => finish[k])].filter(Boolean);
  const notes = [
    { label: 'From your outfit diary', text: diaryNote(pieces) },
    { label: 'Proportion & tuck', text: proportionNote(outfit, intent) },
    { label: 'Colour balance',    text: contrastNote(outfit) },
    { label: 'Fabric & texture',  text: fabricNote(outfit) },
    { label: 'Layering',          text: layerNote(outfit, mood) },
    { label: 'Legwear',           text: finish.legwear ? `${nm(finish.legwear)} links the shoes to the hem — keep it close to the ${finish.legwear.color?.name ? finish.legwear.color.name.toLowerCase() : 'palette'} of the look.` : '' },
    { label: 'Belt',              text: beltNote(finish, outfit, intent) },
    { label: 'Jewelry',           text: jewelryNote(mood, outfit) },
    { label: 'Hair',              text: hairNote(finish, mood, intent) },
    { label: 'Nails',             text: nailsNote(finish, mood, intent) },
    { label: 'Makeup',            text: makeupNote(finish, mood) },
    { label: 'Fragrance',         text: perfumeNote(finish, outfit, mood, intent) }
  ].filter(n => n.text);
  return {
    id: 'look-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title, tagline,
    mood: mood.key,
    occasion,
    itemIds: [...pieces, ...accessories].map(i => i.id),
    pieceIds: pieces.map(i => i.id),
    key: outfitKey(outfit),
    notes
  };
}

/* ---------- Thinking like a person getting dressed ----------
   1. Context first: the occasion (or the core piece) sets how dressy the outfit is, the season sets what is out.
   2. The core piece is the hero; its colours start the colour story.
   3. Everything else must fit that story and the same dressiness.
   4. Skip what was worn a day or two ago.
   5. Mirror check: build many complete outfits and judge each one as a whole, keeping the best. */

export const DRESSINESS = ['Lounge', 'Casual', 'Smart casual', 'Smart', 'Dressy'];
export const OCCASIONS = [
  { id: 'home',     label: 'Home & errands', target: 1.6 },
  { id: 'everyday', label: 'Everyday',       target: 2.5 },
  { id: 'work',     label: 'Work',           target: 3.4 },
  { id: 'dinner',   label: 'Dinner / date',  target: 3.8 },
  { id: 'event',    label: 'Event',          target: 4.6 }
];
const DRESS_BASE = {
  'Tee / Tank': 1.9, 'Sweater / Knit': 2.6, 'Sleeveless Sweater / Vest': 2.6, 'Turtleneck': 3, 'Blouse / Shirt': 3.2, 'Bodysuit': 2.6,
  'Corset / Bustier': 3.6, 'Cardigan': 2.5, 'Blazer / Jacket': 4,
  'Skirt': 3.1, 'Trousers': 3.5, 'Jeans': 2.2, 'Shorts': 1.5, 'Leggings': 1.2, 'Culottes': 3, 'Cargo / Utility': 1.6,
  'Mini': 3, 'Midi': 3.5, 'Maxi': 3.2, 'Slip': 4, 'Wrap': 3.5, 'Shirt dress': 3, 'Knit dress': 3,
  'Coat': 4, 'Trench': 3.8, 'Puffer': 1.8, 'Jacket': 2.6, 'Leather jacket': 2.6, 'Cape / Poncho': 3.4, 'Gilet': 2,
  'Boots': 3, 'Ankle boots': 3.1, 'Loafers': 3.4, 'Heels': 4.5, 'Flats': 3, 'Sneakers': 1.6, 'Sandals': 2.6, 'Mules': 3.4
};
const DRESS_FABRIC = { Satin: 1, Silk: 0.8, Velvet: 0.8, Lace: 0.6, 'Sequin / Metallic': 1.2, Chiffon: 0.5, Cashmere: 0.4, Tweed: 0.3,
  Denim: -0.3, Fleece: -1, 'Jersey / Knit': -0.3, Canvas: -0.4, Corduroy: -0.2, 'Padded / Down': -0.3, Acrylic: -0.2, Linen: -0.2 };
const DRESS_VIBE = { Evening: 0.8, Glam: 0.8, Office: 0.4, Elevated: 0.3, 'Old-Money': 0.3, Classic: 0.2,
  Casual: -0.5, Cozy: -0.4, Streetwear: -0.6, 'Sporty-Luxe': -0.4, Bohemian: -0.2 };
const DRESS_NAME = [[/\b(sweat|hoodie|jogger|track)/i, -1.2], [/\b(tailored|pleated|pencil|pressed)/i, 0.4], [/\b(oversized|ripped|distressed|graphic)/i, -0.5]];

/** 1 (lounge) … 5 (dressy), worked out from the type, fabric, vibe and name. */
export function defaultDressiness(item) { return Math.max(1, Math.min(5, Math.round(dressinessRaw(item)))); }
function dressinessRaw(item) {
  const cat = item?.category;
  let n = DRESS_BASE[item?.subtype] ?? ({ tops: 2.6, bottoms: 2.8, dresses: 3.3, outerwear: 3, shoes: 2.8 }[cat] ?? 3);
  const fi = fabricInfo(item?.fabric); if (fi) n += DRESS_FABRIC[fi.label] || 0;
  const vibes = item?.vibe || [];
  if (vibes.length) n += vibes.reduce((t, v) => t + (DRESS_VIBE[v] || 0), 0) / vibes.length;
  DRESS_NAME.forEach(([re, d]) => { if (re.test(item?.name || '')) n += d; });
  return Math.max(1, Math.min(5, n));
}
/** The piece's dressiness: set by the user, or worked out. */
export function dressinessOf(item) {
  const own = DRESSINESS.indexOf(item?.dressiness) + 1;
  return own || dressinessRaw(item);
}

/** Season rules a person would not break: no sandals or shorts in the cold, no heavy coats in summer. */
const WARM_MONTHS = [4, 5, 6, 7, 8];
function seasonOK(i, warm) {
  const s = `${i.subtype || ''} ${i.name || ''}`;
  if (COLD && /\b(sandals?|shorts)\b/i.test(s)) return false;
  if (CNOW >= 0.75 && ['bottoms', 'dresses'].includes(i.category) && fabricInfo(i.fabric)?.warmth === 'cool' && thicknessOf(i) === 1) return false;   // light linen or chiffon in deep winter
  if (COLD && i.category === 'tops' && /tee|tank|cami/i.test(s) && isSleeveless(i)) return true;   // fine as a base layer
  if (warm && (/\b(puffer|coat|faux fur|shearling)\b/i.test(s) || (i.category !== 'shoes' && thicknessOf(i) === 3))) return false;
  if (warm && /\b(boots?)\b/i.test(s) && !/ankle/i.test(s)) return false;
  if (warm && i.category === 'tops' && /sweater|knit|turtleneck|cardigan/i.test(s) && fabricInfo(i.fabric)?.warmth === 'warm') return false;
  return true;
}

const NEUTRAL_NAMES = new Set(['ivory', 'cream', 'white', 'oatmeal', 'beige', 'camel', 'tan', 'sand', 'taupe', 'chocolate', 'brown', 'espresso',
  'black', 'charcoal', 'grey', 'light grey', 'pale grey', 'navy', 'stone', 'khaki', 'mocha', 'denim blue', 'silver', 'gold']);
function isNeutralPiece(i) {
  const n = lc(i?.color?.name);
  if (NEUTRAL_NAMES.has(n)) return true;
  const hex = i?.color?.hex; if (!hex) return true;
  const { r, g, b } = hexToRgb(hex); const { s, l } = rgbToHsl(r, g, b);
  return isNeutral(hex) || s < 0.16 || l < 0.12 || l > 0.93;
}
/** Colour families of the accents (non-neutrals): hue buckets, so rust and terracotta count as one colour. */
function accentFamilies(pieces) {
  const fam = new Set();
  pieces.filter(p => !isNeutralPiece(p)).forEach(p => { const { r, g, b } = hexToRgb(p.color.hex); fam.add(Math.round(rgbToHsl(r, g, b).h / 30) % 12); });
  return fam;
}
/** A colour story: neutrals plus at most one or two accents that get along. */
function colourStoryScore(pieces, mood) {
  const main = pieces.filter(Boolean);
  if (main.length < 2) return 0;
  const accents = main.filter(p => !isNeutralPiece(p)), fams = accentFamilies(main);
  let s = 0;
  if (fams.size === 0) s += mood.tonal ? 1.2 : 0.6;               // all neutrals: calm and easy
  else if (fams.size === 1) s += 1.4;                              // one accent colour: the classic recipe
  else if (fams.size === 2) {
    const [a, b] = accents.slice(0, 2);
    s += harmony(a.color.hex, b.color.hex) > 0.5 ? -0.6 : -2;   // two accents: only when they really get along
  } else s -= 3 * (fams.size - 2);                                 // three or more accents: too many colours
  if (accents.length === main.length) s -= 1.5;                     // no neutral to rest the eye
  return s;
}

/** Every pair of pieces, not only each piece against one anchor. */
function allPairs(pieces) { const out = []; for (let i = 0; i < pieces.length; i++) for (let j = i + 1; j < pieces.length; j++) out.push([pieces[i], pieces[j]]); return out; }

/** The whole-outfit judgement: how well everything works together. */
function outfitScore(o, mood, intent, target) {
  const pieces = outfitPieces(o);
  if (!pieces.length) return -Infinity;
  const clothes = pieces.filter(p => p.category !== 'shoes');
  let s = 0;
  // dressiness: everything at the same level, and at the level the day asks for
  // (the coat is left out: a casual knit under a smart coat is a normal high-low mix — a puffer over a dressy look is not)
  const inner = pieces.filter(p => p !== o.outer);
  const d = inner.map(dressinessOf), mean = d.reduce((a, b) => a + b, 0) / d.length;
  const spread = Math.max(...d) - Math.min(...d);
  if (o.outer) s -= Math.max(0, mean - 1 - dressinessOf(o.outer)) * 2;
  s -= Math.max(0, spread - 1) * 1.4 + (spread >= 3 ? 2 : 0);   // a sneaker with a slip dress: only on purpose
  s -= Math.abs(mean - target) * 1.2;
  // colour story
  s += colourStoryScore(clothes.concat(o.shoes ? [o.shoes] : []), mood) * 1.2;
  // pairs: harmony, sheen and what the diary / votes taught
  const pairs = allPairs(pieces);
  if (pairs.length) s += pairs.reduce((t, [a, b]) => t + harmony(a.color?.hex, b.color?.hex) * 0.5 + sheenScore(a, b) + learnedPair(a, b) * 0.6, 0) / Math.sqrt(pairs.length);
  // proportion and contrast of the main pairing
  const top = o.top[o.top.length - 1];
  if (top && o.bottom) s += proportionScore(top, o.bottom, intent) * 1.1 + contrastScore(top, o.bottom, intent) * 0.6;
  // one shared vibe running through most of the outfit
  const vc = {}; clothes.forEach(p => (p.vibe || []).forEach(v => { vc[v] = (vc[v] || 0) + 1; }));
  const shared = Object.entries(vc).filter(([v, n]) => n >= Math.ceil(clothes.length / 2));
  s += Math.min(2, shared.length * 0.6 + shared.filter(([v]) => mood.vibes.includes(v)).length * 0.5);
  // layering and coat sit right
  if (o.top.length > 1) s += o.top.reduce((t, x, i) => t + o.top.slice(i + 1).reduce((u, y) => u + layerPair(x, y).penalty, 0), 0);
  if (o.outer) s += outerLayerPenalty(o.dress ? [o.dress] : o.top, o.outer);
  // rotation
  s += pieces.reduce((t, p) => t + rotation(p), 0);
  // the classic look should feel finished: shoes are a must
  if (!o.shoes) s -= 0.8;
  if (o.outer && WARM && thicknessOf(o.outer) >= 2) s -= 1.2;   // summer: a coat only if it is light
  if (WARM && o.top.length > 1 && o.top.some(t => fabricInfo(t.fabric)?.warmth === 'warm' || thicknessOf(t) >= 2)) s -= 2;   // no knit layers in the heat
  // warm enough for the time of year, and within what they taught: warmth, dressiness for this occasion, how many colours
  s += warmthScore(pieces) + dressBandPenalty(mean) + colourCapPenalty(pieces) + pieces.reduce((t, p) => t + slotDressFit(p), 0);
  return s;
}

const outfitKey = o => outfitPieces(o).map(p => p.id).sort().join('|');

/** Build many complete outfits and keep the best few, judged as a whole. */
function mirrorCheck(core, pool, mood, intent, avoid, target, shown = new Set(), n = 36) {
  const seen = new Map(), skipped = [];
  for (let k = 0; k < n; k++) {
    JIT = k === 0 ? 0 : 1 + k / 8;                            // first try: the single best choice each step; then wider variations
    const o = completeOutfit(core, pool, mood, intent, avoid);
    const key = outfitKey(o);
    if (seen.has(key)) continue;
    if (shown.has(key)) { skipped.push(o); continue; }         // Restyle: already shown, look further
    const overlap = outfitPieces(o).filter(p => avoid.has(p.id)).reduce((t, p) => t + (REUSED.has(slotOf(p)) ? 0.35 : 1), 0);
    const repeat = outfitPieces(o).reduce((t, p) => t + shownPenalty(p), 0);
    seen.set(key, { o, score: outfitScore(o, mood, intent, target) - overlap * 2 - repeat });
  }
  JIT = 1;
  if (!seen.size && skipped.length) skipped.forEach(o => seen.set(outfitKey(o), { o, score: outfitScore(o, mood, intent, target) - outfitPieces(o).reduce((t, p) => t + shownPenalty(p), 0) }));   // all shown: the least-repeated comes back first
  return [...seen.values()].sort((a, b) => b.score - a.score);
}

/**
 * Build exactly two looks.
 * items: all closet items. coreIds: >=1 chosen item ids. finish: { belt, jewelry, hair, nails, makeup, perfume } (items or null).
 */
export function buildLooks({ items, coreIds, moodText = '', moodChip = '', moodChips = null, finish = {}, history = null, occasion = '', shown = [], month = null, date = null }) {
  const when = date ?? (month == null ? Date.now() : new Date(new Date().getFullYear(), month, 15).getTime());
  const mon = new Date(when).getMonth();
  LEARN = history;
  COLD = COLD_MONTHS.includes(mon);
  const warm = WARM = WARM_MONTHS.includes(mon);
  CNOW = coldnessAt(when);
  OCC = occasion || '';
  TIGHTS = isTights(finish.legwear);
  const core = coreIds.map(id => items.find(i => i.id === id)).filter(Boolean);
  if (!core.length) return { error: 'Pick at least one core piece from your closet, or tap Surprise Me.' };
  CORE_IDS = new Set(core.map(c => c.id));
  const mood = interpretMood(moodText, moodChips || moodChip);
  const none = new Set();

  // 1. context: how dressy today is — the occasion if one was picked, otherwise the hero piece sets the level
  const occ = OCCASIONS.find(o => o.id === occasion);
  const coreLevel = core.reduce((t, c) => t + dressinessOf(c), 0) / core.length;
  let target = occ ? occ.target * 0.6 + coreLevel * 0.25 + mood.level * 0.15 : coreLevel * 0.5 + mood.level * 0.5;
  // what they taught for this occasion: looks they liked pull the level towards them, "too casual" / "too dressy" set limits
  const band = history?.dress?.get(OCC);
  if (band?.wsum) { const k = Math.min(1, 2 / band.wsum); target = (2 * target + k * band.sum) / (2 + k * band.wsum); }   // at most halfway
  if (band) target = Math.min(Math.max(target, band.lo), band.hi);
  // hard filters a person would apply before even looking: wrong season, or far too casual / too dressy
  const fits = i => CORE_IDS.has(i.id) || !CLOTHING_SLOTS.has(slotOf(i)) || (seasonOK(i, warm) && Math.abs(dressinessOf(i) - target) <= 1.75);
  let base = items.filter(fits);
  // never leave a slot empty because of the filters: fall back to the season-only filter, then everything
  for (const slot of ['top', 'bottom', 'shoes']) {          // a coat is optional: no fallback for it
    if (!base.some(i => slotOf(i) === slot) && items.some(i => slotOf(i) === slot)) {
      const loose = items.filter(i => slotOf(i) === slot && seasonOK(i, warm));
      base = base.concat(loose.length ? loose : items.filter(i => slotOf(i) === slot));
    }
  }
  const warnings = [];
  if (occ && Math.abs(coreLevel - occ.target) > 1.5)
    warnings.push(`${listText(core.map(nm))} ${core.length > 1 ? 'are' : 'is'} ${coreLevel < occ.target ? 'more casual' : 'dressier'} than “${occ.label}” usually asks for — the rest of the look meets it halfway.`);

  // a piece chosen under Finishing touches is the only jewelry offered; otherwise pick from the whole closet
  const pool = finish.jewelry ? base.filter(i => i.category !== 'jewelry' || i.id === finish.jewelry.id) : base;

  // 5. mirror check: many complete outfits, judged whole
  const shownKeys = new Set(shown);
  SHOWN = new Map();
  shown.forEach(k => String(k).split('|').forEach(id => { if (id && !CORE_IDS.has(id)) SHOWN.set(id, (SHOWN.get(id) || 0) + 1); }));
  const c1 = mirrorCheck(core, pool, mood, 'classic', none, target + 0.3, shownKeys);   // the classic look leans a touch more polished
  const o1 = c1[0].o;
  const used = new Set([...outfitPieces(o1), ...o1.jewelry].map(i => i.id));
  core.forEach(c => used.delete(c.id));
  const c2 = mirrorCheck(core, pool, mood, 'editorial', used, target - 0.2, shownKeys);
  const fixJewel = o => { if (finish.jewelry && !o.jewelry.length) o.jewelry = [finish.jewelry]; return o; };

  // no perfume chosen: suggest one from the shelf that matches the mood (a different one per look when there is a choice)
  const scent = (avoid) => { if (finish.perfume) return finish; const p = pickPerfume(items, mood, avoid); return p ? { ...finish, perfume: p, perfumeAuto: true } : finish; };
  const f1 = scent(none);
  let f2 = scent(new Set(f1.perfumeAuto ? [f1.perfume.id] : []));
  const fitsMood = p => perfumeMoodsOf(p).some(m => mood.perfume.includes(m));
  if (f2.perfumeAuto && f1.perfumeAuto && !fitsMood(f2.perfume) && fitsMood(f1.perfume)) f2 = f1;   // a second scent only if it suits the mood too

  const T1 = ['The Polished Classic', 'Balanced proportions, a defined waist and light-to-dark contrast.'];
  const T2 = ['The Effortless Editorial', 'A distinct pairing with a cooler, more undone point of view.'];
  const mk = (c, T, f, intent) => buildLookObject(T[0], T[1], fixJewel(c.o), f, mood, intent, OCC);
  const look1 = mk(c1[0], T1, f1, 'classic');
  const look2 = mk(c2[0], T2, f2, 'editorial');
  // the next-best options, for an AI stylist to choose from
  const alternatives = {
    classic: [look1, ...c1.slice(1, 5).map(c => mk(c, T1, f1, 'classic'))],
    editorial: [look2, ...c2.slice(1, 5).map(c => mk(c, T2, f2, 'editorial'))]
  };
  CORE_IDS = new Set(); SHOWN = new Map();
  return { mood: mood.key, feeling: mood.feeling, occasion: occ?.label || '', season: COLD ? 'cold months' : warm ? 'warm months' : 'mild weather',
    level: DRESSINESS[Math.max(0, Math.min(4, Math.round(target) - 1))], warnings: [...new Set([...o1.warnings, ...warnings])], looks: [look1, look2], alternatives };
}

/* ======================================================================
   FIT, FABRIC & WARDROBE MATCH (Tab 3)
   ====================================================================== */

export const DEFAULT_PROFILE = {
  height: 170, weight: 54, bust: 89, waist: 70, hips: 92, shoulder: 38,
  topSize: 'S', bottomSize: 'S', coatSize: 'S', shoeSize: '39',
  guidelines: 'Prioritise comfort and warmth. Timeless silhouettes over trends. Balance light/medium pieces against dark ones. Define the waist; keep volume to one half of the outfit.'
};

const SIZE_LABEL = /^(?:size\s*)?(?:(?:uk|us|eu|it|fr|de)\s*)?(xxxs|xxs|xs|s|m|l|xl|xxl|xxxl|os|one\s*size|\d{1,2})(?=[\s:|,\-–]|$)/i;
const KEYWORDS = [
  ['bust',     /(bust|chest|pit[\s-]*to[\s-]*pit|underarm)/i],
  ['waist',    /waist/i],
  ['hips',     /(hip|seat)/i],
  ['shoulder', /shoulder/i],
  ['sleeve',   /sleeve/i],
  ['inseam',   /(inseam|inside leg)/i],
  ['length',   /(length|height)/i]
];
function keyFor(word) {
  for (const [k, re] of KEYWORDS) if (re.test(word)) return k;
  return null;
}
const NUM = /(\d+(?:[.,]\d+)?)(?:\s*[-–to]+\s*(\d+(?:[.,]\d+)?))?/g;

function numsIn(str) {
  const out = [];
  let m; NUM.lastIndex = 0;
  while ((m = NUM.exec(str))) {
    const a = parseFloat(m[1].replace(',', '.'));
    const b = m[2] ? parseFloat(m[2].replace(',', '.')) : null;
    out.push({ v: b != null ? (a + b) / 2 : a, range: b != null });
  }
  return out;
}

/** Parse a pasted size chart into rows [{size, bust, waist, hips, ...}] plus meta. */
export function parseSizeChart(raw) {
  const text = (raw || '').replace(/\r/g, '').replace(/[|;\t]+/g, ' ').replace(/ {2,}/g, ' ');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const meta = { hasRanges: false, raw: raw || '' };
  let rows = [];

  // 1) Row-wise: header line with ≥2 keywords, followed by "S 88 70 94" rows
  for (let i = 0; i < lines.length && !rows.length; i++) {
    const keys = [];
    const re = /(bust|chest|pit[\s-]*to[\s-]*pit|underarm|waist|hips?|seat|shoulder|sleeve|inseam|inside leg|(?:total |front |back )?length)/gi;
    let m;
    while ((m = re.exec(lines[i]))) { const k = keyFor(m[1]); if (k && !keys.includes(k)) keys.push(k); }
    if (keys.length < 1 || SIZE_LABEL.test(lines[i])) continue;
    const found = [];
    for (let j = i + 1; j < lines.length && j <= i + 14; j++) {
      const sm = lines[j].match(SIZE_LABEL);
      if (!sm) { if (found.length) break; else continue; }
      const rest = lines[j].slice(sm[0].length);
      const ns = numsIn(rest);
      if (!ns.length) continue;
      const row = { size: sm[1].toUpperCase().replace(/\s+/g, ' ') };
      keys.forEach((k, idx) => { if (ns[idx]) { row[k] = ns[idx].v; if (ns[idx].range) meta.hasRanges = true; } });
      found.push(row);
    }
    if (found.length >= 1) rows = found;
  }

  // 2) Column-wise (sizes across the top): "Size XS S M L" then "Bust 84 88 92 96"
  if (!rows.length) {
    for (let i = 0; i < lines.length; i++) {
      const toks = lines[i].replace(/^size\s*/i, '').split(/\s+/).filter(Boolean);
      const sizes = toks.filter(t => /^(xxxs|xxs|xs|s|m|l|xl|xxl|xxxl|\d{1,2})$/i.test(t));
      if (sizes.length < 3 || sizes.length !== toks.length) continue;
      const cols = sizes.map(s => ({ size: s.toUpperCase() }));
      for (let j = i + 1; j < Math.min(lines.length, i + 10); j++) {
        const km = lines[j].match(/^([A-Za-z][A-Za-z \-/()]*?)[:\s]+(\d.*)$/);
        if (!km) continue;
        const k = keyFor(km[1]);
        const ns = numsIn(km[2]);
        if (!k || ns.length < cols.length) continue;
        cols.forEach((c, idx) => { c[k] = ns[idx].v; if (ns[idx].range) meta.hasRanges = true; });
      }
      if (cols.some(c => Object.keys(c).length > 1)) { rows = cols; break; }
    }
  }

  // 3) Sentence-wise: "Size M: Bust 92cm, Waist 76cm"
  if (!rows.length) {
    for (const l of lines) {
      const sm = l.match(SIZE_LABEL);
      if (!sm) continue;
      const row = { size: sm[1].toUpperCase() };
      const re = /(bust|chest|pit[\s-]*to[\s-]*pit|waist|hips?|shoulder|sleeve|inseam|(?:total |front )?length)[^\d]{0,14}(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?/gi;
      let m, n = 0;
      while ((m = re.exec(l))) {
        const k = keyFor(m[1]); if (!k) continue;
        const a = parseFloat(m[2].replace(',', '.')), b = m[3] ? parseFloat(m[3].replace(',', '.')) : null;
        row[k] = b != null ? (a + b) / 2 : a; if (b != null) meta.hasRanges = true; n++;
      }
      if (n) rows.push(row);
    }
  }

  // unit handling
  const inchHint = /\b(inch|inches|in\b)|["”]/i.test(raw) && !/\bcm\b/i.test(raw);
  const flatHint = /(flat|laid|pit[\s-]*to[\s-]*pit|across|half)/i.test(raw);
  const maxBust = Math.max(0, ...rows.map(r => r.bust || 0));
  let unit = 'cm';
  if (inchHint || (!/\bcm\b/i.test(raw) && maxBust > 0 && maxBust <= 48 && !flatHint)) unit = 'in';
  if (unit === 'in') rows = rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, k === 'size' ? v : +(v * 2.54).toFixed(1)])));
  meta.unit = unit;

  const chartMax = Math.max(0, ...rows.map(r => r.bust || 0));
  const flatByValue = rows.length && chartMax > 0 && chartMax < 66;
  meta.flat = flatHint || flatByValue;
  if (meta.flat && rows.length) {
    rows = rows.map(r => {
      const d = { ...r };
      ['bust', 'waist', 'hips'].forEach(k => { if (d[k] && d[k] < 80) d[k] = +(d[k] * 2).toFixed(1); });
      return d;
    });
  }
  return { rows, meta };
}

export function detectGarmentType(text) {
  const t = lc(text);
  if (/(coat|trench|parka|puffer|overcoat|jacket|blazer|cape|poncho)/.test(t)) return 'outer';
  if (/(dress|gown|jumpsuit)/.test(t)) return 'dress';
  if (/(skirt|trouser|pant|jean|short|culotte|legging)/.test(t)) return 'bottom';
  return 'top';
}
export function detectFit(text) {
  const t = lc(text);
  if (/(oversiz|boxy|dropped shoulder|drop shoulder|slouch|baggy)/.test(t)) return 'oversized';
  if (/(slim|fitted|bodycon|skinny|tailored fit|form[- ]fitting|close[- ]fitting|second skin)/.test(t)) return 'fitted';
  if (/(relaxed|loose|wide|flowy|voluminous|a-line)/.test(t)) return 'relaxed';
  return 'regular';
}

const EASE = {
  top:    { bust: { fitted: [2, 6], regular: [6, 12], relaxed: [10, 18], oversized: [16, 34] }, waist: { fitted: [0, 6], regular: [4, 14], relaxed: [8, 24], oversized: [10, 60] }, hips: { fitted: [2, 8], regular: [6, 16], relaxed: [8, 24], oversized: [10, 60] } },
  outer:  { bust: { fitted: [8, 12], regular: [12, 20], relaxed: [16, 26], oversized: [22, 44] }, waist: { fitted: [6, 12], regular: [12, 24], relaxed: [16, 34], oversized: [20, 60] }, hips: { fitted: [8, 14], regular: [12, 24], relaxed: [16, 34], oversized: [20, 60] } },
  dress:  { bust: { fitted: [2, 6], regular: [6, 12], relaxed: [10, 20], oversized: [16, 36] }, waist: { fitted: [0, 4], regular: [4, 12], relaxed: [10, 30], oversized: [14, 60] }, hips: { fitted: [2, 6], regular: [6, 12], relaxed: [10, 26], oversized: [14, 60] } },
  bottom: { waist: { fitted: [0, 3], regular: [2, 5], relaxed: [3, 8], oversized: [4, 12] }, hips: { fitted: [2, 6], regular: [4, 10], relaxed: [8, 22], oversized: [10, 40] } }
};
const WEIGHT = {
  top: { bust: 1.5, waist: 0.4, hips: 0.2, shoulder: 0.8 },
  outer: { bust: 1.5, waist: 0.3, hips: 0.4, shoulder: 0.8 },
  dress: { bust: 1.2, waist: 1.3, hips: 1.2, shoulder: 0.6 },
  bottom: { waist: 1.6, hips: 1.1 }
};

function sizeOrderKey(s) {
  const order = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  const i = order.indexOf(s); return i >= 0 ? i : (parseFloat(s) || 0);
}

/**
 * Recommend a size.
 * opts: { rows, meta, type, fit, kind: 'garment'|'body'|'auto' }
 */
export function recommendSize(profile, { rows, meta, type, fit, kind = 'auto' }) {
  if (!rows.length) return { ok: false, message: 'I could not read a size chart. Paste rows such as “S 88 70 94” under a header like “Bust Waist Hips”, or “Size M: bust 92cm, waist 76cm”.' };
  const body = { bust: +profile.bust, waist: +profile.waist, hips: +profile.hips, shoulder: +profile.shoulder || 38, height: +profile.height };
  let chartKind = kind;
  if (kind === 'auto') chartKind = meta.hasRanges || /body/i.test(meta.raw || '') ? 'body' : 'garment';

  const dims = Object.keys(EASE[type]);
  const scored = rows.map(r => {
    let penalty = 0; const detail = {};
    for (const d of dims) {
      const gv = r[d];
      if (!gv) continue;
      let lo, hi;
      if (chartKind === 'garment') {
        [lo, hi] = EASE[type][d][fit] || EASE[type][d].regular;
        const ease = gv - body[d];
        detail[d] = { garment: gv, body: body[d], ease: +ease.toFixed(1), lo, hi };
        const miss = ease < lo ? lo - ease : ease > hi ? ease - hi : 0;
        penalty += miss * (WEIGHT[type][d] || 1) * (ease < lo ? 1.3 : 1);   // too tight hurts more than too loose
      } else {
        // Body chart: chart value is the body it was made for. Pick the size that covers you (chart >= body).
        const diff = gv - body[d];
        detail[d] = { garment: gv, body: body[d], ease: +diff.toFixed(1), lo: 0, hi: 4 };
        const miss = diff < 0 ? -diff * 1.5 : diff > 4 ? diff - 4 : 0;
        penalty += miss * (WEIGHT[type][d] || 1);
      }
    }
    if (r.shoulder && chartKind === 'garment' && (type === 'top' || type === 'outer' || type === 'dress')) {
      const e = r.shoulder - body.shoulder;
      const [lo, hi] = fit === 'oversized' ? [3, 9] : fit === 'fitted' ? [-1, 1.5] : [0, 4];
      detail.shoulder = { garment: r.shoulder, body: body.shoulder, ease: +e.toFixed(1), lo, hi };
      penalty += (e < lo ? lo - e : e > hi ? e - hi : 0) * WEIGHT[type].shoulder;
    }
    return { row: r, penalty, detail };
  }).sort((a, b) => a.penalty - b.penalty || sizeOrderKey(a.row.size) - sizeOrderKey(b.row.size));

  const best = scored[0];
  const alt = scored[1] && scored[1].penalty - best.penalty < 3 ? scored[1].row.size : null;

  const notes = [];
  const d = best.detail;
  const mk = (key, name) => {
    if (!d[key]) return;
    const e = d[key].ease;
    if (chartKind === 'garment') notes.push(`${name}: garment ${d[key].garment} cm vs your ${d[key].body} cm → ${e >= 0 ? '+' : ''}${e} cm ease (ideal for ${fit}: ${d[key].lo}–${d[key].hi} cm).`);
    else notes.push(`${name}: size chart ${d[key].garment} cm vs your ${d[key].body} cm (${e >= 0 ? '+' : ''}${e} cm).`);
  };
  mk('bust', 'Bust'); mk('waist', 'Waist'); mk('hips', 'Hips'); mk('shoulder', 'Shoulder');
  if (type === 'bottom' && d.waist && chartKind === 'garment' && d.waist.ease < 0) notes.push('This waist is smaller than yours — it will not close comfortably. Size up.');

  // length / proportion for 170 cm
  const h = body.height || 170;
  const len = best.row.length;
  const lengthNote = len ? lengthAdvice(type, len, h, best.row) : '';
  const sleeve = best.row.sleeve && (type === 'top' || type === 'outer')
    ? `Sleeve ${best.row.sleeve} cm: at ${h} cm your arm needs roughly ${Math.round(h * 0.35)} cm from shoulder to wrist bone${best.row.sleeve < h * 0.33 ? ' — expect a three-quarter sleeve' : best.row.sleeve > h * 0.38 ? ' — sleeves will run long (good for an oversized, pushed-up look)' : ' — length looks right'}.` : '';

  const headline = `Size ${best.row.size}`;
  const sizingTip = fit === 'oversized'
    ? `Because it is designed oversized, ${best.row.size} gives the intended slouch; sizing down one would make it merely roomy rather than editorial.`
    : fit === 'fitted'
      ? `Because it is a fitted cut, stay true to size around the waist — if the fabric has no stretch and you are between sizes, choose the larger.`
      : '';

  const confident = best.penalty < 2.5;
  return {
    ok: true, size: best.row.size, headline, chartKind, confident, alt,
    penalty: +best.penalty.toFixed(1), notes, lengthNote, sleeve, sizingTip,
    flatNote: meta.flat ? 'The chart looked like flat (half) measurements, so I doubled bust/waist/hip values.' : '',
    unitNote: meta.unit === 'in' ? 'Measurements were in inches; converted to cm.' : ''
  };
}

function lengthAdvice(type, len, h, row) {
  const k = h / 170; // scale from a 170 cm reference
  if (type === 'top') {
    const L = len / k;
    if (L < 52) return `Length ${len} cm is cropped on you — it ends above the natural waist, so pair with high-rise bottoms.`;
    if (L < 62) return `Length ${len} cm ends at the waist to high hip — ideal for tucking or wearing over high-rise pieces.`;
    if (L < 70) return `Length ${len} cm lands on the hip bone — a flattering all-rounder at ${h} cm, easy to half-tuck.`;
    return `Length ${len} cm is a longer, tunic-like line (mid-hip or lower) — wear over slim bottoms and keep the waist visible.`;
  }
  if (type === 'outer') {
    const L = len / k;
    if (L < 72) return `Length ${len} cm is a hip-length jacket — pairs best with higher waists.`;
    if (L < 92) return `Length ${len} cm reaches mid-thigh — a versatile coat length that suits your height.`;
    if (L < 110) return `Length ${len} cm reaches around the knee — a polished, elongating coat length on 170 cm.`;
    return `Length ${len} cm is a long, almost-ankle line — dramatic on you; wear with slim bottoms and a defined waist.`;
  }
  if (type === 'bottom') {
    if (row.inseam) {
      const I = row.inseam;
      return `Inseam ${I} cm: for ${h} cm, ~${Math.round(h * 0.45)} cm is a full-length trouser with a small break; ${I < h * 0.4 ? 'this will read ankle-length or cropped' : I > h * 0.48 ? 'this will pool — plan on hemming or wearing heels' : 'this length should land at the ankle bone'}.`;
    }
    const L = len / k;
    if (L < 45) return `Length ${len} cm is a mini on you.`;
    if (L < 62) return `Length ${len} cm sits at or just below the knee — a classic skirt length on 170 cm.`;
    if (L < 85) return `Length ${len} cm is a midi — mid-calf; elongating with a heel or slim boot at your height.`;
    return `Length ${len} cm is a maxi — wear it with a fitted top to keep proportions balanced.`;
  }
  if (type === 'dress') {
    const L = len / k;
    if (L < 90) return `Length ${len} cm is a short dress on you.`;
    if (L < 108) return `Length ${len} cm is around the knee.`;
    if (L < 125) return `Length ${len} cm is a midi dress — mid-calf on 170 cm.`;
    return `Length ${len} cm is a maxi dress — it will reach the ankle on you.`;
  }
  return '';
}

/* ---------- Fabric ---------- */

const FIBRES = [
  { re: /cashmere/i,               name: 'Cashmere',   score: 10, tier: 'natural' },
  { re: /silk/i,                   name: 'Silk',       score: 9.5, tier: 'natural' },
  { re: /(merino|lambswool|wool)/i,name: 'Wool',       score: 9,  tier: 'natural' },
  { re: /(alpaca|mohair|camel hair)/i, name: 'Alpaca/Mohair', score: 8.5, tier: 'natural' },
  { re: /linen/i,                  name: 'Linen',      score: 8.5, tier: 'natural' },
  { re: /(organic )?cotton/i,      name: 'Cotton',     score: 8,  tier: 'natural' },
  { re: /(lyocell|tencel)/i,       name: 'Lyocell',    score: 7,  tier: 'semi' },
  { re: /(viscose|rayon|modal)/i,  name: 'Viscose/Modal', score: 5.5, tier: 'semi' },
  { re: /(elastane|spandex|lycra|elastan)/i, name: 'Elastane', score: 5, tier: 'stretch' },
  { re: /(polyamide|nylon)/i,      name: 'Nylon',      score: 4,  tier: 'synthetic' },
  { re: /(polyester|recycled polyester)/i, name: 'Polyester', score: 2.5, tier: 'synthetic' },
  { re: /(acrylic)/i,              name: 'Acrylic',    score: 2,  tier: 'synthetic' },
  { re: /(polyurethane|pu\b)/i,    name: 'Polyurethane', score: 2, tier: 'synthetic' }
];

export function evaluateFabric(text) {
  const t = text || '';
  const found = [];
  const re = /(\d{1,3})\s*%\s*([A-Za-z][A-Za-z ]{2,28})/g;
  let m;
  while ((m = re.exec(t))) {
    const pct = parseInt(m[1], 10);
    const fib = FIBRES.find(f => f.re.test(m[2]));
    if (fib) found.push({ pct, ...fib });
  }
  // also catch "cotton 80% polyester 20%" ordering
  const re2 = /([A-Za-z][A-Za-z ]{2,20})\s*[:\-]?\s*(\d{1,3})\s*%/g;
  while ((m = re2.exec(t))) {
    const pct = parseInt(m[2], 10);
    const fib = FIBRES.find(f => f.re.test(m[1]));
    if (fib && !found.some(f => f.name === fib.name && f.pct === pct)) found.push({ pct, ...fib });
  }
  if (!found.length) {
    // no percentages: look for mentions
    const mentions = FIBRES.filter(f => f.re.test(t));
    if (!mentions.length) return { ok: false, message: 'No fabric composition found. Paste the “Composition / Material” line (e.g. “80% wool, 20% polyamide”).' };
    mentions.forEach(f => found.push({ pct: 100 / mentions.length, ...f }));
  }
  const total = found.reduce((s, f) => s + f.pct, 0) || 1;
  const stretch = found.filter(f => f.tier === 'stretch').reduce((s, f) => s + f.pct, 0);
  const main = found.filter(f => f.tier !== 'stretch');
  const mainTotal = main.reduce((s, f) => s + f.pct, 0) || 1;
  let score = main.reduce((s, f) => s + f.score * f.pct, 0) / mainTotal;
  if (stretch > 6) score -= 0.5;
  const natural = found.filter(f => f.tier === 'natural').reduce((s, f) => s + f.pct, 0) / total * 100;
  const synthetic = found.filter(f => f.tier === 'synthetic').reduce((s, f) => s + f.pct, 0) / total * 100;
  score = Math.max(0, Math.min(10, score));

  const hero = [...found].sort((a, b) => b.pct - a.pct)[0];
  const flags = [];
  const has = n => found.find(f => f.name === n);
  if (has('Cashmere')) flags.push('Cashmere: exceptional softness and warmth. Check ply and gauge — a fine, dense knit lasts; a thin one pills.');
  if (has('Silk')) flags.push('Silk: beautiful drape and temperature-regulating, but hand-wash or dry-clean and avoid perfume on the fabric.');
  if (has('Wool') && !has('Cashmere')) flags.push('Wool: warm, breathable and long-lasting — ideal for your warmth-first priority.');
  if (has('Cotton')) flags.push('Cotton: breathable, easy to care for and true-to-colour.');
  if (has('Linen')) flags.push('Linen: crisp and breathable; expect natural creasing and a loose, textured look.');
  const acr = has('Acrylic'), poly = has('Polyester'), nyl = has('Nylon');
  if (acr && acr.pct >= 20) flags.push(`Acrylic ${acr.pct}%: a budget wool substitute that pills quickly and does not breathe — be cautious at any premium price.`);
  if (poly && poly.pct >= 40) flags.push(`Polyester ${poly.pct}%: traps heat and moisture, tends to cling and hold odour; it looks cheaper over time.`);
  else if (poly && poly.pct > 0 && poly.pct < 40) flags.push(`A little polyester (${poly.pct}%) adds shape retention — acceptable.`);
  if (nyl && nyl.pct > 0 && nyl.pct <= 20) flags.push(`Nylon ${nyl.pct}% in a wool blend improves durability — acceptable and common in good knitwear.`);
  if (stretch > 0 && stretch <= 5) flags.push(`Elastane ${stretch}%: a touch of stretch for comfort without losing the fibre’s hand-feel.`);
  if (stretch > 8) flags.push(`Elastane ${stretch}%: very stretchy — comfortable but it can bag out and cling.`);
  if (synthetic >= 70) flags.push('Mostly synthetic: you would be paying for performance, not luxury. Fine for budget pieces, not for investment ones.');

  const verdict = score >= 8.5 ? 'Excellent — investment-quality fibres'
    : score >= 7 ? 'Very good — natural-led fabric'
    : score >= 5.5 ? 'Decent — mixed fibres'
    : score >= 3.5 ? 'Mediocre — synthetic-heavy'
    : 'Poor — heavy synthetics';
  const warmth = (has('Wool') || has('Cashmere') || has('Alpaca/Mohair')) ? 'High warmth'
    : (has('Cotton') || has('Linen') || has('Silk')) ? (has('Linen') ? 'Light / cooling' : 'Moderate warmth')
    : synthetic > 50 ? 'Warm but not breathable' : 'Moderate warmth';
  return { ok: true, fibres: found.map(f => ({ name: f.name, pct: Math.round(f.pct) })), score: +score.toFixed(1), natural: Math.round(natural), synthetic: Math.round(synthetic), verdict, warmth, hero: hero?.name, flags };
}

/* ---------- Wardrobe matching for a new piece ---------- */

const COLOR_WORDS = {
  ivory: '#F5F0E6', cream: '#EDE3CF', white: '#FAFAFA', oatmeal: '#D7C9B1', beige: '#C9B79C', camel: '#B98B58', tan: '#A67C52',
  sand: '#D9C7A3', taupe: '#8B7D6F', chocolate: '#4A3226', brown: '#6B4A33', black: '#151515', charcoal: '#3A3B3D', grey: '#8A8A8A',
  gray: '#8A8A8A', navy: '#1F2A44', blue: '#4B6A8F', teal: '#2F6B6B', green: '#2F4A3A', olive: '#6B6B3A', sage: '#A3B08F',
  burgundy: '#5E1F2B', wine: '#7A2E3F', red: '#B3262E', rust: '#A4502D', terracotta: '#B8664A', orange: '#D67A2B', mustard: '#C49A2C',
  gold: '#B89A52', blush: '#E8C9C2', pink: '#E39AB0', lilac: '#B7A5CF', purple: '#5B2E55', silver: '#BFC1C4', khaki: '#A39367', stone: '#CFC6B5'
};
export function detectColor(text) {
  const t = lc(text);
  for (const [w, hex] of Object.entries(COLOR_WORDS)) if (new RegExp(`\\b${w}\\b`).test(t)) return { name: w[0].toUpperCase() + w.slice(1), hex };
  return null;
}

/** newPiece: { type, fit, color:{hex,name}|null }. Returns grouped matches from closet. */
export function matchCloset(items, newPiece) {
  const mood = interpretMood('', 'Quiet Luxury');
  const sil = ({ fitted: 'Fitted', oversized: 'Voluminous', relaxed: 'Relaxed', regular: 'Relaxed' })[newPiece.fit] || 'Relaxed';
  const fake = { category: ({ top: 'tops', bottom: 'bottoms', dress: 'dresses', outer: 'outerwear' })[newPiece.type], silhouette: sil, color: newPiece.color || null, contrast: newPiece.color ? contrastFromHex(newPiece.color.hex) : 'Medium', vibe: [] };

  const wants = {
    top:    [['bottoms', 'Bottoms'], ['outerwear', 'Outerwear'], ['shoes', 'Shoes']],
    outer:  [['tops', 'Tops & knits'], ['bottoms', 'Bottoms'], ['dresses', 'Dresses'], ['shoes', 'Shoes']],
    bottom: [['tops', 'Tops & knits'], ['outerwear', 'Outerwear'], ['shoes', 'Shoes'], ['belts', 'Belts']],
    dress:  [['outerwear', 'Outerwear'], ['shoes', 'Shoes'], ['belts', 'Belts'], ['jewelry', 'Jewelry & accessories']]
  }[newPiece.type];

  const groups = [];
  for (const [catId, label] of wants) {
    const pool = items.filter(i => i.category === catId);
    const scored = pool.map(i => {
      let s = 0; const why = [];
      const h = fake.color ? harmony(fake.color.hex, i.color?.hex) : 0.5;
      if (h >= 1) why.push(fake.color && isNeutral(i.color.hex) ? 'neutral partner' : 'harmonious colour');
      if (h < 0) why.push('colour may clash');
      s += h;
      if (['tops', 'bottoms', 'dresses', 'outerwear'].includes(catId) && i.silhouette) {
        const p = newPiece.type === 'bottom' ? proportionScore(i, fake, 'classic') : newPiece.type === 'top' ? proportionScore(fake, i, 'classic') : 0.5;
        s += p * 0.6;
        if (p >= 2) why.push(`${i.silhouette.toLowerCase()} balances the ${newPiece.fit} shape`);
      }
      const gap = contrastGap(fake, i);
      s += gap >= 1 ? 1 : 0.2;
      if (gap >= 1) why.push(`${i.contrast.toLowerCase()} vs ${fake.contrast.toLowerCase()} contrast`);
      return { item: i, score: s, why: why.slice(0, 2).join(' · ') || 'neutral pairing' };
    }).filter(x => x.score > 0.9).sort((a, b) => b.score - a.score).slice(0, 4);
    groups.push({ catId, label, matches: scored, total: pool.length });
  }
  return groups;
}

/** Overall verdict given size/fabric/match results. */
export function overallVerdict({ size, fabric, groups }) {
  let pts = 0, max = 0; const bits = [];
  if (size?.ok) { max += 4; pts += size.confident ? 4 : 2.5; bits.push(size.confident ? `size ${size.size} fits well` : `size ${size.size} is a compromise`); }
  if (fabric?.ok) { max += 3; pts += fabric.score / 10 * 3; bits.push(fabric.verdict.split(' —')[0].toLowerCase() + ' fabric'); }
  const nMatch = groups ? groups.reduce((s, g) => s + g.matches.length, 0) : 0;
  max += 3; pts += Math.min(3, nMatch * 0.5); bits.push(nMatch ? `${nMatch} closet pairings` : 'no closet pairings yet');
  const pct = max ? pts / max : 0;
  return { pct: Math.round(pct * 100), label: pct >= 0.75 ? 'Buy it' : pct >= 0.5 ? 'Consider it' : 'Think twice', summary: bits.join(' · ') };
}

/** Target full-circumference garment measurements (cm) for the profile, per fit. Used by the Profile tab. */
export function idealRanges(profile) {
  const b = +profile.bust, w = +profile.waist, h = +profile.hips;
  const span = (base, [lo, hi], open) => open ? `${Math.round(base + lo)}+` : `${Math.round(base + lo)}–${Math.round(base + hi)}`;
  const row = (base, group, d) => ({
    fitted: span(base, EASE[group][d].fitted),
    regular: span(base, EASE[group][d].regular),
    oversized: span(base, EASE[group][d].oversized, true)
  });
  return { top: row(b, 'top', 'bust'), coat: row(b, 'outer', 'bust'), waist: row(w, 'bottom', 'waist'), hips: row(h, 'bottom', 'hips') };
}
