// 한 줄 리듬보의 음표 엔진 — 박 하나를 두 성부(위 = 채편, 아래 = 궁편)의 음표·쉼표로 풀고 그린다.
// 가로 위치는 호출 측이 xOf(t)로 준다(리듬보 보기: 시간 비례, 교재식 보기: 표의 칸 격자).

import { STROKES, beatUnits } from '../model.js';
import { el, text, line, r2 } from './svg.js';
import { drawAccent } from './symbols.js';
import { voicesOf, graceOf } from './strokes.js';

export const STEM = 26;          // 기둥 길이
export const RX = 4.6;           // 음표 머리 반지름
export const RY = 3.3;
const BEAM = 3.6;                // 묶음 두께
const BEAM_GAP = 5.6;            // 겹묶음 간격
const REST_DY = 15;              // 성부 쉼표를 줄에서 띄우는 거리

// 음표 값(8분음표 = 1) → [값, 기본 음표, 점]
const VALUES = [
  [6, 4, 1], [4, 4, 0], [3, 2, 1], [2, 2, 0], [1.5, 1, 1], [1, 1, 0], [0.75, 0.5, 1], [0.5, 0.5, 0], [0.25, 0.25, 0],
];
const FLAGS = { 1: 1, 0.5: 2, 0.25: 3 };
const EPS = 1e-6;
const isPow2 = (x) => x > 0 && Math.abs(2 ** Math.round(Math.log2(x)) - x) < EPS;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

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
  if (k === 1) return { w: U, tuplet: 0 };
  if (isPow2(U)) return isPow2(k) ? { w: a, tuplet: 0 } : { w: 2 ** Math.ceil(Math.log2(a) - EPS), tuplet: k };
  if (U % 3 === 0 && isPow2(U / 3)) return [1, 3, 6].includes(k) ? { w: a, tuplet: 0 } : { w: U / 3, tuplet: k };
  const w = 2 ** Math.floor(Math.log2(a) + EPS);
  return { w, tuplet: Math.abs(w - a) < EPS ? 0 : k };
}

/** 장단(또는 그 박 b0..b1 부분)의 박자표 [분자, 분모]. */
export function timeSig(sec, mea, b0 = 0, b1 = mea.beats.length) {
  const beats = mea.beats.slice(b0, b1);
  const mixed = beats.some((b) => b.units != null);
  const total = beats.reduce((acc, b) => acc + beatUnits(sec, b), 0);
  if (!mixed) return sec.meter.division === 3 ? [beats.length * 3, 8] : [beats.length, 4];
  return [total, 8];
}

/** 박자표를 x(가운데), 줄 높이 lineY에 그린다. */
export function drawTimeSig(g, x, lineY, sig) {
  text(g, x, lineY - 2.5, String(sig[0]), { size: 17, anchor: 'middle', cls: 'jg-time' });
  text(g, x, lineY + 14, String(sig[1]), { size: 17, anchor: 'middle', cls: 'jg-time' });
}

/**
 * 박 하나를 성부별 조각으로 푼다.
 * 소리의 길이는 '다음 타점(어느 성부든) 또는 쉼 칸'까지이고, 성부에 소리가 없는 동안은 그 성부에 쉼표를 둔다.
 * 박 안에 타점이 하나도 없으면(앞 소리가 이어짐) 아무것도 그리지 않는다.
 * 반환: { U, k, a, tuplet, voices: { 1: 조각[], -1: 조각[] }, empty }
 * 조각: { t(박 시작부터 실제 시간, 8분음표 단위), i, slot, rest, val, base, dots, flags, attack, tieNext, sub, tremolo, dir }
 */
export function analyzeBeat(sec, beat, style = 'banju') {
  const U = beatUnits(sec, beat);
  const k = beat.slots.length;
  const a = U / k;
  const voices = { 1: [], '-1': [] };
  const onsets = [];
  beat.slots.forEach((slot, i) => { if (slot) onsets.push(i); });
  if (!onsets.length) {
    // 칸이 모두 비면 두 성부 모두 쉼(교재 표기)
    for (const dir of [1, -1]) {
      let t = 0;
      voices[dir] = decompose(U).map((v) => {
        const p = { t, i: 0, slot: null, rest: true, val: v[0], base: v[1], dots: v[2], flags: FLAGS[v[1]] ?? 0, attack: false, sub: false, tieNext: false, tremolo: false, dir };
        t += v[0];
        return p;
      });
    }
    return { U, k, a, tuplet: 0, voices, empty: false };
  }

  // 실제로 쓰인 칸 경계만 남겨 가장 단순한 음표 값을 고른다(예: 4칸 중 0·2칸만 치면 잇단음 불필요)
  const P = [...new Set([0, ...onsets, k])].sort((x, y) => x - y);
  let d = 0;
  for (let j = 1; j < P.length; j += 1) d = gcd(d, P[j] - P[j - 1]);
  const { w, tuplet } = slotNotation(U, k / d);
  const ratio = (a * d) / w; // 표기 1단위당 실제 시간

  for (const dir of [1, -1]) {
    const segs = [];
    for (let j = 0; j < P.length - 1; j += 1) {
      const p = P[j];
      const n = P[j + 1] - p;
      const slot = beat.slots[p];
      const on = !!slot && voicesOf(slot, style)[dir > 0 ? 'up' : 'down'];
      const last = segs[segs.length - 1];
      if (on) segs.push({ p, n, slot });
      else if (last && last.rest) last.n += n;
      else segs.push({ p, n, rest: true, slot: null });
    }
    const pieces = [];
    for (const sg of segs) {
      const st = sg.rest ? null : STROKES[sg.slot.t];
      let parts = decompose((sg.n / d) * w).map((v) => ({ v, sub: false }));
      let tremolo = false;
      if (st?.roll) {
        if (!tuplet && parts.length === 1 && parts[0].v[0] === 2) parts = [0, 1, 2, 3].map((j) => ({ v: VALUES[7], sub: j > 0 }));
        else tremolo = true;
      }
      let cum = 0;
      parts.forEach(({ v, sub }, j) => {
        pieces.push({
          t: sg.p * a + cum * ratio, i: sg.p, slot: sg.slot, rest: !!sg.rest,
          val: v[0], base: v[1], dots: v[2], flags: FLAGS[v[1]] ?? 0,
          attack: !sg.rest && j === 0, sub, tieNext: !sg.rest && !st.roll && j < parts.length - 1,
          tremolo: tremolo && j === 0, dir,
        });
        cum += v[0];
      });
    }
    voices[dir] = pieces;
  }
  return { U, k, a, tuplet, voices, empty: false };
}

// ---------------- 그리기 도구 ----------------

function noteHead(g, x, y, { hollow = false, scale = 1, rim = false } = {}) {
  if (rim) {
    const w = RX * 0.9 * scale;
    const h = RY * 1.15 * scale;
    el('path', { d: `M${r2(x - w)},${r2(y - h)} L${r2(x + w)},${r2(y + h)} M${r2(x - w)},${r2(y + h)} L${r2(x + w)},${r2(y - h)}`, class: 'jg-thin', 'stroke-width': r2(1.5 * scale) }, g);
    return;
  }
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

/** 쉼표. (x, y)가 쉼표의 가운데. */
export function restGlyph(g, x, y, base, dots, scale = 1) {
  const k = scale;
  const X = (dx) => r2(x + dx * k);
  const Y = (dy) => r2(y + dy * k);
  if (base >= 4) {
    el('rect', { x: X(-5), y: Y(-2), width: r2(10 * k), height: r2(4 * k), class: 'jg-fill' }, g); // 2분쉼표
  } else if (base === 2) {
    // 4분쉼표: 굵은 번개 모양 + 아래 갈고리
    el('path', { d: `M${X(-2)},${Y(-11)} L${X(3)},${Y(-4.5)} L${X(-1)},${Y(1.5)} L${X(3.5)},${Y(7)}`, class: 'jg-thin', 'stroke-width': r2(2.4 * k), 'stroke-linejoin': 'bevel' }, g);
    el('path', { d: `M${X(3.5)},${Y(7)} C${X(-1)},${Y(4.5)} ${X(-3.5)},${Y(8.5)} ${X(0.5)},${Y(12.5)}`, class: 'jg-thin', 'stroke-width': r2(1.5 * k) }, g);
  } else {
    const n = FLAGS[base] ?? 1;
    for (let f = 0; f < n; f += 1) {
      const oy = -5 + f * 6 - (n - 1) * 3;
      el('circle', { cx: X(-2.6 - f * 1.4), cy: Y(oy), r: r2(1.9 * k), class: 'jg-dot' }, g);
      el('path', { d: `M${X(-3.4 - f * 1.4)},${Y(oy + 1)} Q${X(0)},${Y(oy + 2.2)} ${X(3 - f * 1.4)},${Y(oy - 1.8)}`, class: 'jg-thin', 'stroke-width': r2(1.3 * k) }, g);
    }
    line(g, x + 3 * k, y + (-6.8 - (n - 1) * 3) * k, x + (-1.5 - (n - 1) * 2.8) * k, y + (7 + (n - 1) * 3) * k, 'jg-thin', { 'stroke-width': r2(1.3 * k) });
  }
  for (let d = 0; d < dots; d += 1) el('circle', { cx: X(7 + d * 4), cy: Y(-3), r: r2(1.5 * k), class: 'jg-dot' }, g);
}

/**
 * 꾸밈음 n개(1: 사선 그은 작은 8분음표, 2: 작은 16분음표 둘)와 이음줄.
 * dir=1이면 기둥 위(채편 꾸밈), -1이면 기둥 아래(궁편 꾸밈). 이음줄은 기둥 반대쪽.
 */
function drawGrace(g, hx, y, n, dir) {
  const sc = 0.62;
  const L = 16;
  const xs = n >= 2 ? [hx - 19, hx - 12.5] : [hx - 12];
  const stems = xs.map((gx) => {
    noteHead(g, gx, y, { scale: sc });
    const sx = dir > 0 ? gx + RX * sc - 0.4 : gx - RX * sc + 0.4;
    line(g, sx, y - dir, sx, y - dir * L, 'jg-thin');
    return sx;
  });
  const tip = y - dir * L;
  if (n >= 2) {
    for (const lv of [0, 1]) {
      const yy = tip + dir * lv * 3.4;
      const top = dir > 0 ? yy : yy - 2;
      el('rect', { x: r2(stems[0] - 0.4), y: r2(top), width: r2(stems[1] - stems[0] + 0.8), height: 2, class: 'jg-fill' }, g);
    }
  } else {
    flags(g, stems[0], tip, 1, dir, 0.6);
    const sx = stems[0];
    if (dir > 0) line(g, sx - 4.5, y - 5.5, sx + 3.5, y - 12.5, 'jg-thin');
    else line(g, sx - 3.5, y + 12.5, sx + 4.5, y + 5.5, 'jg-thin');
  }
  const s = dir; // 이음줄은 기둥 반대쪽(위 기둥이면 아래)
  el('path', { d: `M${r2(xs[0] - 0.5)},${r2(y + s * 3.5)} Q${r2((xs[0] + hx) / 2)},${r2(y + s * 10)} ${r2(hx - 1.5)},${r2(y + s * 4.5)}`, class: 'jg-thin' }, g);
}

/** 한 성부의 묶음 무리: 꼬리 있는 음표가 연달아 있으면 묶는다(쉼표에서 끊김). */
function beamRuns(pieces) {
  const runs = [];
  let cur = [];
  const flush = () => { if (cur.length) runs.push(cur); cur = []; };
  for (const p of pieces) {
    if (p.rest) { flush(); continue; }
    if (p.flags > 0) cur.push(p);
    else { flush(); runs.push([p]); }
  }
  flush();
  return runs;
}

function drawBeams(g, run, dir, lineY) {
  const tip = lineY - dir * STEM;
  const xs = run.map((p) => p.stemX);
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
        if (j + 1 < run.length) bar(xs[j], xs[j] + 6, level);
        else bar(xs[j] - 6, xs[j], level);
      }
    });
  }
}

/**
 * 박 하나를 그린다. xOf(t) = 박 시작부터 t(8분음표 단위)인 음표 머리의 x.
 * onAttack(slot, x): 타점마다 불림(구음 쓰기 등).
 */
export function drawBeat(g, info, xOf, lineY, { style = 'banju', onAttack = null } = {}) {
  if (info.empty) return;
  const up = info.voices[1];
  const down = info.voices[-1];
  const noteUp = up.some((p) => !p.rest);
  const noteDown = down.some((p) => !p.rest);

  // 음표 머리(두 성부가 같은 때 치면 머리 하나를 같이 씀)
  const heads = new Map();
  for (const p of [...up, ...down]) {
    if (p.rest) continue;
    const key = Math.round(p.t * 1000);
    if (!heads.has(key)) heads.set(key, { p, x: xOf(p.t), up: false, down: false, upFlags: 0 });
    const h = heads.get(key);
    if (p.dir > 0) { h.up = true; h.upFlags = p.flags; } else h.down = true;
  }
  for (const h of heads.values()) {
    const { p, x } = h;
    const st = STROKES[p.slot.t];
    const sc = st.soft ? 0.72 : 1;
    noteHead(g, x, lineY, { hollow: p.base >= 4, scale: sc, rim: !!st.rim });
    h.sc = sc;
    const dotX = x + (h.up && h.upFlags ? 11 : 8);
    for (let d = 0; d < p.dots; d += 1) el('circle', { cx: r2(dotX + d * 4), cy: r2(lineY - 3.5), r: 1.5, class: 'jg-dot' }, g);
    if (p.attack) {
      const gr = graceOf(p.slot, style);
      if (gr.n) drawGrace(g, x, lineY, gr.n, gr.dir);
      if (onAttack) onAttack(p.slot, x);
    }
  }
  const headAt = (p) => heads.get(Math.round(p.t * 1000));

  // 기둥·꼬리·묶음, 쉼표
  for (const [dir, pieces] of [[1, up], [-1, down]]) {
    for (const p of pieces) {
      p.x = xOf(p.t);
      if (p.rest) {
        restGlyph(g, p.x, lineY - dir * REST_DY, p.base, p.dots, 0.85);
        continue;
      }
      const sc = headAt(p)?.sc ?? 1;
      p.stemX = dir > 0 ? p.x + RX * sc - 0.6 : p.x - RX * sc + 0.6;
    }
    const tip = lineY - dir * STEM;
    for (const run of beamRuns(pieces)) {
      for (const p of run) {
        if (p.base >= 8) continue;
        line(g, p.stemX, lineY - dir, p.stemX, tip, 'jg-stem');
        if (run.length === 1 && p.flags) flags(g, p.stemX, tip, p.flags, dir);
        if (p.tremolo) {
          for (let j = 0; j < 3; j += 1) {
            const yy = lineY - dir * (9 + j * 4);
            line(g, p.stemX - 4, yy + 2, p.stemX + 4, yy - 2, 'jg-thin', { 'stroke-width': 1.6 });
          }
        }
      }
      if (run.length > 1) drawBeams(g, run, dir, lineY);
    }
  }

  // 붙임줄(성부마다 기둥 반대쪽), 강세
  const tied = new Set();
  for (const [dir, pieces] of [[1, up], [-1, down]]) {
    pieces.forEach((p, j) => {
      if (!p.tieNext) return;
      const q = pieces[j + 1];
      const key = Math.round(p.t * 1000);
      if (!q || tied.has(key)) return;
      tied.add(key);
      const s = dir > 0 ? 1 : -1;
      el('path', {
        d: `M${r2(p.x + 3)},${r2(lineY + s * 5)} Q${r2((p.x + q.x) / 2)},${r2(lineY + s * 12)} ${r2(q.x - 3)},${r2(lineY + s * 5)}`,
        class: 'jg-thin', 'stroke-width': 1.2,
      }, g);
    });
  }
  for (const h of heads.values()) {
    if (!h.p.attack || !h.p.slot.accent) continue;
    if (h.up) drawAccent(g, h.x + 1, lineY - STEM - 7, 9);
    else drawAccent(g, h.x - 1, lineY + STEM + 7, 9);
  }

  // 잇단음 숫자(묶음 하나가 박 전체를 덮지 않으면 꺾쇠도)
  if (info.tuplet && (noteUp || noteDown)) {
    const dir = noteUp ? 1 : -1;
    const pieces = dir > 0 ? up : down;
    const x1 = xOf(pieces[0].t);
    const x2 = xOf(pieces[pieces.length - 1].t) + 2;
    const mid = (x1 + x2) / 2;
    const y = dir > 0 ? lineY - STEM - 15 : lineY + STEM + 17;
    const runs = beamRuns(pieces);
    const covered = runs.length === 1 && runs[0].length === pieces.length && runs[0].length > 1;
    if (!covered && x2 - x1 > 14) {
      const hy = y - 4 * dir;
      const ey = hy + 4 * dir;
      el('path', { d: `M${r2(x1 - 2)},${r2(ey)} L${r2(x1 - 2)},${r2(hy)} L${r2(mid - 6)},${r2(hy)} M${r2(mid + 6)},${r2(hy)} L${r2(x2 + 2)},${r2(hy)} L${r2(x2 + 2)},${r2(ey)}`, class: 'jg-thin' }, g);
    }
    text(g, mid, y, String(info.tuplet), { size: 11, anchor: 'middle', cls: 'jg-time' });
  }
}

/** 이웃 타점 사이에 필요한 최소 간격(px): 꾸밈음 자리까지. */
export function attackGap(slot, style = 'banju') {
  const n = graceOf(slot, style).n;
  return n >= 2 ? 30 : n ? 25 : 17;
}
