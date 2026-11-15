// 한 줄 리듬보 렌더러 — 가로 한 줄 위에 서양 음표로 장구 가락을 적는다.
// 채편 소리는 기둥 위, 궁편 소리는 기둥 아래, 덩은 둘 다. 가로 위치는 시간에 비례한다.
// 음표 풀이·그리기는 notes.js(교재식 보기와 공용).

import { beatUnits, gueumParts } from '../model.js';
import { el, text, line, slotRect, measureGroup, chunkBeats, groupBoundaries, gueumText } from './svg.js';
import { drawSectionHead } from './head.js';
import { RX, STEM, analyzeBeat, drawBeat, timeSig, drawTimeSig, attackGap } from './notes.js';
import { tailOf } from './strokes.js';

const PAD = 6;            // 마디 시작 여백
const HEAD = 9;           // 분박 칸 시작에서 음표 머리 중심까지
const ABOVE = 56;         // 줄 위 공간
const TS_W = 26;          // 박자표 폭

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
        if (prev !== null) ppu = Math.max(ppu, attackGap(sl) / (at - prev));
        prev = at;
        const n = tailOf(sl);
        if (n) { // 같은 칸 안에서 뒤따르는 타점
          ppu = Math.max(ppu, 17 / (a / (n + 1)));
          prev = at + (a * n) / (n + 1);
        }
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
      const blank = mea.beats.every((bt) => bt.slots.every((sl) => !sl)); // 빈 장단은 쉼표 없이 비워 둔다
      const { g, rects } = groupOf(it.m);
      if (it.sig) {
        drawTimeSig(g, x + TS_W / 2 - 2, lineY, it.sig);
        x += TS_W;
      }
      let bx = x + PAD;
      for (let b = it.b0; b < it.b1; b += 1) {
        const beat = mea.beats[b];
        if (b > it.b0 && bounds.has(b)) line(g, bx, lineY - 18, bx, lineY + 18, 'jg-rule-dash');
        const info = analyzeBeat(sec, beat);
        const bx0 = bx;
        if (!blank) drawBeat(g, info, (t) => bx0 + t * ppu + HEAD, lineY, {
          onAttack: gue ? (slot, hx) => {
            const parts = gueumParts(slot);
            if (parts.small || parts.main) gueums.push({ x: hx, parts });
          } : null,
        });
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
    gueums.sort((p, q) => p.x - q.x);
    gueums.forEach((q, j) => {
      const room = j + 1 < gueums.length ? gueums[j + 1].x - q.x - 3 : 60;
      gueumText(staffG, q.x - RX, lineY + STEM + 24, q.parts, { size: 11, maxWidth: Math.max(9, room) });
    });
    y = lineY + below + 8;
  }
  // 클릭 영역은 각 장단 그림 위에 놓는다
  for (const [m, { g, rects }] of groups) {
    for (const [rx, ry, rw, rh, b, i] of rects) slotRect(g, rx, ry, rw, rh, s, m, b, i);
  }
  return y;
}
