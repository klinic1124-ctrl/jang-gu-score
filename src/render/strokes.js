// 렌더러가 쓰는 타법 해석 도우미: 어느 편(성부)에 그릴지, 꾸밈음, 뒤따르는 타점.
// 음표 모양은 타법 정의(STROKES)의 플래그만 따른다. 칸 구음(slot.g)은 글자만 바꾼다.

import { STROKES } from '../model.js';

const GUNG_SOUND = /^[구국궁쿵]/;   // 궁편(북편) 쪽 소리로 읽히는 꾸밈 글자

/** 리듬보에서 이 칸을 위(채편)·아래(궁편) 어느 성부에 그릴지(국은 gung이라 아래). */
export function voicesOf(slot) {
  const st = slot && STROKES[slot.t];
  if (!st || slot.t === 'rest') return { up: false, down: false };
  return { up: !!st.chae, down: !!st.gung };
}

/**
 * 꾸밈음: { n: 개수(0~2), dir: 1 = 채편(위) 쪽, -1 = 궁편(아래) 쪽 }.
 * 쪽은 기본 구음의 꾸밈 글자로 정한다: 구궁·구덩의 '구'는 북편, 기닥의 '기'·드르닥의 '드르'는 채편.
 */
export function graceOf(slot) {
  const st = slot && STROKES[slot.t];
  if (!st || slot.t === 'rest' || !st.grace) return { n: 0, dir: 1 };
  const prefix = st.gueum.slice(0, st.small ?? 0);
  const dir = !st.chae || GUNG_SOUND.test(prefix) ? -1 : 1;
  return { n: Math.min(2, st.grace), dir };
}

/** 같은 칸 안에서 본 타점 뒤에 오는 채편 타점 수(드르닥따 = 1). */
export function tailOf(slot) {
  const st = slot && STROKES[slot.t];
  return st && slot.t !== 'rest' ? Math.max(0, Math.floor(st.tail ?? 0)) : 0;
}
