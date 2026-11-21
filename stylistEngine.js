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
export const VIBES = ['Old-Money', 'Effortless Chic', 'Cozy', 'Elevated', 'Minimal', 'Romantic', 'Edgy', 'Preppy', 'Bohemian', 'Sporty-Luxe', 'Evening', 'Casual'];
export const THICKNESS = ['Light', 'Medium', 'Thick'];
export const SLEEVES = ['Sleeved', 'Sleeveless'];
export const SCENT_MOODS = ['Warm & Spicy', 'Woody', 'Bold Floral', 'Fresh & Clean'];
export const CONTRASTS = ['Light', 'Medium', 'Dark'];
export const MOODS = ['Quiet Luxury', 'Cozy & Polished', 'Effortless Chic', 'Sharp & Confident', 'Soft & Romantic'];

const SILHOUETTE_CATS = new Set(['tops', 'bottoms', 'dresses', 'outerwear']);

export function categoryById(id) { return CATEGORIES.find(c => c.id === id); }
export function usesSilhouette(catId) { return SILHOUETTE_CATS.has(catId); }

/** Smart default tags pre-filled when a category is chosen. */
export function defaultTags(catId) {
  switch (catId) {
    case 'tops':      return { silhouette: 'Fitted',    vibe: ['Elevated'], scentMood: '' };
    case 'bottoms':   return { silhouette: 'Relaxed',   vibe: ['Effortless Chic'], scentMood: '' };
    case 'dresses':   return { silhouette: 'Fitted',    vibe: ['Elevated'], scentMood: '' };
    case 'outerwear': return { silhouette: 'Relaxed',   vibe: ['Old-Money'], scentMood: '' };
    case 'perfume':   return { silhouette: '',          vibe: [], scentMood: 'Fresh & Clean' };
    case 'shoes':     return { silhouette: '',          vibe: ['Elevated'], scentMood: '' };
    default:          return { silhouette: '',          vibe: ['Effortless Chic'], scentMood: '' };
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
  return FABRICS.find(f => f.re.test(t)) || null;
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
/** 0 = base layer, 1 = mid layer (knits, vests), 2 = jacket-type layer. */
function layerRank(item) {
  const s = `${item?.subtype || ''} ${item?.name || ''}`;
  if (/(blazer|jacket)/i.test(s)) return 2;
  if (/(turtle|roll)/i.test(s)) return thicknessOf(item) === 1 ? 0 : 1;
  if (/(tee|tank|blouse|shirt|bodysuit|corset|bustier|cami)/i.test(s)) return 0;
  return 1;
}

/**
 * Can two tops be worn one over the other? Returns { ok, inner, outer, penalty, reason }.
 * Thick pieces never go under another top, a thin layer cannot go over a thicker one,
 * and a sleeveless knit works over a thin sleeved base (blouse, tee).
 */
export function layerPair(a, b) {
  let inner = a, outer = b;
  const ra = layerRank(a), rb = layerRank(b);
  if (ra !== rb) { if (ra > rb) { inner = b; outer = a; } }
  else if (isSleeveless(a) !== isSleeveless(b)) { if (isSleeveless(a)) { inner = b; outer = a; } }
  else if (thicknessOf(a) > thicknessOf(b)) { inner = b; outer = a; }
  const ti = thicknessOf(inner), to = thicknessOf(outer), jacket = layerRank(outer) === 2;
  if (ti === 3 && !jacket) return { ok: false, inner, outer, penalty: 0, reason: `${inner.name} is too thick to wear under another top — layering ${outer.name} over it would be bulky. A thin blouse or tee underneath would work.` };
  if (to < ti && !jacket) return { ok: false, inner, outer, penalty: 0, reason: `${outer.name} is thinner than ${inner.name}, so it will not sit over it. Layer it over a thin base such as a blouse or tee instead.` };
  let penalty = 0;
  if (isSleeveless(outer) && ti === 1) penalty += 1.2;          // sleeveless knit over a thin sleeved base: classic
  if (ti >= 2 && to === ti && !jacket) penalty -= 1.5;          // same medium weight twice: bulky
  if (outer.silhouette === 'Fitted' && ti >= 2) penalty -= 1.5; // fitted outer over a substantial base
  return { ok: true, inner, outer, penalty, reason: '' };
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

/** Very rough guess from the photo's proportions only — shown as a hint, never applied silently. */
export function suggestFromShape(w, h) {
  if (!w || !h) return null;
  const r = w / h;
  if (r > 1.35) return { category: 'shoes', subtype: '' };
  if (r < 0.62) return { category: 'dresses', subtype: '' };
  return null;
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
  ['Lilac', '#B7A5CF'], ['Plum', '#5B2E55'], ['Silver', '#BFC1C4']
];
export function colorName(hex) {
  const { r, g, b } = hexToRgb(hex);
  let best = COLOR_NAMES[0], bd = Infinity;
  for (const c of COLOR_NAMES) {
    const o = hexToRgb(c[1]);
    // weighted euclidean (approximates perception)
    const rm = (r + o.r) / 2;
    const d = (2 + rm / 256) * (r - o.r) ** 2 + 4 * (g - o.g) ** 2 + (2 + (255 - rm) / 256) * (b - o.b) ** 2;
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
    feeling: 'composed, expensive-feeling and calm',
    vibes: ['Old-Money', 'Elevated', 'Minimal'], tonal: true,
    hair: ['a low, sleek chignon with a soft centre part', 'smooth, brushed-back hair tucked behind the ears'],
    makeup: 'skin-first: sheer base, soft taupe lids, a barely-there rosy-nude lip',
    nails: 'a sheer milky nude or soft ballet pink, short and rounded',
    jewelry: 'small gold studs or a single fine chain — nothing that competes with the fabric',
    texture: 'fine wool, cashmere and crisp tailoring'
  },
  'Cozy & Polished': {
    feeling: 'warm, held and effortlessly put-together',
    vibes: ['Cozy', 'Elevated', 'Casual', 'Preppy'], tonal: true,
    hair: ['loose, soft waves tucked behind one ear', 'a low ponytail with a few face-framing strands left out'],
    makeup: 'a warm, cream-based glow: peachy blush, brown mascara, a satin balm',
    nails: 'a soft oat or café-au-lait cream, glossy',
    jewelry: 'chunky-but-smooth gold hoops or a warm-toned bracelet stack',
    texture: 'brushed knits, wool and soft suede'
  },
  'Effortless Chic': {
    feeling: 'relaxed, a little undone and quietly cool',
    vibes: ['Effortless Chic', 'Old-Money', 'Casual', 'Bohemian', 'Sporty-Luxe'], tonal: false,
    hair: ['a slightly undone low bun with loose pieces', 'a tousled half-up twist'],
    makeup: 'a bare face with a blurred brown-red lip and groomed brows',
    nails: 'bare natural nails with a clear gloss, or a pale greige',
    jewelry: 'a mix of one chain and one hoop — deliberately unmatched',
    texture: 'washed cotton, linen and draped jersey'
  },
  'Sharp & Confident': {
    feeling: 'precise, powerful and in charge',
    vibes: ['Elevated', 'Old-Money', 'Edgy', 'Evening', 'Preppy'], tonal: false,
    hair: ['a high, polished ponytail pulled tight', 'a sleek, side-parted blowout tucked behind the ear'],
    makeup: 'defined brows, a crisp winged liner and a deep berry or classic red lip',
    nails: 'a deep oxblood, espresso or crisp milky white — short, squared',
    jewelry: 'structured gold cuffs or sharp geometric earrings',
    texture: 'structured wool, leather and sharp tailoring'
  },
  'Soft & Romantic': {
    feeling: 'tender, graceful and quietly romantic',
    vibes: ['Effortless Chic', 'Cozy', 'Romantic', 'Bohemian', 'Evening'], tonal: true,
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
  return contrastScore(a, b, intent) + harmony(a.color?.hex, b.color?.hex) + vibeScore(b, mood) + sheenScore(a, b);
}

/* ---------- Look building ---------- */

const CLOTHING_SLOTS = new Set(['top', 'bottom', 'dress', 'outer', 'shoes']);

function emptyOutfit() { return { top: [], bottom: null, dress: null, outer: null, shoes: null, warnings: [] }; }

function placeCore(outfit, item) {
  const slot = categoryById(item.category)?.slot;
  if (slot === 'top') {
    if (outfit.top.length === 0) outfit.top.push(item);
    else if (outfit.top.length === 1) {
      const lp = layerPair(outfit.top[0], item);
      if (lp.ok) outfit.top.push(item); else outfit.warnings.push(lp.reason);
    }
  }
  else if (slot === 'bottom' || slot === 'dress' || slot === 'outer' || slot === 'shoes') { if (!outfit[slot]) outfit[slot] = item; }
}

function outfitPieces(o) {
  return [...o.top, o.bottom, o.dress, o.outer, o.shoes].filter(Boolean);
}

function pickBest(cands, scoreFn, avoid, jitter = 0.5) {
  let best = null, bs = -Infinity;
  for (const c of cands) {
    let s = scoreFn(c) + Math.random() * jitter;
    if (avoid.has(c.id)) s -= 6;
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
    const s = proportionScore(t, b, 'classic') + pairScore(t, b, mood, 'classic') + Math.random();
    if (s > bs) { bs = s; best = [t.id, b.id]; }
  }
  return best;
}

function completeOutfit(core, items, mood, intent, avoid) {
  const o = emptyOutfit();
  core.forEach(c => placeCore(o, c));
  const pool = slot => items.filter(i => categoryById(i.category)?.slot === slot);
  const hasCoreIds = new Set(core.map(c => c.id));
  const notCore = arr => arr.filter(i => !hasCoreIds.has(i.id));

  if (!o.dress) {
    if (o.top.length && !o.bottom) {
      o.bottom = pickBest(notCore(pool('bottom')), b => proportionScore(o.top[0], b, intent) * 1.3 + pairScore(o.top[0], b, mood, intent), avoid);
    } else if (o.bottom && !o.top.length) {
      const t = pickBest(notCore(pool('top')), t => proportionScore(t, o.bottom, intent) * 1.3 + pairScore(t, o.bottom, mood, intent), avoid);
      if (t) o.top.push(t);
    } else if (!o.top.length && !o.bottom) {
      const dresses = pool('dress'), tops = pool('top'), bottoms = pool('bottom');
      if (dresses.length && (!(tops.length && bottoms.length) || intent === 'editorial')) {
        o.dress = pickBest(dresses, d => vibeScore(d, mood), avoid);
      } else if (tops.length && bottoms.length) {
        const pair = pickSurpriseCore(items.filter(i => ['tops', 'bottoms'].includes(i.category)));
        pair.forEach(id => placeCore(o, items.find(i => i.id === id)));
      } else if (dresses.length) {
        o.dress = pickBest(dresses, d => vibeScore(d, mood), avoid);
      }
    }
  }

  const base = o.dress || o.bottom || o.top[0];
  const anchor = o.bottom || o.dress || o.top[0];

  // Editorial look gets a layering piece when it already has top + bottom: a second, different top worn as a layer.
  if (intent === 'editorial' && !o.dress && o.top.length === 1 && o.bottom) {
    // only pieces that can physically be layered with the first top (no thick-on-thick, no thin over thick)
    const layer = pickBest(
      notCore(pool('top')).filter(t => t.id !== o.top[0].id && (t.subtype || '').match(/Cardigan|Blazer|Sweater|Knit|Vest/i) && layerPair(o.top[0], t).ok),
      t => pairScore(t, o.top[0], mood, 'editorial') + layerPair(o.top[0], t).penalty + (t.silhouette === 'Relaxed' || t.silhouette === 'Voluminous' ? 0.8 : 0),
      avoid, 0.8
    );
    if (layer) o.top.push(layer);
  }

  if (!o.outer && pool('outer').length && base) {
    const under = o.dress ? [o.dress] : o.top;
    o.outer = pickBest(pool('outer'), c => pairScore(c, anchor, mood, intent) + outerLayerPenalty(under, c) + (intent === 'classic' && c.silhouette === 'Relaxed' ? 0.5 : 0), avoid, 0.7);
    if (o.outer && outerLayerPenalty(under, o.outer) <= -8) o.outer = null;   // would not sit over what is underneath: skip it
  }
  if (!o.shoes && pool('shoes').length && base) {
    o.shoes = pickBest(pool('shoes'), s => harmony(s.color?.hex, anchor.color?.hex) + (intent === 'classic' && s.contrast === 'Dark' ? 1 : 0) + vibeScore(s, mood), avoid, 0.7);
  }
  // order two tops so the base layer comes first and the outer layer second
  if (o.top.length === 2) { const lp = layerPair(o.top[0], o.top[1]); o.top = [lp.inner, lp.outer]; }
  return o;
}

/* ---------- Styling notes ---------- */

const PERFUME_TIES = {
  'Warm & Spicy': { tex: 'the warmth of wool, cashmere and brushed knits', mood: 'amber and spice make cosy textures feel intimate' },
  'Woody':        { tex: 'structured tailoring and smooth leather',          mood: 'dry woods give clean lines depth and quiet authority' },
  'Bold Floral':  { tex: 'fluid, soft fabrics like silk or fine jersey',      mood: 'a statement floral adds the romance a minimal palette leaves out' },
  'Fresh & Clean':{ tex: 'crisp cotton and lightweight knits',                mood: 'a clean, airy scent keeps a polished outfit feeling light and modern' }
};

function nm(i) { return i ? i.name : ''; }
function lc(s) { return (s || '').toLowerCase(); }

function proportionNote(o, intent) {
  const tops = o.top, top = tops[tops.length - 1], bottom = o.bottom, dress = o.dress;   // the visible top is the outer layer
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
  if (tops.length > 1) lines.push(`Layer ${nm(tops[1])} over ${nm(tops[0])} — worn open or draped over the shoulders — so the neckline of the first piece still shows.`);
  return lines.join(' ');
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
    const tie = PERFUME_TIES[p.scentMood] || PERFUME_TIES['Fresh & Clean'];
    return `${nm(p)}${p.scentMood ? ` (${p.scentMood.toLowerCase()})` : ''} — ${tie.mood}. It echoes ${fabric ? lc(fabric) : tie.tex} here; spray on the pulse points and behind the knees, not on the knit, so the fibres stay clean.`;
  }
  const pick = intent === 'classic' ? 'Woody' : 'Fresh & Clean';
  const tie = PERFUME_TIES[pick];
  return `If you reach for perfume, try something ${pick.toLowerCase()} — ${tie.mood}.`;
}

function beltNote(finish, o, intent) {
  const b = finish.belt;
  if (b) return `Wear ${nm(b)} at your natural waist (around 70 cm) ${o.top.length && !o.dress ? 'over the tucked top' : 'over the dress or knit'} — ${intent === 'classic' ? 'snug, centred and exact' : 'a little lower and looser for an undone line'}.`;
  return intent === 'classic'
    ? 'Optional: a slim belt at the natural waist would sharpen the line; the look also works without one.'
    : 'No belt needed — let the drape and the half-tuck define you.';
}

function jewelryNote(finish, mood, intent, o) {
  const j = finish.jewelry;
  if (j) return `${nm(j)} is the single focal accent; keep every other metal quiet so it sings.`;
  const neck = (o.dress || o.top[0])?.subtype || '';
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

function buildLookObject(title, tagline, outfit, finish, mood, intent) {
  const pieces = outfitPieces(outfit);
  const accessories = ['legwear', 'belt', 'jewelry', 'hair', 'nails', 'makeup', 'perfume'].map(k => finish[k]).filter(Boolean);
  const notes = [
    { label: 'Proportion & tuck', text: proportionNote(outfit, intent) },
    { label: 'Colour balance',    text: contrastNote(outfit) },
    { label: 'Fabric & texture',  text: fabricNote(outfit) },
    { label: 'Layering',          text: layerNote(outfit, mood) },
    { label: 'Legwear',           text: finish.legwear ? `${nm(finish.legwear)} links the shoes to the hem — keep it close to the ${finish.legwear.color?.name ? finish.legwear.color.name.toLowerCase() : 'palette'} of the look.` : '' },
    { label: 'Belt',              text: beltNote(finish, outfit, intent) },
    { label: 'Jewelry',           text: jewelryNote(finish, mood, intent, outfit) },
    { label: 'Hair',              text: hairNote(finish, mood, intent) },
    { label: 'Nails',             text: nailsNote(finish, mood, intent) },
    { label: 'Makeup',            text: makeupNote(finish, mood) },
    { label: 'Fragrance',         text: perfumeNote(finish, outfit, mood, intent) }
  ].filter(n => n.text);
  return {
    id: 'look-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title, tagline,
    mood: mood.key,
    itemIds: [...pieces, ...accessories].map(i => i.id),
    pieceIds: pieces.map(i => i.id),
    notes
  };
}

/**
 * Build exactly two looks.
 * items: all closet items. coreIds: >=1 chosen item ids. finish: { belt, jewelry, hair, nails, makeup, perfume } (items or null).
 */
export function buildLooks({ items, coreIds, moodText = '', moodChip = '', moodChips = null, finish = {} }) {
  const core = coreIds.map(id => items.find(i => i.id === id)).filter(Boolean);
  if (!core.length) return { error: 'Pick at least one core piece from your closet, or tap Surprise Me.' };
  const mood = interpretMood(moodText, moodChips || moodChip);
  const none = new Set();

  const o1 = completeOutfit(core, items, mood, 'classic', none);
  const used = new Set(outfitPieces(o1).map(i => i.id));
  core.forEach(c => used.delete(c.id));
  const o2 = completeOutfit(core, items, mood, 'editorial', used);

  const look1 = buildLookObject('The Polished Classic', 'Balanced proportions, a defined waist and light-to-dark contrast.', o1, finish, mood, 'classic');
  const look2 = buildLookObject('The Effortless Editorial', 'A distinct pairing with a cooler, more undone point of view.', o2, finish, mood, 'editorial');
  return { mood: mood.key, feeling: mood.feeling, warnings: o1.warnings, looks: [look1, look2] };
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
