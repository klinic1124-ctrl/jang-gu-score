// 한 줄 리듬보 렌더러 — 가로 한 줄 위에 서양 음표로 장구 가락을 적는다.
// 채편 소리는 기둥 위, 궁편 소리는 기둥 아래, 덩은 둘 다. 가로 위치는 시간에 비례한다.

import { STROKES, beatUnits, gueumOf } from '../model.js';
import { el, text, line, r2, slotRect, measureGroup, chunkBeats, groupBoundaries } from './svg.js';
import { drawAccent } from './symbols.js';
import { drawSectionHead } from './head.js';

const STEM = 26;          // 기둥 길이
const RX = 4.6;           // 음표 머리 반지름
const RY = 3.3;
const PAD = 6;            // 마디 시작 여백
const HEAD = 9;           // 분박 칸 시작에서 음표 머리 중심까지
const ABOVE = 56;         // 줄 위 공간
const TS_W = 26;          // 박자표 폭
const BEAM = 3.6;         // 묶음 두께
const BEAM_GAP = 5.6;     // 겹묶음 간격

// 음표 값(8분음표 = 1) → 기본 음표와 점
const VALUES = [
  [6, 4, 1], [4, 4, 0], [3, 2, 1], [2, 2, 0], [1.5, 1, 1], [1, 1, 0], [0.75, 0.5, 1], [0.5, 0.5, 0], [0.25, 0.25, 0],
];
const FLAGS = { 1: 1, 0.5: 2, 0.25: 3 };
const EPS = 1e-6;
const isPow2 = (x) => x > 0 && Math.abs(2 ** Math.round(Math.log2(x)) - x) < EPS;

/** 길이를 표기 가능한 음표 값들로 나눈다(붙임줄로 이어짐). */
function decompose(d) {
  const out = [];
  let rest = d;
  while (rest > 0.25 - EPS) {
    const v = VALUES.find(([val]) => val <= rest + EPS);
    out.push(v);
    rest -= v[0];
  }
  return out.length ? out : [VALUES[VALUES.length - 1]];
}

/** 박(U 8분음표, k칸)의 한 칸을 어떤 음표 값으로 적을지와 잇단음 수. */
function slotNotation(U, k) {
  const a = U / k;
  if (isPow2(U)) return isPow2(k) ? { w: a, tuplet: 0 } : { w: 2 ** Math.ceil(Math.log2(a) - EPS), tuplet: k };
  if (U % 3 === 0 && isPow2(U / 3)) return [1, 3, 6].includes(k) ? { w: a, tuplet: 0 } : { w: U / 3, tuplet: k };
  if (k === 1) return { w: a, tuplet: 0 };
  const w = 2 ** Math.floor(Math.log2(a) + EPS);
  return { w, tuplet: Math.abs(w - a) < EPS ? 0 : k };
}

/**
 * 박 하나를 음표 조각 목록으로 푼다.
 * 조각: { t(박 시작부터의 실제 시간, 8분음표 단위), i, slot, rest, val, base, dots, flags,
 *        attack(타점 첫 조각), tieNext, sub(더러러러를 풀어 쓴 뒤 음표), tremolo, up, down }
 */
function analyzeBeat(sec, beat) {
  const U = beatUnits(sec, beat);
  const k = beat.slots.length;
  const a = U / k;
  const events = [];
  beat.slots.forEach((slot, i) => {
    if (!slot) return;
    let n = 1;
    while (i + n < k && !beat.slots[i + n]) n += 1; // 뒤따르는 빈 칸만큼 늘림(박 안에서만)
    events.push({ i, n, slot });
  });
  let { w, tuplet } = slotNotation(U, k);
  if (events.length === 1 && events[0].i === 0) { w = a; tuplet = 0; } // 박 전체 한 음이면 잇단음 불필요
  const ratio = a / w;
  const pieces = [];
  for (const ev of events) {
    const st = STROKES[ev.slot.t];
    const rest = ev.slot.t === 'rest';
    let parts = decompose(ev.n * w).map((v) => ({ v, sub: false }));
    let tremolo = false;
    if (st.roll) {
      if (!tuplet && parts.length === 1 && parts[0].v[0] === 2) parts = [0, 1, 2, 3].map((j) => ({ v: VALUES[7], sub: j > 0 }));
      else tremolo = true;
    }
    let cum = 0;
    parts.forEach(({ v, sub }, j) => {
      pieces.push({
        t: ev.i * a + cum * ratio, i: ev.i, slot: ev.slot, rest,
        val: v[0], base: v[1], dots: v[2], flags: FLAGS[v[1]] ?? 0,
        attack: j === 0, sub, tieNext: !rest && !st.roll && j < parts.length - 1,
        tremolo: tremolo && j === 0, up: !rest && st.chae, down: !rest && st.gung,
        soft: !!st.soft, grace: !!st.grace && j === 0,
      });
      cum += v[0];
    });
  }
  return { U, k, a, tuplet, pieces };
}

function timeSig(sec, mea) {
  const mixed = mea.beats.some((b) => b.units != null);
  const total = mea.beats.reduce((acc, b) => acc + beatUnits(sec, b), 0);
  if (!mixed) return sec.meter.division === 3 ? [mea.beats.length * 3, 8] : [mea.beats.length, 4];
  return [total, 8];
}

// ---------------- 그리기 도구 ----------------

function head(g, x, y, { hollow = false, scale = 1 } = {}) {
  el('ellipse', {
    cx: r2(x), cy: r2(y), rx: r2(RX * scale), ry: r2(RY * scale),
    transform: `rotate(-20 ${r2(x)} ${r2(y)})`, class: hollow ? 'jg-hollow' : 'jg-fill',
  }, g);
}

/** 꼬리. dir=1이면 위 기둥(끝 y에서 아래로), -1이면 아래 기둥. */
function flags(g, sx, tipY, count, dir, scale = 1) {
  for (let f = 0; f < count; f += 1) {
    const y0 = tipY + dir * f * 6 * scale;
    const d = (dy) => r2(y0 + dir * dy * scale);
    const x = (dx) => r2(sx + dx * scale);
    el('path', {
      d: `M${x(0)},${d(0)} C${x(0.6)},${d(5)} ${x(7.5)},${d(7)} ${x(6)},${d(15)} C${x(6.6)},${d(9.5)} ${x(2)},${d(8.2)} ${x(0)},${d(6.5)} Z`,
      class: 'jg-fill',
    }, g);
  }
}

function restGlyph(g, x, y, base, dots) {
  if (base >= 4) {
    el('rect', { x: r2(x - 5), y: r2(y - 4), width: 10, height: 4, class: 'jg-fill' }, g); // 2분쉼표
  } else if (base === 2) {
    // 4분쉼표: 굵은 번개 모양 + 아래 갈고리
    el('path', { d: `M${x - 2},${y - 12} L${x + 3},${y - 5.5} L${x - 1},${y + 0.5} L${x + 3.5},${y + 6}`, class: 'jg-thin', 'stroke-width': 2.4, 'stroke-linejoin': 'bevel' }, g);
    el('path', { d: `M${x + 3.5},${y + 6} C${x - 1},${y + 3.5} ${x - 3.5},${y + 7.5} ${x + 0.5},${y + 11.5}`, class: 'jg-thin', 'stroke-width': 1.5 }, g);
  } else {
    const n = FLAGS[base] ?? 1;
    for (let f = 0; f < n; f += 1) {
      const oy = y - 6 + f * 6;
      el('circle', { cx: r2(x - 2.6 - f * 1.4), cy: r2(oy), r: 1.9, class: 'jg-dot' }, g);
      el('path', { d: `M${r2(x - 3.4 - f * 1.4)},${r2(oy + 1)} Q${r2(x)},${r2(oy + 2.2)} ${r2(x + 3 - f * 1.4)},${r2(oy - 1.8)}`, class: 'jg-thin', 'stroke-width': 1.3 }, g);
    }
    line(g, x + 3, y - 7.8, x - 1.5 - (n - 1) * 2.8, y + 8 + (n - 1) * 3, 'jg-thin', { 'stroke-width': 1.3 });
  }
  for (let d = 0; d < dots; d += 1) el('circle', { cx: r2(x + 7 + d * 4), cy: r2(y - 3), r: 1.5, class: 'jg-dot' }, g);
}

/** 기덕의 꾸밈음(사선 그은 작은 8분음표)과 이음줄. */
function graceNote(g, hx, y) {
  const gx = hx - 10.5;
  head(g, gx, y, { scale: 0.62 });
  const sx = gx + RX * 0.62 - 0.4;
  line(g, sx, y - 1, sx, y - 17, 'jg-thin');
  flags(g, sx, y - 17, 1, 1, 0.6);
  line(g, gx - 1.8, y - 6.5, gx + 6.2, y - 13.5, 'jg-thin');
  el('path', { d: `M${r2(gx - 0.5)},${r2(y + 3.5)} Q${r2((gx + hx) / 2)},${r2(y + 10)} ${r2(hx - 1.5)},${r2(y + 4.5)}`, class: 'jg-thin' }, g);
}

/** 한 방향(위/아래) 기둥들의 묶음 무리를 만든다: 꼬리 있는 음표가 연달아 있으면 묶는다. */
function beamRuns(pieces, dir) {
  const runs = [];
  let cur = [];
  const flush = () => { if (cur.length) runs.push(cur); cur = []; };
  for (const p of pieces) {
    if (p.rest) { flush(); continue; }
    if (!(dir > 0 ? p.up : p.down)) continue;
    if (p.flags > 0) cur.push(p);
    else { flush(); runs.push([p]); }
  }
  flush();
  return runs;
}

function drawBeams(g, run, dir, lineY) {
  const tip = lineY - dir * STEM;
  const xs = run.map((p) => p.stemX[dir]);
  const bar = (x1, x2, level) => {
    const y = tip + dir * level * BEAM_GAP;
    const top = dir > 0 ? y : y - BEAM;
    el('rect', { x: r2(x1 - 0.6), y: r2(top), width: r2(x2 - x1 + 1.2), height: BEAM, class: 'jg-fill' }, g);
  };
  bar(xs[0], xs[xs.length - 1], 0);
  for (let level = 1; level < 3; level += 1) {
    const need = run.map((p) => p.flags > level);
    run.forEach((p, j) => {
      if (!need[j]) return;
      if (j + 1 < run.length && need[j + 1]) bar(xs[j], xs[j + 1], level);
      else if (!(j > 0 && need[j - 1])) {
        // 홀로 남은 겹꼬리는 짧은 토막으로
        if (j + 1 < run.length) bar(xs[j], xs[j] + 6, level);
        else bar(xs[j] - 6, xs[j], level);
      }
    });
  }
}

// ---------------- 박 하나 그리기 ----------------

function drawBeat(g, info, bx, ppu, lineY, gueums, settings) {
  const { pieces, tuplet } = info;
  for (const p of pieces) {
    p.x = bx + p.t * ppu + HEAD;
    const sc = p.soft ? 0.72 : 1;
    p.stemX = { 1: p.x + RX * sc - 0.6, '-1': p.x - RX * sc + 0.6 };
    if (p.rest) { restGlyph(g, p.x, lineY, p.base, p.dots); continue; }
    head(g, p.x, lineY, { hollow: p.base >= 4, scale: sc });
    const dotX = p.x + (p.up && p.flags ? 11 : 8); // 위 꼬리와 겹치지 않게
    for (let d = 0; d < p.dots; d += 1) el('circle', { cx: r2(dotX + d * 4), cy: r2(lineY - 3.5), r: 1.5, class: 'jg-dot' }, g);
    if (p.grace) graceNote(g, p.x, lineY);
    if (p.attack && settings.showGueum) {
      const word = gueumOf(p.slot, settings.gueumStyle);
      if (word) gueums.push({ x: p.x, word });
    }
  }

  for (const dir of [1, -1]) {
    const tip = lineY - dir * STEM;
    for (const run of beamRuns(pieces, dir)) {
      for (const p of run) {
        const sx = p.stemX[dir];
        line(g, sx, lineY - dir, sx, tip, 'jg-stem');
        if (run.length === 1 && p.flags) flags(g, sx, tip, p.flags, dir);
        if (p.tremolo && dir > 0) {
          for (let j = 0; j < 3; j += 1) line(g, sx - 4, lineY - 7 - j * 4, sx + 4, lineY - 11 - j * 4, 'jg-thin', { 'stroke-width': 1.6 });
        }
      }
      if (run.length > 1) drawBeams(g, run, dir, lineY);
    }
  }

  for (const p of pieces) {
    // 붙임줄: 기둥 반대쪽(위 기둥만 있으면 아래로)
    if (p.tieNext) {
      const q = pieces[pieces.indexOf(p) + 1];
      const s = p.up ? 1 : -1;
      el('path', {
        d: `M${r2(p.x + 3)},${r2(lineY + s * 5)} Q${r2((p.x + q.x) / 2)},${r2(lineY + s * 12)} ${r2(q.x - 3)},${r2(lineY + s * 5)}`,
        class: 'jg-thin', 'stroke-width': 1.2,
      }, g);
    }
    if (p.attack && p.slot.accent && !p.rest) {
      if (p.up) drawAccent(g, p.x + 1, lineY - STEM - 7, 9);
      else drawAccent(g, p.x - 1, lineY + STEM + 7, 9);
    }
  }

  // 잇단음 숫자(묶음 하나가 박 전체를 덮지 않으면 꺾쇠도)
  if (tuplet && pieces.length) {
    const dir = pieces.some((p) => p.up) || !pieces.some((p) => p.down) ? 1 : -1;
    const x1 = pieces[0].x;
    const x2 = pieces[pieces.length - 1].x + 2;
    const mid = (x1 + x2) / 2;
    const y = dir > 0 ? lineY - STEM - 15 : lineY + STEM + 17;
    const runs = beamRuns(pieces, dir);
    const covered = runs.length === 1 && runs[0].length === pieces.length && runs[0].length > 1;
    if (!covered && x2 - x1 > 14) {
      const hy = y - 4 * dir;
      const ey = hy + 4 * dir;
      el('path', { d: `M${r2(x1 - 2)},${r2(ey)} L${r2(x1 - 2)},${r2(hy)} L${r2(mid - 6)},${r2(hy)} M${r2(mid + 6)},${r2(hy)} L${r2(x2 + 2)},${r2(hy)} L${r2(x2 + 2)},${r2(ey)}`, class: 'jg-thin' }, g);
    }
    text(g, mid, y, String(tuplet), { size: 11, anchor: 'middle', cls: 'jg-time' });
  }
}

// ---------------- 구간 ----------------

/** 8분음표당 폭: 이웃 타점 사이가 충분히 벌어지고(기덕은 꾸밈음 자리까지) 클릭 칸이 너무 좁지 않게. */
function unitWidth(sec) {
  let ppu = 28;
  for (const mea of sec.measures) {
    let t = 0;
    let prev = null;
    for (const beat of mea.beats) {
      const U = beatUnits(sec, beat);
      const a = U / beat.slots.length;
      ppu = Math.max(ppu, 11 / a);
      beat.slots.forEach((sl, i) => {
        if (!sl) return;
        const at = t + i * a;
        if (prev !== null) ppu = Math.max(ppu, (STROKES[sl.t].grace ? 25 : 17) / (at - prev));
        prev = at;
      });
      t += U;
    }
  }
  return ppu;
}

export function renderStaff(parent, ctx, sec, s, y) {
  const { width, margin, settings } = ctx;
  const gue = !!settings.showGueum;
  const bounds = groupBoundaries(sec.meter);
  y += drawSectionHead(parent, sec, s, margin, y) + 2;

  const ppu = unitWidth(sec);
  const avail = width - margin * 2;

  // 장단을 줄에 놓을 조각(너무 긴 장단은 묶음/박 경계에서 나눔)
  const items = [];
  let prevSig = '';
  sec.measures.forEach((mea, m) => {
    const sig = timeSig(sec, mea);
    const showSig = sig.join('/') !== prevSig;
    prevSig = sig.join('/');
    const widths = mea.beats.map((beat) => beatUnits(sec, beat) * ppu);
    const chunks = chunkBeats(widths, sec.meter.grouping, avail - TS_W - PAD - 4);
    chunks.forEach(([b0, b1], ci) => {
      const w = PAD + widths.slice(b0, b1).reduce((acc, x) => acc + x, 0);
      const sigHere = ci === 0 && showSig ? sig : null;
      items.push({ m, b0, b1, w, sig: sigHere, extra: sigHere ? TS_W : 0, end: b1 === mea.beats.length });
    });
  });
  const lines = [];
  let cur = null;
  for (const it of items) {
    const need = it.w + it.extra;
    if (cur && cur.w + need <= avail) { cur.items.push(it); cur.w += need; } else { cur = { items: [it], w: need }; lines.push(cur); }
  }

  const below = gue ? 56 : 44;
  const groups = new Map();
  const groupOf = (m) => {
    if (!groups.has(m)) groups.set(m, { g: measureGroup(parent, s, m), rects: [] });
    return groups.get(m);
  };
  for (const ln of lines) {
    const lineY = y + ABOVE;
    const x0 = margin;
    let x = x0;
    const gueums = [];
    const staffG = el('g', { class: 'jg-staff' }, parent);
    for (const it of ln.items) {
      const mea = sec.measures[it.m];
      const { g, rects } = groupOf(it.m);
      if (it.sig) {
        text(g, x + TS_W / 2 - 2, lineY - 2.5, String(it.sig[0]), { size: 17, anchor: 'middle', cls: 'jg-time' });
        text(g, x + TS_W / 2 - 2, lineY + 14, String(it.sig[1]), { size: 17, anchor: 'middle', cls: 'jg-time' });
        x += TS_W;
      }
      let bx = x + PAD;
      for (let b = it.b0; b < it.b1; b += 1) {
        const beat = mea.beats[b];
        if (b > it.b0 && bounds.has(b)) line(g, bx, lineY - 18, bx, lineY + 18, 'jg-rule-dash');
        const info = analyzeBeat(sec, beat);
        drawBeat(g, info, bx, ppu, lineY, gueums, settings);
        for (let i = 0; i < info.k; i += 1) rects.push([bx + i * info.a * ppu, lineY - ABOVE + 4, info.a * ppu, ABOVE + below - 8, b, i]);
        bx += info.U * ppu;
      }
      x = bx;
      if (it.end) {
        const lastOfSection = it.m === sec.measures.length - 1;
        if (lastOfSection) {
          line(g, x - 5, lineY - 13, x - 5, lineY + 13, 'jg-bar');
          line(g, x - 0.5, lineY - 13, x - 0.5, lineY + 13, 'jg-bar-thick');
          x += 1;
        } else {
          line(g, x, lineY - 13, x, lineY + 13, 'jg-bar');
        }
        if (mea.repeat > 1) text(g, x - 3, lineY - ABOVE + 14, `×${mea.repeat}`, { size: 13, anchor: 'end', weight: 700 });
      } else if (bounds.has(it.b1)) {
        line(g, x, lineY - 18, x, lineY + 18, 'jg-rule-dash');
      }
    }
    line(staffG, x0, lineY, x, lineY, 'jg-staffline');
    // 구음: 음표 머리 왼쪽에 맞춰 쓰고 다음 구음과 겹치지 않게 폭을 맞춤
    gueums.forEach((q, j) => {
      const room = j + 1 < gueums.length ? gueums[j + 1].x - q.x - 3 : 60;
      text(staffG, q.x - RX, lineY + STEM + 24, q.word, { size: 11, maxWidth: Math.max(9, room) });
    });
    y = lineY + below + 8;
  }
  // 클릭 영역은 각 장단 그림 위에 놓는다
  for (const [m, { g, rects }] of groups) {
    for (const [rx, ry, rw, rh, b, i] of rects) slotRect(g, rx, ry, rw, rh, s, m, b, i);
  }
  return y;
}
