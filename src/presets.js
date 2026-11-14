// 장단 프리셋 모음.
//
// 출처 표기
//  [통일안] 국립국악원 국악교육 통일안(1993) 및 국악원 교육자료의 장구 장단 악보(gif)
//           https://academy.gugak.go.kr/dp/pds/HTML5-2-4-2/HTML5-2-4-2-4/HTML5-2-4-2-4-1/index.htm (민속악)
//           https://academy.gugak.go.kr/dp/pds/HTML5-2-4-2/HTML5-2-4-2-4/HTML5-2-4-2-4-2/index.htm (정악·정가)
//           악보 그림을 직접 보고 옮겼다. 3분박 박 하나 = 칸 3개, 12/8의 8분음표 1개 = 칸 1개.
//  [대백과] 한국민족문화대백과 '장단'(이보형) https://encykorea.aks.ac.kr/Article/E0048356
//           "제n박에 떵/덕/쿵…" 식의 문장으로 쓰인 타점 위치를 옮겼다.
//  [위키]   한국어 위키백과 '장단' 문서의 구음(덩 쿵 쿵덕쿵 …).
//
// verified: true  = 위 자료에서 박·칸 위치까지 확인한 것.
//           false = 구음 문자열 정도만 확인되어 박 배치는 추정한 것.
//
// pattern 표기는 model.js의 measureFromPattern을 따른다(박은 공백, 칸은 쉼표, '-'는 빈 칸, '!'는 강세, '/n'은 박 길이).

import { createSection, measureFromPattern } from './model.js';

export const PRESETS = [
  // ───────────────────────── 정악 ─────────────────────────
  {
    id: 'sangnyeongsan',
    name: '상령산·중령산',
    category: '정악',
    meter: { beats: 20, division: 2, grouping: [6, 4, 4, 6] },
    tempo: 44,
    tempoRange: null,
    variants: [
      { name: '기본', pattern: 'deong - - - - - gideok - - - kung - - - deoreo - - - - -' },
    ],
    verified: true,
    source: '[대백과] 상영산장단: 20박을 6·4·4·6으로 나누고 제1박 덩, 제7박 기덕, 제11박 쿵, 제15박 더러러. (갈라치는 시작법은 포함하지 않음)',
  },
  {
    id: 'seryeongsan',
    name: '세령산·가락덜이',
    category: '정악',
    meter: { beats: 10, division: 3, grouping: [3, 2, 2, 3] },
    tempo: 60,
    tempoRange: null,
    variants: [
      { name: '기본', pattern: 'deong - deok deoreo - kung - gideok - deok' },
    ],
    verified: true,
    source: '[대백과] 세영산장단: 3·2·2·3박, 제1박 덩, 제3박 덕, 제4박 더러러, 제6박 쿵, 제8박 기덕, 제10박 덕',
  },
  {
    id: 'dodeuri',
    name: '도드리',
    category: '정악',
    meter: { beats: 6, division: 3, grouping: null },
    tempo: 60,
    tempoRange: null,
    variants: [
      { name: '기본(통일안 악보)', pattern: 'deong - gideok kung deoreo deok' },
      { name: '대백과 표기(끝박 쉼)', pattern: 'deong - gideok kung deoreo -' },
    ],
    verified: true,
    source: '[통일안] 도드리 장단 악보(6/4): 덩(2박) 기덕 쿵 더러러 덕 / [대백과] 도드리장단: 제1박 덩, 제3박 기덕, 제4박 쿵, 제5박 더러러. 곡(윗도드리·염불도드리 등)마다 조금씩 다름',
  },
  {
    id: 'taryeong',
    name: '타령',
    category: '정악',
    meter: { beats: 4, division: 3, grouping: null },
    tempo: 72,
    tempoRange: null,
    variants: [
      { name: '기본(통일안 악보)', pattern: 'deong,-,- gideok,-,deok deong,-,- gideok,-,deok' },
      { name: '대백과 문장 표기', pattern: 'deong,-,- gideok,-,deok deong,-,gideok -,-,deok' },
    ],
    verified: true,
    source: '[통일안] 타령 장단 악보(12/8): 덩 / 기덕 - 덕 / 덩 / 기덕 - 덕. [대백과] 타령장단은 12/8에서 제1박 덩, 제4박 기덕, 제6박 덕, 제7박 덩, 제9박 기덕, 제12박 덕이라 적었으나 제9박은 악보(제10박 자리)와 한 칸 어긋나 두 가지를 모두 싣는다',
  },
  {
    id: 'chwita',
    name: '취타',
    category: '정악',
    meter: { beats: 12, division: 3, grouping: null },
    tempo: 72,
    tempoRange: null,
    variants: [
      { name: '기본', pattern: 'deong deok deong deok deong deoreo kung kung deong - deoreo deok' },
    ],
    verified: true,
    source: '[대백과] 취타장단: 제1박 덩, 2 덕, 3 덩, 4 덕, 5 덩, 6 더러러, 7 쿵, 8 쿵, 9 덩, 11 더러러, 12 덕 (대백과는 "20박자·60/8"이라 적었지만 열거된 타점이 12박까지라 12박으로 옮김; 위키·일반 설명은 12박)',
  },
  {
    id: 'gilgunak',
    name: '길군악(행악)',
    category: '정악',
    meter: { beats: 8, division: 3, grouping: null },
    tempo: 80,
    tempoRange: null,
    variants: [
      { name: '기본', pattern: 'deong deok deong deok deong - deoreo deok' },
    ],
    verified: true,
    source: '[대백과] 길군악장단: 3분박 8박, 제1박 덩, 2 덕, 3 덩, 4 덕, 5 덩, 7 더러러, 8 덕',
  },
  {
    id: 'gagok16',
    name: '가곡 16박',
    category: '정악',
    meter: { beats: 16, division: 3, grouping: [3, 3, 2, 3, 3, 2] },
    tempo: 30,
    tempoRange: [20, 40],
    variants: [
      { name: '기본', pattern: 'deong - deoreo kung - deok gideok - kung - deok deong - deoreo kung deok' },
    ],
    verified: true,
    source: '[대백과] 가곡 16박장단(3·3·2·3·3·2): 제1박 덩, 3 더러러, 4 쿵, 6 덕, 7 기덕, 9 쿵, 11 덕, 12 덩, 14 더러러, 15 쿵, 16 덕 / [통일안] 가곡 장단(16박) ♩=20-40',
  },
  {
    id: 'gagok10',
    name: '가곡 10박(편장단)',
    category: '정악',
    meter: { beats: 10, division: 3, grouping: [3, 2, 2, 3] },
    tempo: 76,
    tempoRange: [75, 80],
    variants: [
      { name: '기본', pattern: 'deong deoreo kung deok gideok kung deok deong deoreo kung' },
    ],
    verified: true,
    source: '[대백과] 가곡 10박장단(편삭대엽·언편·편락): 제1박 덩, 2 더러러, 3 쿵, 4 덕, 5 기덕, 6 쿵, 7 덕, 8 덩, 9 더러러, 10 쿵 / [통일안] 가곡 장단(10박) ♩=75-80',
  },
  {
    id: 'sijo5',
    name: '시조 5박',
    category: '정악',
    meter: { beats: 5, division: 3, grouping: null },
    tempo: 30,
    tempoRange: null,
    variants: [
      { name: '기본', pattern: 'deong - deoreo kung deok' },
    ],
    verified: true,
    source: '[대백과] 시조 5박: 제1박 덩, 3 더러러, 4 쿵, 5 덕 / [통일안] 시조 장단(5박) ♩=30',
  },
  {
    id: 'sijo8',
    name: '시조 8박',
    category: '정악',
    meter: { beats: 8, division: 3, grouping: null },
    tempo: 30,
    tempoRange: null,
    variants: [
      { name: '기본', pattern: 'deong - deoreo kung deok kung gideok kung' },
    ],
    verified: true,
    source: '[대백과] 시조 8박: 제1박 덩, 3 더러러, 4 쿵, 5 덕, 6 쿵, 7 기덕, 8 쿵 / [통일안] 시조 장단(8박) ♩=30 (악보에는 제5박 덕이 보이지 않고 제7박이 점8분+16분)',
  },

  // ───────────────────────── 민속악 ─────────────────────────
  {
    id: 'jinyangjo',
    name: '진양조',
    category: '민속악',
    meter: { beats: 24, division: 3, grouping: [6, 6, 6, 6] },
    tempo: 36,
    tempoRange: [30, 45],
    variants: [
      {
        name: '기본(국악원 교육자료)',
        pattern: [
          'deong - deong - gideok,-,deok -,deok,-',
          'kung - kung - gideok,-,deok -,deok,-',
          'kung - kung - deok! -',
          'kung - kung - gideok,-,deok -,deok,-',
        ].join(' '),
      },
    ],
    verified: true,
    source: '[통일안] 진양조 장단 악보(24/4, ♩.=30-45): 각마다 2박+2박 뒤에 셋잇단 3타(기덕·덕·덕), 3각만 맺는 채(덕!). 소리의 밀고 달고 맺고 푸는 데 따라 크게 변주됨(대백과)',
  },
  {
    id: 'jungmori',
    name: '중모리',
    category: '민속악',
    meter: { beats: 12, division: 2, grouping: [3, 3, 3, 3] },
    tempo: 90,
    tempoRange: [72, 108],
    variants: [
      {
        name: '기본',
        pattern: 'deong - deok kung deok,-,-,deok deok,deok kung kung deok! kung deok,-,-,deok deok,deok',
      },
    ],
    verified: true,
    source: '[통일안] 중모리 장단 악보(12/4, ♩=72-108) / [대백과] 첫 박 덩, 맺는 각의 제9박을 채로 크고 강하게',
  },
  {
    id: 'jungjungmori',
    name: '중중모리',
    category: '민속악',
    meter: { beats: 4, division: 3, grouping: null },
    tempo: 88,
    tempoRange: [80, 96],
    variants: [
      { name: '기본', pattern: 'deong,-,deok kung,deok,deok kung,kung,deok! kung,-,kung' },
    ],
    verified: true,
    source: '[통일안] 중중모리 장단 악보(12/8, ♩.=80-96) / [대백과] 맺는 각 제3박 후반을 채로 크고 강하게',
  },
  {
    id: 'jajinmori',
    name: '자진모리',
    category: '민속악',
    meter: { beats: 4, division: 3, grouping: null },
    tempo: 110,
    tempoRange: [90, 144],
    variants: [
      { name: '기본(통일안)', pattern: 'deong,-,- kung,-,- kung,-,deok! kung,-,-' },
      { name: '변형 2', pattern: 'deong,-,deok kung,-,-,deok,kung,- deong,-,deok! kung,-,-,deok,kung,-' },
      { name: '변형 3', pattern: 'deong,-,deok kung,deok,- kung,-,deok! kung,deok,-' },
    ],
    verified: true,
    source: '[통일안] 자진모리 장단 악보 3종(12/8, ♩.=90-144) / [위키] 기본 구음 "덩 쿵 쿵덕쿵"과 일치. 변형 3의 점 표기는 8분음표로 단순화',
  },
  {
    id: 'hwimori',
    name: '휘모리',
    category: '민속악',
    meter: { beats: 4, division: 2, grouping: null },
    tempo: 130,
    tempoRange: [116, 144],
    variants: [
      { name: '기본(통일안)', pattern: 'deong,- deok,deok kung,deok kung,-' },
      { name: '12/8 변형', pattern: 'deong,-,deok kung,-,deok kung,-,deok! kung,-,-' },
    ],
    verified: true,
    source: '[통일안] 휘모리 장단 악보(4/4, ♩=116-144) 및 12/8 악보 / [위키] 첫 박 덩, 제3박 후반 채 강하게. 12/8 변형 악보는 속도 표기 없는 그림이라 휘모리(2)로 추정',
  },
  {
    id: 'gutgeori',
    name: '굿거리',
    category: '민속악',
    meter: { beats: 4, division: 3, grouping: null },
    tempo: 66,
    tempoRange: [60, 72],
    variants: [
      { name: '기본(통일안)', pattern: 'deong,-,gideok kung,deoreo,- kung,-,gideok! kung,deoreo,-' },
      { name: '변형 1(쿵 시작)', pattern: 'kung,-,gideok kung,deoreo,- kung,-,gideok! kung,deoreo,-' },
      { name: '변형 2(기덕 연속)', pattern: 'kung,-,gideok deok,gideok,gideok kung,-,gideok! kung,deok,-' },
    ],
    verified: true,
    source: '[통일안] 굿거리 장단 악보 3종(12/8, ♩.=60-72). 구음 덩 기덕 쿵 더러러러 쿵 기덕 쿵 더러러러. 더러러러(16분 4개)는 8분 2개 길이라 둘째 칸에 두고 셋째 칸을 비웠다. 변형 1·2의 첫 음은 악보에서 북편만 친다',
  },
  {
    id: 'semachi',
    name: '세마치',
    category: '민속악',
    meter: { beats: 3, division: 3, grouping: null },
    tempo: 90,
    tempoRange: null,
    variants: [
      { name: '기본', pattern: 'deong,-,- deong,-,deok kung,deok,-' },
    ],
    verified: true,
    source: '[통일안] 세마치 장단 악보(9/8) / [대백과]·[위키] 구음 덩 덩 덕 쿵 덕. 속도 표기는 확인 못해 기본값은 임의',
  },
  {
    id: 'eotmori',
    name: '엇모리',
    category: '민속악',
    // 3+2+3+2 혼합박: 박마다 units(8분음표 개수)를 지정한다. division 2 + tempo는 4분음표 기준.
    meter: { beats: 4, division: 2, grouping: null },
    tempo: 100,
    tempoRange: null,
    variants: [
      { name: '기본', pattern: 'deong,-,kung/3 deok,-/2 kung,-,deok!/3 kung,deok/2' },
    ],
    verified: false,
    source: '[위키] 구음 "더엉궁 따악 구웅 궁 따악"(3+2+3+2 혼합 10/8) / [대백과] 첫 박 덩, 10박 중 제8박 덕을 강하게. 구음 문자열만 확인되고 박 안의 칸 배치는 추정',
  },
  {
    id: 'eotjungmori',
    name: '엇중모리',
    category: '민속악',
    meter: { beats: 6, division: 2, grouping: [3, 3] },
    tempo: 96,
    tempoRange: null,
    variants: [
      { name: '기본', pattern: 'deong kung deok kung deok! kung' },
    ],
    verified: false,
    source: '[위키] 치는 법 "덩 궁 딱 궁 딱 궁"(소리북 구음을 장구 구음으로 옮김) / [대백과] 첫 박 덩, 맺는 각 제5박 덕을 강하고 크게. 장구 악보 그림은 확인 못함',
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

/** 프리셋으로 Section을 만든다. 장단을 measures개 채운다(각각 새 id). */
export function sectionFromPreset(id, { variant = 0, measures = 1, name = '' } = {}) {
  const preset = getPreset(id);
  if (!preset) throw new Error(`알 수 없는 장단 프리셋: ${id}`);
  const count = Math.max(1, Math.floor(measures) || 1);
  const list = [];
  for (let i = 0; i < count; i += 1) list.push(measureFromPreset(id, variant));
  return createSection({
    name: name || preset.name,
    jangdan: preset.name,
    meter: { ...preset.meter, grouping: preset.meter.grouping ? [...preset.meter.grouping] : null },
    tempo: preset.tempo,
    measures: list,
  });
}
