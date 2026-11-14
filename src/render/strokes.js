// 렌더러가 쓰는 타법 해석 도우미: 어느 편(성부)에 그릴지, 꾸밈음, 구음을 작은/큰 글씨로 나누기.
// 모델(STROKES·gueumParts)을 기준으로 하고, 칸별 구음(slot.g)에서 교재식 표기를 조금 더 읽어 낸다.

import { STROKES, gueumOf, gueumParts } from '../model.js';

const GUNG_SOUND = /^[구국궁쿵]/;   // 궁편(북편) 쪽 소리로 읽히는 글자

/**
 * 구음을 작은 글씨(꾸밈)와 큰 글씨로 나눈다. gueumParts가 기준이고,
 * 꾸밈음 없는 타법이라도 칸 구음이 '기본 구음 앞에 1~2글자를 덧붙인 꼴'이면(예: 덩 칸의 '기덩'·'구덩')
 * 덧붙인 글자를 작게 쓴다.
 */
export function displayParts(slot, style = 'banju') {
  const p = gueumParts(slot, style);
  if (p.small || !slot || !slot.g) return p;
  const base = gueumOf({ t: slot.t }, style);
  const g = slot.g;
  if (base && g.length > base.length && g.length - base.length <= 2 && g.endsWith(base)) {
    return { small: g.slice(0, g.length - base.length), main: base };
  }
  return p;
}

/** 리듬보에서 이 칸을 위(채편)·아래(궁편) 어느 성부에 그릴지(국은 gung이라 아래). */
export function voicesOf(slot) {
  const st = slot && STROKES[slot.t];
  if (!st || slot.t === 'rest') return { up: false, down: false };
  return { up: !!st.chae, down: !!st.gung };
}

/** 꾸밈음: { n: 개수(0~2), dir: 1 = 채편(위) 쪽, -1 = 궁편(아래) 쪽 }. */
export function graceOf(slot, style = 'banju') {
  const st = slot && STROKES[slot.t];
  if (!st || slot.t === 'rest') return { n: 0, dir: 1 };
  let n = st.grace ?? 0;
  let prefix = '';
  if (n) prefix = gueumParts(slot, style).small;
  else {
    prefix = displayParts(slot, style).small;
    n = Math.min(2, prefix.length);
  }
  let dir = 1;
  if (slot.t === 'gugung') dir = -1;
  else if (prefix && GUNG_SOUND.test(prefix)) dir = -1;
  else if (!st.chae) dir = -1;
  return { n: Math.min(2, n), dir };
}
