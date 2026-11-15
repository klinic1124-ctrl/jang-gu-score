// 장구 부호 — 벡터로 그린다(글꼴에 의존하지 않음).
// 민속악식(산조·민요 반주 교재) 표기 한 가지: ⊖ ○ ─ ······ · ⊗ ◎ 卌 卌─ ✳ ⊕
// 모든 부호는 (cx, cy)를 중심으로 크기 s(부호 높이 기준) 안에 그린다.

import { STROKES } from '../model.js';
import { el, r2, SVG_NS } from './svg.js';

const sw = (s, k = 0.08) => r2(Math.max(1, s * k));
const circle = (g, cx, cy, r, s) => el('circle', { cx: r2(cx), cy: r2(cy), r: r2(r), class: 'jg-sym', 'stroke-width': sw(s) }, g);
const seg = (g, x1, y1, x2, y2, s, k = 0.09) => el('line', { x1: r2(x1), y1: r2(y1), x2: r2(x2), y2: r2(y2), class: 'jg-sym', 'stroke-width': sw(s, k) }, g);
const vline = (g, x, y1, y2, s) => seg(g, x, y1, x, y2, s);
const hline = (g, x1, x2, y, s, k = 0.09) => seg(g, x1, y, x2, y, s, k);
const dot = (g, cx, cy, r) => el('circle', { cx: r2(cx), cy: r2(cy), r: r2(r), class: 'jg-dot' }, g);

const R = 0.34; // 원 반지름(부호 크기 대비)

// 卌(드르닥)의 치수: 가로선 반폭, 세로줄 x 위치, 세로줄 반높이
const TT_HALF = 0.38;
const TT_BARS = [-0.16, 0, 0.16];
const TT_VH = 0.22;
// 드르닥따(卌 ─)의 치수: 卌과 ─ 사이 틈, ─ 반폭
const DT_GAP = 0.2;
const DT_DASH = 0.17;
const DT_W = TT_HALF * 2 + DT_GAP + DT_DASH * 2; // 전체 폭(크기 대비)

function drawTtadeurak(g, cx, cy, s) {
  hline(g, cx - s * TT_HALF, cx + s * TT_HALF, cy, s);
  for (const dx of TT_BARS) vline(g, cx + dx * s, cy - s * TT_VH, cy + s * TT_VH, s);
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** 각 함수는 그린 부호의 왼쪽 끝 x를 돌려줄 수 있다(강세 자리 계산용). */
const GLYPHS = {
  // 덩: ⊖ 원 + 원 안의 가로선
  deong(g, cx, cy, s) { const r = s * R; circle(g, cx, cy, r, s); hline(g, cx - r, cx + r, cy, s, 0.075); },
  // 구덩: 원 안 왼쪽에 작은 원, 작은 원 오른쪽에서 큰 원 오른쪽 테두리까지 가로선(손그림 모양)
  gudeong(g, cx, cy, s) {
    const r = s * R;
    circle(g, cx, cy, r, s);
    const rs = r * 0.4;
    const scx = cx - r * 0.5;
    circle(g, scx, cy, rs, s * 0.85);
    hline(g, scx + rs, cx + r, cy, s, 0.075);
  },
  // 궁: ○
  kung(g, cx, cy, s) { circle(g, cx, cy, s * R, s); },
  // 구궁: 원 안 왼쪽에 작은 원(교재 모양)
  gugung(g, cx, cy, s) {
    const r = s * R;
    circle(g, cx, cy, r, s);
    circle(g, cx - r * 0.32, cy, r * 0.42, s * 0.85);
  },
  // 국(북편 반뮤트): ⊗ 원 안에 X
  guk(g, cx, cy, s) {
    const r = s * R;
    const d = r * 0.68;
    circle(g, cx, cy, r, s);
    seg(g, cx - d, cy - d, cx + d, cy + d, s, 0.075);
    seg(g, cx - d, cy + d, cx + d, cy - d, s, 0.075);
  },
  // 떡(변죽): 원 안에 중심에서 만나는 선 셋(가로선 + 비스듬한 두 선, 6갈래) — 국(⊗)과 구분
  tteok(g, cx, cy, s) {
    const r = s * R;
    const L = r * 0.96;
    circle(g, cx, cy, r, s);
    for (const deg of [0, 60, 120]) {
      const a = (deg * Math.PI) / 180;
      const dx = Math.cos(a) * L;
      const dy = Math.sin(a) * L;
      seg(g, cx - dx, cy - dy, cx + dx, cy + dy, s, 0.07);
    }
  },
  // 따: ─
  deok(g, cx, cy, s) { hline(g, cx - s * 0.34, cx + s * 0.34, cy, s); },
  // 기닥: ─ (꾸밈은 구음의 작은 '기'로 구분)
  gideok(g, cx, cy, s) { hline(g, cx - s * 0.34, cx + s * 0.34, cy, s); },
  // 드르닥: 卌 — 가로선 하나를 짧은 세로줄 셋이 가로지름
  ttadeurak(g, cx, cy, s) { drawTtadeurak(g, cx, cy, s); },
  /**
   * 드르닥따: 卌 오른쪽에 떨어진 짧은 ─.
   * o.span 안에 들도록 크기를 줄이고, o.tailX가 있으면 cx를 卌의 중심, tailX를 ─의 중심으로 삼는다(교재식 표).
   * 없으면 부호 전체를 cx 가운데에 둔다.
   */
  deureudaktta(g, cx, cy, s, o = {}) {
    const span = o.span ?? [cx - (s * DT_W) / 2, cx + (s * DT_W) / 2];
    const avail = span[1] - span[0];
    const k = Math.min(1, avail / (s * DT_W));
    const t = s * k; // 줄인 크기
    let ttX;
    let dashX;
    if (o.tailX != null) {
      ttX = clamp(cx, span[0] + t * TT_HALF, span[1] - t * (DT_W - TT_HALF));
      dashX = clamp(o.tailX, ttX + t * (TT_HALF + DT_GAP + DT_DASH), span[1] - t * DT_DASH);
    } else {
      const left = clamp(cx - (t * DT_W) / 2, span[0], span[1] - t * DT_W);
      ttX = left + t * TT_HALF;
      dashX = left + t * (DT_W - DT_DASH);
    }
    // 세로 크기는 덜 줄여 卌이 납작해지지 않게
    const tv = Math.max(t, s * 0.8);
    hline(g, ttX - t * TT_HALF, ttX + t * TT_HALF, cy, tv);
    for (const dx of TT_BARS) vline(g, ttX + dx * t, cy - tv * TT_VH, cy + tv * TT_VH, tv);
    hline(g, dashX - t * DT_DASH, dashX + t * DT_DASH, cy, tv);
    return ttX - t * TT_HALF;
  },
  // 변죽 드르닥: ✳ — 가로선에 세로선과 비스듬한 두 선이 엇갈림(Ж 꼴)
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
 * accentAt: 'left'(부호 왼쪽) | 'above'(부호 왼쪽 위) | null(강세 생략)
 * span: [x1, x2] 부호가 차지해도 되는 가로 범위(더러러러는 이 폭에 맞춰 늘고, 드르닥따는 이 안에 들게 줄어든다)
 * tailX: 드르닥따의 뒤 ─를 놓을 x(교재식 표에서 뒤따르는 음표 자리). 이때 cx는 卌의 중심.
 */
export function drawSymbol(parent, slot, cx, cy, s, { accentAt = 'left', span = null, tailX = null } = {}) {
  if (!slot || !GLYPHS[slot.t]) return null;
  const g = el('g', { class: `jg-stroke jg-${slot.t}` }, parent);
  const a = Math.max(6, s * 0.5);
  const accent = !!(slot.accent && accentAt);
  // 칸 폭을 채우는 부호(드르닥따)는 강세 자리를 왼쪽에 남기고 그린다
  let sp = span;
  if (accent && span && slot.t === 'deureudaktta') sp = [span[0] + a * (accentAt === 'above' ? 0.4 : 0.8) + 1, span[1]];
  const left = GLYPHS[slot.t](g, cx, cy, s, { span: sp, tailX });
  if (accent) {
    const ax = Math.min(cx - s * 0.62, typeof left === 'number' ? left - a * 0.5 - 1 : Infinity);
    if (accentAt === 'above') drawAccent(g, Math.min(cx - s * 0.5, ax + s * 0.12), cy - s * 0.6, a);
    else drawAccent(g, ax, cy, a);
  }
  return g;
}

/**
 * 부호 하나만 담은 독립 SVG(편집 UI의 팔레트·도움말용). 색은 currentColor.
 * symbolSvg(id, size) — 예전 호출 symbolSvg(id, style, size)도 받는다(style 문자열은 무시).
 */
export function symbolSvg(strokeId, sizeOrStyle = 24, legacySize = 24) {
  const size = typeof sizeOrStyle === 'string' ? (Number(legacySize) || 24) : (Number(sizeOrStyle) || 24);
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries({
    xmlns: SVG_NS, width: size, height: size, viewBox: `0 0 ${size} ${size}`,
    class: 'jg-symbol', 'data-stroke': strokeId, role: 'img',
    'aria-label': STROKES[strokeId]?.label ?? strokeId,
  })) svg.setAttribute(k, String(v));
  const s = size * 0.88;
  drawSymbol(svg, { t: strokeId }, size / 2, size / 2, s, { accentAt: null, span: [size * 0.06, size * 0.94] });
  // 문서 전체 CSS에 기대지 않도록 색을 요소에 직접 준다
  svg.querySelectorAll('.jg-sym').forEach((n) => n.setAttribute('style', 'fill:none;stroke:currentColor;stroke-linecap:round'));
  svg.querySelectorAll('.jg-dot').forEach((n) => n.setAttribute('style', 'fill:currentColor;stroke:none'));
  return svg;
}
