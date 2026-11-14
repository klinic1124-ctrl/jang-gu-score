// 교재식(리듬보 + 부호·구음 표) 렌더러 — 「한국의 장단」류 산조·민요 반주 교재의 표기.
// 한 단(system) = 위에 한 줄 리듬보, 아래에 가로 2줄 표(윗줄 부호, 아랫줄 구음).
// 표의 열은 분박 칸 하나씩이고, 리듬보의 음표 머리는 그 열의 왼쪽 가장자리 가까이에 온다.
// 단 나눔: 장단 하나 = 한 단이 기본. 길면 묶음(grouping)·박 경계에서 고르게 나누고, 짧으면 한 단에 여러 장단.

import { beatUnits } from '../model.js';
import { el, text, line, r2, slotRect, measureGroup, balancedChunks, groupBoundaries, gueumText, gueumWidth } from './svg.js';
import { drawSymbol } from './symbols.js';
import { drawSectionHead } from './head.js';
import { analyzeBeat, drawBeat, timeSig, drawTimeSig } from './notes.js';
import { displayParts } from './strokes.js';
import { drawMemo } from './jeonggan.js';

const GUTTER = 28;     // 단 왼쪽(박자표·장단 번호) 자리
const HEADX = 10;      // 칸 왼쪽에서 음표 머리(=부호) 중심까지
const ABOVE = 54;      // 단 위쪽에서 리듬보 줄까지
const BELOW = 42;      // 리듬보 줄에서 표 위까지
const SYM_H = 28;      // 표 부호 줄 높이
const GUE_H = 24;      // 표 구음 줄 높이
const COMF_SLOT = 40;  // 한 단에 장단을 몇 개 넣을지 정할 때 쓰는 편한 칸 폭
const MAX_SLOT = 84;   // 칸이 이보다 넓어지지는 않게
const MEMO_GAP = 46;   // 단 아래 손 메모용 여백

const sum = (arr) => arr.reduce((a, n) => a + n, 0);

/** 단 나누기: [{ items: [{ m, b0, b1 }], U(8분음표 단위 합) }] */
function layoutSystems(sec, avail, Pcomf) {
  const systems = [];
  let cur = null;
  sec.measures.forEach((mea, m) => {
    const us = mea.beats.map((b) => beatUnits(sec, b));
    const total = sum(us);
    const sig = timeSig(sec, mea).join('/');
    const nb = mea.beats.length;
    if (total * Pcomf <= avail) {
      if (cur && cur.whole && cur.sig === sig && (cur.U + total) * Pcomf <= avail) {
        cur.items.push({ m, b0: 0, b1: nb });
        cur.U += total;
      } else {
        cur = { items: [{ m, b0: 0, b1: nb }], U: total, whole: true, sig };
        systems.push(cur);
      }
    } else {
      for (const [b0, b1] of balancedChunks(us.map((u) => u * Pcomf), sec.meter.grouping, avail)) {
        systems.push({ items: [{ m, b0, b1 }], U: sum(us.slice(b0, b1)), whole: false, sig: timeSig(sec, mea, b0, b1).join('/') });
      }
      cur = null;
    }
  });
  return systems;
}

export function renderCombined(parent, ctx, sec, s, y) {
  const { width, margin, settings } = ctx;
  const gue = !!settings.showGueum;
  const symStyle = settings.symbolStyle === 'jeongak' ? 'jeongak' : 'minsok';
  const gStyle = settings.gueumStyle;
  const bounds = groupBoundaries(sec.meter);

  y += drawSectionHead(parent, sec, s, margin, y) + 2;

  const avail = width - margin * 2 - GUTTER;
  let kPerU = 0;
  for (const mea of sec.measures) for (const b of mea.beats) kPerU = Math.max(kPerU, b.slots.length / beatUnits(sec, b));
  const systems = layoutSystems(sec, avail, COMF_SLOT * kPerU);
  const maxU = Math.max(...systems.map((sy) => sy.U));
  const P = Math.min(avail / maxU, MAX_SLOT * kPerU); // 8분음표 하나의 폭(구간 전체에 같게)

  const groups = new Map();
  const groupOf = (m) => {
    if (!groups.has(m)) groups.set(m, { g: measureGroup(parent, s, m), rects: [] });
    return groups.get(m);
  };
  let prevSig = '';
  const lastM = sec.measures.length - 1;

  for (const sy of systems) {
    const top = y;
    const lineY = top + ABOVE;
    const tabTop = lineY + BELOW;
    const symY = tabTop + SYM_H / 2;
    const tabBot = tabTop + SYM_H + (gue ? GUE_H : 0);
    const x0 = margin;
    const tx0 = margin + GUTTER;
    const staffG = el('g', { class: 'jg-staff' }, parent);
    const tableG = el('g', { class: 'jg-table' }, parent);
    const gueums = []; // { x, parts, size, colX }
    const memos = [];
    let x = tx0;

    // 박자표(바뀔 때만, 단 첫머리에)
    const first = sy.items[0];
    if (first.b0 === 0 && sy.sig !== prevSig) drawTimeSig(staffG, x0 + GUTTER / 2 - 1, lineY, sy.sig.split('/'));
    prevSig = sy.sig;

    sy.items.forEach((it, ii) => {
      const mea = sec.measures[it.m];
      const blank = mea.beats.every((bt) => bt.slots.every((sl) => !sl)); // 아직 아무것도 적지 않은 장단은 쉼표 없이 비워 둔다
      const { g, rects } = groupOf(it.m);
      const mx = x;
      if (ii > 0) line(tableG, x, tabTop, x, tabBot, 'jg-tab-bar');
      if (it.b0 === 0) {
        if (ii === 0) text(g, x0 + GUTTER / 2, tabTop + SYM_H / 2 + 4, String(it.m + 1), { size: 10, anchor: 'middle', cls: 'jg-muted' });
        else text(g, x + 3, top + 12, String(it.m + 1), { size: 10, cls: 'jg-muted' });
      }
      for (let b = it.b0; b < it.b1; b += 1) {
        const beat = mea.beats[b];
        const U = beatUnits(sec, beat);
        const k = beat.slots.length;
        const bw = P * U;
        const swd = bw / k;
        const bx = x;
        if (b > it.b0) line(tableG, bx, tabTop, bx, tabBot, bounds.has(b) ? 'jg-tab-group' : 'jg-tab-beat');
        const symSize = Math.min(20, SYM_H * 0.72, swd * 0.85);
        const fs = Math.min(13, Math.max(8, swd * 0.48));
        beat.slots.forEach((slot, i) => {
          const cx = bx + i * swd;
          if (i > 0) line(tableG, cx, tabTop, cx, tabBot, 'jg-tab-sub');
          if (slot) {
            const hx = cx + Math.min(HEADX, swd / 2);
            drawSymbol(g, slot, hx, symY, symSize, { style: symStyle, accentAt: null, span: [cx + 3, cx + swd - 3] });
            if (gue) {
              const parts = displayParts(slot, gStyle);
              if (parts.small || parts.main) gueums.push({ x: cx + 3, colX: cx, parts, size: fs });
            }
          }
          rects.push([cx, top + 2, swd, tabBot - top - 2, b, i]);
        });
        const info = analyzeBeat(sec, beat, gStyle);
        if (!blank) drawBeat(g, info, (t) => bx + (t / U) * bw + Math.min(HEADX, swd / 2), lineY, { style: gStyle });
        x += bw;
      }
      const mEnd = it.b1 === mea.beats.length;
      if (mEnd) {
        if (it.m === lastM) {
          line(g, x - 4.5, lineY - 12, x - 4.5, lineY + 12, 'jg-bar');
          line(g, x - 0.5, lineY - 12, x - 0.5, lineY + 12, 'jg-bar-thick');
        } else {
          line(g, x, lineY - 12, x, lineY + 12, 'jg-bar');
        }
        if (mea.repeat > 1) text(g, x - 3, top + 12, `×${mea.repeat}`, { size: 13, anchor: 'end', weight: 700 });
        if (mea.memo) memos.push({ m: it.m, memo: mea.memo, x: mx, w: x - mx });
      } else {
        line(g, x, lineY - 7, x, lineY + 7, 'jg-bar'); // 장단이 다음 단으로 이어짐
      }
    });

    // 리듬보 줄과 시작 세로줄
    line(staffG, x0, lineY, x, lineY, 'jg-staffline');
    line(staffG, x0, lineY - 7, x0, lineY + 7, 'jg-bar');

    // 표 테두리와 가운데 가로줄
    if (gue) line(tableG, tx0, tabTop + SYM_H, x, tabTop + SYM_H, 'jg-tab-row');
    el('rect', { x: r2(tx0), y: r2(tabTop), width: r2(x - tx0), height: r2(tabBot - tabTop), class: 'jg-tab-frame' }, tableG);

    // 구음: 칸 왼쪽에 맞춰 쓰고, 다음 구음이 있는 칸 앞까지는 넘쳐도 된다
    gueums.sort((p, q) => p.x - q.x);
    gueums.forEach((q, j) => {
      const next = j + 1 < gueums.length ? gueums[j + 1].colX : x;
      const room = next - q.x - 2;
      const w = gueumWidth(q.parts, q.size);
      gueumText(tableG, q.x, tabTop + SYM_H + GUE_H / 2 + q.size * 0.36, q.parts, { size: q.size, maxWidth: w > room ? Math.max(8, room) : null });
    });

    // 장단 메모: 그 장단이 끝나는 단 아래, 장단 폭 안에서 줄바꿈
    let memoH = 0;
    for (const mm of memos) {
      memoH = Math.max(memoH, drawMemo(parent, s, mm.m, mm.memo, mm.x + 2, tabBot + 6, Math.max(60, mm.w - 4), { size: 12 }));
    }
    y = tabBot + (memoH ? memoH + 10 : 0) + MEMO_GAP;
  }

  // 클릭 영역은 각 장단 그림 위에 놓는다
  for (const [m, { g, rects }] of groups) {
    for (const [rx, ry, rw, rh, b, i] of rects) slotRect(g, rx, ry, rw, rh, s, m, b, i);
  }
  return y - MEMO_GAP + 24;
}
