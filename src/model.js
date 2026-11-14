// 장구 악보 데이터 모델 — 모든 모듈(렌더러, 재생, 편집 UI)이 공유하는 계약.
//
// Score
//   version: 1
//   title, author, memo: string
//   settings: {
//     view: 'vertical' | 'horizontal' | 'staff' | 'combined'
//                                   세로 정간보 / 가로 정간보 / 한 줄 리듬보 / 리듬보+부호·구음 표(교재식)
//     symbolStyle: 'jeongak' | 'minsok'           부호 체계. 정악식(⦶ │ ○ …) / 민속악식(⊖ ─ ○ ⊗ …)
//     gueumStyle: 'banju' | 'samul' | 'minsok'    구음 체계(반주: 덩·덕·쿵 / 사물: 덩·따·궁 / 민속악: 덩·따·궁·떡)
//     showGueum: boolean                          부호 옆(아래)에 구음 병기
//   }
//   sections: Section[]
//
// Section (장·악장 — 같은 장단을 쓰는 구간)
//   id: string
//   name: string                 예: '상령산', '1장'
//   jangdan: string              장단 이름. 예: '도드리'
//   meter: {
//     beats: number              한 장단의 박(정간) 수
//     division: 2 | 3            기본 분박. 3이면 한 박 = 점4분음표, 2이면 4분음표
//     grouping: number[] | null  한 장단 안의 박 묶음(합 = beats). 예: 상령산 [6,4,4,6]
//     slots: number              새 빈 장단을 만들 때 박마다 넣을 분박 칸 수(기본 1). 교재식 표의 고른 격자용
//   }
//   tempo: number                1분당 박 수(기본 박 기준). 재생에 쓰는 값
//   tempoMax: number | null      빠르기 범위의 위쪽 값. 있으면 '≒tempo~tempoMax'로 표시만 한다
//   measures: Measure[]
//
// Measure (한 장단)
//   id: string
//   repeat: number               반복 횟수(1 이상)
//   memo: string (선택)          이 장단 아래에 적는 메모(변형 가락 등). 없으면 ''
//   beats: Beat[]                길이 = meter.beats
//
// Beat (한 박 = 한 정간)
//   units: number | null         이 박의 길이(8분음표 단위). null이면 meter.division을 따름.
//                                엇모리처럼 3+2+3+2 혼합박에만 지정.
//   slots: (Slot | null)[]       분박 칸. 길이는 1,2,3,4,6 중 하나. null = 빈 칸(앞 소리가 이어짐)
//
// Slot
//   t: StrokeId                  STROKES의 키
//   accent: boolean (선택)       강세
//   g: string (선택)             이 칸만의 구음(기본 구음을 덮어씀). 예: ⊗에 '국', ─에 '딱'
//
// Position (선택/재생 위치 주소): { s: 구간, m: 장단, b: 박, i: 분박 칸 } — 모두 0부터.

export const SCORE_VERSION = 1;

export const SLOT_COUNTS = [1, 2, 3, 4, 6];

/** 타법(부호) 정의. gung/chae는 어느 편을 치는지, key는 입력 단축키(KeyboardEvent.code 기준 문자). */
export const STROKES = {
  deong:  { id: 'deong',  label: '덩',       gueum: { banju: '덩',       samul: '덩',       minsok: '덩' },       gung: true,  chae: true,  key: 'd', desc: '합장단 — 북편과 채편을 함께' },
  kung:   { id: 'kung',   label: '쿵',       gueum: { banju: '쿵',       samul: '궁',       minsok: '궁' },       gung: true,  chae: false, key: 'k', desc: '북편' },
  deok:   { id: 'deok',   label: '덕',       gueum: { banju: '덕',       samul: '따',       minsok: '따' },       gung: false, chae: true,  key: 'j', desc: '채편' },
  gideok: { id: 'gideok', label: '기덕',     gueum: { banju: '기덕',     samul: '기닥',     minsok: '기닥' },     gung: false, chae: true,  key: 'g', desc: '겹채 — 채편을 꾸밈음과 함께', grace: 1 },
  deoreo: { id: 'deoreo', label: '더러러러', gueum: { banju: '더러러러', samul: '더르르르', minsok: '더러러러' }, gung: false, chae: true,  key: 'r', desc: '굴림채 — 채를 굴려서', roll: true },
  deo:    { id: 'deo',    label: '더',       gueum: { banju: '더',       samul: '더',       minsok: '더' },       gung: false, chae: true,  key: 'e', desc: '채편을 약하게 찍어서', soft: true },
  rest:   { id: 'rest',   label: '쉼',       gueum: { banju: '',         samul: '',         minsok: '' },         gung: false, chae: false, key: 's', desc: '쉼(소리 없음)' },
  // 아래는 민속악(산조·민요 반주) 교재식 표기에서 쓰는 타법. grace = 앞 꾸밈음 개수, rim = 변죽(채편 가장자리)
  tteok:        { id: 'tteok',        label: '떡',     gueum: { banju: '떡',     samul: '떡',     minsok: '떡' },     gung: false, chae: true,  key: 't', desc: '채편 변죽을 막아 치는 소리(떡·국)', rim: true },
  gugung:       { id: 'gugung',       label: '구궁',   gueum: { banju: '구궁',   samul: '구궁',   minsok: '구궁' },   gung: true,  chae: false, key: 'u', desc: '겹궁 — 북편을 꾸밈음과 함께', grace: 1 },
  ttadeurak:    { id: 'ttadeurak',    label: '따드락', gueum: { banju: '따드락', samul: '따드락', minsok: '따드락' }, gung: false, chae: true,  key: 'f', desc: '채편을 짧게 굴려 치기', grace: 2 },
  byeondeurak:  { id: 'byeondeurak',  label: '변죽 따드락', gueum: { banju: '따드락', samul: '따드락', minsok: '따드락' }, gung: false, chae: true, key: 'v', desc: '채편 변죽을 짧게 굴려 치기', grace: 2, rim: true },
  deureudeong:  { id: 'deureudeong',  label: '드르덩', gueum: { banju: '드르덩', samul: '드르덩', minsok: '드르덩' }, gung: true,  chae: true,  key: 'w', desc: '채를 굴린 뒤 합장단', grace: 2 },
};

export const STROKE_IDS = Object.keys(STROKES);

let idCounter = 0;
export function newId(prefix = 'x') {
  idCounter += 1;
  return `${prefix}${Date.now().toString(36)}${idCounter.toString(36)}`;
}

// ---------- 생성 ----------

export function createBeat(slotCount = 1, units = null) {
  return { units, slots: new Array(slotCount).fill(null) };
}

export function createMeasure(meter) {
  const beats = [];
  for (let b = 0; b < meter.beats; b += 1) beats.push(createBeat(meter.slots ?? 1));
  return { id: newId('m'), repeat: 1, memo: '', beats };
}

export function createSection({ name = '', jangdan = '', meter, tempo = 60, tempoMax = null, measures = null } = {}) {
  const m = { beats: 6, division: 2, grouping: null, slots: 1, ...meter };
  return {
    id: newId('s'),
    name,
    jangdan,
    meter: m,
    tempo,
    tempoMax,
    measures: measures ?? [createMeasure(m)],
  };
}

export function createScore({ title = '제목 없음', author = '', memo = '', sections = null } = {}) {
  return {
    version: SCORE_VERSION,
    title,
    author,
    memo,
    settings: { view: 'vertical', symbolStyle: 'jeongak', gueumStyle: 'banju', showGueum: true },
    sections: sections ?? [createSection({ name: '', jangdan: '도드리', meter: { beats: 6, division: 2 } })],
  };
}

/**
 * 간결한 표기에서 한 장단을 만든다. 박은 공백으로, 분박 칸은 쉼표로 구분.
 * 칸 값: 타법 id, '-'(빈 칸), 뒤에 '!'를 붙이면 강세, ':구음'을 붙이면 그 칸만의 구음(예: tteok:국, deok!:딱).
 * 박 뒤에 '/n'을 붙이면 units 지정.
 * 예: measureFromPattern('deong - gideok kung deoreo -')
 *     measureFromPattern('deong,-,gideok kung,-,deoreo')
 */
export function measureFromPattern(pattern) {
  const beats = pattern.trim().split(/\s+/).map((token) => {
    let units = null;
    let body = token;
    const um = token.match(/^(.*)\/(\d+)$/);
    if (um) { body = um[1]; units = Number(um[2]); }
    const slots = body.split(',').map((raw) => {
      if (raw === '-' || raw === '') return null;
      const [head, g] = raw.split(':');
      const accent = head.endsWith('!');
      const t = accent ? head.slice(0, -1) : head;
      if (!STROKES[t]) throw new Error(`알 수 없는 타법: ${raw}`);
      const slot = { t };
      if (accent) slot.accent = true;
      if (g) slot.g = g;
      return slot;
    });
    return { units, slots };
  });
  return { id: newId('m'), repeat: 1, memo: '', beats };
}

// ---------- 조회 ----------

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getSection(score, pos) { return score.sections[pos.s]; }
export function getMeasure(score, pos) { return score.sections[pos.s]?.measures[pos.m]; }
export function getBeat(score, pos) { return getMeasure(score, pos)?.beats[pos.b]; }
export function getSlot(score, pos) { return getBeat(score, pos)?.slots[pos.i] ?? null; }

/** 박의 길이(8분음표 단위). */
export function beatUnits(section, beat) {
  return beat.units ?? section.meter.division;
}

/** 구음 문자열. 칸에 직접 적은 구음(slot.g)이 있으면 그것, 없으면 타법의 기본 구음. 빈 칸은 ''. */
export function gueumOf(slot, style = 'banju') {
  if (!slot) return '';
  if (slot.g) return slot.g;
  const g = STROKES[slot.t]?.gueum;
  return g?.[style] ?? g?.banju ?? '';
}

/**
 * 구음을 작은 글씨(꾸밈) 부분과 큰 글씨 부분으로 나눈다. 교재식 표기용.
 * 꾸밈음이 있는 타법(grace)은 마지막 글자만 크게: 구궁 → {small:'구', main:'궁'}, 따드락 → {small:'따드', main:'락'}.
 */
export function gueumParts(slot, style = 'banju') {
  const word = gueumOf(slot, style);
  if (!slot || !STROKES[slot.t]?.grace || word.length < 2) return { small: '', main: word };
  return { small: word.slice(0, -1), main: word.slice(-1) };
}

/** 위치가 악보 범위 안에 들도록 보정한다. */
export function clampPos(score, pos) {
  const s = Math.min(Math.max(pos.s, 0), score.sections.length - 1);
  const sec = score.sections[s];
  const m = Math.min(Math.max(pos.m, 0), sec.measures.length - 1);
  const mea = sec.measures[m];
  const b = Math.min(Math.max(pos.b, 0), mea.beats.length - 1);
  const i = Math.min(Math.max(pos.i, 0), mea.beats[b].slots.length - 1);
  return { s, m, b, i };
}

/** 악보의 모든 분박 칸 위치를 연주 순서대로(반복은 펼치지 않고) 나열한다. */
export function allPositions(score) {
  const out = [];
  score.sections.forEach((sec, s) => sec.measures.forEach((mea, m) => mea.beats.forEach((beat, b) => {
    beat.slots.forEach((_, i) => out.push({ s, m, b, i }));
  })));
  return out;
}

export function samePos(a, b) {
  return !!a && !!b && a.s === b.s && a.m === b.m && a.b === b.b && a.i === b.i;
}

/** 연주 순서상 delta칸 이동한 위치(범위를 넘으면 끝에서 멈춤). */
export function movePos(score, pos, delta) {
  const all = allPositions(score);
  const idx = all.findIndex((p) => samePos(p, pos));
  const next = Math.min(Math.max((idx < 0 ? 0 : idx) + delta, 0), all.length - 1);
  return all[next];
}

// ---------- 편집 (score를 직접 수정한다. 실행 취소는 호출 측에서 clone으로 처리) ----------

export function setSlot(score, pos, slot) {
  const beat = getBeat(score, pos);
  if (!beat) return;
  beat.slots[pos.i] = slot ? { ...slot } : null;
}

export function toggleAccent(score, pos) {
  const slot = getSlot(score, pos);
  if (!slot || slot.t === 'rest') return;
  if (slot.accent) delete slot.accent; else slot.accent = true;
}

/** 박의 분박 칸 수를 바꾼다. 기존 내용은 앞에서부터 가능한 만큼 유지. */
export function setBeatSlotCount(score, pos, count) {
  if (!SLOT_COUNTS.includes(count)) throw new Error(`분박 칸 수는 ${SLOT_COUNTS.join(', ')} 중 하나여야 합니다`);
  const beat = getBeat(score, pos);
  if (!beat) return;
  const next = new Array(count).fill(null);
  for (let i = 0; i < Math.min(count, beat.slots.length); i += 1) next[i] = beat.slots[i];
  beat.slots = next;
}

export function insertMeasure(score, s, index, measure = null) {
  const sec = score.sections[s];
  const mea = measure ?? createMeasure(sec.meter);
  sec.measures.splice(index, 0, mea);
  return mea;
}

export function duplicateMeasure(score, s, m) {
  const copy = clone(score.sections[s].measures[m]);
  copy.id = newId('m');
  score.sections[s].measures.splice(m + 1, 0, copy);
  return copy;
}

/** 장단을 같은 구간 안에서 delta(-1 = 앞으로, +1 = 뒤로)만큼 옮긴다. 옮긴 뒤의 장단 번호를 돌려준다(끝이면 그대로). */
export function moveMeasure(score, s, m, delta) {
  const list = score.sections[s].measures;
  const to = m + delta;
  if (m < 0 || m >= list.length || to < 0 || to >= list.length) return m;
  const [mea] = list.splice(m, 1);
  list.splice(to, 0, mea);
  return to;
}

/** 장단 삭제. 구간에 장단이 하나뿐이면 내용만 비운다. */
export function deleteMeasure(score, s, m) {
  const sec = score.sections[s];
  if (sec.measures.length <= 1) {
    sec.measures[0] = createMeasure(sec.meter);
    return;
  }
  sec.measures.splice(m, 1);
}

export function insertSection(score, index, section) {
  score.sections.splice(index, 0, section);
  return section;
}

/** 구간 삭제. 마지막 하나는 지우지 않는다. */
export function deleteSection(score, s) {
  if (score.sections.length <= 1) return false;
  score.sections.splice(s, 1);
  return true;
}

// ---------- 저장 / 불러오기 ----------

export function serialize(score) {
  return JSON.stringify(score, null, 2);
}

/** JSON 문자열을 읽어 검증·보정한 Score를 돌려준다. 잘못된 형식이면 Error. */
export function deserialize(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('JSON 형식이 아닙니다'); }
  return normalizeScore(data);
}

export function normalizeScore(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.sections) || data.sections.length === 0) {
    throw new Error('장구 악보 파일이 아닙니다');
  }
  if (data.version > SCORE_VERSION) throw new Error('더 새로운 버전에서 만든 파일입니다');
  const score = {
    version: SCORE_VERSION,
    title: String(data.title ?? '제목 없음'),
    author: String(data.author ?? ''),
    memo: String(data.memo ?? ''),
    settings: {
      view: ['vertical', 'horizontal', 'staff', 'combined'].includes(data.settings?.view) ? data.settings.view : 'vertical',
      symbolStyle: data.settings?.symbolStyle === 'minsok' ? 'minsok' : 'jeongak',
      gueumStyle: ['samul', 'minsok'].includes(data.settings?.gueumStyle) ? data.settings.gueumStyle : 'banju',
      showGueum: data.settings?.showGueum !== false,
    },
    sections: data.sections.map((sec) => {
      const beats = Math.max(1, Math.floor(Number(sec.meter?.beats) || 0));
      if (!Array.isArray(sec.measures) || sec.measures.length === 0) throw new Error('장단이 없는 구간이 있습니다');
      const grouping = Array.isArray(sec.meter?.grouping)
        && sec.meter.grouping.every((n) => Number.isInteger(n) && n > 0)
        && sec.meter.grouping.reduce((a, n) => a + n, 0) === beats ? [...sec.meter.grouping] : null;
      const meter = { beats, division: sec.meter?.division === 3 ? 3 : 2, grouping, slots: SLOT_COUNTS.includes(sec.meter?.slots) ? sec.meter.slots : 1 };
      const tempo = Math.min(400, Math.max(10, Number(sec.tempo) || 60));
      const tempoMax = Number(sec.tempoMax) > tempo ? Math.min(400, Number(sec.tempoMax)) : null;
      return {
        id: String(sec.id ?? newId('s')),
        name: String(sec.name ?? ''),
        jangdan: String(sec.jangdan ?? ''),
        meter,
        tempo,
        tempoMax,
        measures: sec.measures.map((mea) => {
          if (!Array.isArray(mea.beats) || mea.beats.length !== beats) throw new Error('장단의 박 수가 맞지 않습니다');
          return {
            id: String(mea.id ?? newId('m')),
            repeat: Math.max(1, Math.floor(Number(mea.repeat) || 1)),
            memo: String(mea.memo ?? '').slice(0, 200),
            beats: mea.beats.map((beat) => {
              if (!Array.isArray(beat.slots) || !SLOT_COUNTS.includes(beat.slots.length)) throw new Error('분박 칸 수가 올바르지 않습니다');
              return {
                units: Number.isFinite(beat.units) && beat.units > 0 ? beat.units : null,
                slots: beat.slots.map((slot) => {
                  if (!slot) return null;
                  if (!STROKES[slot.t]) throw new Error(`알 수 없는 타법: ${slot.t}`);
                  const out = { t: slot.t };
                  if (slot.accent && slot.t !== 'rest') out.accent = true;
                  const g = typeof slot.g === 'string' ? slot.g.trim().slice(0, 8) : '';
                  if (g) out.g = g;
                  return out;
                }),
              };
            }),
          };
        }),
      };
    }),
  };
  return score;
}

// ---------- 재생용 시간표 ----------

/**
 * 악보를 시간 순서의 사건 목록으로 펼친다(장단 반복 포함).
 * 반환: {
 *   duration: 전체 길이(초),
 *   strokes: [{ time, dur, t, accent, pos }]   소리 나는 타점(쉼·빈 칸 제외). dur = 다음 타점/쉼까지 길이
 *   slots:   [{ time, dur, pos }]              모든 분박 칸(재생 위치 표시용)
 *   beats:   [{ time, dur, pos, first }]       모든 박(메트로놈용). first = 장단의 첫 박
 * }
 * tempoScale로 전체 빠르기를 조절한다(1 = 원래 빠르기).
 */
export function buildTimeline(score, { tempoScale = 1, from = null } = {}) {
  const strokes = [];
  const slots = [];
  const beats = [];
  let time = 0;
  let started = from === null;
  score.sections.forEach((sec, s) => {
    const unitDur = 60 / (sec.tempo * tempoScale) / sec.meter.division;
    sec.measures.forEach((mea, m) => {
      if (!started && from.s === s && from.m === m) started = true;
      if (!started) return;
      for (let r = 0; r < mea.repeat; r += 1) {
        mea.beats.forEach((beat, b) => {
          const beatDur = beatUnits(sec, beat) * unitDur;
          beats.push({ time, dur: beatDur, pos: { s, m, b, i: 0 }, first: b === 0 });
          const slotDur = beatDur / beat.slots.length;
          beat.slots.forEach((slot, i) => {
            const t0 = time + i * slotDur;
            slots.push({ time: t0, dur: slotDur, pos: { s, m, b, i } });
            if (slot && slot.t !== 'rest') {
              strokes.push({ time: t0, dur: slotDur, t: slot.t, accent: !!slot.accent, pos: { s, m, b, i } });
            } else if (!slot && strokes.length && strokes[strokes.length - 1].time + strokes[strokes.length - 1].dur >= t0 - 1e-9) {
              strokes[strokes.length - 1].dur += slotDur; // 빈 칸은 앞 소리가 이어짐
            }
          });
          time += beatDur;
        });
      }
    });
  });
  return { duration: time, strokes, slots, beats };
}
