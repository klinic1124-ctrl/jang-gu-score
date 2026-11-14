// 정간보 장구 부호 — 국립국악원 표기를 벡터로 그린다(글꼴에 의존하지 않음).
// 모든 부호는 (cx, cy)를 중심으로 크기 s(부호 높이 기준) 안에 그린다.

import { el, r2 } from './svg.js';

const circle = (g, cx, cy, r, s) => el('circle', { cx: r2(cx), cy: r2(cy), r: r2(r), class: 'jg-sym', 'stroke-width': r2(Math.max(1, s * 0.08)) }, g);
const vline = (g, x, y1, y2, s) => el('line', { x1: r2(x), y1: r2(y1), x2: r2(x), y2: r2(y2), class: 'jg-sym', 'stroke-width': r2(Math.max(1, s * 0.09)) }, g);
const dot = (g, cx, cy, r) => el('circle', { cx: r2(cx), cy: r2(cy), r: r2(r), class: 'jg-dot' }, g);

const DRAW = {
  // 덩: 원 + 원 밖으로 살짝 나오는 세로선
  deong(g, cx, cy, s) { circle(g, cx, cy, s * 0.32, s); vline(g, cx, cy - s * 0.48, cy + s * 0.48, s); },
  // 쿵: 빈 원
  kung(g, cx, cy, s) { circle(g, cx, cy, s * 0.32, s); },
  // 덕: 세로선
  deok(g, cx, cy, s) { vline(g, cx, cy - s * 0.42, cy + s * 0.42, s); },
  // 기덕: 점 + 세로선(i 모양)
  gideok(g, cx, cy, s) { dot(g, cx, cy - s * 0.38, Math.max(1.2, s * 0.08)); vline(g, cx, cy - s * 0.18, cy + s * 0.45, s); },
  // 더러러러: 세로로 늘어선 점 4개(맨 위가 조금 큼)
  deoreo(g, cx, cy, s) {
    const r = Math.max(1, s * 0.065);
    for (let k = 0; k < 4; k += 1) dot(g, cx, cy - s * 0.4 + (k * s * 0.8) / 3, k === 0 ? r * 1.4 : r);
  },
  // 더: 점 하나
  deo(g, cx, cy, s) { dot(g, cx, cy, Math.max(1.3, s * 0.09)); },
  // 쉼: 짧은 가로선
  rest(g, cx, cy, s) {
    el('line', { x1: r2(cx - s * 0.3), y1: r2(cy), x2: r2(cx + s * 0.3), y2: r2(cy), class: 'jg-sym', 'stroke-width': r2(Math.max(1, s * 0.09)) }, g);
  },
};

/** 강세 부호 '>'를 (x, y) 중심에 크기 s로 그린다. */
export function drawAccent(parent, x, y, s = 8) {
  const w = s * 0.5;
  const h = s * 0.35;
  return el('path', {
    d: `M${r2(x - w)},${r2(y - h)} L${r2(x + w)},${r2(y)} L${r2(x - w)},${r2(y + h)}`,
    class: 'jg-sym', 'stroke-width': r2(Math.max(1, s * 0.13)), 'stroke-linejoin': 'round',
  }, parent);
}

/**
 * 분박 칸 하나의 부호를 그린다. slot이 null이면 아무것도 그리지 않는다.
 * accentAt: 'left'(부호 왼쪽) | 'above'(부호 왼쪽 위)
 */
export function drawSymbol(parent, slot, cx, cy, s, { accentAt = 'left' } = {}) {
  if (!slot || !DRAW[slot.t]) return null;
  const g = el('g', { class: `jg-stroke jg-${slot.t}` }, parent);
  DRAW[slot.t](g, cx, cy, s);
  if (slot.accent) {
    const a = Math.max(6, s * 0.5);
    if (accentAt === 'above') drawAccent(g, cx - s * 0.5, cy - s * 0.6, a);
    else drawAccent(g, cx - s * 0.62, cy, a);
  }
  return g;
}
