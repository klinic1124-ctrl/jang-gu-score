// 장구 부호 — 벡터로 그린다(글꼴에 의존하지 않음).
//   정악식(jeongak): 국립국악원 정간보 표기(⦶ │ ○ i ⋮ · ─)
//   민속악식(minsok): 산조·민요 반주 교재 표기(⊖ ○ ─ ······ · ⊗ ◎ 卌 ✳ ⊕)
// 새 타법(떡·구궁·따드락·변죽 따드락·드르덩)은 정악식에 해당 부호가 없어 두 체계 모두 민속악식 모양을 쓴다.
// 모든 부호는 (cx, cy)를 중심으로 크기 s(부호 높이 기준) 안에 그린다.

import { STROKES } from '../model.js';
import { el, r2, SVG_NS } from './svg.js';

const sw = (s, k = 0.08) => r2(Math.max(1, s * k));
const circle = (g, cx, cy, r, s) => el('circle', { cx: r2(cx), cy: r2(cy), r: r2(r), class: 'jg-sym', 'stroke-width': sw(s) }, g);
const seg = (g, x1, y1, x2, y2, s, k = 0.09) => el('line', { x1: r2(x1), y1: r2(y1), x2: r2(x2), y2: r2(y2), class: 'jg-sym', 'stroke-width': sw(s, k) }, g);
const vline = (g, x, y1, y2, s) => seg(g, x, y1, x, y2, s);
const hline = (g, x1, x2, y, s, k = 0.09) => seg(g, x1, y, x2, y, s, k);
const dot = (g, cx, cy, r) => el('circle', { cx: r2(cx), cy: r2(cy), r: r2(r), class: 'jg-dot' }, g);

// ---- 두 체계가 함께 쓰는 민속악 타법 ----
const R = 0.34; // 원 반지름(부호 크기 대비)
const SHARED = {
  // 떡(변죽): ⊗ 원 안에 X
  tteok(g, cx, cy, s) {
    const r = s * R;
    const d = r * 0.68;
    circle(g, cx, cy, r, s);
    seg(g, cx - d, cy - d, cx + d, cy + d, s, 0.075);
    seg(g, cx - d, cy + d, cx + d, cy - d, s, 0.075);
  },
  // 구궁: 원 안 왼쪽에 작은 원(교재 모양)
  gugung(g, cx, cy, s) {
    const r = s * R;
    circle(g, cx, cy, r, s);
    circle(g, cx - r * 0.32, cy, r * 0.42, s * 0.85);
  },
  // 따드락: 卌 — 가로선 하나를 짧은 세로줄 셋이 가로지름
  ttadeurak(g, cx, cy, s) {
    hline(g, cx - s * 0.38, cx + s * 0.38, cy, s);
    for (const dx of [-0.16, 0, 0.16]) vline(g, cx + dx * s, cy - s * 0.22, cy + s * 0.22, s);
  },
  // 변죽 따드락: ✳ — 가로선에 세로선과 비스듬한 두 선이 엇갈림(Ж 꼴)
  byeondeurak(g, cx, cy, s) {
    hline(g, cx - s * 0.38, cx + s * 0.38, cy, s, 0.1);
    vline(g, cx, cy - s * 0.26, cy + s * 0.26, s);
    seg(g, cx - s * 0.17, cy - s * 0.26, cx + s * 0.17, cy + s * 0.26, s, 0.1);
    seg(g, cx - s * 0.17, cy + s * 0.26, cx + s * 0.17, cy - s * 0.26, s, 0.1);
  },
  // 드르덩: ⊕ — 원 안에 가로선 하나와 세로선 둘(격자)
  deureudeong(g, cx, cy, s) {
    const r = s * R;
    circle(g, cx, cy, r, s);
    hline(g, cx - r, cx + r, cy, s, 0.07);
    for (const k of [-0.36, 0.36]) {
      const dx = r * k;
      const h = Math.sqrt(r * r - dx * dx) * 0.92;
      seg(g, cx + dx, cy - h, cx + dx, cy + h, s, 0.07);
    }
  },
};

// ---- 정악식 ----
const JEONGAK = {
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
  rest(g, cx, cy, s) { hline(g, cx - s * 0.3, cx + s * 0.3, cy, s); },
  ...SHARED,
};

// ---- 민속악식(교재) ----
const MINSOK = {
  // 덩: ⊖ 원 + 원 안의 가로선
  deong(g, cx, cy, s) { const r = s * R; circle(g, cx, cy, r, s); hline(g, cx - r, cx + r, cy, s, 0.075); },
  // 궁: ○
  kung(g, cx, cy, s) { circle(g, cx, cy, s * R, s); },
  // 따: ─
  deok(g, cx, cy, s) { hline(g, cx - s * 0.34, cx + s * 0.34, cy, s); },
  // 기닥: ─ (꾸밈은 구음의 작은 '기'로 구분)
  gideok(g, cx, cy, s) { hline(g, cx - s * 0.34, cx + s * 0.34, cy, s); },
  // 더러러러: 가로로 늘어선 점들(칸 폭에 맞춤)
  deoreo(g, cx, cy, s, o = {}) {
    const [x1, x2] = o.span ?? [cx - s * 0.45, cx + s * 0.45];
    const r = Math.max(0.9, s * 0.055);
    const gap = Math.max(3.2, s * 0.2);
    const n = Math.max(3, Math.min(10, Math.floor((x2 - x1) / gap) + 1));
    const step = n > 1 ? Math.min(gap, (x2 - x1) / (n - 1)) : 0;
    const start = (x1 + x2) / 2 - (step * (n - 1)) / 2;
    for (let k = 0; k < n; k += 1) dot(g, start + k * step, cy, r);
  },
  // 더: 점 하나
  deo(g, cx, cy, s) { dot(g, cx, cy, Math.max(1.3, s * 0.09)); },
  // 쉼: 교재는 쉼을 표에 적지 않는다(빈칸)
  rest() {},
  ...SHARED,
};

const SETS = { jeongak: JEONGAK, minsok: MINSOK };

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
 * style: 'jeongak' | 'minsok'
 * accentAt: 'left'(부호 왼쪽) | 'above'(부호 왼쪽 위) | null(강세 생략)
 * span: [x1, x2] 가로로 늘어나는 부호(민속악식 더러러러)가 차지할 범위
 */
export function drawSymbol(parent, slot, cx, cy, s, { accentAt = 'left', style = 'jeongak', span = null } = {}) {
  const set = SETS[style] ?? JEONGAK;
  if (!slot || !set[slot.t]) return null;
  const g = el('g', { class: `jg-stroke jg-${slot.t}` }, parent);
  set[slot.t](g, cx, cy, s, { span });
  if (slot.accent && accentAt) {
    const a = Math.max(6, s * 0.5);
    if (accentAt === 'above') drawAccent(g, cx - s * 0.5, cy - s * 0.6, a);
    else drawAccent(g, cx - s * 0.62, cy, a);
  }
  return g;
}

/** 부호 하나만 담은 독립 SVG(편집 UI의 팔레트·도움말용). 색은 currentColor. */
export function symbolSvg(strokeId, symbolStyle = 'jeongak', size = 24) {
  const style = symbolStyle === 'minsok' ? 'minsok' : 'jeongak';
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries({
    xmlns: SVG_NS, width: size, height: size, viewBox: `0 0 ${size} ${size}`,
    class: 'jg-symbol', 'data-stroke': strokeId, 'data-style': style, role: 'img',
    'aria-label': STROKES[strokeId]?.label ?? strokeId,
  })) svg.setAttribute(k, String(v));
  const s = size * 0.88;
  drawSymbol(svg, { t: strokeId }, size / 2, size / 2, s, { style, accentAt: null, span: [size * 0.12, size * 0.88] });
  // 문서 전체 CSS에 기대지 않도록 색을 요소에 직접 준다
  svg.querySelectorAll('.jg-sym').forEach((n) => n.setAttribute('style', 'fill:none;stroke:currentColor;stroke-linecap:round'));
  svg.querySelectorAll('.jg-dot').forEach((n) => n.setAttribute('style', 'fill:currentColor;stroke:none'));
  return svg;
}
