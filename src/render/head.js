// 구간 머리말(구간 이름·장단·빠르기).

import { el, text, textWidth, r2 } from './svg.js';

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
  const tempoStr = sec.tempoMax > sec.tempo ? `≒ ${sec.tempo}~${sec.tempoMax}` : `=${sec.tempo}`;
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

