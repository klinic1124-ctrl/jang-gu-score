// SVG 요소 생성과 글자 폭 추정 — 렌더러 공용 도구.

export const SVG_NS = 'http://www.w3.org/2000/svg';

export const FONT_STACK = '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", "Noto Sans CJK KR", "NanumGothic", "Nanum Gothic", "WenQuanYi Zen Hei", sans-serif';

/** 요소를 만들고 속성을 붙인다. parent가 있으면 거기에 덧붙인다. */
export function el(tag, attrs = {}, parent = null) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== null && v !== undefined && v !== false) node.setAttribute(k, String(v));
  }
  if (parent) parent.appendChild(node);
  return node;
}

/** 소수 둘째 자리까지만 남긴다(SVG 문자열을 짧게). */
export const r2 = (n) => Math.round(n * 100) / 100;

/** 글자 폭 추정(px). DOM에 붙지 않은 SVG에서도 쓸 수 있도록 측정 대신 근사한다. */
export function textWidth(str, size) {
  let w = 0;
  for (const ch of String(str)) {
    const c = ch.codePointAt(0);
    if (c >= 0x1100 && c <= 0xffdc && !(c >= 0x2000 && c <= 0x206f)) w += 1.0;
    else if (ch === ' ') w += 0.3;
    else if (/[0-9A-Z=×]/.test(ch)) w += 0.62;
    else w += 0.52;
  }
  return w * size;
}

/**
 * 글자를 쓴다. maxWidth를 넘을 것 같으면 textLength로 눌러 맞춘다.
 * anchor: 'start' | 'middle' | 'end'
 */
export function text(parent, x, y, str, { size = 12, anchor = 'start', cls = 'jg-text', weight = null, maxWidth = null } = {}) {
  const t = el('text', {
    x: r2(x), y: r2(y), class: cls, 'font-size': size,
    'text-anchor': anchor === 'start' ? null : anchor,
    'font-weight': weight,
  }, parent);
  t.textContent = str;
  if (maxWidth && textWidth(str, size) > maxWidth) {
    t.setAttribute('textLength', r2(Math.max(4, maxWidth)));
    t.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  }
  return t;
}

/** 직선 하나. */
export function line(parent, x1, y1, x2, y2, cls = 'jg-rule', extra = {}) {
  return el('line', { x1: r2(x1), y1: r2(y1), x2: r2(x2), y2: r2(y2), class: cls, ...extra }, parent);
}

/** 히트 테스트용 분박 칸 사각형. */
export function slotRect(parent, x, y, w, h, s, m, b, i) {
  return el('rect', {
    x: r2(x), y: r2(y), width: r2(Math.max(1, w)), height: r2(Math.max(1, h)),
    class: 'jg-slot', 'data-s': s, 'data-m': m, 'data-b': b, 'data-i': i,
  }, parent);
}

/** 장단 묶음 g. */
export function measureGroup(parent, s, m) {
  return el('g', { class: 'jg-measure', 'data-s': s, 'data-m': m }, parent);
}

/**
 * 폭 목록을 maxW 안에 들도록 [start, end) 구간으로 나눈다.
 * grouping(묶음 크기 배열)이 있으면 묶음 경계에서 우선 끊고, 묶음 하나가 넘치면 박 단위로 끊는다.
 */
export function chunkBeats(widths, grouping, maxW) {
  const units = [];
  if (grouping && grouping.reduce((a, n) => a + n, 0) === widths.length) {
    let b = 0;
    for (const g of grouping) { units.push([b, b + g]); b += g; }
  } else {
    widths.forEach((_, b) => units.push([b, b + 1]));
  }
  const sum = (a, z) => widths.slice(a, z).reduce((acc, w) => acc + w, 0);
  const pieces = [];
  for (const [a, z] of units) {
    if (sum(a, z) <= maxW) pieces.push([a, z]);
    else for (let b = a; b < z; b += 1) pieces.push([b, b + 1]);
  }
  const chunks = [];
  let cur = null;
  for (const [a, z] of pieces) {
    if (cur && sum(cur[0], z) <= maxW) cur[1] = z;
    else { cur = [a, z]; chunks.push(cur); }
  }
  return chunks;
}

/** grouping 경계(박 번호 집합, 0과 끝 제외). */
export function groupBoundaries(meter) {
  const set = new Set();
  if (!meter.grouping) return set;
  let b = 0;
  for (const g of meter.grouping.slice(0, -1)) { b += g; set.add(b); }
  return set;
}
