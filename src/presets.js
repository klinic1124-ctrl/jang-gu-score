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
//  [교재]   「한국의 장단 III」 제4장 장구 장단(118~131쪽) — category '산조·민요 반주', id 접두어 'gobeop-'.
//           meter.slots = 표의 박당 칸 수. tempoRange[1]은 Section.tempoMax로 들어간다.
//
// verified: true  = 위 자료에서 박·칸 위치까지 확인한 것.
//           false = 구음 문자열 정도만 확인되어 박 배치는 추정한 것.
//
// pattern 표기는 model.js의 measureFromPattern을 따른다(박은 공백, 칸은 쉼표, '-'는 빈 칸, '!'는 강세, ':구음'은 그 칸의 구음, '/n'은 박 길이).

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
    meter: { beats: 10, division: 2, grouping: [3, 2, 2, 3] },
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
    meter: { beats: 6, division: 2, grouping: null },
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
    meter: { beats: 12, division: 2, grouping: null },
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
    meter: { beats: 8, division: 2, grouping: null },
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
    meter: { beats: 16, division: 2, grouping: [3, 3, 2, 3, 3, 2] },
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
    meter: { beats: 10, division: 2, grouping: [3, 2, 2, 3] },
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
    meter: { beats: 5, division: 2, grouping: null },
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
    meter: { beats: 8, division: 2, grouping: null },
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

  // ───────────────────────── 산조·민요 반주 (교재) ─────────────────────────
  // 「한국의 장단 III」 제4장 장구 장단의 리듬보와 부호·구음 표를 사진으로 보고 옮겼다.
  // 표의 한 칸 = 분박 칸 하나. 부호 대응: ⊖ 덩(deong), ○ 궁(kung), ─ 따(deok), ─+작은 '기' 기닥(gideok),
  // ⊗ 떡(tteok, 채편 변죽)·국(guk, 북편 반뮤트), ◎ 구궁(gugung), 卌 따드락(ttadeurak), ⊛(원 안 별표) 변죽 따드락(byeondeurak),
  // ⊕ 드르덩(deureudeong), ······ 더러러러(deoreo). 구음이 기본과 다르면 ':구음'으로 적었다(기덩·구덩은 소리는 덩).
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
          'gugung,-,- guk,-,- guk,-,- guk,-,- deong:구덩,byeondeurak,- byeondeurak,-,byeondeurak',
          'gugung,-,- guk,-,- guk,-,- guk,-,- tteok,-,- -,-,-',
          'gugung,-,- guk,-,- guk,-,- guk,-,- deong:구덩,kung,- gugung,-,kung',
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
      { name: '변형 1', pattern: 'deong:구덩 guk deok guk deok ttadeurak,deok guk kung tteok! guk guk guk' },
      { name: '변형 2', pattern: 'deong:구덩 kung ttadeurak guk deok ttadeurak,deok guk guk tteok guk ttadeurak ttadeurak,deok' },
      { name: '변형 3', pattern: 'gugung kung ttadeurak guk ttadeurak ttadeurak,deok guk guk tteok guk gugung kung' },
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
      { name: '기본', pattern: 'deong:기덩,-,deok gugung,-,deok gugung,kung,tteok! kung,-,kung' },
      { name: '변형 1', pattern: 'deureudeong,kung,ttadeurak gugung,kung,ttadeurak gugung,kung,tteok! kung,-,kung' },
      { name: '변형 2', pattern: 'deong:기덩,-,tteok -,byeondeurak,tteok:따 gugung,kung,tteok! kung,-,kung' },
      { name: '변형 3', pattern: 'deong,kung,- gugung,-,- deong:구덩,-,tteok! guk,-,guk' },
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
      { name: '기본', pattern: 'deong:기덩,-,- deong:기덩,-,- deong:기덩,-,byeondeurak guk,deok,-' },
      { name: '변형 1', pattern: 'deong:더덩,kung,- gugung,kung,- gugung,-,ttadeurak kung,ttadeurak,-' },
      { name: '변형 2', pattern: 'deong:기덩,deong,- deureudeong:드르더,deong,- tteok,-,tteok -,kung,-' },
      { name: '변형 3', pattern: 'deong:기덩,kung,- gugung,-,ttadeurak gugung,-,tteok -,kung,-' },
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
      { name: '변형 2', pattern: 'deong:구덩 kung deok gugung deok ttadeurak,deok' },
      { name: '변형 3', pattern: 'gugung kung ttadeurak gugung tteok kung' },
      { name: '변형 4', pattern: 'deong:구덩 kung tteok kung tteok kung' },
      { name: '변형 5', pattern: 'deong:구덩 deong ttadeurak,deok gugung tteok kung' },
      { name: '변형 6', pattern: 'deok deok ttadeurak,deok gugung tteok kung' },
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
      { name: '변형 4', pattern: 'deong:구덩,-,- kung,-,gideok kung,ttadeurak,-' },
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
      { name: '변형 7', pattern: 'deong,- deong:기덩,deong deok,kung:구,kung,deok kung,gideok,kung,-' },
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
