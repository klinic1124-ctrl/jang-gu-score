// 인쇄 배치 — 배율·용지 방향에 맞춰 악보를 다시 그리고, 줄(단) 경계에서 쪽을 나눈다.
import { renderScore } from './render/index.js';

const MM = 96 / 25.4;
const PAPER_MM = { portrait: [210, 297], landscape: [297, 210] };
export const PAGE_MARGIN = { x: 12, y: 14 }; // mm — @page margin과 같아야 한다
const PAD = 4;      // 줄 사이 간격을 잴 때 각 요소에 더하는 여유(px)
const FILL = 0.97;  // 한 쪽에 채우는 비율(반올림 오차 여유)
const LEAVES = 'text, line, rect, ellipse, circle, path, polygon, polyline';

/** 인쇄 가능 영역(CSS px). */
export function printArea(landscape) {
  const [w, h] = PAPER_MM[landscape ? 'landscape' : 'portrait'];
  return { w: (w - PAGE_MARGIN.x * 2) * MM, h: (h - PAGE_MARGIN.y * 2) * MM };
}

export function pageRule(landscape) {
  return `@page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: ${PAGE_MARGIN.y}mm ${PAGE_MARGIN.x}mm; }`;
}

/**
 * DOM에 붙은 악보 SVG를 줄 단위 띠로 나눈다. 구간 머리말·제목은 다음 띠에 붙인다.
 * 돌려주는 값: bands(y 범위 배열)와 perLine(한 줄에 놓인 장단 수의 최댓값).
 */
export function analyze(svg) {
  const spans = [];
  for (const n of svg.querySelectorAll(LEAVES)) {
    if (n.classList.contains('jg-paper')) continue;
    const b = n.getBBox();
    if (b.width || b.height) spans.push([b.y - PAD, b.y + b.height + PAD]);
  }
  spans.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [a, z] of spans) {
    const last = merged[merged.length - 1];
    if (last && a <= last.y1) last.y1 = Math.max(last.y1, z);
    else merged.push({ y0: a, y1: z });
  }
  const bandAt = (y) => merged.findIndex((b) => y >= b.y0 && y <= b.y1);
  const glued = new Set();
  for (const n of svg.querySelectorAll('.jg-header, .jg-section-head')) {
    const b = n.getBBox();
    glued.add(bandAt(b.y + b.height / 2));
  }
  // 장단 메모는 바로 위 단의 띠에 붙인다(쪽이 메모 앞에서 갈리지 않게)
  // (메모가 장단 칸과 같은 띠에 이미 들어 있으면 그 띠가 곧 한 덩어리이므로 합치지 않는다)
  const slotBands = new Set();
  for (const r of svg.querySelectorAll('rect.jg-slot')) slotBands.add(bandAt(parseFloat(r.getAttribute('y')) + parseFloat(r.getAttribute('height')) / 2));
  const memos = new Set();
  for (const n of svg.querySelectorAll('.jg-memo')) {
    const b = n.getBBox();
    const i = bandAt(b.y + b.height / 2);
    if (i > 0 && !slotBands.has(i)) memos.add(i);
  }
  const bands = [];
  let carry = null;
  merged.forEach((b, i) => {
    if (memos.has(i) && carry === null && bands.length) { bands[bands.length - 1].y1 = Math.max(bands[bands.length - 1].y1, b.y1); return; }
    if (carry !== null) b.y0 = carry;
    if (glued.has(i) && i < merged.length - 1) carry = b.y0;
    else { bands.push(b); carry = null; }
  });

  const perBand = bands.map(() => new Set());
  for (const r of svg.querySelectorAll('rect.jg-slot')) {
    const cy = parseFloat(r.getAttribute('y')) + parseFloat(r.getAttribute('height')) / 2;
    const i = bands.findIndex((b) => cy >= b.y0 && cy <= b.y1);
    if (i >= 0) perBand[i].add(`${r.dataset.s}:${r.dataset.m}`);
  }
  return { bands, perLine: Math.max(0, ...perBand.map((s) => s.size)) };
}

/** 띠들을 쪽 높이(SVG 단위)에 맞춰 쪽으로 묶는다. 쪽보다 긴 띠는 혼자 한 쪽을 차지한다. */
function paginate(bands, total, cap) {
  const cuts = [0];
  for (let i = 1; i < bands.length; i += 1) cuts.push((bands[i - 1].y1 + bands[i].y0) / 2);
  cuts.push(total);
  const pages = [];
  let a = 0;
  while (a < cuts.length - 1) {
    let z = a + 1;
    while (z + 1 < cuts.length && cuts[z + 1] - cuts[a] <= cap) z += 1;
    pages.push([cuts[a], cuts[z], z - a]);
    a = z;
  }
  return pages;
}

/**
 * 쪽마다 정확히 rows줄을 넣고 줄들을 쪽 높이(cap, SVG 단위)에 고르게 펼친다.
 * 줄 높이 합이 cap을 넘는 쪽이 있으면 모든 줄을 같은 비율(shrink)로 줄여 가장 빡빡한 쪽이 꼭 맞게 한다.
 * 줄이 모자란 마지막 쪽은 앞 쪽과 같은 간격으로 위에서부터 놓는다.
 */
function spread(bands, rows, cap, width) {
  const groups = [];
  for (let i = 0; i < bands.length; i += rows) groups.push(bands.slice(i, i + rows));
  const sum = (g) => g.reduce((t, b) => t + b.y1 - b.y0, 0);
  const shrink = Math.min(1, cap / Math.max(1, ...groups.map(sum)));
  let gap = 0; // 앞 쪽의 간격(마지막 쪽이 이어 쓴다)
  const pages = groups.map((g, gi) => {
    const full = g.length === rows;
    if (full && rows > 1) gap = Math.max(0, (cap - sum(g) * shrink) / (rows - 1));
    else if (!full && gi === 0) gap = Math.max(0, (cap - (sum(g) / g.length) * rows * shrink) / Math.max(1, rows - 1));
    let y = 0;
    const items = g.map((b) => {
      const it = { y0: b.y0, y1: b.y1, k: shrink, x: (width - width * shrink) / 2, y };
      y += (b.y1 - b.y0) * shrink + gap;
      return it;
    });
    return { items, count: g.length };
  });
  return { pages, shrink };
}

/** 인쇄용으로 그려 배치를 계산한다. 돌려주는 svg는 화면에 붙어 있지 않다. */
export function layoutPrint(score, { scale = 1, landscape = false, rows = 0 } = {}) {
  const area = printArea(landscape);
  const width = Math.floor(area.w / scale);
  const svg = renderScore(score, { width, selection: null, playhead: null });
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;left:-100000px;top:0;visibility:hidden;pointer-events:none';
  box.append(svg);
  document.body.append(box);
  try {
    const { bands, perLine } = analyze(svg);
    const total = Number(svg.getAttribute('height'));
    const cap = (area.h / scale) * FILL;
    if (rows > 0 && bands.length) {
      const { pages, shrink } = spread(bands, rows, cap, width);
      return { svg, width, pages, perLine, perPage: pages[0].count, shrink, cap };
    }
    const pages = paginate(bands, total, cap);
    return { svg, width, pages, perLine, perPage: pages[0]?.[2] ?? 0, shrink: 1, cap };
  } finally {
    box.remove();
  }
}

/** 쪽마다 같은 SVG를 복제하고 보이는 범위(viewBox)만 다르게 한 목록. */
export function pageSvgs({ svg, width, pages, cap }) {
  return pages.map((p, i) => {
    if (p.items) return rowsPage(svg, width, cap, p.items, i);
    const [y0, y1] = p;
    const c = svg.cloneNode(true);
    c.removeAttribute('width');
    c.removeAttribute('height');
    c.setAttribute('viewBox', `0 ${y0} ${width} ${y1 - y0}`);
    c.classList.add('print-page');
    c.dataset.page = i + 1;
    return c;
  });
}

/** 줄 수를 정한 쪽: 악보를 defs에 한 번 담고, 줄마다 중첩 svg(viewBox로 그 줄만 오려 낸 것)로 놓는다. */
function rowsPage(svg, width, cap, items, i) {
  const NS = 'http://www.w3.org/2000/svg';
  const c = svg.cloneNode(false);
  c.removeAttribute('width');
  c.removeAttribute('height');
  c.setAttribute('viewBox', `0 0 ${width} ${cap}`);
  c.classList.add('print-page');
  c.dataset.page = i + 1;
  const id = `jg-print-src-${i}`;
  const defs = document.createElementNS(NS, 'defs');
  const g = document.createElementNS(NS, 'g');
  g.id = id;
  g.append(...[...svg.childNodes].map((n) => n.cloneNode(true)));
  defs.append(g);
  c.append(defs);
  for (const it of items) {
    const row = document.createElementNS(NS, 'svg');
    row.classList.add('print-row');
    row.setAttribute('x', it.x);
    row.setAttribute('y', it.y);
    row.setAttribute('width', width * it.k);
    row.setAttribute('height', (it.y1 - it.y0) * it.k);
    row.setAttribute('viewBox', `0 ${it.y0} ${width} ${it.y1 - it.y0}`);
    const use = document.createElementNS(NS, 'use');
    use.setAttribute('href', `#${id}`);
    row.append(use);
    c.append(row);
  }
  return c;
}
