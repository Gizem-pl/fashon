/* ui.js — DOM rendering and event wiring only.
   Data comes from wardrobeStore.js, decisions come from stylistEngine.js. */

import * as S from './wardrobeStore.js';
import * as E from './stylistEngine.js';

/* ---------- tiny helpers ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const catLabel = id => E.categoryById(id)?.label || id;
const CLOTHING_CATS = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes'];
const FINISH_CATS = [
  { key: 'perfume', cat: 'perfume', label: 'Perfume' },
  { key: 'makeup',  cat: 'makeup',  label: 'Makeup look' },
  { key: 'nails',   cat: 'nails',   label: 'Nail polish' },
  { key: 'legwear', cat: 'legwear', label: 'Tights / socks' },
  { key: 'belt',    cat: 'belts',   label: 'Belt' },
  { key: 'jewelry', cat: 'jewelry', label: 'Jewelry / accessories' },
  { key: 'hair',    cat: 'hair',    label: 'Hair accessory' }
];

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

const state = {
  tab: 'studio',
  items: [],
  closetFilter: 'all',
  studio: { core: new Set(), pickFilter: 'all', moodText: '', moodChip: '', finish: {}, result: null, openFinish: false },
  checker: { url: '', name: '', text: '', type: 'auto', fit: 'auto', kind: 'auto', color: null, report: null, activeId: null },
  draft: null
};

function itemById(id) { return state.items.find(i => i.id === id); }
function refreshItems() { state.items = S.getItems(); }

function pic(item, cls = '') {
  const u = S.photoURLSync(item.id);
  return u
    ? `<img class="${cls}" src="${u}" alt="${esc(item.name)}" decoding="async">`
    : `<span class="ph ${cls}" style="background:${esc(item.color?.hex || '#E8E4DC')}"></span>`;
}

function collage(ids, cls = '') {
  const items = ids.map(itemById).filter(Boolean);
  if (!items.length) return '';
  const n = Math.min(items.length, 8);
  return `<div class="collage c${n} ${cls}">${items.slice(0, 8).map(i =>
    `<figure>${pic(i)}<figcaption>${esc(i.name)}</figcaption></figure>`).join('')}</div>`;
}

const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3s-7.6-4.6-9.2-9.5C1.7 7.4 3.7 4.6 6.6 4.6c1.9 0 3.5 1 4.4 2.6.2.3.6.3.8 0 .9-1.6 2.5-2.6 4.4-2.6 2.9 0 4.9 2.8 3.8 6.2-1.6 4.9-8 9.5-8 9.5z"/></svg>';

/* ======================================================================
   NAVIGATION
   ====================================================================== */

function showTab(name) {
  state.tab = name;
  $$('.view').forEach(v => { v.hidden = v.id !== 'view-' + name; });
  $$('#tabbar .tab').forEach(b => {
    const on = b.dataset.tab === name;
    b.classList.toggle('on', on);
    b.setAttribute('aria-current', on ? 'page' : 'false');
  });
  window.scrollTo(0, 0);
  try { sessionStorage.setItem('qc.tab', name); } catch {}
  if (name === 'studio') renderStudio();
  if (name === 'closet') renderCloset();
  if (name === 'checker') renderChecker();
  if (name === 'profile') renderProfile();
}

/* ======================================================================
   TAB 1 — CREATIVE DIRECTOR
   ====================================================================== */

function renderStudio() {
  const v = $('#view-studio');
  const s = state.studio;
  const clothing = state.items.filter(i => CLOTHING_CATS.includes(i.category));

  if (!state.items.length) {
    v.innerHTML = `
      <header class="page-head"><p class="eyebrow">Creative Director</p><h1>Outfit Studio</h1>
      <p class="sub">Two considered looks, built from the pieces you already own.</p></header>
      <div class="empty card">
        <h2>Your closet is empty</h2>
        <p>Photograph a few pieces first — a sweater, a skirt, trousers, a coat — and I will style them.</p>
        <button class="btn primary" data-act="goto-closet">Add your first piece</button>
      </div>`;
    return;
  }

  v.innerHTML = `
    <header class="page-head"><p class="eyebrow">Creative Director</p><h1>Outfit Studio</h1>
    <p class="sub">Two considered looks, built from your own closet.</p></header>

    <section class="card">
      <h2 class="step"><span>1</span>Core piece <em>required</em></h2>
      <p class="hint">Choose one or more pieces to build the look around.</p>
      <div class="pills" id="pick-filters"></div>
      <div class="pick-grid" id="pick-grid"></div>
      <div class="row between">
        <span class="hint" id="core-count"></span>
        <button class="link" data-act="clear-core">Clear</button>
      </div>
      <button class="btn ghost wide" data-act="surprise">✦ Surprise Me From My Closet</button>
    </section>

    <section class="card">
      <h2 class="step"><span>2</span>Mood &amp; feeling</h2>
      <label class="field"><span>How do you want to feel today?</span>
        <input id="mood-text" type="text" inputmode="text" autocomplete="off" placeholder="e.g. calm, warm, quietly confident" value="${esc(s.moodText)}">
      </label>
      <div class="chips" id="mood-chips">
        ${E.MOODS.map(m => `<button class="chip ${s.moodChip === m ? 'on' : ''}" data-act="mood-chip" data-mood="${esc(m)}">${esc(m)}</button>`).join('')}
      </div>
    </section>

    <details class="card fold" id="finish-fold" ${s.openFinish ? 'open' : ''}>
      <summary><h2 class="step"><span>3</span>Finishing layers <em>optional</em></h2></summary>
      <p class="hint">Skip any or all of these — looks generate without them.</p>
      <div class="finish-grid">
        ${FINISH_CATS.map(f => {
          const opts = state.items.filter(i => i.category === f.cat);
          return `<label class="field"><span>${f.label}</span>
            <select data-finish="${f.key}" ${opts.length ? '' : 'disabled'}>
              <option value="">${opts.length ? 'None' : 'None in closet yet'}</option>
              ${opts.map(i => `<option value="${i.id}" ${s.finish[f.key] === i.id ? 'selected' : ''}>${esc(i.name)}</option>`).join('')}
            </select></label>`;
        }).join('')}
      </div>
    </details>

    <button class="btn primary wide big" data-act="generate">Style Me</button>
    <button class="btn ghost wide" data-act="start-over">Start over</button>

    <div id="studio-results"></div>
    <div id="studio-saved"></div>
  `;
  renderPicker();
  renderResults();
  renderSavedLooks();
}

function renderPicker() {
  const s = state.studio;
  const clothing = state.items.filter(i => CLOTHING_CATS.includes(i.category));
  const filters = $('#pick-filters');
  if (!filters) return;
  filters.innerHTML = ['all', ...CLOTHING_CATS].map(c => {
    const n = c === 'all' ? clothing.length : clothing.filter(i => i.category === c).length;
    if (c !== 'all' && !n) return '';
    return `<button class="pill ${s.pickFilter === c ? 'on' : ''}" data-act="pick-filter" data-cat="${c}">${c === 'all' ? 'All' : esc(catLabel(c).replace(/ \(.*\)/, ''))}</button>`;
  }).join('');
  const shown = s.pickFilter === 'all' ? clothing : clothing.filter(i => i.category === s.pickFilter);
  $('#pick-grid').innerHTML = shown.length
    ? shown.map(i => `<button class="pick ${s.core.has(i.id) ? 'on' : ''}" data-act="toggle-core" data-id="${i.id}" aria-pressed="${s.core.has(i.id)}">
        ${pic(i)}<span class="tick">✓</span><span class="cap">${esc(i.name)}</span></button>`).join('')
    : `<p class="hint pad">No clothing in your closet yet — add some in the Closet tab.</p>`;
  const n = s.core.size;
  $('#core-count').textContent = n ? `${n} core piece${n > 1 ? 's' : ''} selected` : 'Nothing selected yet';
}

function lookCard(look, idx, saved) {
  const pieces = look.itemIds.map(itemById).filter(Boolean);
  return `
  <article class="look card" data-look-id="${look.id}">
    <header class="look-head">
      <div><p class="eyebrow">Look ${idx + 1}</p><h3>${esc(look.title)}</h3><p class="sub">${esc(look.tagline)}</p></div>
      <button class="heart ${saved ? 'on' : ''}" data-act="save-look" data-look-id="${look.id}" aria-pressed="${saved}" aria-label="${saved ? 'Remove from saved looks' : 'Save look'}">${HEART}</button>
    </header>
    ${collage(look.itemIds)}
    <p class="legend">${pieces.map(p => `<span><i style="background:${esc(p.color?.hex)}"></i>${esc(p.name)}</span>`).join('')}</p>
    <h4 class="notes-title">Creative Director’s notes</h4>
    <dl class="notes">
      ${look.notes.map(n => `<div><dt>${esc(n.label)}</dt><dd>${esc(n.text)}</dd></div>`).join('')}
    </dl>
  </article>`;
}

function renderResults() {
  const box = $('#studio-results');
  if (!box) return;
  const r = state.studio.result;
  if (!r) { box.innerHTML = ''; return; }
  if (r.error) { box.innerHTML = `<p class="note warn">${esc(r.error)}</p>`; return; }
  box.innerHTML = `
    <div class="result-head"><p class="eyebrow">Today · ${esc(r.mood)}</p><p class="sub">Feeling ${esc(r.feeling)}.</p></div>
    ${r.looks.map((l, i) => lookCard(l, i, S.isLookSaved(l.id))).join('')}
    <button class="btn ghost wide" data-act="generate">↻ Restyle</button>`;
}

function renderSavedLooks() {
  const box = $('#studio-saved');
  if (!box) return;
  const looks = S.getLooks();
  if (!looks.length) { box.innerHTML = ''; return; }
  box.innerHTML = `
    <h2 class="section-title">Saved looks <span>${looks.length}</span></h2>
    ${looks.map(l => `
      <details class="card saved">
        <summary>
          <div class="mini">${l.itemIds.map(itemById).filter(Boolean).slice(0, 4).map(i => `<span>${pic(i)}</span>`).join('')}</div>
          <div><strong>${esc(l.title)}</strong><small>${esc(l.mood)}</small></div>
        </summary>
        ${lookCard(l, 0, true).replace('<p class="eyebrow">Look 1</p>', '<p class="eyebrow">Saved</p>')}
      </details>`).join('')}`;
}

/** Drop looks that no longer match the current inputs. */
function staleResult() {
  if (state.studio.result) { state.studio.result = null; renderResults(); }
}

function startOver() {
  const s = state.studio;
  s.core.clear(); s.moodText = ''; s.moodChip = ''; s.finish = {}; s.result = null; s.openFinish = false; s.pickFilter = 'all';
  renderStudio();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast('Cleared — start fresh');
}

function generate(surprise = false) {
  const s = state.studio;
  const all = state.items;
  if (surprise) {
    const ids = E.pickSurpriseCore(all);
    if (!ids.length) { toast('Add some clothing to your closet first.'); return; }
    s.core = new Set(ids);
    renderPicker();
  }
  if (!s.core.size) { toast('Pick a core piece, or tap Surprise Me.'); return; }
  const finish = {};
  FINISH_CATS.forEach(f => { finish[f.key] = s.finish[f.key] ? itemById(s.finish[f.key]) || null : null; });
  s.result = E.buildLooks({ items: all, coreIds: [...s.core], moodText: s.moodText, moodChip: s.moodChip, finish });
  renderResults();
  $('#studio-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function wireStudio() {
  const v = $('#view-studio');
  v.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const s = state.studio;
    switch (b.dataset.act) {
      case 'goto-closet': showTab('closet'); break;
      case 'start-over': startOver(); break;
      case 'pick-filter': s.pickFilter = b.dataset.cat; renderPicker(); break;
      case 'toggle-core': {
        const id = b.dataset.id;
        s.core.has(id) ? s.core.delete(id) : s.core.add(id);
        b.classList.toggle('on', s.core.has(id)); b.setAttribute('aria-pressed', s.core.has(id));
        const n = s.core.size; $('#core-count').textContent = n ? `${n} core piece${n > 1 ? 's' : ''} selected` : 'Nothing selected yet';
        staleResult();
        break;
      }
      case 'clear-core': s.core.clear(); renderPicker(); staleResult(); break;
      case 'surprise': generate(true); break;
      case 'generate': generate(false); break;
      case 'mood-chip': {
        s.moodChip = s.moodChip === b.dataset.mood ? '' : b.dataset.mood;
        $$('#mood-chips .chip').forEach(c => c.classList.toggle('on', c.dataset.mood === s.moodChip));
        staleResult();
        break;
      }
      case 'save-look': {
        const id = b.dataset.lookId;
        if (S.isLookSaved(id)) { S.removeLook(id); toast('Removed from saved looks'); }
        else {
          const look = s.result?.looks?.find(l => l.id === id);
          if (look) { S.saveLook(look); toast('Look saved ♥'); }
        }
        renderResults(); renderSavedLooks();
        break;
      }
    }
  });
  v.addEventListener('input', e => {
    if (e.target.id === 'mood-text') {
      state.studio.moodText = e.target.value;
      staleResult();
      if (e.target.value && state.studio.moodChip) { /* free text refines, chip stays */ }
    }
  });
  v.addEventListener('change', e => {
    const k = e.target.dataset?.finish;
    if (k) { state.studio.finish[k] = e.target.value; staleResult(); }
  });
  v.addEventListener('toggle', e => { if (e.target.id === 'finish-fold') state.studio.openFinish = e.target.open; }, true);
}

/* ======================================================================
   TAB 2 — CLOSET & VANITY
   ====================================================================== */

function renderCloset() {
  const v = $('#view-closet');
  const f = state.closetFilter;
  const count = id => state.items.filter(i => i.category === id).length;
  const shown = f === 'all' ? state.items : state.items.filter(i => i.category === f);

  v.innerHTML = `
    <header class="page-head row between">
      <div><p class="eyebrow">Closet &amp; Vanity</p><h1>Your collection</h1>
      <p class="sub" id="closet-sub">${state.items.length} piece${state.items.length === 1 ? '' : 's'}</p></div>
      <button class="btn primary round" data-act="add-item" aria-label="Add a piece">+</button>
    </header>
    <div class="pills scroll" id="closet-filters">
      <button class="pill ${f === 'all' ? 'on' : ''}" data-act="closet-filter" data-cat="all">All <small>${state.items.length}</small></button>
      ${E.CATEGORIES.map(c => `<button class="pill ${f === c.id ? 'on' : ''}" data-act="closet-filter" data-cat="${c.id}">${esc(c.label)} <small>${count(c.id)}</small></button>`).join('')}
    </div>
    <div class="grid" id="closet-grid">
      <button class="tile add" data-act="add-item"><span>+</span><small>Add ${f === 'all' ? 'a piece' : esc(catLabel(f)).toLowerCase()}</small></button>
      ${shown.map(i => `
        <button class="tile" data-act="edit-item" data-id="${i.id}">
          <div class="ph-wrap">${pic(i)}</div>
          <div class="meta">
            <strong>${esc(i.name)}</strong>
            <div class="tags">
              <span class="dot" style="background:${esc(i.color?.hex)}" title="${esc(i.color?.name)}"></span>
              <span>${esc(i.contrast)}</span>
              ${i.silhouette ? `<span>${esc(i.silhouette)}</span>` : ''}
              ${i.scentMood ? `<span>${esc(i.scentMood)}</span>` : ''}
            </div>
          </div>
        </button>`).join('')}
    </div>
    ${!shown.length ? `<p class="hint center pad">Nothing here yet. Tap + to photograph a piece — colour and contrast are tagged for you.</p>` : ''}
    <p class="hint center" id="storage-note"></p>`;
  S.storageEstimate().then(e => {
    const n = $('#storage-note'); if (!n || !e?.usage) return;
    n.textContent = `Stored privately on this device · ${(e.usage / 1048576).toFixed(1)} MB used`;
  });
}

function wireCloset() {
  $('#view-closet').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'closet-filter') { state.closetFilter = b.dataset.cat; renderCloset(); }
    if (b.dataset.act === 'add-item') openItemSheet(null);
    if (b.dataset.act === 'edit-item') openItemSheet(b.dataset.id);
  });
}

/* ---------- Item sheet (add / edit) ---------- */

function openItemSheet(id) {
  const existing = id ? itemById(id) : null;
  const cat = existing?.category || (state.closetFilter !== 'all' ? state.closetFilter : 'tops');
  const defaults = E.defaultTags(cat);
  state.draft = existing
    ? { ...structuredClone(existing), isNew: false, blob: null, previewUrl: S.photoURLSync(existing.id), nameTouched: true, contrastTouched: true }
    : {
        id: S.newId('i'), isNew: true, category: cat, name: '', subtype: '', color: { hex: '#C9B79C', name: 'Beige' }, contrast: 'Medium',
        silhouette: defaults.silhouette, vibe: [...defaults.vibe], scentMood: defaults.scentMood, fabric: '', notes: '',
        blob: null, previewUrl: '', nameTouched: false, contrastTouched: false, hasColor: false
      };
  renderSheet();
}

function closeSheet() {
  const d = state.draft;
  if (d?.isNew && d.previewUrl) URL.revokeObjectURL(d.previewUrl);
  state.draft = null;
  $('#sheet-root').innerHTML = '';
  document.body.classList.remove('locked');
}

function chipRow(name, options, value, multi) {
  return `<div class="chips">${options.map(o => {
    const on = multi ? value.includes(o) : value === o;
    return `<button type="button" class="chip ${on ? 'on' : ''}" data-chip="${name}" data-v="${esc(o)}">${esc(o)}</button>`;
  }).join('')}</div>`;
}

function renderSheet() {
  const d = state.draft; if (!d) return;
  const cat = E.categoryById(d.category);
  const isPerfume = d.category === 'perfume';
  const showSil = E.usesSilhouette(d.category);
  const showFabric = CLOTHING_CATS.includes(d.category);
  const suggestedName = E.autoName(d.category, d.hasColor || !d.isNew ? d.color.name : '', d.subtype);
  const root = $('#sheet-root');
  const scrollTop = $('.sheet-body', root)?.scrollTop || 0;
  document.body.classList.add('locked');
  root.innerHTML = `
  <div class="backdrop" data-sheet="close"></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-label="${d.isNew ? 'Add piece' : 'Edit piece'}">
    <header class="sheet-head">
      <button class="link" data-sheet="close">Cancel</button>
      <h2>${d.isNew ? 'Add a piece' : 'Edit piece'}</h2>
      <button class="link strong" data-sheet="save">Save</button>
    </header>
    <div class="sheet-body">
      <label class="upload ${d.previewUrl ? 'has' : ''}">
        ${d.previewUrl ? `<img src="${d.previewUrl}" alt="Preview">` : `<span class="plus">+</span><span>Take or choose a photo</span>`}
        <input type="file" accept="image/*" id="photo-input" hidden>
        ${d.previewUrl ? `<span class="change">Change photo</span>` : ''}
      </label>
      <p class="hint center" id="photo-status">${d.previewUrl ? '' : 'Colour and contrast are read from the photo automatically.'}</p>

      <label class="field"><span>Category</span>
        <select id="f-category">${E.CATEGORIES.map(c => `<option value="${c.id}" ${c.id === d.category ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select>
      </label>

      ${cat.subtypes.length ? `<div class="field"><span>Type</span>${chipRow('subtype', cat.subtypes, d.subtype, false)}</div>` : ''}

      <label class="field"><span>Name</span>
        <input id="f-name" type="text" autocomplete="off" value="${esc(d.name)}" placeholder="${esc(suggestedName)}">
      </label>

      <div class="field"><span>Dominant colour</span>
        <div class="color-row">
          <input type="color" id="f-color" value="${esc(d.color.hex)}" aria-label="Pick colour">
          <input id="f-colorname" type="text" value="${esc(d.color.name)}" aria-label="Colour name">
        </div>
      </div>

      <div class="field"><span>Contrast level <small>auto-tagged</small></span>
        ${chipRow('contrast', E.CONTRASTS, d.contrast, false)}
      </div>

      ${showSil ? `<div class="field"><span>Silhouette</span>${chipRow('silhouette', E.SILHOUETTES, d.silhouette, false)}</div>` : ''}
      ${isPerfume
        ? `<div class="field"><span>Scent mood</span>${chipRow('scentMood', E.SCENT_MOODS, d.scentMood, false)}</div>`
        : `<div class="field"><span>Vibe</span>${chipRow('vibe', E.VIBES, d.vibe, true)}</div>`}
      ${showFabric ? `<label class="field"><span>Fabric <small>optional</small></span><input id="f-fabric" type="text" value="${esc(d.fabric)}" placeholder="e.g. Merino wool, silk, cotton poplin"></label>` : ''}
      <label class="field"><span>Notes <small>optional</small></span><textarea id="f-notes" rows="2" placeholder="Anything to remember">${esc(d.notes)}</textarea></label>

      ${d.isNew ? '' : `<button class="btn danger wide" data-sheet="delete">Delete this piece</button>`}
    </div>
  </div>`;
  const body = $('.sheet-body', root); if (body) body.scrollTop = scrollTop;
}

async function handlePhoto(file) {
  const d = state.draft; if (!d || !file) return;
  const status = $('#photo-status');
  if (status) status.textContent = 'Reading colours…';
  try {
    const { blob, color, contrast } = await S.processPhoto(file);
    if (d.previewUrl && d.isNew) URL.revokeObjectURL(d.previewUrl);
    d.blob = blob; d.previewUrl = URL.createObjectURL(blob);
    d.color = color; d.hasColor = true;
    d.contrast = contrast; d.contrastTouched = false;
    if (!d.nameTouched) d.name = '';
    renderSheet();
    const st = $('#photo-status');
    if (st) st.textContent = `Detected ${color.name.toLowerCase()} · ${contrast.toLowerCase()} contrast`;
  } catch (err) {
    if (status) status.textContent = err.message || 'Could not read that photo.';
  }
}

async function saveDraft() {
  const d = state.draft; if (!d) return;
  if (d.isNew && !d.blob) { toast('Add a photo first.'); return; }
  const name = (d.name || '').trim() || E.autoName(d.category, d.color.name, d.subtype);
  const item = {
    id: d.id, category: d.category, name, subtype: d.subtype || '',
    color: d.color, contrast: d.contrast,
    silhouette: E.usesSilhouette(d.category) ? d.silhouette : '',
    vibe: d.category === 'perfume' ? [] : d.vibe,
    scentMood: d.category === 'perfume' ? d.scentMood : '',
    fabric: (d.fabric || '').trim(), notes: (d.notes || '').trim(),
    createdAt: d.createdAt || Date.now(), updatedAt: Date.now()
  };
  try {
    if (d.blob) {
      await S.putPhoto(item.id, d.blob);
      S.revokePhotoURL(item.id);
      await S.getPhotoURL(item.id);
    }
  } catch (err) {
    toast('Could not store the photo — storage may be full.'); return;
  }
  if (!S.saveItem(item)) { toast('Could not save details — storage may be full.'); return; }
  const wasNew = d.isNew;
  if (d.previewUrl && d.isNew) URL.revokeObjectURL(d.previewUrl);
  state.draft = null; $('#sheet-root').innerHTML = ''; document.body.classList.remove('locked');
  refreshItems();
  S.requestPersistence();
  toast(wasNew ? 'Added to your closet' : 'Saved');
  renderCloset();
}

async function deleteDraft() {
  const d = state.draft; if (!d || d.isNew) return;
  if (!confirm(`Delete “${d.name}” permanently? It will also be removed from saved looks.`)) return;
  await S.deleteItem(d.id);
  state.studio.core.delete(d.id);
  Object.keys(state.studio.finish).forEach(k => { if (state.studio.finish[k] === d.id) state.studio.finish[k] = ''; });
  state.draft = null; $('#sheet-root').innerHTML = ''; document.body.classList.remove('locked');
  refreshItems(); toast('Deleted'); renderCloset();
}

function wireSheet() {
  const root = $('#sheet-root');
  root.addEventListener('click', e => {
    const d = state.draft; if (!d) return;
    const sh = e.target.closest('[data-sheet]');
    if (sh) {
      const a = sh.dataset.sheet;
      if (a === 'close') closeSheet();
      if (a === 'save') saveDraft();
      if (a === 'delete') deleteDraft();
      return;
    }
    const chip = e.target.closest('[data-chip]');
    if (chip) {
      const k = chip.dataset.chip, v = chip.dataset.v;
      if (k === 'vibe') d.vibe = d.vibe.includes(v) ? d.vibe.filter(x => x !== v) : [...d.vibe, v];
      else if (k === 'contrast') { d.contrast = v; d.contrastTouched = true; }
      else if (k === 'subtype') { d.subtype = d.subtype === v ? '' : v; }
      else d[k] = d[k] === v && k !== 'contrast' ? '' : v;
      renderSheet();
    }
  });
  root.addEventListener('input', e => {
    const d = state.draft; if (!d) return;
    if (e.target.id === 'f-name') { d.name = e.target.value; d.nameTouched = true; }
    if (e.target.id === 'f-colorname') d.color = { ...d.color, name: e.target.value };
    if (e.target.id === 'f-fabric') d.fabric = e.target.value;
    if (e.target.id === 'f-notes') d.notes = e.target.value;
  });
  root.addEventListener('change', e => {
    const d = state.draft; if (!d) return;
    if (e.target.id === 'photo-input') handlePhoto(e.target.files?.[0]);
    if (e.target.id === 'f-color') {
      d.color = { hex: e.target.value.toUpperCase(), name: E.colorName(e.target.value) };
      d.hasColor = true;
      if (!d.contrastTouched) d.contrast = E.contrastFromHex(e.target.value);
      renderSheet();
    }
    if (e.target.id === 'f-category') {
      d.category = e.target.value;
      const t = E.defaultTags(d.category);
      d.subtype = '';
      d.silhouette = t.silhouette; d.vibe = [...t.vibe]; d.scentMood = t.scentMood;   // smart defaults for the new category
      renderSheet();
    }
  });
}

/* ======================================================================
   TAB 3 — FIT & STYLE LINK CHECKER
   ====================================================================== */

const TYPE_LABELS = { top: 'Top / knitwear', bottom: 'Bottoms', dress: 'Dress', outer: 'Outerwear' };
const FIT_LABELS = { fitted: 'Fitted', regular: 'Regular', relaxed: 'Relaxed', oversized: 'Oversized' };

function renderChecker() {
  const v = $('#view-checker');
  const c = state.checker;
  const checks = S.getChecks();
  v.innerHTML = `
    <header class="page-head"><p class="eyebrow">Fit &amp; Style</p><h1>Link checker</h1>
    <p class="sub">Paste a piece you are considering. I will check size, fabric and what you already own to wear with it.</p></header>

    <section class="card">
      <label class="field"><span>Product link</span>
        <input id="c-url" type="url" inputmode="url" autocapitalize="off" autocorrect="off" placeholder="https://store.com/product…" value="${esc(c.url)}">
      </label>
      <label class="field"><span>Piece name <small>optional</small></span>
        <input id="c-name" type="text" placeholder="e.g. Merino wool wrap cardigan" value="${esc(c.name)}">
      </label>
      <label class="field"><span>Description, fabric &amp; size chart</span>
        <textarea id="c-text" rows="9" placeholder="Paste from the store page:&#10;• description&#10;• composition, e.g. 80% wool, 20% polyamide&#10;• size chart, e.g.&#10;Size  Bust  Waist  Hips  Length&#10;S  98  84  100  62&#10;M  102  88  104  63">${esc(c.text)}</textarea>
      </label>

      <details class="fold sub-fold" ${c.type !== 'auto' || c.fit !== 'auto' || c.kind !== 'auto' ? 'open' : ''}>
        <summary>Adjust what I detect</summary>
        <div class="finish-grid">
          <label class="field"><span>Garment</span><select id="c-type">
            <option value="auto">Auto-detect</option>${Object.entries(TYPE_LABELS).map(([k, l]) => `<option value="${k}" ${c.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="field"><span>Intended fit</span><select id="c-fit">
            <option value="auto">Auto-detect</option>${Object.entries(FIT_LABELS).map(([k, l]) => `<option value="${k}" ${c.fit === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="field"><span>Size chart shows</span><select id="c-kind">
            <option value="auto" ${c.kind === 'auto' ? 'selected' : ''}>Auto-detect</option>
            <option value="garment" ${c.kind === 'garment' ? 'selected' : ''}>Garment measurements</option>
            <option value="body" ${c.kind === 'body' ? 'selected' : ''}>Body size chart</option></select></label>
          <div class="field"><span>Piece colour</span>
            <div class="color-row">
              <input type="color" id="c-color" value="${esc(c.color?.hex || '#C9B79C')}" aria-label="Piece colour">
              <label class="btn ghost small">From photo<input type="file" accept="image/*" id="c-photo" hidden></label>
            </div>
            <small class="hint">${c.color ? `Using ${esc(c.color.name)}` : 'Detected from the text when possible'}</small>
          </div>
        </div>
      </details>

      <div class="row gap">
        <button class="btn primary grow" data-act="analyse">Analyse piece</button>
        <button class="btn ghost" data-act="open-url">Open store ↗</button>
      </div>
    </section>

    <div id="check-report"></div>

    ${checks.length ? `
      <h2 class="section-title">Saved pieces <span>${checks.length}</span></h2>
      ${checks.map(k => `
        <div class="card saved-check">
          <div class="grow" data-act="reopen-check" data-id="${k.id}">
            <strong>${esc(k.name || 'Untitled piece')}</strong>
            <small>${esc(k.host || '')} ${k.label ? '· ' + esc(k.label) : ''}</small>
          </div>
          <button class="link" data-act="delete-check" data-id="${k.id}" aria-label="Delete saved piece">Delete</button>
        </div>`).join('')}` : ''}
  `;
  renderReport();
}

function currentChecker() {
  const c = state.checker;
  c.url = $('#c-url')?.value.trim() ?? c.url;
  c.name = $('#c-name')?.value.trim() ?? c.name;
  c.text = $('#c-text')?.value ?? c.text;
  c.type = $('#c-type')?.value ?? c.type;
  c.fit = $('#c-fit')?.value ?? c.fit;
  c.kind = $('#c-kind')?.value ?? c.kind;
  return c;
}

function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } }

function runAnalysis(c) {
  const profile = S.getProfile();
  const blob = [c.name, c.url, c.text].join(' ');
  const type = c.type === 'auto' ? E.detectGarmentType(c.name + ' ' + c.text.slice(0, 600) + ' ' + c.url) : c.type;
  const fit = c.fit === 'auto' ? E.detectFit(c.text + ' ' + c.name) : c.fit;
  const parsed = E.parseSizeChart(c.text);
  const size = E.recommendSize(profile, { rows: parsed.rows, meta: parsed.meta, type, fit, kind: c.kind });
  const fabric = E.evaluateFabric(c.text);
  const color = c.color || E.detectColor(blob);
  const groups = E.matchCloset(state.items, { type, fit, color });
  const verdict = E.overallVerdict({ size, fabric, groups });
  return { type, fit, parsed, size, fabric, color, groups, verdict, profile };
}

function renderReport() {
  const box = $('#check-report'); if (!box) return;
  const r = state.checker.report;
  if (!r) { box.innerHTML = ''; return; }
  const { size, fabric, groups, verdict, color, type, fit, parsed, profile } = r;

  const sizeHtml = size.ok ? `
    <div class="big-size"><span>${esc(size.size)}</span>
      <div><strong>${size.confident ? 'Recommended size' : 'Best available size'}</strong>
      <small>${size.alt ? `Also consider ${esc(size.alt)} — it is close. ` : ''}${size.confident ? '' : 'No size is a perfect match for your measurements.'}</small></div></div>
    <ul class="bullets">${size.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
    ${size.sizingTip ? `<p class="note">${esc(size.sizingTip)}</p>` : ''}
    ${size.lengthNote ? `<p class="note">${esc(size.lengthNote)}</p>` : ''}
    ${size.sleeve ? `<p class="note">${esc(size.sleeve)}</p>` : ''}
    ${size.flatNote ? `<p class="hint">${esc(size.flatNote)}</p>` : ''}
    ${size.unitNote ? `<p class="hint">${esc(size.unitNote)}</p>` : ''}
    <details class="fold sub-fold"><summary>Size chart I read</summary>
      <div class="table-wrap"><table><thead><tr><th>Size</th>${['bust', 'waist', 'hips', 'shoulder', 'length', 'sleeve', 'inseam'].filter(k => parsed.rows.some(x => x[k])).map(k => `<th>${k}</th>`).join('')}</tr></thead>
      <tbody>${parsed.rows.map(x => `<tr class="${x.size === size.size ? 'hit' : ''}"><td>${esc(x.size)}</td>${['bust', 'waist', 'hips', 'shoulder', 'length', 'sleeve', 'inseam'].filter(k => parsed.rows.some(y => y[k])).map(k => `<td>${x[k] ?? '–'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    </details>`
    : `<p class="note warn">${esc(size.message)}</p>`;

  const fabricHtml = fabric.ok ? `
    <div class="meter"><div class="bar"><i style="width:${fabric.score * 10}%"></i></div><strong>${fabric.score}/10</strong></div>
    <p class="verdict-line">${esc(fabric.verdict)}</p>
    <div class="chips static">${fabric.fibres.map(f => `<span class="chip">${f.pct}% ${esc(f.name)}</span>`).join('')}<span class="chip gold">${esc(fabric.warmth)}</span></div>
    <ul class="bullets">${fabric.flags.map(f => `<li>${esc(f)}</li>`).join('')}</ul>`
    : `<p class="note warn">${esc(fabric.message)}</p>`;

  const matchHtml = state.items.length ? groups.map(g => `
    <div class="match-group">
      <h4>${esc(g.label)} <small>${g.matches.length ? `${g.matches.length} of ${g.total}` : ''}</small></h4>
      ${g.matches.length ? `<div class="match-row">${g.matches.map(m => `
        <div class="match"><div class="ph-wrap">${pic(m.item)}</div><strong>${esc(m.item.name)}</strong><small>${esc(m.why)}</small></div>`).join('')}</div>`
        : `<p class="hint">${g.total ? 'Nothing in your closet pairs strongly here.' : 'None in your closet yet.'}</p>`}
    </div>`).join('')
    : `<p class="note">Add pieces to your closet and I will show what you already own to pair with this.</p>`;

  box.innerHTML = `
    <section class="card verdict">
      <div class="ring" style="--p:${verdict.pct}"><span>${verdict.pct}</span></div>
      <div><p class="eyebrow">Overall</p><h3>${esc(verdict.label)}</h3><p class="sub">${esc(verdict.summary)}</p></div>
    </section>
    <p class="hint center">Read as: <strong>${esc(TYPE_LABELS[type])}</strong> · <strong>${esc(FIT_LABELS[fit])}</strong> fit${color ? ` · <strong>${esc(color.name)}</strong>` : ''} · for ${profile.height} cm, bust ${profile.bust}, waist ${profile.waist}, hips ${profile.hips}</p>
    <section class="card"><h2 class="section-h">Fit &amp; size</h2>${sizeHtml}</section>
    <section class="card"><h2 class="section-h">Fabric quality</h2>${fabricHtml}</section>
    <section class="card"><h2 class="section-h">Already in your closet</h2>${matchHtml}</section>
    <button class="btn ghost wide" data-act="save-check">Save this piece</button>`;
}

function wireChecker() {
  const v = $('#view-checker');
  v.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const c = state.checker;
    switch (b.dataset.act) {
      case 'analyse': {
        currentChecker();
        if (!c.text.trim()) { toast('Paste the description, fabric and size chart first.'); return; }
        c.report = runAnalysis(c);
        renderReport();
        $('#check-report').scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
      case 'open-url': {
        currentChecker();
        try { const u = new URL(c.url); if (!/^https?:$/.test(u.protocol)) throw 0; window.open(u.href, '_blank', 'noopener'); }
        catch { toast('Paste a valid https:// link first.'); }
        break;
      }
      case 'save-check': {
        currentChecker();
        const rep = c.report;
        S.saveCheck({
          id: c.activeId || S.newId('c'), url: c.url, name: c.name || (rep && TYPE_LABELS[rep.type]) || 'Saved piece', text: c.text,
          type: c.type, fit: c.fit, kind: c.kind, color: c.color, host: hostOf(c.url),
          label: rep ? `${rep.verdict.label}${rep.size.ok ? ' · ' + rep.size.size : ''}` : '', savedAt: Date.now()
        });
        toast('Piece saved'); renderChecker();
        break;
      }
      case 'reopen-check': {
        const k = S.getChecks().find(x => x.id === b.dataset.id); if (!k) return;
        Object.assign(c, { url: k.url, name: k.name, text: k.text, type: k.type, fit: k.fit, kind: k.kind, color: k.color, activeId: k.id });
        c.report = runAnalysis(c); renderChecker(); window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      }
      case 'delete-check': {
        e.stopPropagation(); S.removeCheck(b.dataset.id); renderChecker(); break;
      }
    }
  });
  v.addEventListener('change', async e => {
    const c = state.checker;
    if (e.target.id === 'c-color') { c.color = { hex: e.target.value.toUpperCase(), name: E.colorName(e.target.value) }; currentChecker(); renderChecker(); }
    if (e.target.id === 'c-photo' && e.target.files?.[0]) {
      currentChecker();
      try { const col = await S.colorFromFile(e.target.files[0]); c.color = { hex: col.hex, name: col.name }; toast(`Detected ${col.name.toLowerCase()}`); }
      catch { toast('Could not read that photo.'); }
      renderChecker();
    }
    if (['c-type', 'c-fit', 'c-kind'].includes(e.target.id)) currentChecker();
  });
  v.addEventListener('input', e => { if (['c-url', 'c-name', 'c-text'].includes(e.target.id)) currentChecker(); });
}

/* ======================================================================
   TAB 4 — PROFILE & PROPORTIONS
   ====================================================================== */

const MEASURES = [
  { k: 'height', label: 'Height', unit: 'cm' }, { k: 'weight', label: 'Weight', unit: 'kg' },
  { k: 'bust', label: 'Bust', unit: 'cm' }, { k: 'waist', label: 'Waist', unit: 'cm' },
  { k: 'hips', label: 'Hips', unit: 'cm' }, { k: 'shoulder', label: 'Shoulder width', unit: 'cm' }
];
const SIZES = [
  { k: 'topSize', label: 'Top size' }, { k: 'bottomSize', label: 'Bottom size' },
  { k: 'coatSize', label: 'Coat size' }, { k: 'shoeSize', label: 'Shoe size (EU)' }
];

function proportionSummary(p) {
  const bust = +p.bust, waist = +p.waist, hips = +p.hips, h = +p.height, w = +p.weight;
  const whr = waist / hips;
  const shape = Math.abs(bust - hips) <= 6 && waist / ((bust + hips) / 2) <= 0.82 ? 'balanced, hourglass-leaning'
    : hips - bust > 6 ? 'pear-leaning' : bust - hips > 6 ? 'inverted-triangle-leaning' : 'straight-leaning';
  const bmi = w / ((h / 100) ** 2);
  return { whr: whr.toFixed(2), shape, bmi: bmi.toFixed(1) };
}

function renderProfile() {
  const v = $('#view-profile');
  const p = S.getProfile();
  const sum = proportionSummary(p);
  const r = E.idealRanges(p);
  v.innerHTML = `
    <header class="page-head"><p class="eyebrow">My Profile</p><h1>Proportions</h1>
    <p class="sub">Every size recommendation uses these numbers. Edit anytime — changes save automatically.</p></header>

    <section class="card">
      <h2 class="section-h">Body measurements</h2>
      <div class="form-grid">
        ${MEASURES.map(m => `<label class="field"><span>${m.label}</span><div class="unit-input"><input data-p="${m.k}" type="number" inputmode="decimal" step="0.5" min="0" value="${esc(p[m.k])}"><em>${m.unit}</em></div></label>`).join('')}
      </div>
      <p class="hint">Shoulder width is optional (38 cm is a typical estimate for 170 cm).</p>
    </section>

    <section class="card">
      <h2 class="section-h">Your usual sizes</h2>
      <div class="form-grid">
        ${SIZES.map(m => `<label class="field"><span>${m.label}</span><input data-p="${m.k}" type="text" autocomplete="off" value="${esc(p[m.k])}"></label>`).join('')}
      </div>
    </section>

    <section class="card">
      <h2 class="section-h">Personal style guidelines</h2>
      <textarea data-p="guidelines" rows="5">${esc(p.guidelines)}</textarea>
      <div class="chips static pad-top">
        ${['Comfort first', 'Warmth', 'Timeless silhouettes', 'Light/medium vs dark balance'].map(t => `<span class="chip gold">${t}</span>`).join('')}
      </div>
    </section>

    <section class="card">
      <h2 class="section-h">Your proportions at a glance</h2>
      <div class="stats">
        <div><strong>${sum.whr}</strong><small>waist-to-hip</small></div>
        <div><strong>${esc(sum.shape.split(',')[0])}</strong><small>shape</small></div>
        <div><strong>${sum.bmi}</strong><small>BMI</small></div>
      </div>
      <p class="note">${esc(`Proportions read as ${sum.shape}. Define the waist, keep volume to one half of the outfit, and let length do the work at ${p.height} cm.`)}</p>
      <h4 class="notes-title">Target garment measurements</h4>
      <div class="table-wrap"><table>
        <thead><tr><th></th><th>Fitted</th><th>Regular</th><th>Oversized</th></tr></thead>
        <tbody>
          <tr><td>Top · bust</td><td>${r.top.fitted}</td><td>${r.top.regular}</td><td>${r.top.oversized}</td></tr>
          <tr><td>Coat · bust</td><td>${r.coat.fitted}</td><td>${r.coat.regular}</td><td>${r.coat.oversized}</td></tr>
          <tr><td>Skirt/trouser · waist</td><td>${r.waist.fitted}</td><td>${r.waist.regular}</td><td>${r.waist.oversized}</td></tr>
          <tr><td>Skirt/trouser · hips</td><td>${r.hips.fitted}</td><td>${r.hips.regular}</td><td>${r.hips.oversized}</td></tr>
        </tbody></table></div>
      <p class="hint">Garment measurements in cm, flat-doubled (full circumference).</p>
    </section>

    <section class="card">
      <h2 class="section-h">Backup &amp; export</h2>
      <p class="hint">Your photos live only on this device. Save a backup file regularly — to iCloud Drive or Files — so you can restore them on a new phone or if Safari clears its data.</p>
      <button class="btn primary wide" data-act="export-backup">Export full backup (.json)</button>
      <button class="btn ghost wide" data-act="export-csv">Export closet list (.csv)</button>
      <label class="btn ghost wide">Restore from backup<input type="file" id="restore-input" accept="application/json,.json" hidden></label>
      <p class="hint" id="backup-status"></p>
    </section>

    <button class="btn ghost wide" data-act="reset-profile">Reset to my starting profile</button>
    <p class="hint center" id="profile-saved"></p>
  `;
}

/** Share sheet on iPhone (Save to Files / iCloud Drive); normal download elsewhere. */
async function deliverFile(blob, filename) {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: filename }); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function wireProfile() {
  const v = $('#view-profile');
  let t;
  v.addEventListener('change', async e => {
    if (e.target.id === 'restore-input') {
      const f = e.target.files?.[0]; e.target.value = '';
      if (!f) return;
      const replace = confirm('Restore this backup?\n\nOK = replace everything on this device with the backup.\nCancel = choose merge instead.');
      const merge = !replace && confirm('Merge the backup into your current closet (keeps what you have)?');
      if (!replace && !merge) return;
      const st = $('#backup-status'); if (st) st.textContent = 'Restoring…';
      try {
        const r = await S.restoreBackup(f, replace ? 'replace' : 'merge');
        refreshItems(); renderProfile(); toast(`Restored ${r.items} pieces`);
      } catch (err) { if (st) st.textContent = err.message || 'Restore failed.'; }
      return;
    }
    const k = e.target.dataset?.p; if (!k) return;
    const p = S.getProfile();
    const val = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    if (e.target.type === 'number' && !(val > 0)) { toast('Enter a number above 0.'); e.target.value = p[k]; return; }
    p[k] = val; S.saveProfile(p);
    const n = $('#profile-saved'); if (n) { n.textContent = 'Saved ✓'; clearTimeout(t); t = setTimeout(() => { n.textContent = ''; }, 1500); }
    if (e.target.type === 'number') renderProfile();
  });
  v.addEventListener('click', async e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'export-backup' || act === 'export-csv') {
      const st = $('#backup-status');
      try {
        if (st) st.textContent = 'Preparing…';
        const out = act === 'export-csv' ? S.createCSV() : await S.createBackup();
        await deliverFile(out.blob, out.filename);
        if (st) st.textContent = act === 'export-csv' ? 'Closet list exported.' : `Backup ready · ${out.count} piece${out.count === 1 ? '' : 's'} with photos.`;
      } catch (err) {
        if (err?.name !== 'AbortError' && st) st.textContent = 'Export failed: ' + (err.message || err);
        else if (st) st.textContent = '';
      }
      return;
    }
    if (e.target.closest('[data-act="reset-profile"]') && confirm('Reset all profile values to your starting profile?')) {
      S.resetProfile(); localStorage.removeItem('qc.profile.v1'); renderProfile(); toast('Profile reset');
    }
  });
}

/* ======================================================================
   BOOT
   ====================================================================== */

async function boot() {
  refreshItems();
  wireStudio(); wireCloset(); wireSheet(); wireChecker(); wireProfile();
  $$('#tabbar .tab').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
  await S.preloadPhotos(state.items.map(i => i.id));
  let start = 'studio';
  try { start = sessionStorage.getItem('qc.tab') || 'studio'; } catch {}
  showTab(start);
  S.requestPersistence();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW failed', err));
  }
}
boot();
