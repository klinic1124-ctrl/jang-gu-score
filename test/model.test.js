import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCORE_VERSION, SLOT_COUNTS, STROKES,
  createBeat, createMeasure, createSection, createScore,
  measureFromPattern, clone, getSlot, getBeat, beatUnits, gueumOf, gueumParts,
  clampPos, allPositions, samePos, movePos,
  setSlot, toggleAccent, setBeatSlotCount,
  insertMeasure, duplicateMeasure, moveMeasure, deleteMeasure, insertSection, deleteSection,
  serialize, deserialize, normalizeScore, buildTimeline,
} from '../src/model.js';

const near = (actual, expected, msg) => assert.ok(Math.abs(actual - expected) < 1e-9, `${msg ?? ''} expected ${expected}, got ${actual}`);

/** 한 구간짜리 악보를 패턴 문자열로 만든다. tempo 60, division 2 → 한 박 1초. */
function scoreOf(patterns, { beats, division = 2, tempo = 60, grouping = null } = {}) {
  const list = Array.isArray(patterns) ? patterns : [patterns];
  const measures = list.map((p) => (typeof p === 'string' ? measureFromPattern(p) : p));
  const n = beats ?? measures[0].beats.length;
  return createScore({
    sections: [createSection({ name: 's', meter: { beats: n, division, grouping }, tempo, measures })],
  });
}

describe('measureFromPattern', () => {
  test('박은 공백, 칸은 쉼표로 나눈다', () => {
    const m = measureFromPattern('deong - gideok kung,-,deoreo');
    assert.equal(m.beats.length, 4);
    assert.deepEqual(m.beats[0].slots, [{ t: 'deong' }]);
    assert.deepEqual(m.beats[1].slots, [null]);
    assert.equal(m.beats[3].slots.length, 3);
    assert.deepEqual(m.beats[3].slots, [{ t: 'kung' }, null, { t: 'deoreo' }]);
    assert.equal(m.repeat, 1);
    assert.ok(m.id);
  });

  test('앞뒤 공백과 여러 칸 공백을 허용한다', () => {
    const m = measureFromPattern('  deong   kung \n deok ');
    assert.equal(m.beats.length, 3);
  });

  test('! 는 강세를 붙인다 (accent 키는 true일 때만 존재)', () => {
    const m = measureFromPattern('deok! deok,kung!');
    assert.deepEqual(m.beats[0].slots[0], { t: 'deok', accent: true });
    assert.deepEqual(m.beats[1].slots[0], { t: 'deok' });
    assert.ok(!('accent' in m.beats[1].slots[0]));
    assert.deepEqual(m.beats[1].slots[1], { t: 'kung', accent: true });
  });

  test('/n 은 박의 units를 지정한다', () => {
    const m = measureFromPattern('deong,-,kung/3 deok,-/2 kung');
    assert.equal(m.beats[0].units, 3);
    assert.equal(m.beats[1].units, 2);
    assert.equal(m.beats[2].units, null);
    assert.equal(m.beats[0].slots.length, 3);
  });

  test('/n 과 ! 를 함께 쓸 수 있다', () => {
    const m = measureFromPattern('kung,-,deok!/3');
    assert.equal(m.beats[0].units, 3);
    assert.deepEqual(m.beats[0].slots[2], { t: 'deok', accent: true });
  });

  test('알 수 없는 타법은 오류', () => {
    assert.throws(() => measureFromPattern('deong foo'), /알 수 없는 타법: foo/);
    assert.throws(() => measureFromPattern('deong,bar!'), /알 수 없는 타법: bar!/);
  });

  test('rest 도 타법으로 인정된다', () => {
    const m = measureFromPattern('rest deong');
    assert.deepEqual(m.beats[0].slots, [{ t: 'rest' }]);
  });

  test('호출할 때마다 새 id', () => {
    assert.notEqual(measureFromPattern('deong').id, measureFromPattern('deong').id);
  });
});

describe('생성 함수', () => {
  test('createMeasure는 meter.beats개의 1칸 빈 박을 만든다', () => {
    const m = createMeasure({ beats: 6 });
    assert.equal(m.beats.length, 6);
    assert.ok(m.beats.every((b) => b.slots.length === 1 && b.slots[0] === null && b.units === null));
  });

  test('createSection은 meter 기본값을 채운다', () => {
    const s = createSection({ meter: { beats: 4 } });
    assert.deepEqual(s.meter, { beats: 4, division: 2, grouping: null, slots: 1 });
    assert.equal(s.measures.length, 1);
    assert.equal(s.measures[0].beats.length, 4);
  });

  test('createScore 기본값', () => {
    const sc = createScore();
    assert.equal(sc.version, SCORE_VERSION);
    assert.equal(sc.sections.length, 1);
    assert.deepEqual(sc.settings, { view: 'combined', showGueum: true });
  });

  test('createBeat', () => {
    assert.deepEqual(createBeat(3, 2), { units: 2, slots: [null, null, null] });
  });
});

describe('조회 도우미', () => {
  test('gueumOf: 민속악식 기본 구음, 빈 칸·쉼은 빈 문자열', () => {
    assert.equal(gueumOf({ t: 'kung' }), '궁');
    assert.equal(gueumOf({ t: 'deok' }), '따');
    assert.equal(gueumOf(null), '');
    assert.equal(gueumOf({ t: 'rest' }), '');
  });

  test('beatUnits: units가 있으면 그 값, 없으면 division', () => {
    const sec = createSection({ meter: { beats: 2, division: 3 } });
    assert.equal(beatUnits(sec, { units: null, slots: [null] }), 3);
    assert.equal(beatUnits(sec, { units: 2, slots: [null] }), 2);
  });

  test('getSlot/getBeat는 범위를 벗어나면 null/undefined', () => {
    const sc = scoreOf('deong kung');
    assert.deepEqual(getSlot(sc, { s: 0, m: 0, b: 1, i: 0 }), { t: 'kung' });
    assert.equal(getSlot(sc, { s: 0, m: 0, b: 5, i: 0 }), null);
    assert.equal(getSlot(sc, { s: 3, m: 0, b: 0, i: 0 }), null);
    assert.equal(getBeat(sc, { s: 0, m: 9, b: 0, i: 0 }), undefined);
  });

  test('STROKES 키와 id가 일치하고 SLOT_COUNTS는 1,2,3,4,6', () => {
    for (const [k, v] of Object.entries(STROKES)) assert.equal(v.id, k);
    assert.deepEqual(SLOT_COUNTS, [1, 2, 3, 4, 6]);
  });
});

describe('setSlot / toggleAccent', () => {
  test('setSlot은 복사본을 넣고, null로 지울 수 있다', () => {
    const sc = scoreOf('deong kung');
    const slot = { t: 'deok' };
    setSlot(sc, { s: 0, m: 0, b: 0, i: 0 }, slot);
    slot.t = 'kung';
    assert.equal(sc.sections[0].measures[0].beats[0].slots[0].t, 'deok');
    setSlot(sc, { s: 0, m: 0, b: 0, i: 0 }, null);
    assert.equal(sc.sections[0].measures[0].beats[0].slots[0], null);
  });

  test('범위 밖 위치는 조용히 무시한다', () => {
    const sc = scoreOf('deong');
    assert.doesNotThrow(() => setSlot(sc, { s: 0, m: 0, b: 7, i: 0 }, { t: 'deok' }));
  });

  test('toggleAccent: 켜고 끄기, 빈 칸·쉼은 무시', () => {
    const sc = scoreOf('deong rest -');
    const p = (b) => ({ s: 0, m: 0, b, i: 0 });
    toggleAccent(sc, p(0));
    assert.equal(getSlot(sc, p(0)).accent, true);
    toggleAccent(sc, p(0));
    assert.ok(!('accent' in getSlot(sc, p(0))));
    toggleAccent(sc, p(1));
    assert.ok(!('accent' in getSlot(sc, p(1))));
    toggleAccent(sc, p(2));
    assert.equal(getSlot(sc, p(2)), null);
  });
});

describe('setBeatSlotCount', () => {
  const pos = { s: 0, m: 0, b: 0, i: 0 };

  test('늘리면 뒤에 빈 칸, 기존 내용은 앞에서부터 유지', () => {
    const sc = scoreOf('kung,deok');
    setBeatSlotCount(sc, pos, 4);
    assert.deepEqual(getBeat(sc, pos).slots, [{ t: 'kung' }, { t: 'deok' }, null, null]);
  });

  test('줄이면 뒤쪽이 잘린다', () => {
    const sc = scoreOf('kung,deok,deoreo');
    setBeatSlotCount(sc, pos, 2);
    assert.deepEqual(getBeat(sc, pos).slots, [{ t: 'kung' }, { t: 'deok' }]);
    setBeatSlotCount(sc, pos, 1);
    assert.deepEqual(getBeat(sc, pos).slots, [{ t: 'kung' }]);
  });

  test('허용되지 않는 칸 수(0, 5, 7)는 오류, 내용은 그대로', () => {
    const sc = scoreOf('kung,deok');
    for (const n of [0, 5, 7, -1]) assert.throws(() => setBeatSlotCount(sc, pos, n), /분박 칸 수/);
    assert.equal(getBeat(sc, pos).slots.length, 2);
  });

  test('허용된 칸 수는 모두 가능하다', () => {
    const sc = scoreOf('kung');
    for (const n of SLOT_COUNTS) {
      setBeatSlotCount(sc, pos, n);
      assert.equal(getBeat(sc, pos).slots.length, n);
    }
  });

  test('범위 밖 박은 무시', () => {
    const sc = scoreOf('kung');
    assert.doesNotThrow(() => setBeatSlotCount(sc, { s: 0, m: 0, b: 9, i: 0 }, 3));
  });
});

describe('insert/duplicate/deleteMeasure 경계', () => {
  const lens = (sc) => sc.sections[0].measures.map((m) => m.beats[0].slots[0]?.t);

  test('insertMeasure: 맨 앞, 중간, 맨 끝, 범위 초과', () => {
    const sc = scoreOf(['deong', 'kung']);
    insertMeasure(sc, 0, 0, measureFromPattern('deok'));
    assert.deepEqual(lens(sc), ['deok', 'deong', 'kung']);
    insertMeasure(sc, 0, 2, measureFromPattern('deoreo'));
    assert.deepEqual(lens(sc), ['deok', 'deong', 'deoreo', 'kung']);
    insertMeasure(sc, 0, 4, measureFromPattern('gideok'));
    assert.deepEqual(lens(sc), ['deok', 'deong', 'deoreo', 'kung', 'gideok']);
    insertMeasure(sc, 0, 99, measureFromPattern('deo'));
    assert.equal(sc.sections[0].measures.length, 6);
    assert.equal(lens(sc)[5], 'deo');
  });

  test('insertMeasure: measure를 생략하면 구간 meter의 빈 장단', () => {
    const sc = scoreOf('deong kung deok', { beats: 3 });
    const m = insertMeasure(sc, 0, 1);
    assert.equal(m.beats.length, 3);
    assert.equal(sc.sections[0].measures[1], m);
    assert.ok(m.beats.every((b) => b.slots[0] === null));
  });

  test('duplicateMeasure: 바로 뒤에 깊은 복사, id는 새로', () => {
    const sc = scoreOf(['deong,kung', 'deok,deok']);
    const orig = sc.sections[0].measures[0];
    const copy = duplicateMeasure(sc, 0, 0);
    assert.equal(sc.sections[0].measures.length, 3);
    assert.equal(sc.sections[0].measures[1], copy);
    assert.notEqual(copy.id, orig.id);
    assert.deepEqual(copy.beats, orig.beats);
    copy.beats[0].slots[0].t = 'deoreo';
    assert.equal(orig.beats[0].slots[0].t, 'deong');
  });

  test('duplicateMeasure: 마지막 장단 복제는 맨 끝에 붙는다', () => {
    const sc = scoreOf(['deong', 'kung']);
    duplicateMeasure(sc, 0, 1);
    assert.deepEqual(lens(sc), ['deong', 'kung', 'kung']);
  });

  test('moveMeasure: 가운데 이동은 번호를 돌려주고 repeat·내용이 함께 옮겨진다', () => {
    const sc = scoreOf(['deong', 'kung', 'deok']);
    const mid = sc.sections[0].measures[1];
    mid.repeat = 3;
    assert.equal(moveMeasure(sc, 0, 1, 1), 2);
    assert.deepEqual(lens(sc), ['deong', 'deok', 'kung']);
    assert.equal(sc.sections[0].measures[2], mid);
    assert.equal(sc.sections[0].measures[2].repeat, 3);
    assert.equal(moveMeasure(sc, 0, 2, -1), 1);
    assert.deepEqual(lens(sc), ['deong', 'kung', 'deok']);
    assert.equal(moveMeasure(sc, 0, 1, -1), 0);
    assert.deepEqual(lens(sc), ['kung', 'deong', 'deok']);
  });

  test('moveMeasure: 양 끝에서는 그대로, 다른 구간은 건드리지 않는다', () => {
    const sc = scoreOf(['deong', 'kung']);
    sc.sections.push(createSection({ meter: { beats: 1, division: 2 }, measures: [measureFromPattern('deok')] }));
    assert.equal(moveMeasure(sc, 0, 0, -1), 0);
    assert.equal(moveMeasure(sc, 0, 1, 1), 1);
    assert.equal(moveMeasure(sc, 0, 9, 1), 9);
    assert.deepEqual(lens(sc), ['deong', 'kung']);
    assert.equal(sc.sections[1].measures.length, 1);
  });

  test('deleteMeasure: 중간·처음·끝 삭제', () => {
    const sc = scoreOf(['deong', 'kung', 'deok']);
    deleteMeasure(sc, 0, 1);
    assert.deepEqual(lens(sc), ['deong', 'deok']);
    deleteMeasure(sc, 0, 0);
    assert.deepEqual(lens(sc), ['deok']);
  });

  test('deleteMeasure: 하나뿐이면 내용만 비우고 meter 박 수를 유지', () => {
    const sc = scoreOf('deong kung deok', { beats: 3 });
    const oldId = sc.sections[0].measures[0].id;
    deleteMeasure(sc, 0, 0);
    assert.equal(sc.sections[0].measures.length, 1);
    const m = sc.sections[0].measures[0];
    assert.notEqual(m.id, oldId);
    assert.equal(m.beats.length, 3);
    assert.ok(m.beats.every((b) => b.slots.length === 1 && b.slots[0] === null));
  });

  test('deleteMeasure: 범위 밖 인덱스는 아무것도 지우지 않는다', () => {
    const sc = scoreOf(['deong', 'kung']);
    deleteMeasure(sc, 0, 5);
    assert.equal(sc.sections[0].measures.length, 2);
  });

  test('insertSection / deleteSection: 마지막 하나는 지우지 않는다', () => {
    const sc = scoreOf('deong');
    assert.equal(deleteSection(sc, 0), false);
    assert.equal(sc.sections.length, 1);
    const extra = createSection({ name: 'b', meter: { beats: 2 } });
    insertSection(sc, 1, extra);
    assert.equal(sc.sections[1], extra);
    assert.equal(deleteSection(sc, 0), true);
    assert.equal(sc.sections[0], extra);
  });
});

describe('serialize / deserialize', () => {
  function richScore() {
    const sc = createScore({ title: '왕복', author: '나', memo: '메모' });
    sc.settings = { view: 'staff', showGueum: false };
    sc.sections = [
      createSection({
        name: '엇모리', jangdan: '엇모리', meter: { beats: 4, division: 2, grouping: null }, tempo: 120,
        measures: [measureFromPattern('deong,-,kung/3 deok,-/2 kung,-,deok!/3 kung,deok/2')],
      }),
      createSection({
        name: '진양조', jangdan: '진양조', meter: { beats: 6, division: 3, grouping: [3, 3] }, tempo: 36,
        measures: [measureFromPattern('deong - gideok kung deoreo deok')],
      }),
    ];
    sc.sections[1].measures[0].repeat = 3;
    return sc;
  }

  test('왕복해도 같다', () => {
    const sc = richScore();
    const back = deserialize(serialize(sc));
    assert.deepEqual(back, sc);
  });

  test('왕복 뒤에도 시간표가 같다', () => {
    const sc = richScore();
    assert.deepEqual(buildTimeline(deserialize(serialize(sc))), buildTimeline(sc));
  });

  test('JSON이 아니면 오류', () => {
    assert.throws(() => deserialize('not json'), /JSON 형식이 아닙니다/);
    assert.throws(() => deserialize(''), /JSON 형식이 아닙니다/);
  });

  test('악보 형식이 아니면 오류', () => {
    assert.throws(() => deserialize('null'), /장구 악보 파일이 아닙니다/);
    assert.throws(() => deserialize('42'), /장구 악보 파일이 아닙니다/);
    assert.throws(() => deserialize('{}'), /장구 악보 파일이 아닙니다/);
    assert.throws(() => deserialize('{"sections":[]}'), /장구 악보 파일이 아닙니다/);
    assert.throws(() => deserialize('{"sections":"x"}'), /장구 악보 파일이 아닙니다/);
  });
});

describe('normalizeScore', () => {
  const baseSection = () => ({
    id: 'sec1',
    name: 'a',
    jangdan: 'b',
    meter: { beats: 2, division: 2, grouping: null },
    tempo: 60,
    measures: [{ id: 'm1', repeat: 1, beats: [{ units: null, slots: [{ t: 'deong' }] }, { units: null, slots: [null] }] }],
  });

  test('새 버전 파일은 거부', () => {
    assert.throws(() => normalizeScore({ version: SCORE_VERSION + 1, sections: [baseSection()] }), /더 새로운 버전/);
  });

  test('구간에 장단이 없으면 오류', () => {
    const sec = baseSection();
    sec.measures = [];
    assert.throws(() => normalizeScore({ sections: [sec] }), /장단이 없는 구간/);
    delete sec.measures;
    assert.throws(() => normalizeScore({ sections: [sec] }), /장단이 없는 구간/);
  });

  test('장단의 박 수가 meter와 다르면 오류', () => {
    const sec = baseSection();
    sec.measures[0].beats.pop();
    assert.throws(() => normalizeScore({ sections: [sec] }), /박 수가 맞지 않습니다/);
  });

  test('분박 칸 수가 1,2,3,4,6이 아니면 오류', () => {
    const sec = baseSection();
    sec.measures[0].beats[1].slots = [null, null, null, null, null];
    assert.throws(() => normalizeScore({ sections: [sec] }), /분박 칸 수/);
    sec.measures[0].beats[1].slots = [];
    assert.throws(() => normalizeScore({ sections: [sec] }), /분박 칸 수/);
    sec.measures[0].beats[1].slots = 'x';
    assert.throws(() => normalizeScore({ sections: [sec] }), /분박 칸 수/);
  });

  test('알 수 없는 타법은 오류', () => {
    const sec = baseSection();
    sec.measures[0].beats[0].slots = [{ t: 'nope' }];
    assert.throws(() => normalizeScore({ sections: [sec] }), /알 수 없는 타법: nope/);
  });

  test('누락된 필드는 기본값으로 보정', () => {
    const sc = normalizeScore({ sections: [baseSection()] });
    assert.equal(sc.version, SCORE_VERSION);
    assert.equal(sc.title, '제목 없음');
    assert.equal(sc.author, '');
    assert.equal(sc.memo, '');
    assert.deepEqual(sc.settings, { view: 'combined', showGueum: true });
  });

  test('설정값 보정: 잘못된 view는 기본값(combined), showGueum은 false만 끈다, 옛 symbolStyle·gueumStyle은 버린다', () => {
    const data = { sections: [baseSection()], settings: { view: 'weird', gueumStyle: 'x', symbolStyle: 'minsok', showGueum: 0 } };
    const sc = normalizeScore(data);
    assert.equal(sc.settings.view, 'combined');
    assert.equal(sc.settings.showGueum, true);
    assert.deepEqual(Object.keys(sc.settings).sort(), ['showGueum', 'view']);
    const off = normalizeScore({ sections: [baseSection()], settings: { view: 'horizontal', gueumStyle: 'samul', showGueum: false } });
    assert.deepEqual(off.settings, { view: 'horizontal', showGueum: false });
  });

  test('tempo는 10~400으로 제한, 숫자가 아니면 60', () => {
    const t = (tempo) => { const s = baseSection(); s.tempo = tempo; return normalizeScore({ sections: [s] }).sections[0].tempo; };
    assert.equal(t(5), 10);
    assert.equal(t(1000), 400);
    assert.equal(t(90), 90);
    assert.equal(t('abc'), 60);
    assert.equal(t(undefined), 60);
    assert.equal(t(0), 60);
  });

  test('meter 보정: division은 3만 인정, beats는 정수 1 이상', () => {
    const m = (meter) => { const s = baseSection(); s.meter = meter; s.measures[0].beats = new Array(Math.max(1, Math.floor(Number(meter.beats) || 0))).fill(0).map(() => ({ slots: [null] })); return normalizeScore({ sections: [s] }).sections[0].meter; };
    assert.equal(m({ beats: 2, division: 3 }).division, 3);
    assert.equal(m({ beats: 2, division: 4 }).division, 2);
    assert.equal(m({ beats: 2.9 }).beats, 2);
    assert.equal(m({ beats: 0 }).beats, 1);
  });

  test('grouping은 합이 beats일 때만 유지', () => {
    const g = (grouping) => { const s = baseSection(); s.meter.grouping = grouping; return normalizeScore({ sections: [s] }).sections[0].meter.grouping; };
    assert.deepEqual(g([1, 1]), [1, 1]);
    assert.equal(g([1, 2]), null);
    assert.equal(g(null), null);
    assert.equal(g('1,1'), null);
  });

  test('repeat는 1 이상의 정수로, units는 양수일 때만', () => {
    const sec = baseSection();
    sec.measures[0].repeat = 0;
    sec.measures[0].beats[0].units = -1;
    sec.measures[0].beats[1].units = 2;
    let sc = normalizeScore({ sections: [sec] });
    assert.equal(sc.sections[0].measures[0].repeat, 1);
    assert.equal(sc.sections[0].measures[0].beats[0].units, null);
    assert.equal(sc.sections[0].measures[0].beats[1].units, 2);
    sec.measures[0].repeat = 2.7;
    sc = normalizeScore({ sections: [sec] });
    assert.equal(sc.sections[0].measures[0].repeat, 2);
  });

  test('accent는 true일 때만 남기고 다른 키는 버린다', () => {
    const sec = baseSection();
    sec.measures[0].beats[0].slots = [{ t: 'deong', accent: false, extra: 1 }];
    sec.measures[0].beats[1].slots = [{ t: 'kung', accent: true }];
    const sc = normalizeScore({ sections: [sec] });
    assert.deepEqual(sc.sections[0].measures[0].beats[0].slots[0], { t: 'deong' });
    assert.deepEqual(sc.sections[0].measures[0].beats[1].slots[0], { t: 'kung', accent: true });
  });

  test('id가 없으면 새로 만든다', () => {
    const sec = baseSection();
    delete sec.id;
    delete sec.measures[0].id;
    const sc = normalizeScore({ sections: [sec] });
    assert.ok(sc.sections[0].id);
    assert.ok(sc.sections[0].measures[0].id);
  });

  test('입력 객체를 수정하지 않는다', () => {
    const data = { sections: [baseSection()] };
    const snapshot = JSON.stringify(data);
    normalizeScore(data);
    assert.equal(JSON.stringify(data), snapshot);
  });
});

describe('위치 이동 (movePos / clampPos)', () => {
  // 구간0: 장단 1개(박 2개: 1칸, 2칸), 구간1: 장단 1개(박 1개: 3칸)
  function posScore() {
    const s0 = createSection({ meter: { beats: 2 }, measures: [measureFromPattern('deong deok,kung')] });
    const s1 = createSection({ meter: { beats: 1 }, measures: [measureFromPattern('kung,-,deok')] });
    return createScore({ sections: [s0, s1] });
  }

  test('allPositions는 연주 순서대로 모든 칸을 나열한다', () => {
    const all = allPositions(posScore());
    assert.deepEqual(all, [
      { s: 0, m: 0, b: 0, i: 0 },
      { s: 0, m: 0, b: 1, i: 0 },
      { s: 0, m: 0, b: 1, i: 1 },
      { s: 1, m: 0, b: 0, i: 0 },
      { s: 1, m: 0, b: 0, i: 1 },
      { s: 1, m: 0, b: 0, i: 2 },
    ]);
  });

  test('movePos: 앞뒤 이동, 박·구간 경계 통과', () => {
    const sc = posScore();
    assert.deepEqual(movePos(sc, { s: 0, m: 0, b: 0, i: 0 }, 1), { s: 0, m: 0, b: 1, i: 0 });
    assert.deepEqual(movePos(sc, { s: 0, m: 0, b: 1, i: 1 }, 1), { s: 1, m: 0, b: 0, i: 0 });
    assert.deepEqual(movePos(sc, { s: 1, m: 0, b: 0, i: 0 }, -1), { s: 0, m: 0, b: 1, i: 1 });
    assert.deepEqual(movePos(sc, { s: 0, m: 0, b: 0, i: 0 }, 3), { s: 1, m: 0, b: 0, i: 0 });
    assert.deepEqual(movePos(sc, { s: 0, m: 0, b: 0, i: 0 }, 0), { s: 0, m: 0, b: 0, i: 0 });
  });

  test('movePos: 처음과 끝에서 멈춘다', () => {
    const sc = posScore();
    assert.deepEqual(movePos(sc, { s: 0, m: 0, b: 0, i: 0 }, -5), { s: 0, m: 0, b: 0, i: 0 });
    assert.deepEqual(movePos(sc, { s: 1, m: 0, b: 0, i: 2 }, 1), { s: 1, m: 0, b: 0, i: 2 });
    assert.deepEqual(movePos(sc, { s: 0, m: 0, b: 0, i: 0 }, 999), { s: 1, m: 0, b: 0, i: 2 });
  });

  test('movePos: 목록에 없는 위치는 처음에서 출발한다', () => {
    const sc = posScore();
    assert.deepEqual(movePos(sc, { s: 9, m: 9, b: 9, i: 9 }, 0), { s: 0, m: 0, b: 0, i: 0 });
  });

  test('clampPos: 범위 안으로 보정', () => {
    const sc = posScore();
    assert.deepEqual(clampPos(sc, { s: 0, m: 0, b: 0, i: 0 }), { s: 0, m: 0, b: 0, i: 0 });
    assert.deepEqual(clampPos(sc, { s: -3, m: -1, b: -1, i: -1 }), { s: 0, m: 0, b: 0, i: 0 });
    assert.deepEqual(clampPos(sc, { s: 9, m: 9, b: 9, i: 9 }), { s: 1, m: 0, b: 0, i: 2 });
    // 박이 바뀌면 그 박의 칸 수에 맞춰 i를 보정
    assert.deepEqual(clampPos(sc, { s: 0, m: 0, b: 0, i: 5 }), { s: 0, m: 0, b: 0, i: 0 });
    assert.deepEqual(clampPos(sc, { s: 0, m: 0, b: 1, i: 5 }), { s: 0, m: 0, b: 1, i: 1 });
  });

  test('samePos', () => {
    assert.ok(samePos({ s: 0, m: 1, b: 2, i: 3 }, { s: 0, m: 1, b: 2, i: 3 }));
    assert.ok(!samePos({ s: 0, m: 1, b: 2, i: 3 }, { s: 0, m: 1, b: 2, i: 4 }));
    assert.ok(!samePos(null, { s: 0, m: 0, b: 0, i: 0 }));
    assert.ok(!samePos(undefined, undefined));
  });
});

describe('buildTimeline', () => {
  test('시간 계산: tempo 60, division 2 → 한 박 1초', () => {
    const tl = buildTimeline(scoreOf('deong kung deok'));
    near(tl.duration, 3);
    assert.deepEqual(tl.strokes.map((s) => s.t), ['deong', 'kung', 'deok']);
    near(tl.strokes[0].time, 0); near(tl.strokes[1].time, 1); near(tl.strokes[2].time, 2);
    near(tl.strokes[0].dur, 1);
    assert.deepEqual(tl.strokes[2].pos, { s: 0, m: 0, b: 2, i: 0 });
  });

  test('tempo가 빠르면 짧아진다 (tempo 120 → 한 박 0.5초)', () => {
    const tl = buildTimeline(scoreOf('deong kung', { tempo: 120 }));
    near(tl.duration, 1);
    near(tl.strokes[1].time, 0.5);
  });

  test('분박 칸은 박을 균등 분할한다 (3칸 → 1/3초)', () => {
    const tl = buildTimeline(scoreOf('deong,deok,kung', { division: 3 }));
    near(tl.duration, 1);
    assert.equal(tl.slots.length, 3);
    near(tl.slots[1].time, 1 / 3);
    near(tl.strokes[2].time, 2 / 3);
    near(tl.strokes[2].dur, 1 / 3);
  });

  test('division은 박 길이를 바꾸지 않고 units 기준만 바꾼다 (1박 = division units)', () => {
    near(buildTimeline(scoreOf('deong', { division: 3, tempo: 60 })).duration, 1);
    near(buildTimeline(scoreOf('deong', { division: 2, tempo: 60 })).duration, 1);
  });

  test('빈 칸은 앞 소리를 이어 간다', () => {
    const tl = buildTimeline(scoreOf('deong - - kung'));
    assert.equal(tl.strokes.length, 2);
    near(tl.strokes[0].dur, 3);
    near(tl.strokes[1].time, 3);
    near(tl.strokes[1].dur, 1);
  });

  test('빈 칸 이어짐은 박·칸 경계, 장단 경계를 넘는다', () => {
    const tl = buildTimeline(scoreOf(['deong,- -', '- kung'], { beats: 2 }));
    // deong: 칸 2개(0.5+0.5) + 둘째 박(1) + 다음 장단 첫 박(1) = 3
    near(tl.strokes[0].dur, 3);
    near(tl.strokes[1].time, 3);
  });

  test('악보 맨 앞의 빈 칸은 이어질 소리가 없어 무시', () => {
    const tl = buildTimeline(scoreOf('- deong'));
    assert.equal(tl.strokes.length, 1);
    near(tl.strokes[0].time, 1);
    assert.equal(tl.slots.length, 2);
  });

  test('쉼은 소리가 아니고 앞 소리의 이어짐을 끊는다', () => {
    const tl = buildTimeline(scoreOf('deong rest - kung'));
    assert.deepEqual(tl.strokes.map((s) => s.t), ['deong', 'kung']);
    near(tl.strokes[0].dur, 1);
    near(tl.strokes[1].time, 3);
    assert.equal(tl.slots.length, 4);
  });

  test('강세 표시를 전달한다', () => {
    const tl = buildTimeline(scoreOf('deok! deok'));
    assert.equal(tl.strokes[0].accent, true);
    assert.equal(tl.strokes[1].accent, false);
  });

  test('repeat는 장단을 반복해서 펼친다', () => {
    const m = measureFromPattern('deong kung');
    m.repeat = 3;
    const tl = buildTimeline(scoreOf([m]));
    near(tl.duration, 6);
    assert.equal(tl.strokes.length, 6);
    assert.deepEqual(tl.strokes.map((s) => s.t), ['deong', 'kung', 'deong', 'kung', 'deong', 'kung']);
    // 반복해도 위치 주소는 같다
    assert.deepEqual(tl.strokes[2].pos, tl.strokes[0].pos);
    near(tl.strokes[4].time, 4);
  });

  test('beats: 박마다 하나, 장단 첫 박에 first 표시', () => {
    const tl = buildTimeline(scoreOf(['deong kung', 'deok deok']));
    assert.equal(tl.beats.length, 4);
    assert.deepEqual(tl.beats.map((b) => b.first), [true, false, true, false]);
    near(tl.beats[3].time, 3);
    near(tl.beats[3].dur, 1);
  });

  test('units 혼합박(3+2+3+2): 박 길이가 units에 비례한다', () => {
    // division 2, tempo 60 → unitDur = 0.5초(8분음표). 3+2+3+2 = 10 units = 5초
    const sc = scoreOf('deong,-,kung/3 deok,-/2 kung,-,deok!/3 kung,deok/2', { division: 2 });
    const tl = buildTimeline(sc);
    near(tl.duration, 5);
    assert.deepEqual(tl.beats.map((b) => b.dur), [1.5, 1, 1.5, 1]);
    near(tl.beats[1].time, 1.5);
    near(tl.beats[2].time, 2.5);
    near(tl.beats[3].time, 4);
    // 3칸짜리 박: 한 칸 0.5초
    near(tl.strokes[1].time, 1); // kung (박0 칸2)
    // 2칸짜리 박(units 2, 칸 2개): 한 칸 0.5초
    assert.deepEqual(tl.strokes.map((s) => s.t), ['deong', 'kung', 'deok', 'kung', 'deok', 'kung', 'deok']);
    near(tl.strokes[2].time, 1.5);
    near(tl.strokes[3].time, 2.5);
    near(tl.strokes[4].time, 3.5); // deok! (박2 칸2)
    assert.equal(tl.strokes[4].accent, true);
    near(tl.strokes[5].time, 4);
    near(tl.strokes[6].time, 4.5);
  });

  test('units가 division과 같으면 지정하지 않은 것과 같다', () => {
    const a = buildTimeline(scoreOf('deong/2 kung/2', { division: 2 }));
    const b = buildTimeline(scoreOf('deong kung', { division: 2 }));
    near(a.duration, b.duration);
  });

  test('tempoScale: 1보다 크면 빨라지고 작으면 느려진다', () => {
    const sc = scoreOf('deong kung deok kung');
    near(buildTimeline(sc, { tempoScale: 2 }).duration, 2);
    near(buildTimeline(sc, { tempoScale: 0.5 }).duration, 8);
    near(buildTimeline(sc, { tempoScale: 1 }).duration, 4);
    const tl = buildTimeline(sc, { tempoScale: 2 });
    near(tl.strokes[1].time, 0.5);
  });

  test('구간마다 tempo와 division이 따로 적용된다', () => {
    const s0 = createSection({ meter: { beats: 2, division: 2 }, tempo: 60, measures: [measureFromPattern('deong kung')] });
    const s1 = createSection({ meter: { beats: 2, division: 3 }, tempo: 120, measures: [measureFromPattern('deok,deok,deok kung')] });
    const tl = buildTimeline(createScore({ sections: [s0, s1] }));
    near(tl.duration, 2 + 1);
    near(tl.strokes[2].time, 2);
    near(tl.strokes[3].time, 2 + 1 / 6);
    near(tl.strokes[4].time, 2 + 1 / 3);
    near(tl.strokes[5].time, 2.5);
    assert.deepEqual(tl.strokes[2].pos, { s: 1, m: 0, b: 0, i: 0 });
  });

  test('from: 그 장단부터 시작하고 시간은 0부터', () => {
    const sc = scoreOf(['deong kung', 'deok deoreo', 'gideok deo']);
    const tl = buildTimeline(sc, { from: { s: 0, m: 1, b: 0, i: 0 } });
    assert.deepEqual(tl.strokes.map((s) => s.t), ['deok', 'deoreo', 'gideok', 'deo']);
    near(tl.strokes[0].time, 0);
    near(tl.duration, 4);
    assert.equal(tl.strokes[0].pos.m, 1);
  });

  test('from: 다음 구간의 장단부터', () => {
    const s0 = createSection({ meter: { beats: 2 }, measures: [measureFromPattern('deong kung')] });
    const s1 = createSection({ meter: { beats: 2 }, measures: [measureFromPattern('deok deok'), measureFromPattern('kung kung')] });
    const sc = createScore({ sections: [s0, s1] });
    const tl = buildTimeline(sc, { from: { s: 1, m: 1, b: 0, i: 0 } });
    assert.deepEqual(tl.strokes.map((s) => s.t), ['kung', 'kung']);
    assert.equal(tl.strokes[0].pos.s, 1);
    near(tl.duration, 2);
  });

  test('from이 범위를 벗어나면 빈 시간표', () => {
    const tl = buildTimeline(scoreOf('deong kung'), { from: { s: 5, m: 0, b: 0, i: 0 } });
    assert.equal(tl.strokes.length, 0);
    assert.equal(tl.duration, 0);
  });

  test('from 이전의 빈 칸 이어짐은 가져오지 않는다', () => {
    const sc = scoreOf(['deong -', '- kung']);
    const tl = buildTimeline(sc, { from: { s: 0, m: 1, b: 0, i: 0 } });
    assert.deepEqual(tl.strokes.map((s) => s.t), ['kung']);
    near(tl.strokes[0].time, 1);
  });

  test('slots는 모든 칸을 시간순으로 담는다', () => {
    const tl = buildTimeline(scoreOf('deong,kung deok', { division: 2 }));
    assert.equal(tl.slots.length, 3);
    for (let i = 1; i < tl.slots.length; i += 1) assert.ok(tl.slots[i].time >= tl.slots[i - 1].time);
    near(tl.slots.reduce((a, s) => a + s.dur, 0), tl.duration);
  });

  test('clone은 깊은 복사', () => {
    const sc = scoreOf('deong');
    const c = clone(sc);
    c.sections[0].measures[0].beats[0].slots[0].t = 'kung';
    assert.equal(sc.sections[0].measures[0].beats[0].slots[0].t, 'deong');
  });
});

describe('민속악 확장: 칸별 구음·새 타법·meter.slots·tempoMax', () => {
  const sec = (extra = {}) => ({
    id: 's1',
    name: '',
    jangdan: '자진모리',
    meter: { beats: 1, division: 3, grouping: null },
    tempo: 90,
    measures: [{ id: 'm1', repeat: 1, beats: [{ units: null, slots: [{ t: 'deong' }, null, null] }] }],
    ...extra,
  });

  test('새 타법이 STROKES에 있고 단축키가 겹치지 않는다', () => {
    for (const id of ['tteok', 'gugung', 'ttadeurak', 'byeondeurak', 'deureudeong']) assert.ok(STROKES[id], id);
    const keys = Object.values(STROKES).map((s) => s.key);
    assert.equal(new Set(keys).size, keys.length);
  });

  test('국(guk): 북편 반뮤트 타법, 단축키 q, 떡과 구별', () => {
    assert.ok(STROKES.guk.gung && !STROKES.guk.chae && STROKES.guk.mute);
    assert.equal(STROKES.guk.key, 'q');
    assert.equal(gueumOf({ t: 'guk' }), '국');
    assert.ok(!STROKES.tteok.mute && STROKES.tteok.chae);
  });

  test('normalizeScore: 옛 파일의 tteok/kung + g:"국" 은 guk으로(강세 유지), 일반 떡은 그대로', () => {
    const s = sec();
    s.meter.beats = 1;
    s.measures[0].beats = [{ units: null, slots: [{ t: 'tteok', g: '국', accent: true }, { t: 'kung', g: ' 국 ' }, { t: 'tteok' }, { t: 'tteok', g: '따' }] }];
    const out = normalizeScore({ sections: [s] }).sections[0].measures[0].beats[0].slots;
    assert.deepEqual(out[0], { t: 'guk', accent: true });
    assert.deepEqual(out[1], { t: 'guk' });
    assert.deepEqual(out[2], { t: 'tteok' });
    assert.deepEqual(out[3], { t: 'tteok', g: '따' });
  });

  test('패턴의 :구음 은 slot.g, !:구음 은 강세와 구음을 함께', () => {
    const m = measureFromPattern('tteok:따 deok!:딱,deong:기덩 kung!');
    assert.deepEqual(m.beats[0].slots[0], { t: 'tteok', g: '따' });
    assert.deepEqual(m.beats[1].slots[0], { t: 'deok', accent: true, g: '딱' });
    assert.deepEqual(m.beats[1].slots[1], { t: 'deong', g: '기덩' });
    assert.deepEqual(m.beats[2].slots[0], { t: 'kung', accent: true });
    assert.ok(!('g' in m.beats[2].slots[0]));
  });

  test('패턴의 :구음 과 /n units를 함께 쓸 수 있다', () => {
    const m = measureFromPattern('kung,-,gugung:구구궁/3');
    assert.equal(m.beats[0].units, 3);
    assert.deepEqual(m.beats[0].slots[2], { t: 'gugung', g: '구구궁' });
  });

  test('패턴에서 :구음 앞의 타법이 틀리면 오류', () => {
    assert.throws(() => measureFromPattern('nope:국'), /알 수 없는 타법/);
  });

  test('gueumOf: slot.g가 기본 구음보다 우선', () => {
    assert.equal(gueumOf({ t: 'tteok', g: '따' }), '따');
    assert.equal(gueumOf({ t: 'guk' }), '국');
    assert.equal(gueumOf({ t: 'deok', g: '딱' }), '딱');
    assert.equal(gueumOf({ t: 'tteok' }), '떡');
  });

  test('gueumOf: 민속악식 기본 구음', () => {
    assert.equal(gueumOf({ t: 'deok' }), '따');
    assert.equal(gueumOf({ t: 'kung' }), '궁');
    assert.equal(gueumOf({ t: 'gideok' }), '기닥');
    assert.equal(gueumOf({ t: 'deong' }), '덩');
    assert.equal(gueumOf({ t: 'gudeong' }), '구덩');
    assert.equal(gueumOf({ t: 'ttadeurak' }), '드르닥');
    assert.equal(gueumOf({ t: 'byeondeurak' }), '드르닥');
    assert.equal(gueumOf({ t: 'deureudaktta' }), '드르닥따');
    assert.equal(gueumOf({ t: 'gugung' }), '구궁');
  });

  test('STROKES: 구음은 문자열, 라벨도 민속악식, 단축키는 겹치지 않는다', () => {
    for (const def of Object.values(STROKES)) assert.equal(typeof def.gueum, 'string', def.id);
    assert.equal(STROKES.deok.label, '따');
    assert.equal(STROKES.kung.label, '궁');
    assert.equal(STROKES.gideok.label, '기닥');
    assert.equal(STROKES.ttadeurak.label, '드르닥');
  });

  test('새 타법 gudeong·deureudaktta: 존재, 플래그, 단축키 유일', () => {
    const g = STROKES.gudeong;
    assert.ok(g.gung && g.chae);
    assert.equal(g.grace, 1);
    assert.equal(g.small, 1);
    assert.ok(!g.tail);
    const d = STROKES.deureudaktta;
    assert.ok(!d.gung && d.chae && !d.rim);
    assert.equal(d.grace, 2);
    assert.equal(d.small, 2);
    assert.equal(d.tail, 1);
    const keys = Object.values(STROKES).map((x) => x.key);
    assert.equal(new Set(keys).size, keys.length);
    assert.equal(keys.filter((k) => k === g.key).length, 1);
    assert.equal(keys.filter((k) => k === d.key).length, 1);
    assert.equal(Object.keys(STROKES).length, 15);
  });

  test('gueumParts: 기본 구음은 타법의 small 글자 수만큼 작게', () => {
    assert.deepEqual(gueumParts({ t: 'gugung' }), { small: '구', main: '궁' });
    assert.deepEqual(gueumParts({ t: 'gideok' }), { small: '기', main: '닥' });
    assert.deepEqual(gueumParts({ t: 'ttadeurak' }), { small: '드르', main: '닥' });
    assert.deepEqual(gueumParts({ t: 'byeondeurak' }), { small: '드르', main: '닥' });
    assert.deepEqual(gueumParts({ t: 'deureudaktta' }), { small: '드르', main: '닥따' });
    assert.deepEqual(gueumParts({ t: 'gudeong' }), { small: '구', main: '덩' });
    assert.deepEqual(gueumParts({ t: 'deureudeong' }), { small: '드르', main: '덩' });
  });

  test('gueumParts: 덮어쓴 구음 — 글자 수가 같으면 같은 자리, 다르면 마지막 글자만 크게', () => {
    assert.deepEqual(gueumParts({ t: 'gideok', g: '기떡' }), { small: '기', main: '떡' });
    assert.deepEqual(gueumParts({ t: 'ttadeurak', g: '따드닥' }), { small: '따드', main: '닥' });
    assert.deepEqual(gueumParts({ t: 'gugung', g: '구구궁' }), { small: '구구', main: '궁' });
    assert.deepEqual(gueumParts({ t: 'deureudaktta', g: '드르딱' }), { small: '드르', main: '딱' });
    assert.deepEqual(gueumParts({ t: 'gudeong', g: '기덩덩' }), { small: '기덩', main: '덩' });
  });

  test('gueumParts: small이 없는 타법은 여러 글자여도 나누지 않는다', () => {
    assert.deepEqual(gueumParts({ t: 'deoreo' }), { small: '', main: '더러러러' });
    assert.deepEqual(gueumParts({ t: 'deong', g: '기덩' }), { small: '', main: '기덩' });
  });

  test('gueumParts: 한 글자 구음과 빈 칸', () => {
    assert.deepEqual(gueumParts({ t: 'gugung', g: '궁' }), { small: '', main: '궁' });
    assert.deepEqual(gueumParts({ t: 'kung' }), { small: '', main: '궁' });
    assert.deepEqual(gueumParts(null), { small: '', main: '' });
    assert.deepEqual(gueumParts({ t: 'rest' }), { small: '', main: '' });
  });

  test('createMeasure: meter.slots만큼 칸을 둔 빈 박', () => {
    const m = createMeasure({ beats: 4, slots: 3 });
    assert.equal(m.beats.length, 4);
    assert.ok(m.beats.every((b) => b.slots.length === 3 && b.slots.every((x) => x === null)));
    assert.equal(m.memo, '');
    assert.ok(createMeasure({ beats: 2 }).beats.every((b) => b.slots.length === 1));
  });

  test('createSection: slots를 지정하면 첫 장단도 그 칸 수, tempoMax 기본 null', () => {
    const s = createSection({ meter: { beats: 3, division: 3, slots: 3 } });
    assert.ok(s.measures[0].beats.every((b) => b.slots.length === 3));
    assert.equal(s.tempoMax, null);
    assert.equal(createSection({ meter: { beats: 2 }, tempo: 80, tempoMax: 120 }).tempoMax, 120);
  });

  test('normalizeScore: view 유지, 옛 symbolStyle·gueumStyle은 버린다', () => {
    const sc = normalizeScore({ sections: [sec()], settings: { view: 'combined', gueumStyle: 'minsok', symbolStyle: 'minsok' } });
    assert.deepEqual(sc.settings, { view: 'combined', showGueum: true });
    assert.equal(normalizeScore({ sections: [sec()], settings: { view: 'staff' } }).settings.view, 'staff');
    assert.equal(normalizeScore({ sections: [sec()], settings: { view: 'vertical' } }).settings.view, 'vertical');
    assert.equal(normalizeScore({ sections: [sec()] }).settings.view, 'combined');
  });

  test('normalizeScore 옛 파일 변환: deong + g 구덩/기덩 → gudeong(강세 유지)', () => {
    const s = sec();
    s.measures[0].beats = [{ units: null, slots: [{ t: 'deong', g: '구덩', accent: true }, { t: 'deong', g: ' 기덩 ' }, { t: 'deong', g: '더덩' }] }];
    const out = normalizeScore({ sections: [s] }).sections[0].measures[0].beats[0].slots;
    assert.deepEqual(out[0], { t: 'gudeong', accent: true });
    assert.deepEqual(out[1], { t: 'gudeong' });
    assert.deepEqual(out[2], { t: 'deong', g: '더덩' });
  });

  test('normalizeScore 옛 파일 변환: ttadeurak·byeondeurak + g 따드락 → g 제거(기본 구음이 드르닥)', () => {
    const s = sec();
    s.measures[0].beats = [{ units: null, slots: [{ t: 'ttadeurak', g: '따드락' }, { t: 'byeondeurak', g: '따드락', accent: true }, { t: 'ttadeurak', g: '따드닥' }] }];
    const out = normalizeScore({ sections: [s] }).sections[0].measures[0].beats[0].slots;
    assert.deepEqual(out[0], { t: 'ttadeurak' });
    assert.deepEqual(out[1], { t: 'byeondeurak', accent: true });
    assert.deepEqual(out[2], { t: 'ttadeurak', g: '따드닥' });
  });

  test('normalizeScore 옛 파일 변환: 기본 구음과 같은 g는 제거, 다르면 유지', () => {
    const s = sec();
    s.measures[0].beats = [{ units: null, slots: [{ t: 'kung', g: '궁' }, { t: 'deok', g: '따' }, { t: 'gideok', g: '기닥' }, { t: 'deok', g: '딱' }] }];
    const out = normalizeScore({ sections: [s] }).sections[0].measures[0].beats[0].slots;
    assert.deepEqual(out[0], { t: 'kung' });
    assert.deepEqual(out[1], { t: 'deok' });
    assert.deepEqual(out[2], { t: 'gideok' });
    assert.deepEqual(out[3], { t: 'deok', g: '딱' });
  });

  test('normalizeScore: 새 타법 gudeong·deureudaktta는 그대로 읽힌다', () => {
    const s = sec();
    s.measures[0].beats = [{ units: null, slots: [{ t: 'gudeong', accent: true }, { t: 'deureudaktta' }, { t: 'deureudaktta', g: '드르닥딱' }] }];
    const out = normalizeScore({ sections: [s] }).sections[0].measures[0].beats[0].slots;
    assert.deepEqual(out[0], { t: 'gudeong', accent: true });
    assert.deepEqual(out[1], { t: 'deureudaktta' });
    assert.deepEqual(out[2], { t: 'deureudaktta', g: '드르닥딱' });
  });

  test('옛 banju 스타일로 저장된 파일이 오류 없이 열린다(view 유지, 옛 설정 버림, 구음 변환)', () => {
    const old = {
      version: 1, title: '옛 파일',
      settings: { view: 'vertical', symbolStyle: 'jeongak', gueumStyle: 'banju', showGueum: true },
      sections: [{
        id: 's1', name: '', jangdan: '자진모리',
        meter: { beats: 6, division: 2, grouping: null },
        tempo: 80,
        measures: [{
          id: 'm1', repeat: 1,
          beats: ['deong', 'kung', 'deok', 'gideok', 'deoreo', 'deong'].map((t, i) => ({ units: null, slots: [i === 5 ? { t, g: '구덩', accent: true } : { t }] })),
        }],
      }],
    };
    const sc = deserialize(JSON.stringify(old));
    assert.deepEqual(sc.settings, { view: 'vertical', showGueum: true });
    const slots = sc.sections[0].measures[0].beats.map((b) => b.slots[0]);
    assert.deepEqual(slots.map((x) => x.t), ['deong', 'kung', 'deok', 'gideok', 'deoreo', 'gudeong']);
    assert.equal(slots[5].accent, true);
    assert.deepEqual(slots.map((x) => gueumOf(x)), ['덩', '궁', '따', '기닥', '더러러러', '구덩']);
    assert.ok(buildTimeline(sc).strokes.length === 6);
  });

  test('normalizeScore: slot.g는 앞뒤 공백 제거·8자 제한, 빈 값·문자열 아님은 버린다', () => {
    const s = sec();
    s.measures[0].beats[0].slots = [
      { t: 'tteok', g: '  따 ' },
      { t: 'deok', g: '가나다라마바사아자차' },
      { t: 'kung', g: '   ' },
    ];
    s.measures[0].beats.push({ units: null, slots: [{ t: 'deong', g: 5 }] });
    s.meter.beats = 2;
    const out = normalizeScore({ sections: [s] }).sections[0].measures[0].beats;
    assert.deepEqual(out[0].slots[0], { t: 'tteok', g: '따' });
    assert.equal(out[0].slots[1].g, '가나다라마바사아');
    assert.equal(out[0].slots[1].g.length, 8);
    assert.deepEqual(out[0].slots[2], { t: 'kung' });
    assert.deepEqual(out[1].slots[0], { t: 'deong' });
  });

  test('normalizeScore: 쉼에는 강세를 남기지 않지만 구음은 남긴다', () => {
    const s = sec();
    s.measures[0].beats[0].slots = [{ t: 'rest', accent: true, g: '쉬' }, null, null];
    assert.deepEqual(normalizeScore({ sections: [s] }).sections[0].measures[0].beats[0].slots[0], { t: 'rest', g: '쉬' });
  });

  test('normalizeScore: measure.memo는 문자열로, 200자 제한, 없으면 빈 문자열', () => {
    const s = sec();
    s.measures.push({ id: 'm2', repeat: 1, memo: 'x'.repeat(300), beats: [{ units: null, slots: [null] }] });
    s.measures.push({ id: 'm3', repeat: 1, memo: 42, beats: [{ units: null, slots: [null] }] });
    const ms = normalizeScore({ sections: [s] }).sections[0].measures;
    assert.equal(ms[0].memo, '');
    assert.equal(ms[1].memo.length, 200);
    assert.equal(ms[2].memo, '42');
  });

  test('normalizeScore: tempoMax는 tempo보다 클 때만, 400 제한', () => {
    const t = (tempo, tempoMax) => normalizeScore({ sections: [sec({ tempo, tempoMax })] }).sections[0].tempoMax;
    assert.equal(t(90, 120), 120);
    assert.equal(t(90, 90), null);
    assert.equal(t(90, 60), null);
    assert.equal(t(90, 'x'), null);
    assert.equal(t(90, undefined), null);
    assert.equal(t(90, 999), 400);
  });

  test('normalizeScore: meter.slots는 SLOT_COUNTS 중 하나만, 아니면 1', () => {
    const slots = (v) => normalizeScore({ sections: [sec({ meter: { beats: 1, division: 3, grouping: null, slots: v } })] }).sections[0].meter.slots;
    assert.equal(slots(3), 3);
    assert.equal(slots(6), 6);
    assert.equal(slots(5), 1);
    assert.equal(slots('3'), 1);
    assert.equal(slots(undefined), 1);
  });

  test('setSlot은 g(구음)를 보존하고 복사본을 넣는다', () => {
    const sc = createScore({ sections: [createSection({ meter: { beats: 1, slots: 2 } })] });
    const slot = { t: 'tteok', g: '따', accent: true };
    setSlot(sc, { s: 0, m: 0, b: 0, i: 1 }, slot);
    const got = getSlot(sc, { s: 0, m: 0, b: 0, i: 1 });
    assert.deepEqual(got, { t: 'tteok', g: '따', accent: true });
    assert.notEqual(got, slot);
    slot.g = '떡';
    assert.equal(got.g, '따');
  });

  test('slot.g·memo·tempoMax·meter.slots가 직렬화 왕복에서 유지된다', () => {
    const s = createSection({ meter: { beats: 2, division: 3, slots: 3 }, tempo: 80, tempoMax: 120, measures: [measureFromPattern('guk,-,deok!:딱 kung,-,-')] });
    s.measures[0].memo = '맺는 가락';
    const back = deserialize(serialize(createScore({ sections: [s] })));
    const b = back.sections[0];
    assert.equal(b.tempoMax, 120);
    assert.equal(b.meter.slots, 3);
    assert.equal(b.measures[0].memo, '맺는 가락');
    assert.deepEqual(b.measures[0].beats[0].slots[2], { t: 'deok', accent: true, g: '딱' });
  });
});
