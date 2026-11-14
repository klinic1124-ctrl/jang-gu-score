// 장구 악보 편집기 — 상태(state) 한 곳에서 관리: 변경 → 히스토리 기록 → 다시 그리기 → 자동 저장.
import {
  STROKES, STROKE_IDS, SLOT_COUNTS, createScore, gueumOf, createSection, createMeasure, newId, clone,
  clampPos, movePos, getMeasure, getBeat, getSlot, setSlot, toggleAccent, setBeatSlotCount,
  insertMeasure, duplicateMeasure, moveMeasure, deleteMeasure, insertSection, deleteSection, serialize, deserialize,
} from './model.js';
import { renderScore, updateHighlights, symbolSvg } from './render/index.js';
import { Player } from './audio.js';
import { PRESETS, getPreset, sectionFromPreset, measureFromPreset } from './presets.js';
import { History } from './history.js';
import * as io from './io.js';
import { layoutPrint, pageSvgs, pageRule, analyze } from './print.js';

const SCORE_KEY = 'janggu-score/score';
const OPTS_KEY = 'janggu-score/options';
const CUSTOM = '__custom';
const ZOOMS = [0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.6, 1.8, 2];
const GOBEOP = '산조·민요 반주';
// 교재식 표기: 리듬보+표, 민속악식 부호·구음
const TEXTBOOK_LOOK = { view: 'combined', symbolStyle: 'minsok', gueumStyle: 'minsok', showGueum: true };
const isPlainLook = (st) => st.view === 'vertical' && st.symbolStyle === 'jeongak';
// PNG·인쇄용 색(종이 위 먹색). 페이지 CSS가 없는 SVG 단독 그림에서도 같은 색이 되도록 넘긴다.
const EXPORT_VARS = {
  '--jg-ink': '#1f1c18', '--jg-line': '#8f8778', '--jg-paper': '#ffffff',
  '--jg-select': 'transparent', '--jg-play': 'transparent',
};

const $ = (sel) => document.querySelector(sel);

const state = {
  score: null,
  sel: { s: 0, m: 0, b: 0, i: 0 },
  playhead: null,
  opts: {
    autoAdvance: true, previewSound: true, addFill: 'empty',
    zoom: 1, tempoScale: 1, loop: false, metronome: false,
    printScale: 1, printLandscape: false,
  },
};

const history = new History(300);
const player = new Player();
let svg = null;          // 지금 화면의 악보 SVG
let renderWidth = 0;     // 마지막으로 renderScore에 넘긴 폭
let paletteStyle = '';   // 팔레트 부호 그림이 그려진 부호 체계

// ---------- 시작 ----------

function defaultScore() {
  const dodri = PRESETS.find((p) => p.name === '도드리') ?? PRESETS[0];
  if (!dodri) return createScore({ title: '새 악보' });
  const sec = buildPresetSection(dodri.id, { variant: 0, measures: 4, fill: 'first', tempo: dodri.tempo });
  return createScore({ title: '새 악보', sections: [sec] });
}

function init() {
  loadOptions();
  const saved = io.storageGet(SCORE_KEY);
  if (saved) {
    try { state.score = deserialize(saved); } catch { state.score = null; }
    if (!state.score) setTimeout(() => toast('저장된 악보를 읽지 못해 기본 악보로 시작합니다.'), 0);
  }
  if (!state.score) {
    state.score = defaultScore();
    saveNow();
  }
  state.sel = clampPos(state.score, state.sel);

  buildPalette();
  buildPresetOptions();
  buildHelp();
  bindEvents();
  render();
  updateUi();
}

function loadOptions() {
  try {
    const o = JSON.parse(io.storageGet(OPTS_KEY) ?? '{}');
    for (const k of Object.keys(state.opts)) if (typeof o[k] === typeof state.opts[k]) state.opts[k] = o[k];
  } catch { /* 기본값 사용 */ }
  if (!ZOOMS.includes(state.opts.zoom)) state.opts.zoom = 1;
  state.opts.tempoScale = Math.min(1.5, Math.max(0.5, state.opts.tempoScale));
  state.opts.printScale = Math.min(1.5, Math.max(0.5, Math.round(state.opts.printScale * 20) / 20));
}

function saveOptions() { io.storageSet(OPTS_KEY, JSON.stringify(state.opts)); }

let saveTimer = 0;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 300);
}
function saveNow() {
  clearTimeout(saveTimer);
  if (!io.storageSet(SCORE_KEY, serialize(state.score))) toast('브라우저 저장 공간에 저장하지 못했습니다. 파일로 저장해 두세요.');
}

// ---------- 편집 흐름 ----------

/** 악보를 바꾸는 모든 편집은 여기를 거친다. 실제로 바뀐 경우에만 히스토리에 남는다. */
function edit(mutate, { sel = null } = {}) {
  const before = JSON.stringify(state.score);
  const beforeSel = state.sel;
  mutate(state.score);
  const changed = JSON.stringify(state.score) !== before;
  if (changed) history.record({ score: before, sel: beforeSel });
  const nextSel = typeof sel === 'function' ? sel(state.score) : sel;
  if (nextSel) state.sel = nextSel;
  state.sel = clampPos(state.score, state.sel);
  if (changed) {
    render();
    scheduleSave();
    updateUi();
    revealSelection();
  } else if (nextSel) {
    select(state.sel);
  }
  return changed;
}

/** 보기 설정 변경 — 실행 취소 대상이 아니다. */
function setSettings(patch) {
  Object.assign(state.score.settings, patch);
  render();
  scheduleSave();
  updateUi();
}

/** 악보 전체 교체(새 악보·불러오기). 실행 취소할 수 있다. */
function replaceScore(score) {
  history.record({ score: JSON.stringify(state.score), sel: state.sel });
  if (player.playing) player.stop();
  state.score = score;
  state.sel = clampPos(score, { s: 0, m: 0, b: 0, i: 0 });
  $('#score-scroll').scrollTo(0, 0);
  render();
  saveNow();
  updateUi();
}

function restore(entry) {
  if (!entry) return;
  const settings = state.score.settings; // 보기 설정은 되돌리지 않는다
  state.score = JSON.parse(entry.score);
  state.score.settings = settings;
  state.sel = clampPos(state.score, entry.sel ?? state.sel);
  render();
  scheduleSave();
  updateUi();
  revealSelection();
}

function undo() {
  if (!history.canUndo) { toast('더 되돌릴 작업이 없습니다.'); return; }
  restore(history.undo({ score: JSON.stringify(state.score), sel: state.sel }));
}
function redo() {
  if (!history.canRedo) { toast('다시 실행할 작업이 없습니다.'); return; }
  restore(history.redo({ score: JSON.stringify(state.score), sel: state.sel }));
}

// ---------- 그리기 ----------

function availableWidth() {
  const scroll = $('#score-scroll');
  const cs = getComputedStyle(scroll);
  const pcs = getComputedStyle($('#score-host'));
  const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
    + parseFloat(pcs.paddingLeft) + parseFloat(pcs.paddingRight);
  return Math.max(280, scroll.clientWidth - pad);
}

/** SVG에 viewBox를 보장하고 확대 배율만큼 표시 크기를 바꾼다. */
function applyZoom(el, zoom) {
  const w = Number(el.getAttribute('width')) || el.viewBox.baseVal?.width;
  const h = Number(el.getAttribute('height')) || el.viewBox.baseVal?.height;
  if (!w || !h) return;
  if (!el.getAttribute('viewBox')) el.setAttribute('viewBox', `0 0 ${w} ${h}`);
  el.setAttribute('width', w);
  el.setAttribute('height', h);
  el.style.width = `${Math.round(w * zoom)}px`;
  el.style.height = `${Math.round(h * zoom)}px`;
}

function render() {
  const zoom = state.opts.zoom;
  renderWidth = Math.floor(availableWidth() / zoom);
  const next = renderScore(state.score, { width: renderWidth, selection: state.sel, playhead: state.playhead });
  applyZoom(next, zoom);
  next.setAttribute('role', 'img');
  next.setAttribute('aria-label', `${state.score.title} 악보`);
  $('#score-host').replaceChildren(next);
  svg = next;
}

function highlight() {
  if (svg) updateHighlights(svg, { selection: state.sel, playhead: state.playhead });
}

function slotEl(pos) {
  return svg?.querySelector(`.jg-slot[data-s="${pos.s}"][data-m="${pos.m}"][data-b="${pos.b}"][data-i="${pos.i}"]`);
}

/** pos 칸이 악보 스크롤 영역 밖이면 보이도록 스크롤한다. */
function reveal(pos, smooth = false) {
  const el = pos && slotEl(pos);
  if (!el) return;
  const box = el.getBoundingClientRect();
  const view = $('#score-scroll').getBoundingClientRect();
  const margin = 24;
  const outside = box.top < view.top + margin || box.bottom > view.bottom - margin
    || box.left < view.left + margin || box.right > view.right - margin;
  if (outside) el.scrollIntoView({ block: 'center', inline: 'center', behavior: smooth ? 'smooth' : 'auto' });
}
function revealSelection() { reveal(state.sel); }

function select(pos) {
  state.sel = clampPos(state.score, pos);
  highlight();
  updateUi();
  revealSelection();
}

// ---------- 위치 이동 ----------

function measureList() {
  const out = [];
  state.score.sections.forEach((sec, s) => sec.measures.forEach((_, m) => out.push({ s, m })));
  return out;
}

function stepMeasure(pos, d) {
  const list = measureList();
  const idx = list.findIndex((x) => x.s === pos.s && x.m === pos.m);
  const t = list[Math.min(Math.max(idx + d, 0), list.length - 1)];
  // 분박 칸 수가 다르면 같은 시간 비율의 칸으로
  const len = getBeat(state.score, pos).slots.length;
  const tb = state.score.sections[t.s].measures[t.m].beats[Math.min(pos.b, state.score.sections[t.s].measures[t.m].beats.length - 1)];
  const i = Math.floor((pos.i / len) * tb.slots.length);
  return clampPos(state.score, { s: t.s, m: t.m, b: pos.b, i });
}

function stepBeat(pos, d) {
  const list = [];
  state.score.sections.forEach((sec, s) => sec.measures.forEach((mea, m) => mea.beats.forEach((_, b) => list.push({ s, m, b }))));
  const idx = list.findIndex((x) => x.s === pos.s && x.m === pos.m && x.b === pos.b);
  const t = list[Math.min(Math.max(idx + d, 0), list.length - 1)];
  return { ...t, i: 0 };
}

function arrowMove(code) {
  const vertical = state.score.settings.view === 'vertical';
  const map = vertical
    ? { ArrowUp: ['slot', -1], ArrowDown: ['slot', 1], ArrowLeft: ['measure', 1], ArrowRight: ['measure', -1] }
    : { ArrowLeft: ['slot', -1], ArrowRight: ['slot', 1], ArrowUp: ['measure', -1], ArrowDown: ['measure', 1] };
  const [kind, d] = map[code];
  select(kind === 'slot' ? movePos(state.score, state.sel, d) : stepMeasure(state.sel, d));
}

// ---------- 칸 편집 ----------

function inputStroke(id) {
  const pos = state.sel;
  const next = state.opts.autoAdvance ? movePos(state.score, pos, 1) : pos;
  edit((sc) => setSlot(sc, pos, { t: id }), { sel: next });
  if (state.opts.previewSound && id !== 'rest') {
    try { player.preview(id); } catch { /* 소리 장치가 없을 때 */ }
  }
}

function clearSlot() {
  const pos = state.sel;
  edit((sc) => setSlot(sc, pos, null));
}

function accent() {
  const slot = getSlot(state.score, state.sel);
  if (!slot || slot.t === 'rest') { toast('타법이 있는 칸에만 강세를 붙일 수 있습니다.'); return; }
  const pos = state.sel;
  edit((sc) => toggleAccent(sc, pos));
}

/** 선택한 칸의 구음을 직접 정한다. 비웠거나 기본 구음과 같으면 slot.g를 지운다. */
function setGueum(text) {
  const pos = state.sel;
  const g = text.trim().slice(0, 8);
  edit((sc) => {
    const slot = getSlot(sc, pos);
    if (!slot || slot.t === 'rest') return;
    if (g && g !== gueumOf({ t: slot.t }, sc.settings.gueumStyle)) slot.g = g; else delete slot.g;
  });
}

function focusGueum() {
  const input = $('#slot-gueum');
  if (input.disabled) { toast('타법이 있는 칸을 고른 뒤 구음을 적을 수 있습니다.'); return; }
  input.focus();
  input.select();
}

function setMemo(text) {
  const pos = state.sel;
  const memo = text.slice(0, 200);
  edit((sc) => { getMeasure(sc, pos).memo = memo; });
}

function setDivision(n) {
  const pos = state.sel;
  edit((sc) => setBeatSlotCount(sc, pos, n), { sel: { ...pos, i: Math.min(pos.i, n - 1) } });
}

// ---------- 장단 ----------

/** 구간의 장단 이름·박 수와 맞는 프리셋. */
function presetFor(sec) {
  return PRESETS.find((p) => p.name === sec.jangdan && p.meter.beats === sec.meter.beats)
    ?? PRESETS.find((p) => p.id === sec.jangdan && p.meter.beats === sec.meter.beats) ?? null;
}

/** ref 장단과 같은 박 길이(units)를 가진 빈 장단. 엇모리 같은 혼합박을 지키기 위함. */
function emptyMeasureLike(sec, ref) {
  const mea = createMeasure(sec.meter);
  if (ref) mea.beats.forEach((beat, b) => { beat.units = ref.beats[b]?.units ?? null; });
  return mea;
}

/** 프리셋 가락 장단. 박 수가 구간과 맞지 않으면 null. */
function presetMeasure(sec, variant = 0) {
  const p = presetFor(sec);
  if (!p) return null;
  const mea = measureFromPreset(p.id, variant);
  return mea && mea.beats.length === sec.meter.beats ? mea : null;
}

function addMeasure() {
  const { s, m } = state.sel;
  const sec = state.score.sections[s];
  let mea = null;
  if (state.opts.addFill === 'preset') {
    mea = presetMeasure(sec, 0);
    if (!mea) toast('이 구간에는 기본 가락이 없어 빈 장단을 추가합니다.');
  }
  if (!mea) mea = emptyMeasureLike(sec, sec.measures[m]);
  edit((sc) => insertMeasure(sc, s, m + 1, mea), { sel: { s, m: m + 1, b: 0, i: 0 } });
}

function duplicate() {
  const { s, m } = state.sel;
  edit((sc) => duplicateMeasure(sc, s, m), { sel: { ...state.sel, m: m + 1 } });
}

function shiftMeasure(d) {
  const { s, m } = state.sel;
  const to = m + d;
  if (to < 0 || to >= state.score.sections[s].measures.length) return;
  edit((sc) => moveMeasure(sc, s, m, d), { sel: { ...state.sel, m: to } });
}

function removeMeasure() {
  const { s, m } = state.sel;
  const sec = state.score.sections[s];
  const only = sec.measures.length <= 1;
  edit((sc) => {
    const ref = sc.sections[s].measures[m];
    deleteMeasure(sc, s, m);
    if (only) sc.sections[s].measures[0] = emptyMeasureLike(sc.sections[s], ref);
  }, { sel: { ...state.sel, m: Math.max(0, only ? 0 : Math.min(m, sec.measures.length - 2)), i: 0 } });
  if (only) toast('구간의 마지막 장단이라 내용만 비웠습니다.');
}

function setRepeat(n) {
  const pos = state.sel;
  const v = Math.min(99, Math.max(1, Math.floor(Number(n) || 1)));
  edit((sc) => { getMeasure(sc, pos).repeat = v; });
}

function fillVariant() {
  const pos = state.sel;
  const sec = state.score.sections[pos.s];
  const v = Number($('#variant-select').value);
  const src = presetMeasure(sec, v);
  if (!src) { toast('이 구간의 장단에는 채울 가락이 없습니다.'); return; }
  edit((sc) => { getMeasure(sc, pos).beats = src.beats; }, { sel: { ...pos, i: 0 } });
}

// ---------- 구간 ----------

function moveSection(d) {
  const s = state.sel.s;
  const t = s + d;
  if (t < 0 || t >= state.score.sections.length) return;
  edit((sc) => { const [sec] = sc.sections.splice(s, 1); sc.sections.splice(t, 0, sec); }, { sel: { ...state.sel, s: t } });
}

function removeSection(s = state.sel.s) {
  if (state.score.sections.length <= 1) { toast('구간이 하나뿐이라 지울 수 없습니다.'); return; }
  const name = sectionLabel(state.score.sections[s], s);
  edit((sc) => deleteSection(sc, s), { sel: { s: Math.max(0, s - 1), m: 0, b: 0, i: 0 } });
  toast(`‘${name}’ 구간을 지웠습니다. 실행 취소(Ctrl+Z)로 되돌릴 수 있습니다.`);
}

function sectionLabel(sec, s) {
  return sec.name || sec.jangdan || `${s + 1}번째 구간`;
}

/** 프리셋에서 구간을 만든다. fill: 'all' | 'first' | 'none' */
function buildPresetSection(id, { variant = 0, measures = 1, fill = 'all', name = '', tempo = null }) {
  const sec = sectionFromPreset(id, { variant, measures: 1, name });
  const first = sec.measures[0];
  const out = [];
  for (let k = 0; k < measures; k += 1) {
    if (fill === 'none' || (fill === 'first' && k > 0)) out.push(emptyMeasureLike(sec, first));
    else out.push(k === 0 ? first : { ...clone(first), id: newId('m') });
  }
  sec.measures = out;
  sec.name = name; // 이름을 비워 두면 머리말에 장단 이름만 나온다
  if (tempo) sec.tempo = tempo;
  if (sec.tempoMax && sec.tempoMax <= sec.tempo) sec.tempoMax = null;
  return sec;
}

// ---------- 재생 ----------

/** from: {s, m} 이면 그 장단부터, null이면 처음부터 재생. */
function play(from = null) {
  try {
    player.play(state.score, {
      from,
      tempoScale: state.opts.tempoScale,
      loop: state.opts.loop,
      metronome: state.opts.metronome,
      onPosition: (pos) => {
        state.playhead = pos;
        highlight();
        if (pos) reveal(pos, true);
        else updatePlayUi();
      },
      onEnd: updatePlayUi,
    });
  } catch (err) {
    toast(`재생할 수 없습니다: ${err.message}`);
  }
  updatePlayUi();
}

function togglePlay() {
  if (player.playing) player.stop();
  else play(null);
}

function playFromSelection() { play({ s: state.sel.s, m: state.sel.m }); }

/** 재생 중에 옵션을 바꾸면 지금 장단부터 다시 재생한다. */
function restartIfPlaying() {
  if (!player.playing) return;
  const at = state.playhead;
  play(at ? { s: at.s, m: at.m } : null);
}

// ---------- 파일 ----------

function saveFile() {
  io.downloadText(serialize(state.score), `${io.safeFileName(state.score.title)}.janggu.json`);
  toast('악보 파일을 저장했습니다.');
}

async function openFile() {
  let picked;
  try { picked = await io.pickTextFile('.json,.janggu.json,application/json'); } catch { picked = null; }
  if (picked) loadText(picked.text, picked.name);
}

function loadText(text, name = '') {
  try {
    replaceScore(deserialize(text));
    toast(`‘${name || state.score.title}’을(를) 불러왔습니다.`);
  } catch (err) {
    toast(`파일을 열 수 없습니다: ${err.message}`, 6000);
  }
}

async function exportPng() {
  try {
    const clean = renderScore(state.score, { width: renderWidth || 900, selection: null, playhead: null });
    const blob = await io.svgToPng(clean, { scale: 2, background: '#ffffff', vars: EXPORT_VARS });
    io.downloadBlob(blob, `${io.safeFileName(state.score.title)}.png`);
    toast('PNG 그림을 내보냈습니다.');
  } catch (err) {
    toast(`PNG를 만들지 못했습니다: ${err.message}`, 6000);
  }
}

// ---------- 인쇄 ----------
// 인쇄 설정(배율·용지 방향)으로 강조 없이 다시 그리고, 줄 경계에서 쪽을 나눠 쪽마다 SVG 하나로 넣는다.

const printOpts = () => ({ scale: state.opts.printScale, landscape: state.opts.printLandscape });

function applyPageRule() {
  let style = $('#print-page-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'print-page-style';
    document.head.append(style);
  }
  style.textContent = pageRule(state.opts.printLandscape);
}

function beforePrint() {
  if (player.playing) player.stop();
  applyPageRule();
  const pages = pageSvgs(layoutPrint(state.score, printOpts()));
  $('#score-host').replaceChildren(...pages);
  svg = pages[0];
}
function afterPrint() { render(); }

function openPrint() {
  $('#print-scale').value = Math.round(state.opts.printScale * 100);
  for (const r of document.querySelectorAll('input[name="print-orient"]')) r.checked = (r.value === 'landscape') === state.opts.printLandscape;
  updatePrintInfo();
  $('#dlg-print').showModal();
  $('#btn-print-go').focus();
}

function updatePrintInfo() {
  const o = printOpts();
  $('#print-scale-label').textContent = `${Math.round(o.scale * 100)}%`;
  const { perLine, pages } = layoutPrint(state.score, o);
  $('#print-info').textContent = `A4 ${o.landscape ? '가로' : '세로'} · 한 줄에 장단 ${perLine}개 · 약 ${pages.length}쪽`;
}

function setPrintOpts(patch) {
  Object.assign(state.opts, patch);
  saveOptions();
  updatePrintInfo();
}

/** 화면에서 한 줄에 보이는 장단 수만큼 인쇄에도 들어가는 가장 큰 배율(최대 100%)을 찾는다. */
function fitPrintScale() {
  const target = svg ? analyze(svg).perLine : 0;
  let pick = 0.5;
  for (let p = 100; p >= 50; p -= 5) {
    pick = p / 100;
    if (layoutPrint(state.score, { ...printOpts(), scale: pick }).perLine >= target) break;
  }
  $('#print-scale').value = Math.round(pick * 100);
  setPrintOpts({ printScale: pick });
}

function submitPrint(e) {
  e.preventDefault();
  $('#dlg-print').close();
  applyPageRule();
  window.print();
}

// ---------- 화면 갱신 ----------

function updateUi() {
  const sc = state.score;
  const pos = state.sel;
  const sec = sc.sections[pos.s];
  const mea = sec.measures[pos.m];
  const beat = mea.beats[pos.b];
  const slot = beat.slots[pos.i];

  $('#score-title').textContent = sc.title || '제목 없음';
  document.title = `${sc.title || '제목 없음'} — 장구 악보`;
  $('#btn-undo').disabled = !history.canUndo;
  $('#btn-redo').disabled = !history.canRedo;
  for (const r of document.querySelectorAll('input[name="view"]')) r.checked = r.value === sc.settings.view;
  $('#opt-gueum').checked = sc.settings.showGueum;
  $('#opt-gueum-style').value = sc.settings.gueumStyle;
  $('#opt-gueum-style').disabled = !sc.settings.showGueum;
  $('#opt-symbol').value = sc.settings.symbolStyle;
  if (paletteStyle !== sc.settings.symbolStyle) fillPaletteSymbols();
  $('#zoom-label').textContent = `${Math.round(state.opts.zoom * 100)}%`;
  $('#opt-tempo').value = Math.round(state.opts.tempoScale * 100);
  $('#tempo-label').textContent = `${Math.round(state.opts.tempoScale * 100)}%`;
  $('#btn-loop').setAttribute('aria-pressed', state.opts.loop);
  $('#btn-metronome').setAttribute('aria-pressed', state.opts.metronome);
  $('#opt-advance').checked = state.opts.autoAdvance;
  $('#opt-preview').checked = state.opts.previewSound;
  $('#opt-add-fill').value = state.opts.addFill;

  // 팔레트: 현재 칸의 타법·강세·분박 표시
  for (const btn of document.querySelectorAll('[data-stroke]')) btn.setAttribute('aria-pressed', slot?.t === btn.dataset.stroke);
  $('#btn-accent').setAttribute('aria-pressed', !!slot?.accent);
  for (const btn of document.querySelectorAll('[data-division]')) btn.setAttribute('aria-pressed', Number(btn.dataset.division) === beat.slots.length);

  // 선택 위치
  const what = slot ? `${STROKES[slot.t].label}${slot.accent ? ' (강세)' : ''}` : '빈 칸';
  $('#pos-info').innerHTML = `<b>${esc(sectionLabel(sec, pos.s))}</b> · ${pos.m + 1}째 장단 · ${pos.b + 1}박`
    + (beat.slots.length > 1 ? ` · ${pos.i + 1}/${beat.slots.length}칸` : '') + `<br><span class="muted">${esc(what)}</span>`;
  $('#measure-repeat').value = mea.repeat;
  const gin = $('#slot-gueum');
  const hasStroke = !!slot && slot.t !== 'rest';
  gin.disabled = !hasStroke;
  gin.placeholder = hasStroke ? gueumOf({ t: slot.t }, sc.settings.gueumStyle) : '';
  if (document.activeElement !== gin) gin.value = slot?.g ?? '';
  const memo = $('#measure-memo');
  if (document.activeElement !== memo) memo.value = mea.memo ?? '';

  // 가락 선택
  const preset = presetFor(sec);
  const vs = $('#variant-select');
  const key = preset ? preset.id : '';
  if (vs.dataset.preset !== key) {
    vs.dataset.preset = key;
    vs.title = '';
    vs.replaceChildren(...(preset
      ? preset.variants.map((v, k) => new Option(v.name || `가락 ${k + 1}`, k))
      : [new Option('(가락 없음)', '')]));
  }
  vs.disabled = !preset;
  vs.title = vs.selectedOptions[0]?.textContent ?? '';
  $('#btn-fill').disabled = !preset;

  const g = sec.meter.grouping ? ` (${sec.meter.grouping.join('+')})` : '';
  $('#section-info').innerHTML = `<b>${esc(sectionLabel(sec, pos.s))}</b> — ${esc(sec.jangdan || '사용자 장단')}`
    + `<br><span class="muted">${sec.meter.beats}박${g} · ${sec.meter.division}분박 · 빠르기 ${sec.tempo}${sec.tempoMax ? `~${sec.tempoMax}` : ''} · 장단 ${sec.measures.length}개</span>`;
  $('#btn-mea-up').disabled = pos.m === 0;
  $('#btn-mea-down').disabled = pos.m >= sec.measures.length - 1;
  $('#btn-sec-up').disabled = pos.s === 0;
  $('#btn-sec-down').disabled = pos.s >= sc.sections.length - 1;
  $('#btn-sec-del').disabled = sc.sections.length <= 1;
  updatePlayUi();
}

function updatePlayUi() {
  const btn = $('#btn-play');
  btn.textContent = player.playing ? '■ 정지' : '▶ 재생';
  btn.setAttribute('aria-pressed', player.playing);
  document.body.classList.toggle('is-playing', player.playing);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer = 0;
function toast(msg, ms = 3000) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ---------- 팔레트·도움말 만들기 ----------

function buildPalette() {
  $('#palette-strokes').replaceChildren(...STROKE_IDS.map((id) => {
    const st = STROKES[id];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pal-btn stroke';
    b.dataset.stroke = id;
    b.title = `${st.label} — ${st.desc} (${st.key.toUpperCase()})`;
    b.setAttribute('aria-label', `${st.label} 입력, 단축키 ${st.key.toUpperCase()}`);
    b.innerHTML = `<span class="pal-glyph" aria-hidden="true"></span><span class="pal-label">${esc(st.label)}</span><kbd>${esc(st.key.toUpperCase())}</kbd>`;
    return b;
  }));
  fillPaletteSymbols();
  $('#palette-division').replaceChildren(...SLOT_COUNTS.map((n) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'div-btn';
    b.dataset.division = n;
    b.textContent = n;
    b.title = `선택한 박을 ${n}칸으로 (${n})`;
    b.setAttribute('aria-label', `분박 ${n}칸`);
    return b;
  }));
}

/** 한 타법의 부호 그림(렌더러의 symbolSvg). 그리지 못하면 빈 span. */
function glyphFor(id, style, size = 24) {
  try { return symbolSvg(id, style, size); } catch { return document.createElement('span'); }
}

/** 팔레트 버튼의 부호 그림을 지금 부호 체계로 다시 그린다. */
function fillPaletteSymbols() {
  paletteStyle = state.score.settings.symbolStyle;
  for (const btn of document.querySelectorAll('.pal-btn.stroke')) {
    btn.querySelector('.pal-glyph')?.replaceChildren(glyphFor(btn.dataset.stroke, paletteStyle));
  }
}

/** 도움말의 부호 표: 정악식·민속악식 두 모양을 모두 보여준다. */
function buildHelp() {
  const tbody = $('#help-strokes tbody');
  tbody.replaceChildren(...STROKE_IDS.map((id) => {
    const st = STROKES[id];
    const g = (k) => esc(st.gueum[k] || '—');
    const tr = document.createElement('tr');
    tr.innerHTML = '<td class="glyph-cell"></td><td class="glyph-cell"></td>'
      + `<td>${esc(st.label)}</td><td>${g('banju')} / ${g('samul')} / ${g('minsok')}</td>`
      + `<td><kbd>${esc(st.key.toUpperCase())}</kbd></td><td>${esc(st.desc)}</td>`;
    const cells = tr.querySelectorAll('.glyph-cell');
    cells[0].append(glyphFor(id, 'jeongak', 30));
    cells[1].append(glyphFor(id, 'minsok', 30));
    return tr;
  }));
}

// ---------- 구간 대화상자 ----------

let sectionDialogMode = 'add';

function buildPresetOptions() {
  const sel = $('#sd-preset');
  const cats = [...new Set(PRESETS.map((p) => p.category))];
  const order = [GOBEOP, '정악', '민속악'];
  cats.sort((a, b) => (order.indexOf(a) + 99) % 99 - (order.indexOf(b) + 99) % 99);
  const groups = cats.map((cat) => {
    const og = document.createElement('optgroup');
    og.label = cat || '기타';
    for (const p of PRESETS.filter((x) => x.category === cat)) {
      og.append(new Option(`${p.name} — ${p.meter.beats}박${p.verified === false ? ' (확인 필요)' : ''}`, p.id));
    }
    return og;
  });
  const custom = document.createElement('optgroup');
  custom.label = '직접 지정';
  custom.append(new Option('사용자 장단 (박 수·분박 지정)', CUSTOM));
  sel.replaceChildren(...groups, custom);
}

function openSectionDialog(mode) {
  sectionDialogMode = mode;
  const dlg = $('#dlg-section');
  const isNew = mode === 'new';
  $('#dlg-section-title').textContent = isNew ? '새 악보' : '구간 추가';
  $('#sd-submit').textContent = isNew ? '새 악보 만들기' : '구간 추가';
  $('#sd-title-row').hidden = !isNew;
  $('#sd-title').value = isNew ? '' : state.score.title;
  // 구간 추가는 지금 구간의 장단을 기본으로
  const cur = presetFor(state.score.sections[state.sel.s]);
  $('#sd-preset').value = isNew ? (PRESETS.find((p) => p.name === '도드리')?.id ?? PRESETS[0]?.id ?? CUSTOM) : (cur?.id ?? PRESETS[0]?.id ?? CUSTOM);
  $('#sd-slots').value = 1;
  $('#sd-name').value = '';
  $('#sd-measures').value = 4;
  $('#sd-fill').value = 'first';
  $('#sd-error').textContent = '';
  onPresetChange();
  dlg.showModal();
  (isNew ? $('#sd-title') : $('#sd-preset')).focus();
}

function onPresetChange() {
  const id = $('#sd-preset').value;
  const custom = id === CUSTOM;
  $('#sd-custom-fields').hidden = !custom;
  $('#sd-preset-fields').hidden = custom;
  // 교재식 표기는 ‘산조·민요 반주’를 고르면 기본으로 켠다(구간 추가는 지금 악보가 기본 모양일 때만)
  const gobeop = !custom && getPreset(id)?.category === GOBEOP;
  $('#sd-textbook').checked = gobeop && (sectionDialogMode === 'new' || isPlainLook(state.score.settings));
  if (!custom) {
    const p = getPreset(id);
    $('#sd-variant').replaceChildren(...p.variants.map((v, k) => new Option(v.name || `가락 ${k + 1}`, k)));
    $('#sd-tempo').value = p.tempo;
    const range = Array.isArray(p.tempoRange) ? ` · 보통 ♩=${p.tempoRange[0]}~${p.tempoRange[1]}` : '';
    const g = p.meter.grouping ? ` (${p.meter.grouping.join('+')})` : '';
    $('#sd-info').textContent = `${p.category} · ${p.meter.beats}박${g} · ${p.meter.division}분박${range}`
      + (p.source ? ` · 출처: ${p.source}` : '') + (p.verified === false ? ' · 가락 확인 필요' : '');
  } else {
    $('#sd-info').textContent = '박 수와 분박을 정해 빈 장단으로 시작합니다.';
    if (!$('#sd-tempo').value) $('#sd-tempo').value = 60;
  }
  updateSectionPreview();
}

/** 대화상자 입력값으로 구간을 만든다. 잘못된 값이면 Error. */
function sectionFromDialog() {
  const id = $('#sd-preset').value;
  const name = $('#sd-name').value.trim();
  const tempo = Math.floor(Number($('#sd-tempo').value));
  const measures = Math.floor(Number($('#sd-measures').value));
  if (!(tempo >= 10 && tempo <= 400)) throw new Error('빠르기는 10~400 사이로 적어 주세요.');
  if (!(measures >= 1 && measures <= 200)) throw new Error('장단 수는 1~200 사이로 적어 주세요.');
  if (id !== CUSTOM) {
    return buildPresetSection(id, { variant: Number($('#sd-variant').value) || 0, measures, fill: $('#sd-fill').value, name, tempo });
  }
  const beats = Math.floor(Number($('#sd-beats').value));
  if (!(beats >= 1 && beats <= 24)) throw new Error('박 수는 1~24 사이로 적어 주세요.');
  const division = Number($('#sd-division').value) === 3 ? 3 : 2;
  const gtext = $('#sd-grouping').value.trim();
  let grouping = null;
  if (gtext) {
    grouping = gtext.split(/[\s,+]+/).filter(Boolean).map(Number);
    if (grouping.some((n) => !Number.isInteger(n) || n < 1) || grouping.reduce((a, n) => a + n, 0) !== beats) {
      throw new Error(`박 묶음의 합이 박 수(${beats})와 같아야 합니다. 예: ${beats % 2 === 0 ? `${beats / 2},${beats / 2}` : beats}`);
    }
  }
  const meter = { beats, division, grouping, slots: Number($('#sd-slots').value) || 1 };
  const list = Array.from({ length: measures }, () => createMeasure(meter));
  return createSection({ name, jangdan: $('#sd-jangdan').value.trim() || '사용자 장단', meter, tempo, measures: list });
}

function updateSectionPreview() {
  const box = $('#sd-preview');
  try {
    const sec = sectionFromDialog();
    sec.measures = sec.measures.slice(0, 1);
    sec.name = '';
    const sc = createScore({ title: '', sections: [sec] });
    sc.settings = { ...state.score.settings, ...($('#sd-textbook').checked ? TEXTBOOK_LOOK : {}) };
    const width = Math.max(240, box.clientWidth - 16 || 300);
    box.replaceChildren(renderScore(sc, { width }));
    $('#sd-error').textContent = '';
  } catch (err) {
    box.replaceChildren();
    $('#sd-error').textContent = err.message;
  }
}

function submitSectionDialog(e) {
  e.preventDefault();
  let sec;
  try { sec = sectionFromDialog(); } catch (err) { $('#sd-error').textContent = err.message; return; }
  if (sectionDialogMode === 'new') {
    const score = createScore({ title: $('#sd-title').value.trim() || '제목 없음', sections: [sec] });
    score.settings = { ...state.score.settings, ...($('#sd-textbook').checked ? TEXTBOOK_LOOK : {}) };
    replaceScore(score);
    toast('새 악보를 시작했습니다. 이전 악보는 실행 취소로 되돌릴 수 있습니다.', 4000);
  } else {
    const at = state.sel.s + 1;
    if ($('#sd-textbook').checked) Object.assign(state.score.settings, TEXTBOOK_LOOK);
    edit((sc) => insertSection(sc, at, sec), { sel: { s: at, m: 0, b: 0, i: 0 } });
  }
  $('#dlg-section').close();
  $('#score-scroll').focus({ preventScroll: true });
}

// ---------- 구간 설정·악보 정보 ----------

let editingSection = 0;

function openSectionEdit(s = state.sel.s) {
  editingSection = s;
  const sec = state.score.sections[s];
  const p = presetFor(sec);
  const g = sec.meter.grouping ? ` (${sec.meter.grouping.join('+')})` : '';
  $('#se-info').textContent = `${sec.jangdan || '사용자 장단'} · ${sec.meter.beats}박${g} · ${sec.meter.division}분박 · 장단 ${sec.measures.length}개`;
  $('#se-name').value = sec.name;
  $('#se-tempo').value = sec.tempo;
  $('#se-tempomax').value = sec.tempoMax ?? '';
  $('#se-slots').value = sec.meter.slots ?? 1;
  $('#se-tempo-hint').textContent = p && Array.isArray(p.tempoRange) ? `${p.name}은(는) 보통 ♩=${p.tempoRange[0]}~${p.tempoRange[1]} 정도로 연주합니다.` : '';
  $('#se-error').textContent = '';
  $('#dlg-section-edit').showModal();
  $('#se-name').focus();
}

function submitSectionEdit(e) {
  e.preventDefault();
  const tempo = Math.floor(Number($('#se-tempo').value));
  if (!(tempo >= 10 && tempo <= 400)) { $('#se-error').textContent = '빠르기는 10~400 사이로 적어 주세요.'; return; }
  const maxText = $('#se-tempomax').value.trim();
  const tempoMax = maxText === '' ? null : Math.floor(Number(maxText));
  if (tempoMax !== null && !(tempoMax > tempo && tempoMax <= 400)) { $('#se-error').textContent = `빠르기 범위의 위쪽 값은 ${tempo}보다 크고 400 이하여야 합니다. 비워 두면 한 값만 표시합니다.`; return; }
  const slots = Number($('#se-slots').value) || 1;
  const s = editingSection;
  const name = $('#se-name').value.trim();
  edit((sc) => {
    const sec = sc.sections[s];
    sec.name = name; sec.tempo = tempo; sec.tempoMax = tempoMax; sec.meter.slots = slots;
  });
  $('#dlg-section-edit').close();
}

function openHelp() {
  $('#dlg-help').showModal();
  $('#dlg-help [data-close]').focus();
}

function openInfo() {
  $('#info-title').value = state.score.title;
  $('#info-author').value = state.score.author;
  $('#info-memo').value = state.score.memo;
  $('#dlg-info').showModal();
  $('#info-title').focus();
}

function submitInfo(e) {
  e.preventDefault();
  const title = $('#info-title').value.trim() || '제목 없음';
  const author = $('#info-author').value.trim();
  const memo = $('#info-memo').value;
  edit((sc) => { sc.title = title; sc.author = author; sc.memo = memo; });
  $('#dlg-info').close();
}

// ---------- 이벤트 ----------

const ACTIONS = {
  new: () => openSectionDialog('new'),
  open: openFile,
  save: saveFile,
  png: exportPng,
  print: openPrint,
  'print-fit': fitPrintScale,
  help: openHelp,
  info: openInfo,
  undo,
  redo,
  'zoom-in': () => zoomStep(1),
  'zoom-out': () => zoomStep(-1),
  'zoom-reset': () => setZoom(1),
  play: togglePlay,
  'play-from': playFromSelection,
  loop: () => { state.opts.loop = !state.opts.loop; saveOptions(); updateUi(); restartIfPlaying(); },
  metronome: () => { state.opts.metronome = !state.opts.metronome; saveOptions(); updateUi(); restartIfPlaying(); },
  accent,
  clear: clearSlot,
  'measure-add': addMeasure,
  'measure-dup': duplicate,
  'measure-up': () => shiftMeasure(-1),
  'measure-down': () => shiftMeasure(1),
  'measure-del': removeMeasure,
  'measure-fill': fillVariant,
  'section-add': () => openSectionDialog('add'),
  'section-edit': () => openSectionEdit(),
  'section-up': () => moveSection(-1),
  'section-down': () => moveSection(1),
  'section-del': () => removeSection(),
};

function setZoom(z) {
  state.opts.zoom = z;
  saveOptions();
  render();
  updateUi();
  revealSelection();
}
function zoomStep(d) {
  const i = ZOOMS.indexOf(state.opts.zoom);
  setZoom(ZOOMS[Math.min(Math.max(i + d, 0), ZOOMS.length - 1)]);
}

const CONTROL_INPUTS = ['checkbox', 'radio', 'range', 'button', 'submit'];
// 글자를 입력하는 요소(여기서는 악보 단축키를 쓰지 않는다)
const isTyping = (el) => el instanceof HTMLElement && (el.isContentEditable || el.tagName === 'TEXTAREA'
  || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && !CONTROL_INPUTS.includes(el.type)));
// Space·Enter·Tab·방향키를 스스로 쓰는 요소
const isControl = (el) => el instanceof HTMLElement && (el.matches('button, a, summary')
  || (el.tagName === 'INPUT' && CONTROL_INPUTS.includes(el.type)));
const DIGITS = { Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4, Digit6: 6, Numpad1: 1, Numpad2: 2, Numpad3: 3, Numpad4: 4, Numpad6: 6 };
const STROKE_BY_CODE = Object.fromEntries(STROKE_IDS.map((id) => [`Key${STROKES[id].key.toUpperCase()}`, id]));

function onKeyDown(e) {
  if (document.querySelector('dialog[open]')) return; // 대화상자는 자체 처리
  const t = e.target;
  if (isTyping(t)) return;
  const onControl = isControl(t);
  const ctrl = e.ctrlKey || e.metaKey;

  if (ctrl) {
    const k = e.code;
    if (k === 'KeyZ') e.shiftKey ? redo() : undo();
    else if (k === 'KeyY') redo();
    else if (k === 'KeyD') duplicate();
    else if (k === 'KeyS') saveFile();
    else if (k === 'KeyO') openFile();
    else if (k === 'Delete' || k === 'Backspace') removeMeasure();
    else return;
    e.preventDefault();
    return;
  }
  if (e.altKey) {
    // Alt+방향키: 장단 순서 바꾸기 (보기 방향은 방향키 이동과 같다)
    const vertical = state.score.settings.view === 'vertical';
    const d = (vertical ? { ArrowRight: -1, ArrowLeft: 1 } : { ArrowUp: -1, ArrowDown: 1 })[e.code];
    if (!d || e.shiftKey) return;
    shiftMeasure(d);
    e.preventDefault();
    return;
  }
  // 버튼에 포커스가 있으면 Space/Enter/Tab/방향키는 브라우저 기본 동작(접근성)
  if (onControl && ['Space', 'Enter', 'NumpadEnter', 'Tab'].includes(e.code)) return;

  const code = e.code;
  if (code.startsWith('Arrow')) {
    if (onControl) return;
    arrowMove(code);
  } else if (code === 'Tab') {
    select(stepBeat(state.sel, e.shiftKey ? -1 : 1));
  } else if (STROKE_BY_CODE[code] && !e.shiftKey) {
    inputStroke(STROKE_BY_CODE[code]);
  } else if (code === 'F2' || (code === 'Quote' && !e.shiftKey)) {
    focusGueum();
  } else if (code === 'Backspace' || code === 'Delete') {
    clearSlot();
  } else if (code === 'Period' || code === 'NumpadDecimal') {
    accent();
  } else if (DIGITS[code] && !e.shiftKey) {
    setDivision(DIGITS[code]);
  } else if (code === 'Enter' || code === 'NumpadEnter') {
    addMeasure();
  } else if (code === 'Space') {
    if (e.shiftKey) playFromSelection(); else togglePlay();
  } else if (code === 'Escape') {
    if (player.playing) player.stop();
    else return;
  } else if (code === 'Equal' || code === 'NumpadAdd') {
    zoomStep(1);
  } else if (code === 'Minus' || code === 'NumpadSubtract') {
    zoomStep(-1);
  } else if (e.key === '?' || code === 'F1') {
    openHelp();
  } else {
    return;
  }
  e.preventDefault();
}

function onScoreClick(e) {
  const memo = e.target.closest('.jg-memo');
  if (memo) {
    const d = memo.dataset;
    const same = state.sel.s === +d.s && state.sel.m === +d.m;
    select(same ? state.sel : { s: +d.s, m: +d.m, b: 0, i: 0 });
    $('#measure-memo').focus();
    return;
  }
  const slot = e.target.closest('.jg-slot');
  if (slot) {
    const d = slot.dataset;
    select({ s: +d.s, m: +d.m, b: +d.b, i: +d.i });
    return;
  }
  const head = e.target.closest('.jg-section-head');
  if (head) { openSectionEdit(+head.dataset.s); return; }
  const mea = e.target.closest('.jg-measure');
  if (mea) select({ s: +mea.dataset.s, m: +mea.dataset.m, b: 0, i: 0 });
}

function bindEvents() {
  document.addEventListener('keydown', onKeyDown);

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || btn.disabled) return;
    if (btn.hasAttribute('data-close')) { btn.closest('dialog')?.close(); return; }
    let handled = true;
    if (btn.dataset.stroke) inputStroke(btn.dataset.stroke);
    else if (btn.dataset.division) setDivision(Number(btn.dataset.division));
    else if (ACTIONS[btn.dataset.action]) ACTIONS[btn.dataset.action]();
    else handled = false;
    // 마우스로 누른 경우 키보드 입력이 바로 악보로 가도록 포커스를 돌려준다
    if (handled && e.detail > 0 && !btn.closest('dialog') && !document.querySelector('dialog[open]')) {
      $('#score-scroll').focus({ preventScroll: true });
    }
  });

  const host = $('#score-host');
  host.addEventListener('click', onScoreClick);

  for (const r of document.querySelectorAll('input[name="view"]')) {
    r.addEventListener('change', () => { setSettings({ view: r.value }); revealSelection(); r.blur(); });
  }
  $('#opt-gueum').addEventListener('change', (e) => setSettings({ showGueum: e.target.checked }));
  $('#opt-symbol').addEventListener('change', (e) => {
    const symbolStyle = e.target.value;
    setSettings({ symbolStyle, gueumStyle: symbolStyle === 'minsok' ? 'minsok' : 'banju' });
    e.target.blur();
  });
  const gin = $('#slot-gueum');
  gin.addEventListener('change', () => setGueum(gin.value));
  gin.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key === 'Enter') { e.preventDefault(); setGueum(gin.value); $('#score-scroll').focus({ preventScroll: true }); }
    else if (e.key === 'Escape') { e.preventDefault(); gin.value = getSlot(state.score, state.sel)?.g ?? ''; $('#score-scroll').focus({ preventScroll: true }); }
  });
  $('#measure-memo').addEventListener('change', (e) => setMemo(e.target.value));
  $('#measure-memo').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); $('#score-scroll').focus({ preventScroll: true }); }
  });
  $('#opt-gueum-style').addEventListener('change', (e) => { setSettings({ gueumStyle: e.target.value }); e.target.blur(); });
  $('#opt-tempo').addEventListener('input', (e) => {
    state.opts.tempoScale = Number(e.target.value) / 100;
    $('#tempo-label').textContent = `${e.target.value}%`;
  });
  $('#opt-tempo').addEventListener('change', () => { saveOptions(); restartIfPlaying(); });
  $('#opt-advance').addEventListener('change', (e) => { state.opts.autoAdvance = e.target.checked; saveOptions(); });
  $('#opt-preview').addEventListener('change', (e) => { state.opts.previewSound = e.target.checked; saveOptions(); });
  $('#opt-add-fill').addEventListener('change', (e) => { state.opts.addFill = e.target.value; saveOptions(); e.target.blur(); });
  $('#variant-select').addEventListener('change', (e) => { e.target.title = e.target.selectedOptions[0]?.textContent ?? ''; });
  $('#measure-repeat').addEventListener('change', (e) => setRepeat(e.target.value));

  // 대화상자
  $('#form-section').addEventListener('submit', submitSectionDialog);
  $('#sd-preset').addEventListener('change', onPresetChange);
  for (const id of ['#sd-variant', '#sd-fill', '#sd-beats', '#sd-division', '#sd-slots', '#sd-grouping', '#sd-tempo', '#sd-measures', '#sd-textbook']) {
    $(id).addEventListener('input', updateSectionPreview);
  }
  $('#form-section-edit').addEventListener('submit', submitSectionEdit);
  $('#form-info').addEventListener('submit', submitInfo);
  $('#form-print').addEventListener('submit', submitPrint);
  $('#print-scale').addEventListener('input', (e) => setPrintOpts({ printScale: Number(e.target.value) / 100 }));
  for (const r of document.querySelectorAll('input[name="print-orient"]')) {
    r.addEventListener('change', () => setPrintOpts({ printLandscape: r.value === 'landscape' }));
  }
  applyPageRule();
  for (const dlg of document.querySelectorAll('dialog')) {
    // 바깥(배경)을 누르면 닫기
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => $('#score-scroll').focus({ preventScroll: true }));
  }

  // 창 크기 변경 → 폭이 바뀌었을 때만 다시 그리기
  let resizeTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (Math.floor(availableWidth() / state.opts.zoom) !== renderWidth) render();
    }, 150);
  }).observe($('#score-scroll'));

  // 파일 끌어다 놓기
  document.addEventListener('dragover', (e) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
  document.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    e.preventDefault();
    file.text().then((text) => loadText(text, file.name));
  });

  window.addEventListener('beforeprint', beforePrint);
  window.addEventListener('afterprint', afterPrint);
  window.addEventListener('pagehide', saveNow);
}

init();
