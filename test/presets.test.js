import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, getPreset, sectionFromPreset, measureFromPreset } from '../src/presets.js';
import { measureFromPattern, SLOT_COUNTS, STROKES, normalizeScore, createScore, createMeasure, buildTimeline } from '../src/model.js';

const CATEGORIES = ['정악', '민속악', '산조·민요 반주'];
const GOBEOP = PRESETS.filter((p) => p.category === '산조·민요 반주');

describe('PRESETS 데이터', () => {
  test('프리셋이 있고 id가 유일하다', () => {
    assert.ok(PRESETS.length >= 10);
    const ids = PRESETS.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  test('필수 장단이 들어 있다', () => {
    const need = [
      'sangnyeongsan', 'seryeongsan', 'dodeuri', 'taryeong',
      'jinyangjo', 'jungmori', 'jungjungmori', 'jajinmori', 'hwimori', 'gutgeori', 'semachi', 'eotmori', 'eotjungmori',
    ];
    for (const id of need) assert.ok(getPreset(id), `${id} 없음`);
  });

  for (const p of PRESETS) {
    describe(`${p.id} (${p.name})`, () => {
      test('메타데이터 형식', () => {
        assert.ok(p.name);
        assert.ok(CATEGORIES.includes(p.category), p.category);
        if (p.meter.slots !== undefined) assert.ok(SLOT_COUNTS.includes(p.meter.slots), `meter.slots ${p.meter.slots}`);
        assert.ok(Number.isInteger(p.meter.beats) && p.meter.beats >= 1);
        assert.ok([2, 3].includes(p.meter.division));
        assert.ok(Number.isFinite(p.tempo) && p.tempo >= 10 && p.tempo <= 400);
        if (p.tempoRange !== null) {
          assert.equal(p.tempoRange.length, 2);
          assert.ok(p.tempoRange[0] < p.tempoRange[1]);
          assert.ok(p.tempo >= p.tempoRange[0] && p.tempo <= p.tempoRange[1], '기본 tempo가 범위 안');
        }
        assert.equal(typeof p.verified, 'boolean');
        assert.ok(p.source && p.source.length > 0);
        assert.ok(p.variants.length >= 1);
      });

      test('grouping의 합이 beats와 같다(있다면)', () => {
        if (p.meter.grouping === null) return;
        assert.ok(Array.isArray(p.meter.grouping));
        assert.ok(p.meter.grouping.every((n) => Number.isInteger(n) && n > 0));
        assert.equal(p.meter.grouping.reduce((a, n) => a + n, 0), p.meter.beats);
      });

      p.variants.forEach((v, idx) => {
        test(`variant ${idx} (${v.name}): 파싱되고 박 수가 meter.beats와 같다`, () => {
          assert.ok(v.name);
          const m = measureFromPattern(v.pattern);
          assert.equal(m.beats.length, p.meter.beats);
          for (const beat of m.beats) {
            assert.ok(SLOT_COUNTS.includes(beat.slots.length), `칸 수 ${beat.slots.length}`);
            for (const slot of beat.slots) if (slot) assert.ok(STROKES[slot.t]);
          }
        });

        test(`variant ${idx} (${v.name}): 소리가 하나 이상 있고 첫 칸은 비어 있지 않다`, () => {
          const m = measureFromPattern(v.pattern);
          assert.ok(m.beats[0].slots[0], '장단은 첫 칸에서 시작');
          assert.ok(m.beats.some((b) => b.slots.some((s) => s && s.t !== 'rest')));
        });
      });

      test('units를 쓰면 박 수와 무관하게 양의 정수', () => {
        for (const v of p.variants) {
          for (const beat of measureFromPattern(v.pattern).beats) {
            if (beat.units !== null) assert.ok(Number.isInteger(beat.units) && beat.units > 0);
          }
        }
      });
    });
  }

  test('교재 장단(산조·민요 반주)이 모두 들어 있다', () => {
    const need = ['jinyangjo', 'jungmori', 'jungjungmori', 'jajinmori', 'hwimori', 'eotmori', 'eotjungmori', 'semachi', 'dongsalpuri'];
    for (const n of need) {
      const p = getPreset(`gobeop-${n}`);
      assert.ok(p, `gobeop-${n} 없음`);
      assert.equal(p.category, '산조·민요 반주');
    }
    assert.equal(GOBEOP.length, need.length);
  });

  for (const p of GOBEOP) {
    describe(`${p.id} 교재 규칙`, () => {
      test('id 접두어·출처·이름', () => {
        assert.match(p.id, /^gobeop-/);
        assert.match(p.source, /「한국의 장단 III」 제4장 장구 장단, \d+쪽/);
        assert.ok(!p.name.includes('교재'));
      });

      test('meter.slots가 있고 SLOT_COUNTS 중 하나', () => {
        assert.ok(SLOT_COUNTS.includes(p.meter.slots));
      });

      test('박마다 칸 수가 SLOT_COUNTS 중 하나이고, units가 없는 박은 meter.slots의 배수(고른 격자)', () => {
        p.variants.forEach((v) => {
          for (const beat of measureFromPattern(v.pattern).beats) {
            assert.ok(SLOT_COUNTS.includes(beat.slots.length), `${v.name}: ${beat.slots.length}칸`);
            if (beat.units === null) assert.equal(beat.slots.length % p.meter.slots, 0, `${v.name}: ${beat.slots.length}칸`);
          }
        });
      });

      test('variant 이름이 겹치지 않고 첫 variant는 기본', () => {
        assert.equal(p.variants[0].name, '기본');
        assert.equal(new Set(p.variants.map((v) => v.name)).size, p.variants.length);
      });
    });
  }

  test('교재 진양조는 4각 24박 한 장단, 3분박 3칸', () => {
    const p = getPreset('gobeop-jinyangjo');
    const m = measureFromPreset('gobeop-jinyangjo');
    assert.equal(m.beats.length, 24);
    assert.deepEqual(p.meter.grouping, [6, 6, 6, 6]);
    assert.ok(m.beats.every((b) => b.slots.length === 3));
    assert.deepEqual(m.beats[1].slots[0], { t: 'tteok', g: '국' });
  });

  test('교재 엇모리는 3+2+3+2 혼합박이고 박 칸 수가 units를 따른다(16분 박만 6칸)', () => {
    getPreset('gobeop-eotmori').variants.forEach((_, i) => {
      const m = measureFromPreset('gobeop-eotmori', i);
      assert.deepEqual(m.beats.map((b) => b.units), [3, 2, 3, 2]);
      m.beats.forEach((b) => assert.ok(b.slots.length === b.units || b.slots.length === b.units * 2));
    });
  });

  test('교재 세마치 맺음가락 이름과 칸별 구음', () => {
    const p = getPreset('gobeop-semachi');
    assert.ok(p.variants.some((v) => v.name.includes('한오백년, 농부가 등의 맺음가락')));
    const m = measureFromPreset('gobeop-semachi', p.variants.length - 1);
    assert.deepEqual(m.beats[1].slots[2], { t: 'tteok', g: '기떡' });
  });

  test('엇모리는 3+2+3+2 혼합박(units)을 쓴다', () => {
    const m = measureFromPreset('eotmori');
    assert.deepEqual(m.beats.map((b) => b.units), [3, 2, 3, 2]);
  });

  test('굿거리 기본형은 통일안 구음(덩 기덕 쿵 더러러러 쿵 기덕 쿵 더러러러)을 따른다', () => {
    const m = measureFromPreset('gutgeori');
    const strokes = m.beats.flatMap((b) => b.slots.filter(Boolean).map((s) => s.t));
    assert.deepEqual(strokes, ['deong', 'gideok', 'kung', 'deoreo', 'kung', 'gideok', 'kung', 'deoreo']);
    assert.equal(m.beats[2].slots[2].accent, true);
  });

  test('상령산은 첫 박 덩, 제7박 기덕, 제11박 쿵, 제15박 더러러러 (6·4·4·6)', () => {
    const m = measureFromPreset('sangnyeongsan');
    const at = (n) => m.beats[n - 1].slots[0]?.t ?? null;
    assert.equal(at(1), 'deong');
    assert.equal(at(7), 'gideok');
    assert.equal(at(11), 'kung');
    assert.equal(at(15), 'deoreo');
    assert.equal(m.beats.filter((b) => b.slots[0]).length, 4);
  });
});

describe('getPreset', () => {
  test('id로 찾고, 없으면 null', () => {
    assert.equal(getPreset('dodeuri').name, '도드리');
    assert.equal(getPreset('nope'), null);
  });
});

describe('measureFromPreset', () => {
  test('호출마다 새 Measure(id가 다르고 서로 독립)', () => {
    const a = measureFromPreset('dodeuri');
    const b = measureFromPreset('dodeuri');
    assert.notEqual(a.id, b.id);
    a.beats[0].slots[0].t = 'kung';
    assert.equal(b.beats[0].slots[0].t, 'deong');
  });

  test('variant 번호 선택', () => {
    const base = measureFromPreset('gutgeori', 0);
    const alt = measureFromPreset('gutgeori', 1);
    assert.equal(base.beats[0].slots[0].t, 'deong');
    assert.equal(alt.beats[0].slots[0].t, 'kung');
  });

  test('없는 프리셋·변형은 오류', () => {
    assert.throws(() => measureFromPreset('nope'), /알 수 없는 장단 프리셋/);
    assert.throws(() => measureFromPreset('dodeuri', 99), /변형이 없습니다/);
    assert.throws(() => measureFromPreset('dodeuri', -1), /변형이 없습니다/);
  });
});

describe('sectionFromPreset', () => {
  test('기본값: 장단 1개, 이름은 비우고 jangdan에 프리셋 이름', () => {
    const s = sectionFromPreset('jungmori');
    assert.equal(s.name, '');
    assert.equal(s.jangdan, '중모리');
    assert.equal(s.measures.length, 1);
    assert.equal(s.meter.beats, 12);
    assert.equal(s.tempo, getPreset('jungmori').tempo);
    assert.ok(s.id);
  });

  test('measures 개수와 name 옵션', () => {
    const s = sectionFromPreset('semachi', { measures: 4, name: '1장' });
    assert.equal(s.name, '1장');
    assert.equal(s.measures.length, 4);
    assert.equal(new Set(s.measures.map((m) => m.id)).size, 4);
    assert.ok(s.measures.every((m) => m.beats.length === 3));
  });

  test('measures가 0 이하이거나 잘못된 값이면 1개', () => {
    assert.equal(sectionFromPreset('semachi', { measures: 0 }).measures.length, 1);
    assert.equal(sectionFromPreset('semachi', { measures: -3 }).measures.length, 1);
    assert.equal(sectionFromPreset('semachi', { measures: NaN }).measures.length, 1);
  });

  test('variant 옵션이 장단 내용에 반영된다', () => {
    const s = sectionFromPreset('gutgeori', { variant: 2, measures: 2 });
    for (const m of s.measures) assert.equal(m.beats[1].slots[0].t, 'deok');
  });

  test('meter가 복사본이라 프리셋을 오염시키지 않는다', () => {
    const s = sectionFromPreset('sangnyeongsan');
    s.meter.grouping.push(99);
    s.meter.beats = 1;
    assert.deepEqual(getPreset('sangnyeongsan').meter.grouping, [6, 4, 4, 6]);
    assert.equal(getPreset('sangnyeongsan').meter.beats, 20);
  });

  test('없는 프리셋은 오류', () => {
    assert.throws(() => sectionFromPreset('nope'), /알 수 없는 장단 프리셋/);
  });

  test('tempoMax = tempoRange[1], 범위가 없으면 null', () => {
    assert.equal(sectionFromPreset('jungmori').tempoMax, 108);
    assert.equal(sectionFromPreset('gobeop-hwimori').tempoMax, 160);
    assert.equal(sectionFromPreset('dodeuri').tempoMax, null);
  });

  test('meter.slots: 프리셋 값, 없으면 1. 새 빈 장단도 그 칸 수', () => {
    assert.equal(sectionFromPreset('gobeop-jajinmori').meter.slots, 3);
    assert.equal(sectionFromPreset('gobeop-hwimori').meter.slots, 2);
    assert.equal(sectionFromPreset('dodeuri').meter.slots, 1);
    const s = sectionFromPreset('gobeop-semachi');
    assert.ok(createMeasure(s.meter).beats.every((b) => b.slots.length === 3));
  });

  test('칸별 구음(slot.g)과 tempoMax가 정규화 왕복 뒤에도 남는다', () => {
    const s = sectionFromPreset('gobeop-jinyangjo');
    const back = normalizeScore(JSON.parse(JSON.stringify(createScore({ sections: [s] }))));
    assert.equal(back.sections[0].tempoMax, null);
    assert.equal(back.sections[0].measures[0].beats[1].slots[0].g, '국');
    const h = normalizeScore(JSON.parse(JSON.stringify(createScore({ sections: [sectionFromPreset('gobeop-hwimori')] }))));
    assert.equal(h.sections[0].tempoMax, 160);
    assert.equal(h.sections[0].measures[0].beats[2].slots[1].g, '딱');
  });

  test('모든 프리셋·변형의 Section이 정규화 검증을 통과하고 시간표가 만들어진다', () => {
    for (const p of PRESETS) {
      p.variants.forEach((_, variant) => {
        const s = sectionFromPreset(p.id, { variant, measures: 2 });
        const score = createScore({ sections: [s] });
        const back = normalizeScore(JSON.parse(JSON.stringify(score)));
        assert.deepEqual(back.sections[0].meter, s.meter, `${p.id}#${variant}`);
        const tl = buildTimeline(back);
        assert.ok(tl.duration > 0);
        assert.ok(tl.strokes.length >= 2);
        assert.equal(tl.beats.length, p.meter.beats * 2);
      });
    }
  });
});
