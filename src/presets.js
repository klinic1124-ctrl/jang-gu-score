// 장단 프리셋 모음 — 「한국의 장단 III」 제4장 장구 장단(118~131쪽)의 리듬보와 부호·구음 표를 옮긴 것.
// category는 '산조·민요 반주', id 접두어는 'gobeop-'.
//   meter.slots = 표의 박당 칸 수. tempoRange[1]은 Section.tempoMax로 들어간다.
//
// verified: true  = 박·칸 위치까지 확인한 것.
//           false = 인쇄가 흐려 일부 구음·배치를 추정한 것.
//
// pattern 표기는 model.js의 measureFromPattern을 따른다(박은 공백, 칸은 쉼표, '-'는 빈 칸, '!'는 강세, ':구음'은 그 칸의 구음, '/n'은 박 길이).

import { createSection, measureFromPattern } from './model.js';

export const PRESETS = [
  // ───────────────────────── 산조·민요 반주 (교재) ─────────────────────────
  // 「한국의 장단 III」 제4장 장구 장단의 리듬보와 부호·구음 표를 사진으로 보고 옮겼다.
  // 표의 한 칸 = 분박 칸 하나. 부호 대응: ⊖ 덩(deong), ○ 궁(kung), ─ 따(deok), ─+작은 '기' 기닥(gideok),
  // ⊗ 떡(tteok, 채편 변죽)·국(guk, 북편 반뮤트), ◎ 구궁(gugung), 卌 따드락(ttadeurak), ⊛(원 안 별표) 변죽 따드락(byeondeurak),
  // ⊕ 드르덩(deureudeong), ······ 더러러러(deoreo). 구덩·기덩 = gudeong(구덩), 따드락+따 한 칸 = deureudaktta. 구음이 기본과 다르면 ':구음'으로 적었다.
  {
    id: 'gobeop-jinyangjo',
    name: '진양조',
    category: '산조·민요 반주',
    meter: { beats: 24, division: 3, grouping: [6, 6, 6, 6], slots: 3 },
    tempo: 36,
    tempoRange: null,
    variants: [
      {
        name: '기본',
        pattern: [
          'deong,-,- guk,-,- guk,-,- guk,-,- tteok,-,- tteok,-,-',
          'gugung,-,- guk,-,- guk,-,- guk,-,- gudeong,byeondeurak,- byeondeurak,-,byeondeurak',
          'gugung,-,- guk,-,- guk,-,- guk,-,- tteok,-,- -,-,-',
          'gugung,-,- guk,-,- guk,-,- guk,-,- gudeong,kung,- gugung,-,kung',
        ].join(' '),
      },
    ],
    verified: false,
    source: '「한국의 장단 III」 제4장 장구 장단, 118쪽. 4단(4각)을 이어 24박 한 장단. 빠르기 표기는 사진에서 가려져(♩.만 보임) 기본값 36은 임의. 4각 제23박 첫 칸은 부호가 ⊗인데 구음은 \'구덩\'이고 리듬보는 위아래 기둥이라 덩(구덩)으로 옮김',
  },
  {
    id: 'gobeop-jungmori',
    name: '중모리',
    category: '산조·민요 반주',
    meter: { beats: 12, division: 2, grouping: [3, 3, 3, 3], slots: 1 },
    tempo: 90,
    tempoRange: [72, 108],
    variants: [
      { name: '기본', pattern: 'deong guk deok guk deok deok guk guk tteok! guk guk guk' },
      { name: '변형 1', pattern: 'gudeong guk deok guk deok deureudaktta guk kung tteok! guk guk guk' },
      { name: '변형 2', pattern: 'gudeong kung ttadeurak guk deok deureudaktta guk guk tteok guk ttadeurak deureudaktta' },
      { name: '변형 3', pattern: 'gugung kung ttadeurak guk ttadeurak deureudaktta guk guk tteok guk gugung kung' },
    ],
    verified: false,
    source: '「한국의 장단 III」 제4장 장구 장단, 120쪽(12/4, ♩≒72~108). 인쇄가 흐려 따드락의 작은 글자(따드)와 변형 1 제6박의 \'따드닥다\'를 분명히 읽지 못해 기본 구음(따드락·따)으로 둠',
  },
  {
    id: 'gobeop-jungjungmori',
    name: '중중모리',
    category: '산조·민요 반주',
    meter: { beats: 4, division: 3, grouping: null, slots: 3 },
    tempo: 55,
    tempoRange: [50, 60],
    variants: [
      { name: '기본', pattern: 'gudeong,-,deok gugung,-,deok gugung,kung,tteok! kung,-,kung' },
      { name: '변형 1', pattern: 'deureudeong,kung,ttadeurak gugung,kung,ttadeurak gugung,kung,tteok! kung,-,kung' },
      { name: '변형 2', pattern: 'gudeong,-,tteok -,byeondeurak,tteok:따 gugung,kung,tteok! kung,-,kung' },
      { name: '변형 3', pattern: 'deong,kung,- gugung,-,- gudeong,-,tteok! guk,-,guk' },
    ],
    verified: true,
    source: '「한국의 장단 III」 제4장 장구 장단, 122쪽(12/8, ♩.≒50~60)',
  },
  {
    id: 'gobeop-jajinmori',
    name: '자진모리',
    category: '산조·민요 반주',
    meter: { beats: 4, division: 3, grouping: null, slots: 3 },
    tempo: 100,
    tempoRange: [80, 120],
    variants: [
      { name: '기본', pattern: 'gudeong,-,- gudeong,-,- gudeong,-,byeondeurak guk,deok,-' },
      { name: '변형 1', pattern: 'deong:더덩,kung,- gugung,kung,- gugung,-,ttadeurak kung,ttadeurak,-' },
      { name: '변형 2', pattern: 'gudeong,deong,- deureudeong:드르더,deong,- tteok,-,tteok -,kung,-' },
      { name: '변형 3', pattern: 'gudeong,kung,- gugung,-,ttadeurak gugung,-,tteok -,kung,-' },
    ],
    verified: false,
    source: '「한국의 장단 III」 제4장 장구 장단, 124쪽(12/8, ♩.≒80~120). 변형 1 첫 칸의 작은 글자(더덩?)가 흐림',
  },
  {
    id: 'gobeop-hwimori',
    name: '휘모리',
    category: '산조·민요 반주',
    meter: { beats: 4, division: 2, grouping: null, slots: 2 },
    tempo: 140,
    tempoRange: [120, 160],
    variants: [
      { name: '기본', pattern: 'deong,- deok,deok kung,deok:딱 kung,-' },
      { name: '변형 1', pattern: 'kung,- ttadeurak,deok kung,deok:딱 kung,-' },
      { name: '변형 2', pattern: 'deong,- -,- ttadeurak,- deok,-' },
      { name: '변형 3', pattern: 'deong,- -,- deong,- -,-' },
      { name: '변형 4', pattern: 'deong,- deok,deok kung,deok:딱 guk,-' },
      { name: '변형 5', pattern: 'deok,kung -,deok kung,deok:딱 kung,-' },
      { name: '변형 6', pattern: 'deong,- deong,- kung,deok:딱 kung,-' },
    ],
    verified: true,
    source: '「한국의 장단 III」 제4장 장구 장단, 126쪽(4/4, ♩≒120~160). 한 단에 장단 2개씩 4단 = 8장단이며, 2단 둘째 장단은 변형 1과 같아 뺐다',
  },
  {
    id: 'gobeop-eotmori',
    name: '엇모리',
    category: '산조·민요 반주',
    // 3+2+3+2 혼합박. 박마다 units(8분음표 개수)만큼 칸을 둔다(8분음표 = 칸 하나, 16분 둘이 있는 박만 6칸).
    meter: { beats: 4, division: 2, grouping: null, slots: 2 },
    tempo: 96,
    tempoRange: [92, 100],
    variants: [
      { name: '기본', pattern: 'deong,-,deong/3 deong,-/2 deong,-,tteok/3 kung,-/2' },
      { name: '변형 1', pattern: 'deong,-,gideok:기덕/3 kung,gideok:기덕/2 kung,-,tteok/3 kung,-/2' },
      { name: '변형 2', pattern: 'deong,-,deureudeong/3 deong,-/2 deong,-,gideok:기덕/3 kung,-/2' },
      { name: '변형 3', pattern: 'deong,kung,deok/3 kung,ttadeurak/2 kung,-,tteok/3 kung,-/2' },
      { name: '변형 4', pattern: 'deong,-,deong/3 kung,deok/2 kung,-,gideok:기떡/3 kung,deok:다/2' },
      { name: '변형 5', pattern: 'kung,-,gugung:구구궁/3 kung,-/2 kung,-,gugung:구구궁/3 kung,-/2' },
      { name: '변형 6', pattern: 'deok,-,ttadeurak/3 deok,deok/2 deok,-,ttadeurak/3 deok,deok/2' },
      { name: '변형 7', pattern: 'deok,-,kung:쿵,-,deok,deok/3 gugung,ttadeurak/2 gugung,-,byeondeurak/3 kung,-/2' },
      { name: '변형 8', pattern: 'deong,-,deureudeong/3 deong,deong/2 deong,-,deureudeong/3 deong,deong/2' },
      { name: '변형 9', pattern: 'deoreo,-,-/3 kung,deok/2 kung,-,tteok/3 tteok,-/2' },
    ],
    verified: true,
    source: '「한국의 장단 III」 제4장 장구 장단, 128쪽(10/8, ♪≒184~200 → 4분음표 기준 92~100). 한 단에 장단 2개씩 5단 = 10장단',
  },
  {
    id: 'gobeop-eotjungmori',
    name: '엇중모리',
    category: '산조·민요 반주',
    meter: { beats: 6, division: 2, grouping: [3, 3], slots: 1 },
    tempo: 90,
    tempoRange: [72, 108],
    variants: [
      { name: '기본', pattern: 'deong kung gideok gugung tteok kung' },
      { name: '변형 1', pattern: 'deong kung ttadeurak kung tteok kung' },
      { name: '변형 2', pattern: 'gudeong kung deok gugung deok deureudaktta' },
      { name: '변형 3', pattern: 'gugung kung ttadeurak gugung tteok kung' },
      { name: '변형 4', pattern: 'gudeong kung tteok kung tteok kung' },
      { name: '변형 5', pattern: 'gudeong deong deureudaktta gugung tteok kung' },
      { name: '변형 6', pattern: 'deok deok deureudaktta gugung tteok kung' },
      { name: '변형 7', pattern: 'deong - ttadeurak,-,deok kung tteok kung' },
    ],
    verified: true,
    source: '「한국의 장단 III」 제4장 장구 장단, 129쪽(6/4, ♩≒72~108). 한 단에 장단 2개씩 4단 = 8장단. 변형 7 제3박은 셋잇단(따드락 2 : 따 1)',
  },
  {
    id: 'gobeop-semachi',
    name: '세마치',
    category: '산조·민요 반주',
    meter: { beats: 3, division: 3, grouping: null, slots: 3 },
    tempo: 96,
    tempoRange: [82, 108],
    variants: [
      { name: '기본', pattern: 'deong,-,- deong,-,gideok kung,deok,-' },
      { name: '변형 1', pattern: 'deong:더덩,deong,- deong,-,gideok kung,deok,-' },
      { name: '변형 2', pattern: 'deong,-,- tteok:기닥,-,gideok kung,ttadeurak,-' },
      { name: '변형 3', pattern: 'deong:더,kung,- kung,-,gideok kung,byeondeurak,-' },
      { name: '변형 4', pattern: 'gudeong,-,- kung,-,gideok kung,ttadeurak,-' },
      { name: '변형 5', pattern: 'deong:더,kung,- kung,-,gideok kung,deok,-' },
      { name: '한오백년, 농부가 등의 맺음가락 1', pattern: 'deong,-,- kung,-,- tteok,-,-' },
      { name: '한오백년, 농부가 등의 맺음가락 2', pattern: 'deok,kung,deok:다 kung,-,tteok:기떡 kung,-,-' },
    ],
    verified: true,
    source: '「한국의 장단 III」 제4장 장구 장단, 130쪽(9/8, ♩.≒82~108). 한 단에 장단 2개씩 4단 = 8장단, 마지막 단은 "한오백년, 농부가 등의 맺음가락"',
  },
  {
    id: 'gobeop-dongsalpuri',
    name: '동살풀이',
    category: '산조·민요 반주',
    meter: { beats: 4, division: 2, grouping: null, slots: 2 },
    tempo: 80,
    tempoRange: [72, 92],
    variants: [
      { name: '기본', pattern: 'deong,- deong,- deong!,deong! deok,deok' },
      { name: '변형 1', pattern: 'deong,- ttadeurak,deok kung,-,ttadeurak,deok kung,deok' },
      { name: '변형 2', pattern: 'deong,- deok,deok kung,-,gideok,kung:구 kung,deok' },
      { name: '변형 3', pattern: 'deong,- deong,- gugung,deok! kung,deok' },
      { name: '변형 4', pattern: 'deong,- deong,deong kung,gideok gugung,-' },
      { name: '변형 5', pattern: 'kung,- ttadeurak,deok kung,-,ttadeurak,deok kung,kung' },
      { name: '변형 6', pattern: 'deong,- ttadeurak,deok deok,kung:구,kung,deok kung,deok' },
      { name: '변형 7', pattern: 'deong,- gudeong,deong deok,kung:구,kung,deok kung,gideok,kung,-' },
    ],
    verified: true,
    source: '「한국의 장단 III」 제4장 장구 장단, 131쪽(4/4, ♩≒72~92). 한 단에 장단 2개씩 4단 = 8장단. 16분음표가 있는 박만 4칸. 기본 제3박 첫 덩은 리듬보에 꾸밈음이 있으나 표의 구음은 \'덩\'',
  },
];

export function getPreset(id) {
  return PRESETS.find((p) => p.id === id) ?? null;
}

/** 프리셋의 variant 하나로 장단 하나(Measure)를 만든다. */
export function measureFromPreset(id, variant = 0) {
  const preset = getPreset(id);
  if (!preset) throw new Error(`알 수 없는 장단 프리셋: ${id}`);
  const v = preset.variants[variant];
  if (!v) throw new Error(`${preset.name}에 ${variant}번 변형이 없습니다`);
  return measureFromPattern(v.pattern);
}

/** 프리셋으로 Section을 만든다. 장단을 measures개 채운다(각각 새 id). name을 비우면 Section.name도 ''(머리말은 jangdan으로 표시). */
export function sectionFromPreset(id, { variant = 0, measures = 1, name = '' } = {}) {
  const preset = getPreset(id);
  if (!preset) throw new Error(`알 수 없는 장단 프리셋: ${id}`);
  const count = Math.max(1, Math.floor(measures) || 1);
  const list = [];
  for (let i = 0; i < count; i += 1) list.push(measureFromPreset(id, variant));
  return createSection({
    name: name || '',
    jangdan: preset.name,
    meter: {
      ...preset.meter,
      grouping: preset.meter.grouping ? [...preset.meter.grouping] : null,
      slots: preset.meter.slots ?? 1,
    },
    tempo: preset.tempoRange ? preset.tempoRange[0] : preset.tempo, // 범위가 있으면 악보에 '≒최소~최대'로 적히도록 최솟값으로 시작
    tempoMax: preset.tempoRange ? preset.tempoRange[1] : null,
    measures: list,
  });
}
