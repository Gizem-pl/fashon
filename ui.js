/* ui.js — DOM rendering and event wiring only.
   Data comes from wardrobeStore.js, decisions come from stylistEngine.js. */

import * as S from './wardrobeStore.js';
import * as E from './stylistEngine.js';
import * as G from './geminiStylist.js';

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
  studio: { core: new Set(), pickFilter: 'all', moodText: '', moodChips: [], finish: {}, result: null, openFinish: false,
            seg: 'create', collapsed: false, addingMood: false },
  checker: { url: '', name: '', text: '', type: 'auto', fit: 'auto', kind: 'auto', color: null, report: null, activeId: null,
             product: null, shots: [], reading: false, ai: null, aiBusy: false, openManual: false },
  chat: { text: '', photo: null, photoUrl: '', busy: false, ctrl: null },
  draft: null,
  wear: null,            // outfit-diary sheet draft
  openWear: null,        // diary entry currently expanded
  aiBusy: new Set()      // diary entries waiting on Gemini
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
  if (name === 'stylist') renderStylist();
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
      <header class="page-head"><p class="eyebrow">${greeting()}</p><h1>Outfit <em>Studio</em></h1>
      <p class="sub">Two considered looks, built from the pieces you already own.</p></header>
      <div class="empty card">
        <h2>Your closet is empty</h2>
        <p>Photograph a few pieces first — a sweater, a skirt, trousers, a coat — and I will style them.</p>
        <button class="btn primary" data-act="goto-closet">Add your first piece</button>
      </div>`;
    return;
  }

  const looks = S.getLooks().length, wears = S.getWears().length;
  const seg = (id, label, n) => `<button class="seg-btn ${s.seg === id ? 'on' : ''}" data-act="seg" data-seg="${id}" aria-pressed="${s.seg === id}">${label}${n ? ` <small>${n}</small>` : ''}</button>`;
  v.innerHTML = `
    <header class="page-head"><p class="eyebrow">${greeting()}</p><h1>Outfit <em>Studio</em></h1></header>
    <nav class="seg" aria-label="Studio sections">${seg('create', 'Create')}${seg('saved', 'Saved', looks)}${seg('diary', 'Diary', wears)}</nav>
    ${s.seg === 'saved' ? '<div id="studio-saved"></div>' : s.seg === 'diary' ? '<div id="studio-diary"></div>' : studioCreateHTML(clothing)}
  `;
  if (s.seg === 'create') { if (!(s.result && s.collapsed)) renderPicker(); renderResults(); }
  if (s.seg === 'saved') renderSavedLooks();
  if (s.seg === 'diary') renderDiary();
}

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Late night edit' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/** The look builder, or — once looks are generated — a one-line summary of what they were built from. */
function studioCreateHTML() {
  const s = state.studio;
  if (s.result && !s.result.error && s.collapsed) {
    const core = [...s.core].map(itemById).filter(Boolean);
    const moods = [...s.moodChips, s.moodText].filter(Boolean).join(' · ');
    return `
    <section class="card brief">
      <div class="mini">${core.slice(0, 4).map(i => `<span>${pic(i)}</span>`).join('')}</div>
      <div class="grow"><p class="eyebrow">Built around</p><strong>${esc(core.map(i => i.name).join(', ') || 'Your pieces')}</strong>
        ${moods ? `<small>${esc(moods)}</small>` : ''}</div>
      <button class="btn ghost small" data-act="edit-brief">Edit</button>
    </section>
    <div id="studio-results"></div>
    <p class="center"><button class="link" data-act="start-over">Start over</button></p>`;
  }
  return `
    <section class="card step-card">
      <div class="step-row">
        <h2 class="step"><span>01</span>Core piece</h2>
        <button class="btn ghost small" data-act="surprise">✦ Surprise me</button>
      </div>
      <div class="pills" id="pick-filters"></div>
      <div class="pick-grid" id="pick-grid"></div>
      <div class="row between">
        <span class="hint" id="core-count"></span>
        <button class="link" data-act="clear-core">Clear</button>
      </div>
    </section>

    <section class="card step-card">
      <h2 class="step"><span>02</span>Mood</h2>
      <input id="mood-text" type="text" inputmode="text" autocomplete="off" aria-label="How do you want to feel today?" placeholder="How do you want to feel? e.g. calm, warm, quietly confident" value="${esc(s.moodText)}">
      <div class="chips" id="mood-chips">${moodChipsHTML()}</div>
      ${s.addingMood ? `
      <div class="add-mood">
        <input id="new-mood" type="text" autocomplete="off" maxlength="24" placeholder="Name it, e.g. Gallery opening">
        <select id="new-mood-base" aria-label="Feels most like">
          ${E.MOODS.map(m => `<option value="${esc(m)}">Feels like ${esc(m)}</option>`).join('')}
        </select>
        <button class="btn ghost small" data-act="add-mood">Add</button>
      </div>` : ''}
    </section>

    <details class="card fold step-card" id="finish-fold" ${s.openFinish ? 'open' : ''}>
      <summary><h2 class="step"><span>03</span>Finishing touches <em>optional</em></h2></summary>
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

    <button class="btn primary wide big" data-act="generate">Style me</button>
    <p class="center"><button class="link" data-act="start-over">Start over</button></p>

    <div id="studio-results"></div>`;
}

function moodChipsHTML() {
  const on = new Set(state.studio.moodChips);
  const builtin = E.MOODS.map(m => `<button class="chip ${on.has(m) ? 'on' : ''}" data-act="mood-chip" data-mood="${esc(m)}" aria-pressed="${on.has(m)}">${esc(m)}</button>`);
  const custom = S.getCustomMoods().map(m => `<span class="chipset"><button class="chip ${on.has(m.name) ? 'on' : ''}" data-act="mood-chip" data-mood="${esc(m.name)}" aria-pressed="${on.has(m.name)}">${esc(m.name)}</button><button class="chipx" data-act="del-mood" data-id="${m.id}" aria-label="Remove ${esc(m.name)}">×</button></span>`);
  const add = `<button class="chip add" data-act="toggle-add-mood" aria-expanded="${state.studio.addingMood}">${state.studio.addingMood ? '× Close' : '+ Your own'}</button>`;
  return [...builtin, ...custom, add].join('');
}

/** Selected mood names → what the engine needs (custom moods carry the built-in mood they inherit from). */
function moodPicks() {
  const custom = S.getCustomMoods();
  return state.studio.moodChips.map(n => custom.find(m => m.name === n) || n);
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
    <button class="btn ghost wide" data-act="wore-look" data-look-id="${look.id}">I wore this · add a photo</button>
  </article>`;
}

function updateSegCounts() {
  const n = { saved: S.getLooks().length, diary: S.getWears().length };
  $$('#view-studio .seg-btn').forEach(b => {
    const k = b.dataset.seg; if (!(k in n)) return;
    b.innerHTML = `${k === 'saved' ? 'Saved' : 'Diary'}${n[k] ? ` <small>${n[k]}</small>` : ''}`;
  });
}

function renderResults() {
  const box = $('#studio-results');
  if (!box) return;
  const r = state.studio.result;
  if (!r) { box.innerHTML = ''; return; }
  if (r.error) { box.innerHTML = `<p class="note warn">${esc(r.error)}</p>`; return; }
  box.innerHTML = `
    <div class="result-head"><p class="eyebrow">Today · ${esc(r.mood)}</p><h2>Feeling ${esc(r.feeling)}</h2></div>
    ${(r.warnings || []).map(w => `<p class="note warn">${esc(w)}</p>`).join('')}
    ${r.looks.map((l, i) => lookCard(l, i, S.isLookSaved(l.id))).join('')}
    <button class="btn ghost wide" data-act="generate">↻ Restyle</button>`;
}

function renderSavedLooks() {
  const box = $('#studio-saved');
  if (!box) return;
  const looks = S.getLooks();
  if (!looks.length) { box.innerHTML = `<div class="empty quiet"><p class="lede">Nothing saved yet</p><p>Tap ♥ on any look — from the Studio or your Stylist — to keep it here.</p></div>`; return; }
  box.innerHTML = `
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
  s.core.clear(); s.moodText = ''; s.moodChips = []; s.finish = {}; s.result = null; s.openFinish = false; s.pickFilter = 'all';
  s.collapsed = false; s.addingMood = false;
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
  const history = E.learnFromWears(S.getWears(), all);
  s.result = E.buildLooks({ items: all, coreIds: [...s.core], moodText: s.moodText, moodChips: moodPicks(), finish, history });
  s.collapsed = !s.result.error;
  renderStudio();
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
      case 'seg': s.seg = b.dataset.seg; renderStudio(); break;
      case 'edit-brief': s.collapsed = false; renderStudio(); break;
      case 'toggle-add-mood': s.addingMood = !s.addingMood; renderStudio(); if (s.addingMood) $('#new-mood')?.focus(); break;
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
        const m = b.dataset.mood;
        if (s.moodChips.includes(m)) s.moodChips = s.moodChips.filter(x => x !== m);
        else if (s.moodChips.length >= 3) { toast('Pick up to 3 moods to blend.'); break; }
        else s.moodChips = [...s.moodChips, m];
        $('#mood-chips').innerHTML = moodChipsHTML();
        staleResult();
        break;
      }
      case 'add-mood': {
        const input = $('#new-mood'), name = (input.value || '').trim();
        if (!name) { toast('Type a name for your mood first.'); break; }
        if (E.MOODS.some(m => m.toLowerCase() === name.toLowerCase())) { toast('That mood already exists.'); break; }
        if (!S.saveCustomMood({ name, base: $('#new-mood-base').value })) { toast('Could not save — storage may be full.'); break; }
        if (s.moodChips.length < 3 && !s.moodChips.includes(name)) s.moodChips = [...s.moodChips, name];
        input.value = ''; s.addingMood = false;
        renderStudio();
        staleResult(); toast(`Added “${name}”`);
        break;
      }
      case 'del-mood': {
        const m = S.getCustomMoods().find(x => x.id === b.dataset.id);
        S.removeCustomMood(b.dataset.id);
        if (m) s.moodChips = s.moodChips.filter(x => x !== m.name);
        $('#mood-chips').innerHTML = moodChipsHTML();
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
        renderResults(); renderSavedLooks(); updateSegCounts();
        break;
      }
      case 'wore-look': {
        const id = b.dataset.lookId;
        const look = s.result?.looks?.find(l => l.id === id) || S.getLooks().find(l => l.id === id);
        if (look) openWearSheet({ look });
        break;
      }
      case 'edit-wear': openWearSheet({ wearId: b.dataset.id }); break;
      case 'ai-wear': askAIForEntry(b.dataset.id); break;
      case 'del-wear': {
        if (!confirm('Delete this outfit from your diary? The photo will be removed too.')) break;
        S.deleteWear(b.dataset.id).then(() => { renderDiary(); updateSegCounts(); toast('Removed from your diary'); });
        break;
      }
    }
  });
  v.addEventListener('input', e => {
    if (e.target.id === 'mood-text') {
      state.studio.moodText = e.target.value;
      staleResult();
    }
  });
  v.addEventListener('change', e => {
    const k = e.target.dataset?.finish;
    if (k) { state.studio.finish[k] = e.target.value; staleResult(); }
  });
  v.addEventListener('toggle', e => {
    if (e.target.id === 'finish-fold') state.studio.openFinish = e.target.open;
    const wid = e.target.dataset?.wearId;
    if (wid) { if (e.target.open) state.openWear = wid; else if (state.openWear === wid) state.openWear = null; }
  }, true);
}

/* ======================================================================
   OUTFIT DIARY — "I wore this": photo, how it felt, what you noticed, optional AI advice.
   Every entry feeds E.learnFromWears, so the next looks are scored with it. The AI's private score is never shown.
   ====================================================================== */

const WEAR_PHOTO_W = 1024;   // larger than closet photos so the AI can see fit and proportion
const feelLabel = id => E.WEAR_FEELS.find(f => f.id === id)?.label || '';
const dateInput = ts => { const d = new Date(ts); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const niceDate = ts => new Date(ts).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

function wearPic(w, cls = '') {
  const u = w.hasPhoto ? S.photoURLSync(w.id) : '';
  return u ? `<img class="${cls}" src="${u}" alt="Outfit worn ${esc(niceDate(w.wornAt))}" decoding="async">` : '';
}

function aiAdviceHTML(ai) {
  if (!ai) return '';
  return `<div class="ai-advice">
    <p class="eyebrow">AI stylist</p>
    ${ai.summary ? `<p class="verdict-line">${esc(ai.summary)}</p>` : ''}
    ${ai.works?.length ? `<h5>What works</h5><ul class="bullets">${ai.works.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    ${ai.change?.length ? `<h5>Try next time</h5><ul class="bullets">${ai.change.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
  </div>`;
}

function renderDiary() {
  const box = $('#studio-diary');
  if (!box) return;
  const wears = S.getWears();
  if (!wears.length) { box.innerHTML = `<div class="empty quiet"><p class="lede">Your diary is empty</p><p>Tap “I wore this” under any look to log it with a photo. Every entry teaches the stylist what works on you.</p></div>`; return; }
  const hasKey = !!S.getAISettings().key;
  box.innerHTML = `
    <p class="hint">Every outfit you log teaches the stylist what works on you.</p>
    ${wears.map(w => {
      const pieces = (w.itemIds || w.pieceIds || []).map(itemById).filter(Boolean);
      const busy = state.aiBusy.has(w.id);
      const aiBtn = !w.hasPhoto ? '' : !hasKey
        ? `<p class="hint">Add your Gemini key in Profile to get AI feedback on this photo.</p>`
        : `<button class="btn ghost wide" data-act="ai-wear" data-id="${w.id}" ${busy ? 'disabled' : ''}>${busy ? 'Looking at your photo…' : w.ai ? '↻ Ask the AI again' : '✦ Get AI feedback'}</button>`;
      return `
      <details class="card saved wear" data-wear-id="${w.id}" ${state.openWear === w.id ? 'open' : ''}>
        <summary>
          <div class="wear-thumb">${wearPic(w) || `<div class="mini">${pieces.slice(0, 3).map(i => `<span>${pic(i)}</span>`).join('')}</div>`}</div>
          <div class="grow"><strong>${esc(w.title || 'Outfit')}</strong><small>${esc(niceDate(w.wornAt))}${w.feel ? ' · ' + esc(feelLabel(w.feel)) : ''}</small></div>
        </summary>
        <div class="wear-body">
          ${w.hasPhoto ? `<div class="wear-photo">${wearPic(w)}</div>` : ''}
          ${pieces.length ? `<p class="legend">${pieces.map(p => `<span><i style="background:${esc(p.color?.hex)}"></i>${esc(p.name)}</span>`).join('')}</p>` : ''}
          ${w.tags?.length ? `<div class="chips static">${w.tags.map(t => `<span class="chip ${E.WEAR_TAGS.good.includes(t) ? 'gold' : ''}">${esc(t)}</span>`).join('')}</div>` : ''}
          ${w.notes ? `<p class="note">${esc(w.notes)}</p>` : ''}
          ${aiAdviceHTML(w.ai)}
          ${aiBtn}
          <div class="row gap pad-top">
            <button class="btn ghost grow" data-act="edit-wear" data-id="${w.id}">Edit</button>
            <button class="btn danger" data-act="del-wear" data-id="${w.id}">Delete</button>
          </div>
        </div>
      </details>`;
    }).join('')}`;
}

function openWearSheet({ look, wearId }) {
  const ex = wearId ? S.getWears().find(w => w.id === wearId) : null;
  if (wearId && !ex) return;
  state.wear = ex
    ? { ...structuredClone(ex), isNew: false, blob: null, previewUrl: ex.hasPhoto ? S.photoURLSync(ex.id) : '', ownUrl: false, busy: false }
    : {
        id: S.newId('w'), isNew: true, lookId: look.id, title: look.title, mood: look.mood,
        pieceIds: [...(look.pieceIds?.length ? look.pieceIds : look.itemIds)], itemIds: [...look.itemIds],
        feel: '', tags: [], notes: '', ai: null, wornAt: Date.now(), hasPhoto: false,
        blob: null, previewUrl: '', ownUrl: false, busy: false
      };
  renderWearSheet();
}

function closeWearSheet() {
  const w = state.wear;
  if (w?.ownUrl && w.previewUrl) URL.revokeObjectURL(w.previewUrl);
  state.wear = null;
  $('#sheet-root').innerHTML = '';
  document.body.classList.remove('locked');
}

function wChips(name, options, value, multi) {
  return `<div class="chips">${options.map(o => {
    const id = typeof o === 'string' ? o : o.id, label = typeof o === 'string' ? o : o.label;
    const on = multi ? value.includes(id) : value === id;
    return `<button type="button" class="chip ${on ? 'on' : ''}" data-wchip="${name}" data-v="${esc(id)}" aria-pressed="${on}">${esc(label)}</button>`;
  }).join('')}</div>`;
}

const WSEC = {
  photo: w => `
    <label class="upload tall ${w.previewUrl ? 'has' : ''}">
      ${w.previewUrl ? `<img src="${w.previewUrl}" alt="Your outfit">` : `<span class="plus">+</span><span>Add a photo of you wearing it</span>`}
      <input type="file" accept="image/*" id="wear-photo" hidden>
      ${w.previewUrl ? `<span class="change">Change photo</span>` : ''}
    </label>
    <p class="hint center">A full-length mirror photo works best.</p>`,
  feel: w => `<span>How did it feel?</span>${wChips('feel', E.WEAR_FEELS, w.feel, false)}`,
  tags: w => `<span>What did you notice? <small>pick any</small></span>
    <p class="hint">Worked</p>${wChips('tag', E.WEAR_TAGS.good, w.tags, true)}
    <p class="hint">Didn’t work</p>${wChips('tag', E.WEAR_TAGS.bad, w.tags, true)}`,
  ai: w => {
    const hasKey = !!S.getAISettings().key;
    let btn;
    if (!w.previewUrl) btn = `<p class="hint">Add a photo to get feedback from your AI stylist.</p>`;
    else if (!hasKey) btn = `<p class="hint">Add your Gemini key in Profile to get AI feedback on this photo.</p>`;
    else btn = `<button type="button" class="btn ghost wide" data-wear="ai" ${w.busy ? 'disabled' : ''}>${w.busy ? 'Looking at your photo…' : w.ai ? '↻ Ask the AI again' : '✦ Get AI feedback'}</button>`;
    return aiAdviceHTML(w.ai) + btn;
  }
};

function refreshWear(...keys) {
  const w = state.wear; if (!w) return;
  keys.forEach(k => { const el = $('#wsec-' + k); if (el) el.innerHTML = WSEC[k](w); });
}

function renderWearSheet() {
  const w = state.wear; if (!w) return;
  document.body.classList.add('locked');
  const sec = (k, cls = 'field') => `<div class="${cls}" id="wsec-${k}">${WSEC[k](w)}</div>`;
  $('#sheet-root').innerHTML = `
  <div class="backdrop" data-wear="close"></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-label="I wore this">
    <header class="sheet-head">
      <button class="link" data-wear="close">Cancel</button>
      <h2>${w.isNew ? 'I wore this' : 'Edit diary entry'}</h2>
      <button class="link strong" data-wear="save">Save</button>
    </header>
    <div class="sheet-body">
      <p class="eyebrow">${esc(w.title || 'Outfit')}${w.mood ? ' · ' + esc(w.mood) : ''}</p>
      ${sec('photo', 'plain')}
      <label class="field"><span>Worn on</span><input id="w-date" type="date" value="${dateInput(w.wornAt)}" max="${dateInput(Date.now())}"></label>
      ${sec('feel')}
      ${sec('tags')}
      <label class="field"><span>Notes <small>optional</small></span><textarea id="w-notes" rows="2" placeholder="e.g. sleeves kept slipping, got compliments">${esc(w.notes)}</textarea></label>
      ${sec('ai')}
      ${w.isNew ? '' : `<button class="btn danger wide" data-wear="delete">Delete this entry</button>`}
    </div>
  </div>`;
}

async function handleWearPhoto(file) {
  const w = state.wear; if (!w || !file) return;
  try {
    const { blob } = await S.processPhoto(file, WEAR_PHOTO_W);
    if (state.wear !== w) return;
    if (w.ownUrl && w.previewUrl) URL.revokeObjectURL(w.previewUrl);
    w.blob = blob; w.previewUrl = URL.createObjectURL(blob); w.ownUrl = true;
    w.ai = null;                       // advice was about the previous photo
    refreshWear('photo', 'ai');
  } catch (err) { toast(err.message || 'Could not read that photo.'); }
}

function wearPayload(w) {
  return {
    id: w.id, lookId: w.lookId, title: w.title, mood: w.mood, pieceIds: w.pieceIds, itemIds: w.itemIds,
    feel: w.feel, tags: w.tags, notes: (w.notes || '').trim(), ai: w.ai || null,
    wornAt: w.wornAt, hasPhoto: !!(w.hasPhoto || w.blob), createdAt: w.createdAt || Date.now()
  };
}

async function saveWearDraft() {
  const w = state.wear; if (!w) return;
  if (!w.previewUrl && !w.feel && !w.tags.length) { toast('Add a photo or tell me how it felt.'); return; }
  const rec = wearPayload(w);
  try {
    if (w.blob) { await S.putPhoto(rec.id, w.blob); S.revokePhotoURL(rec.id); await S.getPhotoURL(rec.id); }
  } catch { toast('Could not store the photo — storage may be full.'); return; }
  if (!S.saveWear(rec)) { toast('Could not save — storage may be full.'); return; }
  const wasNew = w.isNew;
  closeWearSheet();
  S.requestPersistence();
  state.openWear = rec.id;
  if (wasNew && state.tab === 'studio') { state.studio.seg = 'diary'; renderStudio(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  else { renderDiary(); updateSegCounts(); }
  toast(wasNew ? 'Added to your outfit diary' : 'Saved');
}

async function deleteWearDraft() {
  const w = state.wear; if (!w || w.isNew) return;
  if (!confirm('Delete this outfit from your diary? The photo will be removed too.')) return;
  await S.deleteWear(w.id);
  closeWearSheet(); renderDiary(); updateSegCounts(); toast('Removed from your diary');
}

/** Everything Gemini needs about a wear, apart from the photo. */
function aiContext(w) {
  const ai = S.getAISettings();
  return {
    key: ai.key, model: ai.model || G.DEFAULT_MODEL,
    pieces: (w.itemIds || w.pieceIds || []).map(itemById).filter(Boolean),
    mood: w.mood, profile: S.getProfile(), closet: state.items.filter(i => CLOTHING_CATS.includes(i.category)),
    feel: feelLabel(w.feel), tags: w.tags || [], notes: w.notes || ''
  };
}

/** AI from inside the sheet: result stays in the draft until Save. */
async function askAIInSheet() {
  const w = state.wear; if (!w || w.busy) return;
  const photo = w.blob || (w.hasPhoto ? await S.getPhoto(w.id) : null);
  if (!photo) { toast('Add a photo first.'); return; }
  w.busy = true; refreshWear('ai');
  try {
    const res = await G.reviewOutfit({ ...aiContext(w), photo });
    if (state.wear !== w) return;
    w.ai = res;
    toast('Advice ready — tap Save to keep it');
  } catch (err) { toast(err.message || 'AI feedback failed.'); }
  finally { w.busy = false; if (state.wear === w) refreshWear('ai'); }
}

/** AI from a saved diary entry: result is saved straight away. */
async function askAIForEntry(id) {
  if (state.aiBusy.has(id)) return;
  const w = S.getWears().find(x => x.id === id); if (!w) return;
  const photo = w.hasPhoto ? await S.getPhoto(id) : null;
  if (!photo) { toast('This entry has no photo.'); return; }
  state.aiBusy.add(id); state.openWear = id; renderDiary();
  try {
    const res = await G.reviewOutfit({ ...aiContext(w), photo });
    const cur = S.getWears().find(x => x.id === id);
    if (cur) { cur.ai = res; S.saveWear(cur); }
    toast('Advice ready');
  } catch (err) { toast(err.message || 'AI feedback failed.'); }
  finally { state.aiBusy.delete(id); renderDiary(); }
}

function wireWearSheet() {
  const root = $('#sheet-root');
  root.addEventListener('click', e => {
    const w = state.wear; if (!w) return;
    const a = e.target.closest('[data-wear]')?.dataset.wear;
    if (a) {
      if (a === 'close') closeWearSheet();
      if (a === 'save') saveWearDraft();
      if (a === 'delete') deleteWearDraft();
      if (a === 'ai') askAIInSheet();
      return;
    }
    const chip = e.target.closest('[data-wchip]'); if (!chip) return;
    const v = chip.dataset.v;
    if (chip.dataset.wchip === 'feel') { w.feel = w.feel === v ? '' : v; refreshWear('feel'); }
    else { w.tags = w.tags.includes(v) ? w.tags.filter(t => t !== v) : [...w.tags, v]; refreshWear('tags'); }
  });
  root.addEventListener('input', e => { if (state.wear && e.target.id === 'w-notes') state.wear.notes = e.target.value; });
  root.addEventListener('change', e => {
    const w = state.wear; if (!w) return;
    if (e.target.id === 'wear-photo') handleWearPhoto(e.target.files?.[0]);
    if (e.target.id === 'w-date' && e.target.value) {
      const t = new Date(e.target.value + 'T12:00').getTime();
      if (Number.isFinite(t)) w.wornAt = Math.min(t, Date.now());
    }
  });
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
      <div><p class="eyebrow">Closet &amp; Vanity</p><h1>Your <em>collection</em></h1>
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
              ${i.category === 'perfume' ? '' : `<span class="dot" style="background:${esc(i.color?.hex)}" title="${esc(i.color?.name)}"></span>
              <span>${esc(i.contrast)}</span>`}
              ${i.silhouette ? `<span>${esc(i.silhouette)}</span>` : ''}
              ${i.thickness ? `<span>${esc(i.thickness)}</span>` : ''}
              ${E.scentsOf(i).slice(0, 3).map(sc => `<span>${esc(sc)}</span>`).join('')}
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

/* ---------- Item sheet (add / edit) ----------
   The sheet is rendered ONCE. Every interaction afterwards updates only the section it affects, so nothing
   flickers, scroll and keyboard focus are preserved, and the slide-in animation plays only when it opens. */

const THICK_CATS = ['tops', 'bottoms', 'dresses', 'outerwear'];
const usesThick = c => THICK_CATS.includes(c);
const needsFabric = c => CLOTHING_CATS.includes(c);

function autoSleeves(d) {
  if (d.category !== 'tops' || d.sleevesTouched) return;
  d.sleeves = /(sleeveless|vest|corset|bustier)/i.test(d.subtype || '') ? 'Sleeveless' : 'Sleeved';
}
function isPerfume(d) { return d.category === 'perfume'; }
function autoThickness(d) {
  if (!usesThick(d.category) || d.thickTouched) return;
  d.thickness = E.defaultThickness(d.category, d.subtype, d.fabric);
}

function openItemSheet(id) {
  const existing = id ? itemById(id) : null;
  const cat = existing?.category || (state.closetFilter !== 'all' ? state.closetFilter : 'tops');
  const defaults = E.defaultTags(cat);
  if (existing) {
    const fi = E.fabricInfo(existing.fabric);
    const d = {
      ...structuredClone(existing), isNew: false, blob: null, previewUrl: S.photoURLSync(existing.id),
      nameTouched: true, contrastTouched: true, categoryTouched: true, subtypeTouched: true, fabricTouched: true, hasColor: true,
      fabric: fi ? fi.label : '',
      // keep whatever was typed before as the composition, so nothing is lost
      fabricMix: existing.fabricMix || (fi && (existing.fabric || '').toLowerCase() !== fi.label.toLowerCase() ? existing.fabric : ''),
      thickTouched: !!existing.thickness, sleevesTouched: !!existing.sleeves,
      thickness: existing.thickness || (usesThick(existing.category) ? E.defaultThickness(existing.category, existing.subtype, existing.fabric) : ''),
      sleeves: existing.sleeves || (existing.category === 'tops' ? (E.isSleeveless(existing) ? 'Sleeveless' : 'Sleeved') : ''),
      scentMood: E.scentsOf(existing),
      autoMsg: '', shapeSuggest: null, fabricError: false
    };
    state.draft = d;
  } else {
    state.draft = {
      id: S.newId('i'), isNew: true, category: cat, name: '', subtype: '', color: { hex: '#C9B79C', name: 'Beige' }, contrast: 'Medium',
      silhouette: defaults.silhouette, vibe: [...defaults.vibe], scentMood: [...defaults.scentMood], fabric: '', fabricMix: '', thickness: '', sleeves: '', notes: '',
      blob: null, previewUrl: '', nameTouched: false, contrastTouched: false, categoryTouched: false, subtypeTouched: false, fabricTouched: false,
      thickTouched: false, sleevesTouched: false, hasColor: false, autoMsg: '', shapeSuggest: null, fabricError: false
    };
    autoSleeves(state.draft); autoThickness(state.draft);
  }
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
    return `<button type="button" class="chip ${on ? 'on' : ''}" data-chip="${name}" data-v="${esc(o)}" aria-pressed="${on}">${esc(o)}</button>`;
  }).join('')}</div>`;
}

const SECTIONS = {
  photo: d => `
    <label class="upload ${d.previewUrl ? 'has' : ''}">
      ${d.previewUrl ? `<img src="${d.previewUrl}" alt="Preview">` : `<span class="plus">+</span><span>Take or choose a photo</span>`}
      <input type="file" accept="image/*" id="photo-input" hidden>
      ${d.previewUrl ? `<span class="change">Change photo</span>` : ''}
    </label>
    <p class="hint center" id="photo-status">${d.previewUrl || isPerfume(d) ? '' : 'Colour and contrast are read from the photo automatically.'}</p>`,

  suggest: d => {
    const ai = d.aiBusy ? `<p class="suggest">Asking AI… <small>(you can keep filling in)</small></p>`
      : d.aiMsg ? `<p class="suggest ok">✦ ${esc(d.aiMsg)}</p>`
      : d.aiErr ? `<p class="suggest">${esc(d.aiErr)} <button type="button" class="link strong" data-sheet="ai-fill">Try again</button></p>` : '';
    const offer = !ai && d.isNew && d.blob && S.getAISettings().key
      ? `<p class="suggest"><button type="button" class="link strong" data-sheet="ai-fill">✦ Fill in from photo with AI</button> <small>optional</small></p>` : '';
    return ai || (d.autoMsg ? `<p class="suggest ok">✦ ${esc(d.autoMsg)}</p>` : '') + offer;
  },

  type: d => {
    const cat = E.categoryById(d.category);
    return cat.subtypes.length ? `<span>Type</span>${chipRow('subtype', cat.subtypes, d.subtype, false)}` : '';
  },

  color: d => isPerfume(d) ? '' : `
    <span>Colour</span>
    ${d.previewUrl ? `<button type="button" class="btn ghost small eyedrop ${d.picking ? 'on' : ''}" data-sheet="eyedropper">${d.picking ? 'Tap the photo above… (cancel)' : '⌖ Pick colour from the photo'}</button>` : ''}
    <div class="swatches">${E.COLOR_NAMES.map(([n, h]) =>
      `<button type="button" class="sw ${h.toUpperCase() === d.color.hex.toUpperCase() ? 'on' : ''}" data-swatch="${h}" data-name="${esc(n)}" style="background:${h}" aria-label="${esc(n)}" title="${esc(n)}"></button>`).join('')}</div>
    <div class="color-row">
      <input type="color" id="f-color" value="${esc(d.color.hex.toLowerCase())}" aria-label="Fine-tune colour">
      <input id="f-colorname" type="text" value="${esc(d.color.name)}" aria-label="Colour name">
    </div>`,

  contrast: d => isPerfume(d) ? '' : `<span>Contrast level <small>auto-tagged</small></span>${chipRow('contrast', E.CONTRASTS, d.contrast, false)}`,

  sil: d => E.usesSilhouette(d.category) ? `<span>Silhouette</span>${chipRow('silhouette', E.SILHOUETTES, d.silhouette, false)}` : '',

  sleeves: d => d.category === 'tops' ? `<span>Sleeves <small>a sleeveless knit only layers over a thin sleeved top</small></span>${chipRow('sleeves', E.SLEEVES, d.sleeves, false)}` : '',

  fabric: d => {
    if (!needsFabric(d.category)) return '';
    const fi = E.fabricInfo(d.fabric);
    return `<span>Fabric <small class="${d.fabricError ? 'err' : ''}">${d.fabricError ? 'required — choose one' : 'required'}</small></span>
      ${chipRow('fabric', E.FABRICS.map(f => f.label), d.fabric, false)}
      ${fi ? `<p class="hint fab-info"><strong>${esc(fi.label)}</strong> — ${esc(fi.note)}. Sheen: ${esc(fi.sheen)} · drape: ${esc(fi.drape)} · warmth: ${esc(fi.warmth)}.</p>` : ''}`;
  },

  thick: d => {
    if (!usesThick(d.category)) return '';
    const fi = E.fabricInfo(d.fabric);
    return `<span>Thickness <small>${d.thickTouched ? 'set by you' : `auto-set${fi ? ` from ${esc(fi.label.toLowerCase())}` : ''} — tap to change`}</small></span>
      ${chipRow('thickness', E.THICKNESS, d.thickness, false)}
      <p class="hint">Light = tee, silk blouse · Medium = fine knit, jeans · Thick = chunky knit, coat. Two thick pieces are never layered together.</p>`;
  },

  vibe: d => d.category === 'perfume'
    ? `<span>Scent accords <small>pick any — as listed on Fragrantica</small></span>${chipRow('scentMood', E.SCENT_MOODS, d.scentMood, true)}`
    : `<span>Vibe <small>pick any</small></span>${chipRow('vibe', E.VIBES, d.vibe, true)}`
};

function refresh(...keys) {
  const d = state.draft; if (!d) return;
  keys.forEach(k => { const el = $('#sec-' + k); if (el) el.innerHTML = SECTIONS[k](d); });
}

/** Leaving the name blank auto-names the piece (e.g. “Beige Turtleneck”); keep that visible. */
function updateNamePlaceholder() {
  const d = state.draft, el = $('#f-name'); if (!d || !el) return;
  el.placeholder = d.isNew ? `e.g. black wool turtleneck — or leave blank for “${E.autoName(d.category, d.hasColor && !isPerfume(d) ? d.color.name : '', d.subtype)}”` : '';
}

function renderSheet() {
  const d = state.draft; if (!d) return;
  const root = $('#sheet-root');
  document.body.classList.add('locked');
  const sec = (k, cls = 'field') => `<div class="${cls}" id="sec-${k}">${SECTIONS[k](d)}</div>`;
  root.innerHTML = `
  <div class="backdrop" data-sheet="close"></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-label="${d.isNew ? 'Add piece' : 'Edit piece'}">
    <header class="sheet-head">
      <button class="link" data-sheet="close">Cancel</button>
      <h2>${d.isNew ? 'Add a piece' : 'Edit piece'}</h2>
      <button class="link strong" data-sheet="save">Save</button>
    </header>
    <div class="sheet-body">
      ${sec('photo', 'plain')}
      <label class="field name-field"><span>Name <small>${d.isNew ? 'type what it is and I will fill in category, fabric &amp; thickness' : ''}</small></span>
        <input id="f-name" type="text" autocomplete="off" value="${esc(d.name)}" placeholder="e.g. black wool turtleneck">
      </label>
      ${sec('suggest', 'plain')}
      <label class="field"><span>Category</span>
        <select id="f-category">${E.CATEGORIES.map(c => `<option value="${c.id}" ${c.id === d.category ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select>
      </label>
      ${sec('type')}
      ${sec('color')}
      ${sec('contrast')}
      ${sec('sil')}
      ${sec('sleeves')}
      ${sec('fabric')}
      <label class="field" id="mixfield"><span>Composition <small>optional</small></span>
        <input id="f-fabricmix" type="text" autocomplete="off" value="${esc(d.fabricMix)}" placeholder="e.g. 80% wool, 20% polyamide"></label>
      ${sec('thick')}
      ${sec('vibe')}
      <label class="field"><span>Notes <small>optional</small></span><textarea id="f-notes" rows="2" placeholder="Anything to remember">${esc(d.notes)}</textarea></label>
      ${d.isNew ? '' : `<button class="btn danger wide" data-sheet="delete">Delete this piece</button>`}
    </div>
  </div>`;
  updateNamePlaceholder();
}

/** Switch category and reset the dependent fields to that category's smart defaults. */
function setCategory(cat, manual) {
  const d = state.draft; if (!d) return;
  d.category = cat;
  const t = E.defaultTags(cat);
  d.subtype = ''; d.subtypeTouched = false;
  d.silhouette = t.silhouette; d.vibe = [...t.vibe]; d.scentMood = [...t.scentMood];
  d.sleevesTouched = false; d.thickTouched = false;
  if (manual) d.categoryTouched = true;
  autoSleeves(d); autoThickness(d);
  const sel = $('#f-category'); if (sel) sel.value = cat;
  refresh('type', 'color', 'contrast', 'sil', 'sleeves', 'fabric', 'thick', 'vibe', 'suggest');
  updateNamePlaceholder();
}

function setColor(hex, name, fromNative) {
  const d = state.draft; if (!d) return;
  d.color = { hex: hex.toUpperCase(), name }; d.hasColor = true;
  if (!d.contrastTouched) {
    const c = E.contrastFromHex(hex);
    if (c !== d.contrast) { d.contrast = c; refresh('contrast'); }
  }
  if (!fromNative) { const p = $('#f-color'); if (p) p.value = hex.toLowerCase(); }
  const n = $('#f-colorname'); if (n && document.activeElement !== n) n.value = name;
  $$('#sec-color .sw').forEach(b => b.classList.toggle('on', b.dataset.swatch.toUpperCase() === hex.toUpperCase()));
  updateNamePlaceholder();
}

/** Eyedropper: scroll up to the photo and let the user tap it to sample a colour. */
function toggleEyedropper() {
  const d = state.draft; if (!d) return;
  if (!d.previewUrl) { toast('Add a photo first.'); return; }
  d.picking = !d.picking;
  refresh('color');
  $('.upload')?.classList.toggle('picking', d.picking);
  if (d.picking) {
    const body = $('.sheet-body');
    if (body) body.scrollTo({ top: 0, behavior: 'smooth' });
    else $('.upload')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast('Tap the garment in the photo');
  }
}

function sampleFromPhoto(e, up) {
  const d = state.draft; const img = $('img', up);
  if (!d || !img || !img.naturalWidth) return;
  const nw = img.naturalWidth, nh = img.naturalHeight, r = img.getBoundingClientRect();
  const sc = Math.min(r.width / nw, r.height / nh);                       // the photo is letterboxed (object-fit: contain)
  const ox = r.left + (r.width - nw * sc) / 2, oy = r.top + (r.height - nh * sc) / 2;
  const px = Math.floor((e.clientX - ox) / sc), py = Math.floor((e.clientY - oy) / sc);
  if (px < 0 || py < 0 || px >= nw || py >= nh) { toast('Tap on the garment itself.'); return; }
  const cv = document.createElement('canvas'); cv.width = nw; cv.height = nh;
  const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
  const R = 3, x0 = Math.max(0, px - R), y0 = Math.max(0, py - R);
  const w = Math.min(nw - x0, 2 * R + 1), h = Math.min(nh - y0, 2 * R + 1);
  const px4 = ctx.getImageData(x0, y0, w, h).data;
  let rr = 0, gg = 0, bb = 0; const n = px4.length / 4;
  for (let i = 0; i < px4.length; i += 4) { rr += px4[i]; gg += px4[i + 1]; bb += px4[i + 2]; }
  const hex = E.rgbToHex(rr / n, gg / n, bb / n);
  const name = E.colorName(hex);
  setColor(hex, name, false);
  d.picking = false;
  refresh('color');
  $('.upload')?.classList.remove('picking');
  $('#sec-color')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  toast(`Picked ${name.toLowerCase()}`);
}

/** Read the typed name and pre-fill category, type, fabric, thickness and sleeves — only fields the user has not set themselves. */
function autoFromName() {
  const d = state.draft; if (!d) return;
  const sig = () => [d.category, d.subtype, d.fabric, d.thickness, d.sleeves, d.autoMsg].join('|');
  const before = sig();
  const sug = E.suggestFromText(d.name);
  if (!sug) { if (d.autoMsg) { d.autoMsg = ''; refresh('suggest'); } scentsFromName(d); return; }
  const cat0 = d.category;
  if (sug.category && !d.categoryTouched) {
    if (sug.category !== d.category) setCategory(sug.category, false);
    const c = E.categoryById(d.category);
    if (sug.subtype && !d.subtypeTouched && c.subtypes.includes(sug.subtype)) d.subtype = sug.subtype;
    d.autoMsg = `Picked ${catLabel(d.category)}${d.subtype ? ' → ' + d.subtype : ''} from the name. Change it below if that is wrong.`;
  }
  if (sug.fabric && !d.fabricTouched && needsFabric(d.category)) d.fabric = sug.fabric;
  autoSleeves(d);
  if (sug.sleeves && !d.sleevesTouched && d.category === 'tops') d.sleeves = 'Sleeveless';
  autoThickness(d);
  if (sug.thickness && !d.thickTouched && usesThick(d.category)) d.thickness = sug.thickness;
  if (sig() !== before) {
    refresh('type', 'color', 'contrast', 'sleeves', 'fabric', 'thick', 'vibe', 'suggest');
    updateNamePlaceholder();
    if (cat0 !== d.category) $('#f-category').value = d.category;
  }
  scentsFromName(d);
}

/** Perfume named e.g. “vanilla oud” → tick those accords (until the user picks accords themselves). */
function scentsFromName(d) {
  if (!isPerfume(d) || d.scentTouched) return;
  const words = (d.name || '').toLowerCase();
  const found = E.SCENT_MOODS.filter(sc => new RegExp(`\\b${sc.toLowerCase().replace('è', '[eè]')}\\b`).test(words));
  if (found.join() !== d.scentMood.join()) { d.scentMood = found; refresh('vibe'); }
}

async function handlePhoto(file) {
  const d = state.draft; if (!d || !file) return;
  const status = $('#photo-status');
  if (status) status.textContent = 'Reading colours…';
  try {
    const { blob, color, contrast, width, height } = await S.processPhoto(file);
    if (state.draft !== d) return;
    if (d.previewUrl && d.isNew) URL.revokeObjectURL(d.previewUrl);
    d.blob = blob; d.previewUrl = URL.createObjectURL(blob);
    d.color = color; d.hasColor = true;
    d.contrast = contrast; d.contrastTouched = false;
    if (!d.nameTouched) d.name = '';
    d.photoW = width; d.photoH = height; d.picking = false;
    refresh('photo', 'color', 'contrast', 'suggest');
    updateNamePlaceholder();
    const st = $('#photo-status');
    if (st) st.textContent = isPerfume(d) ? '' : `Detected ${color.name.toLowerCase()} · ${contrast.toLowerCase()} contrast`;
  } catch (err) {
    if (status) status.textContent = err.message || 'Could not read that photo.';
  }
}

/** New piece + Gemini key: let the AI fill in everything the user has not set themselves. */
async function aiFill() {
  const d = state.draft; const ai = S.getAISettings();
  if (!d || !ai.key || !d.blob || d.aiBusy) return;
  d.aiBusy = true; d.aiErr = ''; d.aiMsg = ''; refresh('suggest');
  try {
    const r = await G.describePiece({ key: ai.key, model: ai.model || G.DEFAULT_MODEL, photo: d.blob });
    if (state.draft !== d) return;
    const filled = [];
    if (r.category && !d.categoryTouched) { if (r.category !== d.category) setCategory(r.category, false); filled.push('category'); }
    const cat = E.categoryById(d.category);
    if (r.subtype && !d.subtypeTouched && cat.subtypes.includes(r.subtype)) { d.subtype = r.subtype; filled.push('type'); }
    if (r.fabric && !d.fabricTouched && needsFabric(d.category)) { d.fabric = r.fabric; d.fabricError = false; filled.push('fabric'); }
    if (r.silhouette && E.usesSilhouette(d.category) && !d.silTouched) d.silhouette = r.silhouette;
    if (r.sleeves && d.category === 'tops' && !d.sleevesTouched) d.sleeves = r.sleeves; else autoSleeves(d);
    if (r.thickness && usesThick(d.category) && !d.thickTouched) { d.thickness = r.thickness; filled.push('thickness'); } else autoThickness(d);
    if (r.vibe.length && !d.vibeTouched && d.category !== 'perfume') d.vibe = r.vibe;
    if (d.category === 'perfume' && r.scents.length && !d.scentTouched) { d.scentMood = r.scents; filled.push('scent accords'); }
    if (r.name && !d.nameTouched) { d.name = r.name; const el = $('#f-name'); if (el) el.value = r.name; filled.unshift('name'); }
    d.aiMsg = filled.length ? `Filled in ${filled.join(', ')} from the photo — tap anything to change it.` : 'Looked at the photo — your choices are kept.';
    d.autoMsg = '';
    refresh('type', 'color', 'contrast', 'sil', 'sleeves', 'fabric', 'thick', 'vibe');
    updateNamePlaceholder();
  } catch (err) {
    if (state.draft === d) d.aiErr = err.message || 'The AI could not read this photo.';
  } finally {
    if (state.draft === d) { d.aiBusy = false; refresh('suggest'); }
  }
}

async function saveDraft() {
  const d = state.draft; if (!d) return;
  if (d.isNew && !d.blob) { toast('Add a photo first.'); return; }
  if (needsFabric(d.category) && !d.fabric) {
    d.fabricError = true; refresh('fabric');
    $('#sec-fabric')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast('Choose a fabric — it is required.');
    return;
  }
  const name = (d.name || '').trim() || E.autoName(d.category, isPerfume(d) ? '' : d.color.name, d.subtype);
  const item = {
    id: d.id, category: d.category, name, subtype: d.subtype || '',
    color: d.color, contrast: d.contrast,
    silhouette: E.usesSilhouette(d.category) ? d.silhouette : '',
    vibe: d.category === 'perfume' ? [] : d.vibe,
    scentMood: d.category === 'perfume' ? [...d.scentMood] : [],
    fabric: needsFabric(d.category) ? d.fabric : '', fabricMix: needsFabric(d.category) ? (d.fabricMix || '').trim() : '',
    thickness: usesThick(d.category) ? d.thickness : '',
    sleeves: d.category === 'tops' ? d.sleeves : '',
    notes: (d.notes || '').trim(),
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
      if (a === 'eyedropper') toggleEyedropper();
      if (a === 'ai-fill') aiFill();
      return;
    }
    // eyedropper mode: tapping the photo samples a colour instead of opening the file chooser
    const up = e.target.closest('.upload');
    if (up && d.picking && d.previewUrl) { e.preventDefault(); sampleFromPhoto(e, up); return; }
    const sw = e.target.closest('[data-swatch]');
    if (sw) { setColor(sw.dataset.swatch, sw.dataset.name, false); return; }
    const chip = e.target.closest('[data-chip]');
    if (!chip) return;
    const k = chip.dataset.chip, v = chip.dataset.v;
    if (k === 'vibe') { d.vibe = d.vibe.includes(v) ? d.vibe.filter(x => x !== v) : [...d.vibe, v]; d.vibeTouched = true; refresh('vibe'); }
    else if (k === 'contrast') { d.contrast = v; d.contrastTouched = true; refresh('contrast'); }
    else if (k === 'subtype') {
      d.subtype = d.subtype === v ? '' : v; d.subtypeTouched = true;
      autoSleeves(d); autoThickness(d); updateNamePlaceholder();
      refresh('type', 'sleeves', 'thick');
    }
    else if (k === 'fabric') {
      d.fabric = d.fabric === v ? '' : v; d.fabricTouched = true; d.fabricError = false;
      autoThickness(d); refresh('fabric', 'thick');
    }
    else if (k === 'thickness') { d.thickness = v; d.thickTouched = true; refresh('thick'); }
    else if (k === 'sleeves') { d.sleeves = v; d.sleevesTouched = true; refresh('sleeves'); }
    else if (k === 'silhouette') { d.silhouette = d.silhouette === v ? '' : v; d.silTouched = true; refresh('sil'); }
    else if (k === 'scentMood') { d.scentMood = d.scentMood.includes(v) ? d.scentMood.filter(x => x !== v) : [...d.scentMood, v]; d.scentTouched = true; refresh('vibe'); }
  });
  root.addEventListener('input', e => {
    const d = state.draft; if (!d) return;
    if (e.target.id === 'f-name') { d.name = e.target.value; d.nameTouched = true; autoFromName(); }
    if (e.target.id === 'f-colorname') d.color = { ...d.color, name: e.target.value };
    if (e.target.id === 'f-fabricmix') {
      d.fabricMix = e.target.value;
      const fi = E.fabricInfo(d.fabricMix);
      if (fi && !d.fabric && !d.fabricTouched && needsFabric(d.category)) { d.fabric = fi.label; autoThickness(d); refresh('fabric', 'thick'); }
    }
    if (e.target.id === 'f-notes') d.notes = e.target.value;
    // live colour while dragging in the native picker: update state only, never rebuild the DOM
    if (e.target.id === 'f-color') setColor(e.target.value, E.colorName(e.target.value), true);
  });
  root.addEventListener('change', e => {
    const d = state.draft; if (!d) return;
    if (e.target.id === 'photo-input') handlePhoto(e.target.files?.[0]);
    if (e.target.id === 'f-color') setColor(e.target.value, E.colorName(e.target.value), true);
    if (e.target.id === 'f-category') { d.autoMsg = ''; setCategory(e.target.value, true); }
  });
}

/* ======================================================================
   STYLIST — chat with Gemini about what to wear, trips, and (only when asked) closet gaps
   ====================================================================== */

const CHAT_PHOTO_W = 1024;
const PROMPTS = [
  { label: 'What should I wear today?', text: 'What should I wear today?' },
  { label: 'Dinner tonight', text: 'Dinner out tonight — I want to feel elegant but warm. What should I wear?' },
  { label: 'Pack for a trip', text: 'Pack for a trip: __ days in __. Weather: __. Plans: __.', fill: true },
  { label: 'Style one piece', text: 'Give me three different ways to wear my ', fill: true },
  { label: 'What am I missing?', text: 'Looking at my closet, what am I missing? I buy slowly, so only the few pieces that would make the biggest difference.' }
];

/** Light formatting for AI text: paragraphs, "- " bullets and **bold**. Everything is escaped first. */
function richText(t) {
  const inline = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const out = []; let list = [];
  const flush = () => { if (list.length) { out.push(`<ul class="bullets">${list.map(li => `<li>${inline(li)}</li>`).join('')}</ul>`); list = []; } };
  String(t || '').split('\n').forEach(line => {
    const m = line.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/);
    if (m) { list.push(m[1]); return; }
    flush();
    if (line.trim()) out.push(`<p>${inline(line.trim())}</p>`);
  });
  flush();
  return out.join('');
}

/** An AI outfit as a look object the rest of the app understands (save, "I wore this"). */
function chatLook(msg, idx) {
  const o = msg.outfits[idx];
  return {
    id: `${msg.id}_${idx}`, title: o.title, tagline: o.note, mood: 'AI Stylist', itemIds: o.itemIds, pieceIds: o.itemIds,
    notes: o.note ? [{ label: 'Stylist', text: o.note }] : [], source: 'chat'
  };
}

function chatMsgHTML(m) {
  if (m.role === 'user') {
    const photo = m.photo ? S.photoURLSync(m.id) : '';
    return `<div class="msg me">${photo ? `<img class="msg-photo" src="${photo}" alt="Your photo">` : ''}${m.text ? `<p>${esc(m.text)}</p>` : ''}</div>`;
  }
  if (m.error) return `<div class="msg ai err"><p>${esc(m.text)}</p><button class="link" data-act="chat-retry">Try again</button></div>`;
  const outfits = (m.outfits || []).map((o, i) => {
    const look = chatLook(m, i), saved = S.isLookSaved(look.id);
    const pieces = o.itemIds.map(itemById).filter(Boolean);
    if (!pieces.length) return '';
    return `<article class="chat-look">
      <header class="look-head">
        <div><p class="eyebrow">Look ${i + 1}</p><h3>${esc(o.title)}</h3></div>
        <button class="heart ${saved ? 'on' : ''}" data-act="chat-save" data-mid="${m.id}" data-idx="${i}" aria-pressed="${saved}" aria-label="${saved ? 'Remove from saved looks' : 'Save look'}">${HEART}</button>
      </header>
      ${collage(o.itemIds)}
      ${o.note ? `<p class="look-note">${esc(o.note)}</p>` : ''}
      <button class="btn ghost wide small" data-act="chat-wore" data-mid="${m.id}" data-idx="${i}">I wore this</button>
    </article>`;
  }).join('');
  const pack = m.packing ? (() => {
    const pieces = m.packing.itemIds.map(itemById).filter(Boolean);
    return `<section class="pack">
      <p class="eyebrow">Packing list · ${pieces.length} piece${pieces.length === 1 ? '' : 's'}</p><h3>${esc(m.packing.title)}</h3>
      <div class="pack-grid">${pieces.map(p => `<figure>${pic(p)}<figcaption>${esc(p.name)}</figcaption></figure>`).join('')}</div>
      ${m.packing.tips?.length ? `<ul class="bullets">${m.packing.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      <button class="btn ghost wide small" data-act="chat-copy-pack" data-mid="${m.id}">Copy as a checklist</button>
    </section>`;
  })() : '';
  const gaps = m.gaps?.length ? `<section class="gaps"><p class="eyebrow">Worth considering, slowly</p>
    ${m.gaps.map((g, i) => `<div class="gap"><span class="gap-n">${String(i + 1).padStart(2, '0')}</span><div><strong>${esc(g.piece)}</strong><small>${esc(g.why)}${g.unlocks ? ` · about ${g.unlocks} new outfit${g.unlocks === 1 ? '' : 's'}` : ''}</small></div></div>`).join('')}
  </section>` : '';
  return `<div class="msg ai">${richText(m.text)}</div>${outfits}${pack}${gaps}`;
}

function renderStylist() {
  const v = $('#view-stylist');
  const key = S.getAISettings().key;
  const msgs = S.getChat();
  const c = state.chat;
  if (!key) {
    v.innerHTML = `
      <header class="page-head"><p class="eyebrow">AI Stylist</p><h1>Your <em>stylist</em></h1>
      <p class="sub">Ask what to wear, pack for a trip, or send a mirror photo for an honest second look — always from your own closet.</p></header>
      <div class="card empty">
        <p class="lede">One small step first</p>
        <p>Add your free Google Gemini key in Profile and your stylist is ready.</p>
        <button class="btn primary" data-act="goto-profile">Add my key</button>
      </div>`;
    return;
  }
  v.innerHTML = `
    <header class="page-head row between">
      <div><p class="eyebrow">AI Stylist</p><h1>Your <em>stylist</em></h1></div>
      ${msgs.length ? `<button class="link" data-act="chat-clear">Clear</button>` : ''}
    </header>
    <div class="thread" id="thread">
      ${msgs.length ? msgs.map(chatMsgHTML).join('') : `
        <div class="hello">
          <p class="lede">What shall we wear?</p>
          <p class="hint">I know your ${state.items.length} piece${state.items.length === 1 ? '' : 's'}, your proportions and your diary. Ask anything.</p>
        </div>`}
      ${c.busy ? `<div class="msg ai typing" aria-label="Stylist is thinking"><i></i><i></i><i></i></div>` : ''}
    </div>
    ${!msgs.length || !c.busy ? `<div class="prompts" id="prompts">${PROMPTS.map((p, i) => `<button class="chip" data-act="chat-prompt" data-i="${i}">${esc(p.label)}</button>`).join('')}</div>` : ''}
    <form class="composer" id="composer" autocomplete="off">
      ${c.photoUrl ? `<div class="composer-photo"><img src="${c.photoUrl}" alt="Attached photo"><button type="button" data-act="chat-unphoto" aria-label="Remove photo">×</button></div>` : ''}
      <div class="composer-row">
        <label class="icon-btn" aria-label="Attach a photo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.3" r="3.4"/></svg><input type="file" accept="image/*" id="chat-photo" hidden></label>
        <textarea id="chat-input" rows="1" placeholder="Ask your stylist…" enterkeyhint="send">${esc(c.text)}</textarea>
        ${c.busy
          ? `<button type="button" class="send stop" data-act="chat-stop" aria-label="Stop"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/></svg></button>`
          : `<button type="submit" class="send" aria-label="Send"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button>`}
      </div>
    </form>`;
  autosize($('#chat-input'));
  scrollThread();
}

function autosize(el) { if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 140) + 'px'; }
function scrollThread() { requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })); }

async function sendChat(retry = false) {
  const c = state.chat;
  if (c.busy) return;
  let msgs = S.getChat();
  let photo = null;
  if (retry) {
    msgs = msgs.filter(m => !m.error);
    const last = msgs[msgs.length - 1];
    if (!last || last.role !== 'user') return;
    if (last.photo) photo = await S.getPhoto(last.id).catch(() => null);
  } else {
    const text = ($('#chat-input')?.value ?? c.text).trim();
    if (!text && !c.photo) { toast('Type a question or add a photo.'); return; }
    const msg = { id: S.newId('m'), role: 'user', text, photo: !!c.photo, at: Date.now() };
    if (c.photo) {
      try { await S.putPhoto(msg.id, c.photo); await S.getPhotoURL(msg.id); photo = c.photo; }
      catch { toast('Could not store the photo — storage may be full.'); return; }
    }
    msgs = [...msgs, msg];
    if (c.photoUrl) URL.revokeObjectURL(c.photoUrl);
    c.text = ''; c.photo = null; c.photoUrl = '';
  }
  await S.saveChat(msgs);
  const ctrl = new AbortController();
  c.busy = true; c.ctrl = ctrl; renderStylist();
  const ai = S.getAISettings();
  let reply = null;
  try {
    const res = await G.chat({
      key: ai.key, model: ai.model || G.DEFAULT_MODEL, messages: msgs, photo, signal: ctrl.signal,
      closet: state.items, profile: S.getProfile(), wears: S.getWears(), looks: S.getLooks()
    });
    reply = { id: S.newId('m'), role: 'model', text: res.reply, outfits: res.outfits, packing: res.packing, gaps: res.gaps, at: Date.now() };
  } catch (err) {
    if (err?.name !== 'AbortError') reply = { id: S.newId('m'), role: 'model', error: true, text: err.message || 'Something went wrong.', at: Date.now() };
  }
  if (c.ctrl !== ctrl) return;                 // stopped: the Stop button already reset everything
  if (reply) await S.saveChat([...msgs, reply]);
  c.busy = false; c.ctrl = null;
  if (state.tab === 'stylist') renderStylist();
  else toast('Your stylist replied ✦');
}

async function attachChatPhoto(file) {
  const c = state.chat;
  try {
    const { blob } = await S.processPhoto(file, CHAT_PHOTO_W);
    if (c.photoUrl) URL.revokeObjectURL(c.photoUrl);
    c.photo = blob; c.photoUrl = URL.createObjectURL(blob);
    c.text = $('#chat-input')?.value ?? c.text;
    renderStylist();
    $('#chat-input')?.focus();
  } catch (err) { toast(err.message || 'Could not read that photo.'); }
}

function findChatLook(mid, idx) {
  const m = S.getChat().find(x => x.id === mid);
  return m?.outfits?.[idx] ? chatLook(m, +idx) : null;
}

function wireStylist() {
  const v = $('#view-stylist');
  v.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const c = state.chat;
    switch (b.dataset.act) {
      case 'goto-profile': showTab('profile'); setTimeout(() => $('#ai-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); break;
      case 'chat-prompt': {
        const p = PROMPTS[+b.dataset.i]; if (!p) break;
        if (p.fill) {
          const el = $('#chat-input'); el.value = p.text; c.text = p.text; autosize(el); el.focus();
          const at = p.text.indexOf('__'); if (at >= 0) el.setSelectionRange(at, at + 2); else el.setSelectionRange(p.text.length, p.text.length);
        } else { const el = $('#chat-input'); if (el) el.value = p.text; sendChat(); }
        break;
      }
      case 'chat-unphoto': if (c.photoUrl) URL.revokeObjectURL(c.photoUrl); c.photo = null; c.photoUrl = ''; c.text = $('#chat-input')?.value ?? c.text; renderStylist(); break;
      case 'chat-retry': sendChat(true); break;
      case 'chat-stop': {
        c.ctrl?.abort(); c.ctrl = null; c.busy = false;
        renderStylist(); toast('Stopped');
        break;
      }
      case 'chat-clear':
        if (!confirm('Clear the whole conversation? Saved looks and your diary stay.')) break;
        await S.clearChat(); renderStylist(); break;
      case 'chat-save': {
        const look = findChatLook(b.dataset.mid, b.dataset.idx); if (!look) break;
        if (S.isLookSaved(look.id)) { S.removeLook(look.id); toast('Removed from saved looks'); }
        else { S.saveLook(look); toast('Look saved ♥ — find it in Studio › Saved'); }
        const on = S.isLookSaved(look.id); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
        break;
      }
      case 'chat-wore': { const look = findChatLook(b.dataset.mid, b.dataset.idx); if (look) openWearSheet({ look }); break; }
      case 'chat-copy-pack': {
        const m = S.getChat().find(x => x.id === b.dataset.mid); if (!m?.packing) break;
        const list = `${m.packing.title}\n` + m.packing.itemIds.map(itemById).filter(Boolean).map(i => `☐ ${i.name}`).join('\n');
        try { await navigator.clipboard.writeText(list); toast('Checklist copied — paste it into Notes'); }
        catch { toast('Could not copy on this device.'); }
        break;
      }
    }
  });
  v.addEventListener('submit', e => { e.preventDefault(); sendChat(); });
  v.addEventListener('input', e => { if (e.target.id === 'chat-input') { state.chat.text = e.target.value; autosize(e.target); } });
  v.addEventListener('keydown', e => {
    // Enter sends on a hardware keyboard; Shift+Enter adds a line. On phones the return key keeps adding lines.
    if (e.target.id === 'chat-input' && e.key === 'Enter' && !e.shiftKey && !e.isComposing && matchMedia('(hover: hover)').matches) { e.preventDefault(); sendChat(); }
  });
  v.addEventListener('change', e => { if (e.target.id === 'chat-photo' && e.target.files?.[0]) attachChatPhoto(e.target.files[0]); });
  v.addEventListener('focusin', e => { if (e.target.id === 'chat-input') document.body.classList.add('typing'); });
  v.addEventListener('focusout', e => { if (e.target.id === 'chat-input') document.body.classList.remove('typing'); });
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
  const hasKey = !!S.getAISettings().key;
  const manualOpen = !hasKey || c.openManual || (!c.product && !!c.text.trim());
  v.innerHTML = `
    <header class="page-head row between">
      <div><p class="eyebrow">Fit &amp; Style</p><h1>Link <em>checker</em></h1></div>
      ${c.url || c.text || c.report ? `<button class="link" data-act="check-new">New piece</button>` : ''}
    </header>
    <p class="sub lead-sub">${hasKey ? 'Paste a link to a piece you are considering. Your stylist reads the page — sizes, fabric, fit — and checks it against your body and your closet.' : 'Paste a piece you are considering. I will check size, fabric and what you already own to wear with it.'}</p>

    <section class="card">
      <label class="field"><span>Product link</span>
        <input id="c-url" type="url" inputmode="url" autocapitalize="off" autocorrect="off" placeholder="https://store.com/product…" value="${esc(c.url)}">
      </label>
      ${hasKey ? `
        <div class="row gap">
          <button class="btn primary grow" data-act="read-link" ${c.reading ? 'disabled' : ''}>${c.reading === 'link' ? 'Reading the page…' : '✦ Read & check'}</button>
          <button class="btn ghost" data-act="open-url" aria-label="Open the store page">Open ↗</button>
        </div>
        <div id="c-status">${checkStatusHTML()}</div>
        <div class="shots">
          ${c.shots.map((x, i) => `<figure><img src="${x.url}" alt="Screenshot ${i + 1}"><button data-act="shot-del" data-i="${i}" aria-label="Remove screenshot">×</button></figure>`).join('')}
          ${c.shots.length < 4 ? `<label class="shot-add"><input type="file" accept="image/*" id="c-shots" multiple hidden><span>+</span><small>${c.shots.length ? 'Add more' : 'Screenshots'}</small></label>` : ''}
        </div>
        ${c.shots.length ? `<button class="btn ghost wide" data-act="read-shots" ${c.reading ? 'disabled' : ''}>${c.reading === 'shots' ? 'Reading your screenshots…' : `✦ Read ${c.shots.length} screenshot${c.shots.length === 1 ? '' : 's'}`}</button>`
          : `<p class="hint">If a shop hides its size chart, add screenshots of the product page and the size table instead — no copying needed.</p>`}
      ` : `<p class="hint">Add your Gemini key in Profile and the checker will read the link for you. Until then, paste the details below.</p>`}

      <details class="fold sub-fold" id="manual-fold" ${manualOpen ? 'open' : ''}>
        <summary>${hasKey ? 'What I read — or paste it yourself' : 'Paste the details'}</summary>
        <label class="field"><span>Piece name <small>optional</small></span>
          <input id="c-name" type="text" placeholder="e.g. Merino wool wrap cardigan" value="${esc(c.name)}">
        </label>
        <label class="field"><span>Description, fabric &amp; size chart</span>
          <textarea id="c-text" rows="8" placeholder="Paste from the store page:&#10;• description&#10;• composition, e.g. 80% wool, 20% polyamide&#10;• size chart, e.g.&#10;Size  Bust  Waist  Hips  Length&#10;S  98  84  100  62&#10;M  102  88  104  63">${esc(c.text)}</textarea>
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
          <button class="btn ${hasKey ? 'ghost' : 'primary'} grow" data-act="analyse">Analyse piece</button>
          ${hasKey ? '' : `<button class="btn ghost" data-act="open-url">Open store ↗</button>`}
        </div>
      </details>
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

function checkStatusHTML() {
  const st = state.checker.status;
  return st ? `<p class="note ${st.warn ? 'warn' : ''}">${esc(st.text)}</p>` : '';
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
    <div id="check-ai"></div>
    <button class="btn ghost wide" data-act="save-check">Save this piece</button>`;
  renderCheckAI();
}

const VERDICT_LABEL = { buy: 'Worth it', wait: 'Sleep on it', skip: 'Let it go' };

function renderCheckAI() {
  const box = $('#check-ai'); if (!box) return;
  const c = state.checker;
  if (!S.getAISettings().key) { box.innerHTML = ''; return; }
  if (c.aiBusy) { box.innerHTML = `<section class="card ai-opinion"><p class="eyebrow">Your stylist</p><p class="verdict-line pulse">Thinking it over…</p></section>`; return; }
  const a = c.ai;
  if (!a) { box.innerHTML = `<button class="btn ghost wide" data-act="ask-piece-ai">✦ Ask my stylist for a second opinion</button>`; return; }
  const pairs = a.pairWith.map(itemById).filter(Boolean);
  const row = (label, t) => t ? `<div><dt>${label}</dt><dd>${esc(t)}</dd></div>` : '';
  box.innerHTML = `
    <section class="card ai-opinion v-${a.verdict}">
      <div class="row between"><p class="eyebrow">Your stylist’s view</p><span class="verdict-pill">${VERDICT_LABEL[a.verdict]}</span></div>
      <p class="verdict-line">${esc(a.headline)}</p>
      <dl class="notes">${row('Size', a.size)}${row('Quality', a.quality)}${row('Your style', a.style)}${row(a.verdict === 'buy' ? 'Also' : 'Instead', a.instead)}</dl>
      ${pairs.length ? `<h4 class="notes-title">Wear it with${a.outfits ? ` <small>· about ${a.outfits} outfit${a.outfits === 1 ? '' : 's'} with what you own</small>` : ''}</h4>
        <div class="match-row">${pairs.map(i => `<div class="match"><div class="ph-wrap">${pic(i)}</div><strong>${esc(i.name)}</strong></div>`).join('')}</div>` : ''}
      <button class="link" data-act="ask-piece-ai">↻ Ask again</button>
    </section>`;
}

function resetChecker() {
  const c = state.checker;
  c.shots.forEach(x => URL.revokeObjectURL(x.url));
  Object.assign(c, { url: '', name: '', text: '', type: 'auto', fit: 'auto', kind: 'auto', color: null, report: null, activeId: null,
    product: null, shots: [], reading: false, ai: null, aiBusy: false, status: null, openManual: false });
}

const SHOT_W = 1400;   // screenshots stay sharp enough for the AI to read a size table
async function addShots(files) {
  const c = state.checker;
  currentChecker();
  for (const f of files.slice(0, 4 - c.shots.length)) {
    try { const { blob } = await S.processPhoto(f, SHOT_W); c.shots.push({ blob, url: URL.createObjectURL(blob) }); }
    catch { toast('Could not read one of those images.'); }
  }
  renderChecker();
}

/** Merge what was read (link and/or screenshots) into the checker, then run the analysis and the AI opinion. */
function applyProduct(p) {
  const c = state.checker;
  const prev = c.product;
  const merged = prev ? { ...prev } : { ...p };
  if (prev) {
    for (const k of ['name', 'brand', 'price', 'colour', 'composition', 'description', 'garment', 'fit', 'chartSource']) if (p[k]) merged[k] = p[k];
    if (p.sizes.length) { merged.sizes = p.sizes; merged.chartKind = p.chartKind; }
    merged.found = prev.found || p.found;
    merged.missing = p.missing;
  }
  c.product = merged;
  c.name = [merged.brand && !merged.name.toLowerCase().includes(merged.brand.toLowerCase()) ? merged.brand : '', merged.name].filter(Boolean).join(' ');
  c.text = G.productToText(merged);
  c.type = merged.garment || 'auto'; c.fit = merged.fit || 'auto'; c.kind = merged.chartKind || 'auto'; c.color = null;
  return merged;
}

function readSummary(p) {
  const got = [p.composition && 'fabric', p.sizes.length && `size chart (${p.sizes.length} sizes)`, p.description && 'fit'].filter(Boolean);
  const src = p.chartSource && p.sizes.length ? ` Size chart from ${p.chartSource}.` : '';
  return `Read ${got.length ? got.join(', ') : 'the basics'}${p.price ? ` · ${p.price}` : ''}.${src}`;
}

async function readLink() {
  const c = state.checker;
  currentChecker();
  let u;
  try { u = new URL(c.url); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { toast('Paste a valid https:// link first.'); return; }
  const ai = S.getAISettings();
  if (c.product?.url && c.product.url !== u.href) { const url = c.url; resetChecker(); c.url = url; }
  c.reading = 'link'; c.status = { text: `Opening ${hostOf(u.href)}…` }; renderChecker();
  try {
    const p = await G.readProductLink({ key: ai.key, model: ai.model || G.DEFAULT_MODEL, url: u.href });
    if (!p.found && !p.sizes.length && !p.composition) {
      c.status = { warn: true, text: p.blocked
        ? `${hostOf(u.href)} would not let me in. Add screenshots of the product page and its size table below, and I will read those instead.`
        : 'I could not see this product on the page. Add screenshots of the product page and its size table below, and I will read those instead.' };
      return;
    }
    const m = applyProduct({ ...p, url: u.href }); c.product.url = u.href;
    c.status = m.sizes.length
      ? { text: readSummary(m) + ' Check it below if you like.' }
      : { warn: true, text: `${readSummary(m)} The size chart was hidden — add a screenshot of the size table and I will read it.` };
    c.report = runAnalysis(c); c.ai = null;
  } catch (err) { c.status = { warn: true, text: err.message || 'Could not read that link.' }; }
  finally { c.reading = false; renderChecker(); }
  if (c.report) { $('#check-report')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); askPieceAI(); }
}

async function readShots() {
  const c = state.checker;
  currentChecker();
  if (!c.shots.length) return;
  const ai = S.getAISettings();
  c.reading = 'shots'; c.status = { text: 'Reading your screenshots…' }; renderChecker();
  try {
    const p = await G.readProductImages({ key: ai.key, model: ai.model || G.DEFAULT_MODEL, images: c.shots.map(x => x.blob), url: c.url });
    const m = applyProduct(p);
    c.status = m.sizes.length ? { text: readSummary(m) } : { warn: true, text: `${readSummary(m)} I could not find a size table — add a screenshot that shows it.` };
    c.report = runAnalysis(c); c.ai = null;
  } catch (err) { c.status = { warn: true, text: err.message || 'Could not read those screenshots.' }; }
  finally { c.reading = false; renderChecker(); }
  if (c.report) { $('#check-report')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); askPieceAI(); }
}

async function askPieceAI() {
  const c = state.checker;
  const ai = S.getAISettings();
  if (!c.report || c.aiBusy || !ai.key) return;
  c.aiBusy = true; renderCheckAI();
  try {
    c.ai = await G.adviseOnPiece({
      key: ai.key, model: ai.model || G.DEFAULT_MODEL,
      piece: { name: c.name, url: c.url, price: c.product?.price || '', text: c.text },
      report: c.report, closet: state.items, profile: S.getProfile(), images: c.shots.map(x => x.blob)
    });
  } catch (err) { toast(err.message || 'The second opinion failed.'); }
  finally { c.aiBusy = false; renderCheckAI(); }
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
        c.report = runAnalysis(c); c.ai = null;
        renderReport();
        $('#check-report').scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
      case 'read-link': readLink(); break;
      case 'read-shots': readShots(); break;
      case 'ask-piece-ai': askPieceAI(); break;
      case 'shot-del': {
        const [x] = c.shots.splice(+b.dataset.i, 1); if (x) URL.revokeObjectURL(x.url);
        currentChecker(); renderChecker(); break;
      }
      case 'check-new': resetChecker(); renderChecker(); window.scrollTo({ top: 0, behavior: 'smooth' }); break;
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
          label: c.ai ? `${VERDICT_LABEL[c.ai.verdict]}${rep?.size.ok ? ' · ' + rep.size.size : ''}` : rep ? `${rep.verdict.label}${rep.size.ok ? ' · ' + rep.size.size : ''}` : '',
          ai: c.ai || null, product: c.product || null, savedAt: Date.now()
        });
        c.activeId = c.activeId || S.getChecks()[0]?.id;
        toast('Piece saved'); renderChecker();
        break;
      }
      case 'reopen-check': {
        const k = S.getChecks().find(x => x.id === b.dataset.id); if (!k) return;
        resetChecker();
        Object.assign(c, { url: k.url, name: k.name, text: k.text, type: k.type, fit: k.fit, kind: k.kind, color: k.color, activeId: k.id, ai: k.ai || null, product: k.product || null });
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
    if (e.target.id === 'c-shots' && e.target.files?.length) addShots([...e.target.files]);
  });
  v.addEventListener('toggle', e => { if (e.target.id === 'manual-fold') state.checker.openManual = e.target.open; }, true);
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
  const ai = S.getAISettings();
  v.innerHTML = `
    <header class="page-head"><p class="eyebrow">My Profile</p><h1><em>Proportions</em></h1>
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

    <section class="card" id="ai-card">
      <h2 class="section-h">AI stylist <small>optional · Google Gemini</small></h2>
      <p class="hint">Powers your Stylist chat, reads product links in the Checker, fills in new closet pieces from their photo, and gives feedback on your diary photos. Get a free key at
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> (“Create API key”), then paste it here.</p>
      ${ai.key ? `
        <p class="note">Key saved on this device ✓ · ends in ${esc(ai.key.slice(-4))}</p>
        <button class="btn ghost wide" data-act="ai-remove">Remove key</button>` : `
        <label class="field"><span>Gemini API key</span>
          <input id="ai-key" type="password" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Paste your key"></label>
        <button class="btn primary wide" data-act="ai-save">Save key</button>`}
      <details class="fold sub-fold">
        <summary>Model</summary>
        <label class="field"><span>Gemini model</span>
          <input id="ai-model" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(G.DEFAULT_MODEL)}" value="${esc(ai.model)}"></label>
        <p class="hint">Leave blank to use ${esc(G.DEFAULT_MODEL)} (always Google’s latest Flash model).</p>
      </details>
      <p class="hint">Your key stays only on this device and is not included in backups. When you use an AI feature, what it needs is sent to Google — your closet list and profile for the Stylist, the link or screenshots for the Checker, and any photo you share. On the free tier Google may use them to improve its products.</p>
      <p class="hint" id="ai-status"></p>
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
    if (e.target.id === 'ai-model') {
      S.saveAISettings({ ...S.getAISettings(), model: e.target.value.trim() });
      toast('Model saved'); return;
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
    if (act === 'ai-save') {
      const key = ($('#ai-key')?.value || '').trim();
      if (!key) { toast('Paste your Gemini key first.'); return; }
      const st = $('#ai-status'); if (st) st.textContent = 'Checking the key with Google…';
      const model = $('#ai-model')?.value.trim() || S.getAISettings().model || '';
      try {
        await G.testKey(key, model || G.DEFAULT_MODEL);
        S.saveAISettings({ key, model });
        renderProfile(); toast('Gemini key saved — your Stylist is ready ✦');
      } catch (err) { if (st) st.textContent = err.message || 'That key did not work.'; }
      return;
    }
    if (act === 'ai-remove') {
      if (!confirm('Remove your Gemini key from this device?')) return;
      S.clearAISettings(); renderProfile(); toast('Key removed');
      return;
    }
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
  const dl = $('#dateline');
  if (dl) dl.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  wireStudio(); wireCloset(); wireSheet(); wireWearSheet(); wireStylist(); wireChecker(); wireProfile();
  $$('#tabbar .tab').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
  await S.preloadPhotos([...state.items.map(i => i.id), ...S.getWears().filter(w => w.hasPhoto).map(w => w.id), ...S.getChat().filter(m => m.photo).map(m => m.id)]);
  let start = 'studio';
  try { start = sessionStorage.getItem('qc.tab') || 'studio'; } catch {}
  showTab(start);
  S.requestPersistence();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW failed', err));
  }
}
boot();
