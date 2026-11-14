// 정간보(세로·가로) 렌더러.

import { beatUnits, gueumOf } from '../model.js';
import { el, text, line, r2, slotRect, measureGroup, chunkBeats, groupBoundaries } from './svg.js';
import { drawSymbol } from './symbols.js';
import { drawSectionHead } from './head.js';

/** 구간 전체에서 분박 칸이 minSlot 이상이 되도록 기본 박 크기를 정한다(박 크기는 units에 비례). */
function baseBeatSize(sec, minBase, minSlot) {
  const div = sec.meter.division;
  let base = minBase;
  for (const mea of sec.measures) {
    for (const beat of mea.beats) base = Math.max(base, (beat.slots.length * minSlot * div) / beatUnits(sec, beat));
  }
  return Math.ceil(base);
}

const repeatLabel = (mea) => (mea.repeat > 1 ? `×${mea.repeat}` : '');

// ---------------- 세로 정간보 ----------------
// 한 장단 = 세로 한 줄(위→아래), 장단은 오른쪽→왼쪽, 폭이 차면 아래 단으로.

export function renderVertical(parent, ctx, sec, s, y) {
  const { width, margin, settings } = ctx;
  const gue = !!settings.showGueum;
  const div = sec.meter.division;
  const bounds = groupBoundaries(sec.meter);

  y += drawSectionHead(parent, sec, s, width - margin, y, 'end') + 4;

  const baseH = baseBeatSize(sec, sec.meter.beats > 12 ? 32 : 44, 21);
  const symW = 30;
  const gueW = gue ? 40 : 0;
  const colW = symW + gueW;
  const gap = 12;
  const perRow = Math.max(1, Math.floor((width - margin * 2 + gap) / (colW + gap)));
  const colHeight = (mea) => mea.beats.reduce((a, beat) => a + (baseH * beatUnits(sec, beat)) / div, 0);

  for (let r0 = 0; r0 < sec.measures.length; r0 += perRow) {
    const row = sec.measures.slice(r0, r0 + perRow);
    const top = y + 14;
    const rowH = Math.max(...row.map(colHeight));
    const hasRepeat = row.some((mea) => mea.repeat > 1);

    row.forEach((mea, j) => {
      const m = r0 + j;
      const x = width - margin - (j + 1) * colW - j * gap;
      const g = measureGroup(parent, s, m);
      text(g, x + colW / 2, top - 4, String(m + 1), { size: 10, anchor: 'middle', cls: 'jg-muted' });

      const rects = [];
      let by = top;
      mea.beats.forEach((beat, b) => {
        const h = (baseH * beatUnits(sec, beat)) / div;
        if (b > 0) line(g, x, by, x + colW, by, bounds.has(b) ? 'jg-rule-bold' : 'jg-rule');
        const k = beat.slots.length;
        const sh = h / k;
        const size = Math.min(17, sh * 0.72);
        beat.slots.forEach((slot, i) => {
          const cy = by + (i + 0.5) * sh;
          const cx = gue ? x + symW / 2 + 2 : x + colW / 2 + 2; // 왼쪽에 강세 자리
          drawSymbol(g, slot, cx, cy, size, { accentAt: 'left' });
          const word = gue ? gueumOf(slot, settings.gueumStyle) : '';
          if (word) {
            const fs = Math.min(11, Math.max(8, sh * 0.62));
            text(g, x + symW - 2, cy + fs * 0.36, word, { size: fs, maxWidth: gueW - 5 });
          }
          rects.push([x, by + i * sh, colW, sh, b, i]);
        });
        by += h;
      });
      el('rect', { x: r2(x), y: r2(top), width: colW, height: r2(by - top), class: 'jg-frame' }, g);
      const rep = repeatLabel(mea);
      if (rep) text(g, x + colW / 2, by + 15, rep, { size: 13, anchor: 'middle', weight: 700 });
      for (const [rx, ry, rw, rh, b, i] of rects) slotRect(g, rx, ry, rw, rh, s, m, b, i);
    });
    y = top + rowH + (hasRepeat ? 22 : 6) + 14;
  }
  return y;
}

// ---------------- 가로 정간보 ----------------
// 한 장단 = 가로 한 줄(왼쪽→오른쪽), 장단은 위→아래. 너무 길면 묶음/박 경계에서 줄바꿈.

export function renderHorizontal(parent, ctx, sec, s, y) {
  const { width, margin, settings } = ctx;
  const gue = !!settings.showGueum;
  const div = sec.meter.division;
  const bounds = groupBoundaries(sec.meter);

  y += drawSectionHead(parent, sec, s, margin, y) + 6;

  const baseW = baseBeatSize(sec, gue ? 46 : 38, gue ? 26 : 22);
  const rowH = gue ? 46 : 32;
  const labelW = 24;
  const repW = 34;
  const avail = width - margin * 2 - labelW - repW;
  const symY = gue ? 19 : rowH / 2 + 2;

  sec.measures.forEach((mea, m) => {
    const g = measureGroup(parent, s, m);
    const widths = mea.beats.map((beat) => (baseW * beatUnits(sec, beat)) / div);
    const chunks = chunkBeats(widths, sec.meter.grouping, avail);
    const rects = [];
    chunks.forEach(([b0, b1], ci) => {
      const x0 = margin + labelW;
      if (ci === 0) text(g, margin + labelW - 8, y + rowH / 2 + 4, String(m + 1), { size: 10, anchor: 'end', cls: 'jg-muted' });
      let x = x0;
      for (let b = b0; b < b1; b += 1) {
        const beat = mea.beats[b];
        const w = widths[b];
        if (b > b0) line(g, x, y, x, y + rowH, bounds.has(b) ? 'jg-rule-bold' : 'jg-rule');
        const k = beat.slots.length;
        const sw = w / k;
        const size = Math.min(16, sw * 0.7, rowH * 0.5);
        beat.slots.forEach((slot, i) => {
          const cx = x + (i + 0.5) * sw;
          drawSymbol(g, slot, cx, y + symY, size, { accentAt: 'above' });
          const word = gue ? gueumOf(slot, settings.gueumStyle) : '';
          if (word) text(g, cx, y + 39, word, { size: 10, anchor: 'middle', maxWidth: sw - 3 });
          rects.push([x + i * sw, y, sw, rowH, b, i]);
        });
        x += w;
      }
      el('rect', { x: r2(x0), y: r2(y), width: r2(x - x0), height: rowH, class: 'jg-frame' }, g);
      const last = ci === chunks.length - 1;
      if (last && mea.repeat > 1) text(g, x + 8, y + rowH / 2 + 5, repeatLabel(mea), { size: 13, weight: 700 });
      y += rowH + (last ? 10 : 4);
    });
    for (const [rx, ry, rw, rh, b, i] of rects) slotRect(g, rx, ry, rw, rh, s, m, b, i);
  });
  return y;
}
