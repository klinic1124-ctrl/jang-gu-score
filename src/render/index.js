// 악보 SVG 렌더러 — 공개 API: renderScore, updateHighlights.

import { el, text, textWidth, r2, FONT_STACK } from './svg.js';
import { renderVertical, renderHorizontal } from './jeonggan.js';
import { renderStaff } from './staff.js';

const MARGIN = 24;

const STYLE = `
.jg-score { font-family: ${FONT_STACK}; }
.jg-paper { fill: var(--jg-paper, #fff); }
.jg-text { fill: var(--jg-ink, #111); }
.jg-muted { fill: var(--jg-ink, #111); fill-opacity: .62; }
.jg-title { fill: var(--jg-ink, #111); font-weight: 700; }
.jg-time { fill: var(--jg-ink, #111); font-weight: 700; font-family: Georgia, "Times New Roman", serif; }
.jg-rule { stroke: var(--jg-line, #555); stroke-width: 1; fill: none; }
.jg-rule-bold { stroke: var(--jg-line, #555); stroke-width: 2.4; fill: none; }
.jg-rule-dash { stroke: var(--jg-line, #555); stroke-width: 1; stroke-dasharray: 3 3; fill: none; }
.jg-frame { stroke: var(--jg-ink, #111); stroke-width: 1.6; fill: none; }
.jg-sym { stroke: var(--jg-ink, #111); fill: none; stroke-linecap: round; }
.jg-dot, .jg-fill { fill: var(--jg-ink, #111); stroke: none; }
.jg-stem { stroke: var(--jg-ink, #111); stroke-width: 1.2; fill: none; }
.jg-thin { stroke: var(--jg-ink, #111); stroke-width: 1; fill: none; }
.jg-hollow { fill: var(--jg-paper, #fff); stroke: var(--jg-ink, #111); stroke-width: 1.3; }
.jg-staffline { stroke: var(--jg-ink, #111); stroke-width: 1.1; }
.jg-bar { stroke: var(--jg-ink, #111); stroke-width: 1.2; }
.jg-bar-thick { stroke: var(--jg-ink, #111); stroke-width: 3.5; }
.jg-slot { fill: transparent; stroke: none; pointer-events: all; cursor: pointer; }
.jg-slot.is-playing { fill: var(--jg-play, #ffb02e); fill-opacity: .32; }
.jg-slot.is-selected { fill: var(--jg-select, #2f6bff); fill-opacity: .2; stroke: var(--jg-select, #2f6bff); stroke-width: 1.5; }
@media print {
  .jg-slot, .jg-slot.is-selected, .jg-slot.is-playing { fill: transparent !important; stroke: none !important; }
}
`;

/** 빠르기 표시용 작은 4분음표(점4분이면 점까지) 아이콘. 글꼴의 ♩에 의존하지 않는다. 폭을 돌려준다. */
export function drawTempoNote(parent, x, y, dotted, size = 13) {
  const k = size / 13;
  const hx = x + 4 * k;
  const hy = y - 2.5 * k;
  el('ellipse', { cx: r2(hx), cy: r2(hy), rx: r2(3.6 * k), ry: r2(2.6 * k), transform: `rotate(-20 ${r2(hx)} ${r2(hy)})`, class: 'jg-fill' }, parent);
  el('line', { x1: r2(hx + 3.3 * k), y1: r2(hy), x2: r2(hx + 3.3 * k), y2: r2(hy - 11 * k), class: 'jg-stem' }, parent);
  let w = 9 * k;
  if (dotted) { el('circle', { cx: r2(x + w + 1 * k), cy: r2(hy), r: r2(1.4 * k), class: 'jg-dot' }, parent); w += 4 * k; }
  return w;
}

/** 구간 머리말 문자열 조각들. */
function sectionTitle(sec) {
  const parts = [];
  if (sec.name) parts.push(sec.name);
  if (sec.jangdan) parts.push(sec.jangdan.endsWith('장단') ? sec.jangdan : `${sec.jangdan} 장단`);
  return parts.join('  ·  ');
}

/**
 * 구간 머리말을 그린다. align='end'면 오른쪽 끝(x)에 맞춘다. 차지한 높이를 돌려준다.
 */
export function drawSectionHead(parent, sec, s, x, y, align = 'start') {
  const g = el('g', { class: 'jg-section-head', 'data-s': s }, parent);
  const label = sectionTitle(sec);
  const size = 15;
  const tempoStr = `=${sec.tempo}`;
  const gap = label ? 14 : 0;
  const dotted = sec.meter.division === 3;
  const tempoW = 9 + (dotted ? 4 : 0) + textWidth(tempoStr, 13);
  const total = textWidth(label, size) + gap + tempoW;
  const x0 = align === 'end' ? x - total : x;
  const base = y + 16;
  if (label) text(g, x0, base, label, { size, weight: 700 });
  const tx = x0 + textWidth(label, size) + gap;
  const nw = drawTempoNote(g, tx, base, dotted);
  text(g, tx + nw + 1, base, tempoStr, { size: 13 });
  return 26;
}

/** 제목·작성자·메모. 차지한 높이를 돌려준다. */
function drawHeader(parent, score, width) {
  const g = el('g', { class: 'jg-header' }, parent);
  let y = MARGIN + 22;
  const title = score.title || '';
  if (title) { text(g, width / 2, y, title, { size: 24, anchor: 'middle', cls: 'jg-title', maxWidth: width - MARGIN * 2 }); }
  y += 10;
  if (score.author) { y += 16; text(g, width - MARGIN, y, score.author, { size: 13, anchor: 'end' }); }
  if (score.memo) {
    const size = 12;
    const maxChars = (s) => textWidth(s, size) > width - MARGIN * 2;
    for (const para of score.memo.split(/\r?\n/)) {
      // 폭에 맞춰 글자 단위로 줄바꿈
      let lineStr = '';
      const flush = () => { y += 17; text(g, width / 2, y, lineStr, { size, anchor: 'middle', cls: 'jg-muted' }); lineStr = ''; };
      for (const ch of para) {
        if (maxChars(lineStr + ch)) flush();
        lineStr += ch;
      }
      flush();
    }
  }
  return y + 18;
}

/** 악보 전체를 SVG로 그린다. 브라우저 DOM(document.createElementNS) 사용. */
export function renderScore(score, { width = 900, selection = null, playhead = null } = {}) {
  width = Math.max(240, Math.round(width));
  const view = score.settings?.view ?? 'vertical';
  const svg = el('svg', {
    xmlns: 'http://www.w3.org/2000/svg', class: 'jg-score', 'data-view': view, width,
  });
  el('style', {}, svg).textContent = STYLE;
  const paper = el('rect', { x: 0, y: 0, width, class: 'jg-paper' }, svg);
  const root = el('g', {}, svg);

  let y = drawHeader(root, score, width);
  const ctx = { score, width, margin: MARGIN, settings: score.settings ?? {} };
  score.sections.forEach((sec, s) => {
    if (view === 'staff') y = renderStaff(root, ctx, sec, s, y);
    else if (view === 'horizontal') y = renderHorizontal(root, ctx, sec, s, y);
    else y = renderVertical(root, ctx, sec, s, y);
    y += 22;
  });

  const height = Math.ceil(y + MARGIN - 10);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  paper.setAttribute('height', height);
  updateHighlights(svg, { selection, playhead });
  return svg;
}

const asList = (p) => (!p ? [] : Array.isArray(p) ? p : [p]);
const slotSelector = (p) => `rect.jg-slot[data-s="${p.s}"][data-m="${p.m}"][data-b="${p.b}"][data-i="${p.i}"]`;

function mark(svg, cls, positions) {
  svg.querySelectorAll(`rect.jg-slot.${cls}`).forEach((n) => n.classList.remove(cls));
  for (const p of positions) svg.querySelectorAll(slotSelector(p)).forEach((n) => n.classList.add(cls));
}

/** 다시 그리지 않고 선택/재생 위치 강조만 갱신한다. selection/playhead는 Position(또는 그 배열)이나 null. */
export function updateHighlights(svg, { selection = null, playhead = null } = {}) {
  if (!svg) return;
  mark(svg, 'is-selected', asList(selection));
  mark(svg, 'is-playing', asList(playhead));
}
