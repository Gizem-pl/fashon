/* wardrobeStore.js — persistence + image processing.
   - IndexedDB: compressed photo blobs (one per item id)
   - IndexedDB also holds outfit-diary photos (one per wear id)
   - localStorage: item metadata, profile, saved looks, saved link checks, outfit diary, AI settings
   No DOM rendering and no styling logic lives here. */

import { DEFAULT_PROFILE, scentsOf, contrastFromHex, colorName, rgbToHex, rgbToHsl } from './stylistEngine.js';

const LS = {
  items: 'qc.items.v1',
  profile: 'qc.profile.v1',
  looks: 'qc.looks.v1',
  checks: 'qc.checks.v1',
  moods: 'qc.moods.v1',
  wears: 'qc.wears.v1',
  ai: 'qc.ai.v1',
  chat: 'qc.chat.v1',
  votes: 'qc.votes.v1',
  seen: 'qc.seen.v1'
};
const DB_NAME = 'quiet-closet';
const DB_VERSION = 1;
const PHOTO_STORE = 'photos';

/* ---------- localStorage helpers ---------- */

function read(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { console.warn('localStorage write failed', e); return false; }
}
export function newId(prefix = 'i') { return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

/* ---------- Items (metadata) ---------- */

export function getItems() { return read(LS.items, []); }
export function saveItem(item) {
  const items = getItems();
  const i = items.findIndex(x => x.id === item.id);
  if (i >= 0) items[i] = item; else items.unshift(item);
  return write(LS.items, items);
}
export function getItem(id) { return getItems().find(i => i.id === id) || null; }
export async function deleteItem(id) {
  write(LS.items, getItems().filter(i => i.id !== id));
  revokePhotoURL(id);
  try { await deletePhoto(id); } catch (e) { console.warn(e); }
  // drop it from saved looks
  const looks = getLooks().map(l => ({ ...l, itemIds: l.itemIds.filter(x => x !== id), pieceIds: (l.pieceIds || []).filter(x => x !== id) }))
    .filter(l => l.pieceIds.length > 0 || l.itemIds.length > 0);
  write(LS.looks, looks);
}

/* ---------- Profile ---------- */

export function getProfile() { return { ...DEFAULT_PROFILE, ...read(LS.profile, {}) }; }
export function saveProfile(p) { return write(LS.profile, p); }
export function resetProfile() { try { localStorage.removeItem(LS.profile); } catch {} return getProfile(); }

/* ---------- Saved looks ---------- */

export function getLooks() { return read(LS.looks, []); }
export function saveLook(look) {
  const looks = getLooks().filter(l => l.id !== look.id);
  looks.unshift({ ...look, savedAt: Date.now() });
  return write(LS.looks, looks);
}
export function removeLook(id) { write(LS.looks, getLooks().filter(l => l.id !== id)); }
export function isLookSaved(id) { return getLooks().some(l => l.id === id); }

/* ---------- Custom moods: { id, name, base } where base is a built-in mood the custom one inherits from ---------- */

export function getCustomMoods() { return read(LS.moods, []); }
export function saveCustomMood(m) {
  const list = getCustomMoods().filter(x => x.name.toLowerCase() !== m.name.toLowerCase());
  list.push({ id: m.id || newId('m'), name: m.name, base: m.base });
  return write(LS.moods, list);
}
export function removeCustomMood(id) { write(LS.moods, getCustomMoods().filter(m => m.id !== id)); }

/* ---------- Outfit diary: { id, lookId, title, mood, pieceIds, itemIds, feel, tags, notes, ai, wornAt, hasPhoto } ----------
   The wear photo is stored in IndexedDB under the wear's own id. */

export function getWears() { return read(LS.wears, []).sort((a, b) => (b.wornAt || 0) - (a.wornAt || 0)); }
export function saveWear(w) {
  const list = getWears().filter(x => x.id !== w.id);
  list.push(w);
  return write(LS.wears, list);
}
export async function deleteWear(id) {
  write(LS.wears, getWears().filter(w => w.id !== id));
  revokePhotoURL(id);
  try { await deletePhoto(id); } catch (e) { console.warn(e); }
}

/* ---------- Quick 👍 / 👎 on suggested looks — teaches the Studio your taste:
   { id (outfit key), pieceIds, itemIds (with accessories, e.g. tights), vote: 1 | -1, at, occasion, tags: [], off: [piece ids], note, muted: [] }
   The why (tags, off, note) is all optional. muted: reasons the note implies that they switched off, so editing the note does not bring them back.
   Only what is saved here is learned from: switching a reason or a piece off leaves no trace. ---------- */

export function getVotes() { return read(LS.votes, []); }
export function voteRecord(key) { return getVotes().find(v => v.id === key) || null; }
export function voteOf(key) { return voteRecord(key)?.vote || 0; }
/** vote 0 removes it. Flipping the vote clears the reasons given for the old one. ctx: { occasion, itemIds }. */
export function setVote(key, pieceIds, vote, ctx = {}) {
  const old = voteRecord(key);
  const list = getVotes().filter(v => v.id !== key);
  if (vote) list.push(old && old.vote === vote ? { ...old, at: Date.now() }
    : { id: key, pieceIds, itemIds: ctx.itemIds || pieceIds, vote, at: Date.now(), occasion: ctx.occasion || '', tags: [], off: [], note: '' });
  return write(LS.votes, list.slice(-300));
}
/** Optional reasons on an existing vote: patch of { tags, off, note }. */
export function setVoteReasons(key, patch) {
  const list = getVotes(), v = list.find(x => x.id === key);
  if (!v) return false;
  Object.assign(v, patch);
  return write(LS.votes, list);
}

/* ---------- Seen lately: [{ at, key (outfit key), ids (every piece in the look) }], one per look the Studio showed.
   Only the last two weeks are kept; it lets the next visit open on pieces not seen lately. Not part of a backup. ---------- */

const SEEN_DAYS = 14;
export function getSeen() {
  const since = Date.now() - SEEN_DAYS * 864e5;
  return read(LS.seen, []).filter(e => (e.at || 0) >= since);
}
export function markSeen(looks = []) {
  const at = Date.now();
  return write(LS.seen, [...getSeen(), ...looks.filter(l => l?.key).map(l => ({ at, key: l.key, ids: l.itemIds || l.pieceIds || [] }))].slice(-400));
}
/** The AI stylist swapped a look for another one: remember the one actually shown. */
export function swapSeen(oldKey, look) {
  const list = getSeen();
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].key !== oldKey) continue;
    list[i] = { at: list[i].at, key: look.key, ids: look.itemIds || look.pieceIds || [] };
    return write(LS.seen, list);
  }
  return false;
}

/* ---------- AI stylist settings: { key, model }. Stays on this device and is never put in a backup. ---------- */

export function getAISettings() { return { key: '', model: '', ...read(LS.ai, {}) }; }
export function saveAISettings(s) { return write(LS.ai, s); }
export function clearAISettings() { try { localStorage.removeItem(LS.ai); } catch {} }

/* ---------- Stylist chat: [{ id, role, text, photo, outfits, packing, gaps, at }]. Attached photos live in IndexedDB under the message id. ---------- */

const CHAT_MAX = 80;
export function getChat() { return read(LS.chat, []); }
export async function saveChat(list) {
  const keep = list.slice(-CHAT_MAX);
  const dropped = list.slice(0, Math.max(0, list.length - CHAT_MAX)).filter(m => m.photo);
  for (const m of dropped) { revokePhotoURL(m.id); try { await deletePhoto(m.id); } catch {} }
  return write(LS.chat, keep);
}
export async function clearChat() {
  for (const m of getChat().filter(m => m.photo)) { revokePhotoURL(m.id); try { await deletePhoto(m.id); } catch {} }
  try { localStorage.removeItem(LS.chat); } catch {}
}

/* ---------- Saved link checks ---------- */

export function getChecks() { return read(LS.checks, []); }
export function saveCheck(c) {
  const list = getChecks().filter(x => x.id !== c.id);
  list.unshift(c);
  return write(LS.checks, list.slice(0, 60));
}
export function removeCheck(id) { write(LS.checks, getChecks().filter(c => c.id !== id)); }

/* ---------- IndexedDB (photos) ---------- */

let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(PHOTO_STORE)) req.result.createObjectStore(PHOTO_STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbPromise = null; reject(req.error); };
    });
  }
  return dbPromise;
}
function tx(mode, fn) {
  return db().then(d => new Promise((resolve, reject) => {
    const t = d.transaction(PHOTO_STORE, mode);
    const store = t.objectStore(PHOTO_STORE);
    const r = fn(store);
    t.oncomplete = () => resolve(r && 'result' in r ? r.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}
export function putPhoto(id, blob) { return tx('readwrite', s => s.put(blob, id)); }
export function getPhoto(id) { return tx('readonly', s => s.get(id)); }
export function deletePhoto(id) { return tx('readwrite', s => s.delete(id)); }

const urlCache = new Map();
/** Returns an object URL for an item's photo (cached), or '' if none. */
export async function getPhotoURL(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  try {
    const blob = await getPhoto(id);
    if (!blob) return '';
    const url = URL.createObjectURL(blob);
    urlCache.set(id, url);
    return url;
  } catch { return ''; }
}
export function photoURLSync(id) { return urlCache.get(id) || ''; }
export function revokePhotoURL(id) {
  const u = urlCache.get(id);
  if (u) { URL.revokeObjectURL(u); urlCache.delete(id); }
}
export async function preloadPhotos(ids) { await Promise.all(ids.map(getPhotoURL)); }

export async function requestPersistence() {
  try { if (navigator.storage?.persist) return await navigator.storage.persist(); } catch {}
  return false;
}
export async function storageEstimate() {
  try { if (navigator.storage?.estimate) { const e = await navigator.storage.estimate(); return e; } } catch {}
  return null;
}

/* ---------- Image processing ---------- */

const MAX_W = 600;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
    img.src = url;
  });
}

/**
 * Resize to max 600px wide (JPEG 0.8) and extract dominant colour + contrast.
 * Returns { blob, color: {hex, name}, contrast }.
 */
export async function processPhoto(file, maxW = MAX_W) {
  let source = null;
  // createImageBitmap honours EXIF orientation on modern Safari; fall back to <img>.
  try { if (window.createImageBitmap) source = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { source = null; }
  if (!source) source = await loadImage(file);
  const sw = source.width || source.naturalWidth, sh = source.height || source.naturalHeight;
  const scale = Math.min(1, maxW / sw);
  const w = Math.max(1, Math.round(sw * scale)), h = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);               // flatten transparency to white for JPEG
  ctx.drawImage(source, 0, 0, w, h);
  if (source.close) source.close();

  const blob = await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('Compression failed.')), 'image/jpeg', 0.8));
  const color = dominantColor(ctx, w, h);
  return { blob, color: { hex: color.hex, name: colorName(color.hex) }, contrast: contrastFromHex(color.hex), width: sw, height: sh };
}

/** Dominant colour via 4-bit quantised histogram over the centre of the image, ignoring blank backdrops. */
export function dominantColor(ctx, w, h) {
  const sampleW = 64, sampleH = Math.max(1, Math.round(64 * h / w));
  const tmp = document.createElement('canvas');
  tmp.width = sampleW; tmp.height = sampleH;
  const tctx = tmp.getContext('2d', { willReadFrequently: true });
  tctx.drawImage(ctx.canvas, 0, 0, sampleW, sampleH);
  const data = tctx.getImageData(0, 0, sampleW, sampleH).data;

  // First pass: estimate backdrop from the border pixels.
  const border = [];
  for (let x = 0; x < sampleW; x++) { border.push(px(data, sampleW, x, 0), px(data, sampleW, x, sampleH - 1)); }
  for (let y = 0; y < sampleH; y++) { border.push(px(data, sampleW, 0, y), px(data, sampleW, sampleW - 1, y)); }
  const bg = avg(border);

  const bins = new Map();
  const x0 = Math.floor(sampleW * 0.15), x1 = Math.ceil(sampleW * 0.85);
  const y0 = Math.floor(sampleH * 0.12), y1 = Math.ceil(sampleH * 0.88);
  const run = (skipBg) => {
    bins.clear();
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const [r, g, b] = px(data, sampleW, x, y);
      if (skipBg) {
        const d = Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]);
        if (d < 36) continue;                                      // looks like backdrop
        const l = rgbToHsl(r, g, b);
        if (l.l > 0.94 && l.s < 0.12) continue;                    // blown-out white wall
      }
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const e = bins.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      e.n++; e.r += r; e.g += g; e.b += b;
      bins.set(key, e);
    }
  };
  run(true);
  let total = 0; bins.forEach(e => total += e.n);
  if (total < 30) run(false);                                      // photo is all one colour: use it

  // merge each bin with its neighbours so noise doesn't split a single colour
  let best = null, bestN = 0;
  bins.forEach((e, key) => {
    let n = 0, r = 0, g = 0, b = 0;
    const kr = key >> 8, kg = (key >> 4) & 15, kb = key & 15;
    for (let dr = -1; dr <= 1; dr++) for (let dg = -1; dg <= 1; dg++) for (let db = -1; db <= 1; db++) {
      const nk = ((kr + dr) << 8) | ((kg + dg) << 4) | (kb + db);
      if (kr + dr < 0 || kr + dr > 15 || kg + dg < 0 || kg + dg > 15 || kb + db < 0 || kb + db > 15) continue;
      const o = bins.get(nk); if (o) { n += o.n; r += o.r; g += o.g; b += o.b; }
    }
    if (n > bestN) { bestN = n; best = [r / n, g / n, b / n]; }
  });
  if (!best) best = bg;
  return { hex: rgbToHex(best[0], best[1], best[2]) };
}
function px(d, w, x, y) { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; }
function avg(list) {
  const s = [0, 0, 0]; list.forEach(p => { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; });
  return s.map(v => v / (list.length || 1));
}

/** Extract colour from an arbitrary image file without storing it (used for the Link Checker). */
export async function colorFromFile(file) {
  const { color, contrast } = await processPhoto(file);
  return { ...color, contrast };
}

/* ---------- Backup / restore ---------- */

const BACKUP_VERSION = 1;

function blobToDataURL(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
}
async function dataURLToBlob(url) { return (await fetch(url)).blob(); }

/** Build a single JSON backup file (metadata + photos as data URLs). Returns { blob, filename, count }. */
export async function createBackup() {
  const items = getItems();
  const photos = {};
  for (const it of items) {
    try { const b = await getPhoto(it.id); if (b) photos[it.id] = await blobToDataURL(b); } catch (e) { console.warn('photo skipped', it.id, e); }
  }
  const wears = getWears();
  for (const w of wears) {
    if (!w.hasPhoto) continue;
    try { const b = await getPhoto(w.id); if (b) photos[w.id] = await blobToDataURL(b); } catch (e) { console.warn('wear photo skipped', w.id, e); }
  }
  const data = { app: 'quiet-closet', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), items, profile: read(LS.profile, {}), looks: getLooks(), checks: getChecks(), moods: getCustomMoods(), wears, votes: getVotes(), photos };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  return { blob, filename: `quiet-closet-backup-${new Date().toISOString().slice(0, 10)}.json`, count: items.length };
}

/** Plain-text/CSV list of the closet (no photos) for reading in Numbers/Excel. */
export function createCSV() {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Name', 'Category', 'Type', 'Colour', 'Hex', 'Contrast', 'Silhouette', 'Thickness', 'Sleeves', 'Dressiness', 'Vibe', 'Scent accords', 'Fabric', 'Composition', 'Notes'];
  const rows = getItems().map(i => [i.name, i.category, i.subtype, i.color?.name, i.color?.hex, i.contrast, i.silhouette, i.thickness, i.sleeves, i.dressiness, (i.vibe || []).join('; '), scentsOf(i).join('; '), i.fabric, i.fabricMix, i.notes].map(q).join(','));
  return { blob: new Blob([[head.map(q).join(','), ...rows].join('\n')], { type: 'text/csv' }), filename: 'quiet-closet-items.csv' };
}

/** Restore from a backup file. mode: 'merge' (keep existing, add/overwrite by id) or 'replace'. */
export async function restoreBackup(file, mode = 'merge') {
  let data;
  try { data = JSON.parse(await file.text()); } catch { throw new Error('That file is not a valid backup.'); }
  if (data?.app !== 'quiet-closet' || !Array.isArray(data.items)) throw new Error('That does not look like a Fashon backup.');

  if (mode === 'replace') {
    for (const it of [...getItems(), ...getWears()]) { revokePhotoURL(it.id); try { await deletePhoto(it.id); } catch {} }
    write(LS.items, []); write(LS.looks, []); write(LS.checks, []); write(LS.wears, []); write(LS.votes, []); write(LS.moods, []);
  }
  const byId = new Map(getItems().map(i => [i.id, i]));
  let photosRestored = 0;
  for (const it of data.items) {
    const url = data.photos?.[it.id];
    if (url) { await putPhoto(it.id, await dataURLToBlob(url)); revokePhotoURL(it.id); photosRestored++; }
    byId.set(it.id, it);
  }
  write(LS.items, [...byId.values()]);
  const knownWears = new Set(getWears().map(w => w.id));
  for (const w of data.wears || []) {
    const url = data.photos?.[w.id];
    if (url && !knownWears.has(w.id)) { await putPhoto(w.id, await dataURLToBlob(url)); revokePhotoURL(w.id); }
  }
  const mergeList = (key, incoming) => {
    const cur = read(key, []); const ids = new Set(cur.map(x => x.id));
    write(key, [...cur, ...(incoming || []).filter(x => !ids.has(x.id))]);
  };
  mergeList(LS.looks, data.looks); mergeList(LS.checks, data.checks); mergeList(LS.moods, data.moods); mergeList(LS.wears, data.wears); mergeList(LS.votes, data.votes);
  if (data.profile && Object.keys(data.profile).length && (mode === 'replace' || !Object.keys(read(LS.profile, {})).length)) write(LS.profile, data.profile);
  await preloadPhotos([...data.items.map(i => i.id), ...(data.wears || []).filter(w => w.hasPhoto).map(w => w.id)]);
  return { items: data.items.length, photos: photosRestored };
}
