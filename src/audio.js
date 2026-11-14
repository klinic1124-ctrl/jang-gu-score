// 확인용 재생 모듈 — 샘플 없이 Web Audio로 장구 소리를 합성하고 악보 시간표대로 재생한다.
import { STROKES, buildTimeline } from './model.js';

const noiseCache = new WeakMap();

/** 컨텍스트별로 한 번만 만드는 백색 소음 버퍼. */
function noiseBuffer(ctx) {
  let buf = noiseCache.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, buf);
  }
  return buf;
}

/** 지수 감쇠 엔벨로프가 걸린 게인 노드. */
function envGain(ctx, dest, when, peak, decay, attack = 0.002) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(peak, when + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
  g.connect(dest);
  return g;
}

function noiseBurst(ctx, dest, when, { type, freq, q = 1, peak, decay }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  src.connect(f);
  f.connect(envGain(ctx, dest, when, peak, decay));
  src.start(when);
  src.stop(when + decay + 0.05);
}

function tone(ctx, dest, when, { type = 'sine', from, to, sweep, peak, decay }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, when);
  osc.frequency.exponentialRampToValueAtTime(to, when + sweep);
  osc.connect(envGain(ctx, dest, when, peak, decay));
  osc.start(when);
  osc.stop(when + decay + 0.05);
}

/** 북편: 피치가 빠르게 내려가는 낮은 북소리 + 짧은 저역 노이즈 어택. */
function gung(ctx, dest, when, vol) {
  tone(ctx, dest, when, { from: 110, to: 58, sweep: 0.16, peak: 0.7 * vol, decay: 0.42 });
  tone(ctx, dest, when, { type: 'triangle', from: 190, to: 90, sweep: 0.05, peak: 0.25 * vol, decay: 0.12 });
  noiseBurst(ctx, dest, when, { type: 'lowpass', freq: 500, peak: 0.5 * vol, decay: 0.04 });
}

/** 국: 북편을 반쯤 막아 친 소리 — 울림 없이 짧게 끊기는 둔탁한 북소리(피치는 약간 높게). */
function guk(ctx, dest, when, vol) {
  tone(ctx, dest, when, { from: 125, to: 80, sweep: 0.04, peak: 0.6 * vol, decay: 0.1 });
  noiseBurst(ctx, dest, when, { type: 'lowpass', freq: 450, peak: 0.45 * vol, decay: 0.035 });
}

/** 채편: 밴드패스 노이즈 '딱' + 짧은 고음 톤. */
function chae(ctx, dest, when, vol, decay = 0.11) {
  noiseBurst(ctx, dest, when, { type: 'bandpass', freq: 2400, q: 1.1, peak: 0.8 * vol, decay });
  tone(ctx, dest, when, { from: 650, to: 430, sweep: 0.04, peak: 0.28 * vol, decay: decay * 0.6 });
}

/** 채편 변죽(가장자리)을 막아 치는 마른 '딱/톡': 더 짧고 높은 밴드패스 노이즈, 톤 없음. */
function rim(ctx, dest, when, vol, decay = 0.05) {
  noiseBurst(ctx, dest, when, { type: 'bandpass', freq: 4000, q: 1.3, peak: 0.8 * vol, decay });
}

/** 꾸밈음 시각(본 타점 앞 초). 한 개면 50ms(북편 꾸밈은 60ms), 두 개면 90ms·45ms. */
function graceLeads(def) {
  if (def.grace >= 2) return [0.09, 0.045];
  return [def.gung ? 0.06 : 0.05];
}

/**
 * 타법 하나를 when(컨텍스트 시각)에 합성한다. 재생·미리듣기·오프라인 렌더 공용.
 * 타법 플래그로 처리: gung/chae = 치는 편, rim = 채편 변죽 음색, grace = 앞 꾸밈음 개수, roll/soft = 굴림·약하게, mute = 북편 반뮤트.
 * opts: accent, dur(이 타점의 길이, 굴림용), notBefore(꾸밈음이 이 시각보다 앞서지 않게)
 */
export function synthStroke(ctx, dest, strokeId, when, { accent = false, dur = 0.25, notBefore = 0 } = {}) {
  const def = Object.hasOwn(STROKES, strokeId) ? STROKES[strokeId] : null;
  if (!def || strokeId === 'rest') return;
  const vol = accent ? 1.5 : 1;
  if (def.roll) {
    const total = Math.min(Math.max(dur, 0.08), 1);
    const n = Math.min(16, Math.max(4, Math.round(total / 0.06)));
    for (let k = 0; k < n; k += 1) {
      const u = k / n;
      const at = when + total * (u ** 0.9); // 약간 가속
      chae(ctx, dest, at, vol * 0.7 * (1 - 0.65 * u), 0.05);
    }
    return;
  }
  const strike = def.rim ? rim : chae;
  // 꾸밈음: 북편만 치는 타법(구궁)은 약한 북소리, 그 밖은 약한 채편(변죽이면 변죽)
  const graceGung = def.gung && !def.chae;
  if (def.grace) {
    for (const lead of graceLeads(def)) {
      const graceAt = Math.max(when - lead, notBefore);
      if (graceAt >= when - 0.01) continue;
      if (graceGung) gung(ctx, dest, graceAt, vol * 0.45);
      else strike(ctx, dest, graceAt, vol * 0.4, 0.05);
    }
  }
  if (def.mute) guk(ctx, dest, when, vol);
  else if (def.gung) gung(ctx, dest, when, def.chae ? vol * 0.85 : vol);
  if (def.chae) strike(ctx, dest, when, (def.soft ? 0.35 : 1) * (def.gung ? vol * 0.85 : vol));
}

/** 메트로놈 클릭(짧은 우드블록). first면 높은 소리. */
export function synthClick(ctx, dest, when, first) {
  tone(ctx, dest, when, { type: 'square', from: first ? 1700 : 1100, to: first ? 1500 : 1000, sweep: 0.02, peak: 0.18, decay: 0.03 });
}

const TICK_MS = 25;
const LOOKAHEAD = 0.12;
const LOOKAHEAD_HIDDEN = 1.5; // 백그라운드 탭은 타이머가 느려지므로 더 멀리 예약
const START_DELAY = 0.08;

export class Player {
  constructor() {
    this.ctx = null;
    this.master = null;
    this._run = null;
  }

  get playing() { return !!this._run; }

  _ensureContext() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  play(score, { from = null, tempoScale = 1, loop = false, metronome = false, onPosition = null, onEnd = null } = {}) {
    this.stop();
    const ctx = this._ensureContext();
    const tl = buildTimeline(score, { tempoScale, from });
    const bus = ctx.createGain(); // 이번 재생 전용 — 끊으면 예약된 소리가 모두 사라진다
    bus.connect(this.master);
    const startAt = ctx.currentTime + START_DELAY;
    const run = { bus, timer: 0, onPosition };
    this._run = run;

    // 한 바퀴(timeline) 안에서 각 목록을 어디까지 예약했는지
    let offset = startAt;
    let iStroke = 0; let iSlot = 0; let iBeat = 0;
    const posQueue = []; // {at, pos} — 소리 시각이 되면 onPosition 호출

    const finish = (natural) => {
      if (this._run !== run) return;
      clearInterval(run.timer);
      this._run = null;
      bus.disconnect();
      if (onPosition) onPosition(null);
      if (natural && onEnd) onEnd();
    };

    const tick = () => {
      if (this._run !== run) return;
      const now = ctx.currentTime;
      const horizon = now + (document.hidden ? LOOKAHEAD_HIDDEN : LOOKAHEAD);
      for (;;) {
        for (; iStroke < tl.strokes.length && offset + tl.strokes[iStroke].time < horizon; iStroke += 1) {
          const s = tl.strokes[iStroke];
          synthStroke(ctx, bus, s.t, offset + s.time, { accent: s.accent, dur: s.dur, notBefore: startAt });
        }
        for (; iSlot < tl.slots.length && offset + tl.slots[iSlot].time < horizon; iSlot += 1) {
          posQueue.push({ at: offset + tl.slots[iSlot].time, pos: tl.slots[iSlot].pos });
        }
        for (; metronome && iBeat < tl.beats.length && offset + tl.beats[iBeat].time < horizon; iBeat += 1) {
          synthClick(ctx, bus, offset + tl.beats[iBeat].time, tl.beats[iBeat].first);
        }
        if (!metronome) iBeat = tl.beats.length;
        const done = iStroke >= tl.strokes.length && iSlot >= tl.slots.length && iBeat >= tl.beats.length;
        if (!done) break;
        // 한 바퀴 예약 끝: 반복이면 다음 바퀴, 아니면 종료 시각을 기다린다
        if (loop && tl.duration > 0) {
          if (offset + tl.duration >= horizon) break;
          offset += tl.duration; iStroke = 0; iSlot = 0; iBeat = 0;
        } else break;
      }
      // 소리 시각이 된 위치만 알린다
      while (posQueue.length && posQueue[0].at <= now + 0.005) {
        const { pos } = posQueue.shift();
        if (onPosition) onPosition(pos);
        if (this._run !== run) return; // 콜백 안에서 stop()된 경우
      }
      const allScheduled = iStroke >= tl.strokes.length && iSlot >= tl.slots.length && iBeat >= tl.beats.length;
      if (!loop && allScheduled && posQueue.length === 0 && now >= offset + tl.duration) finish(true);
      else if (loop && tl.duration <= 0) finish(true); // 빈 악보 무한 루프 방지
    };

    tick();
    if (this._run === run) run.timer = setInterval(tick, TICK_MS);
  }

  stop() {
    const run = this._run;
    if (!run) return;
    clearInterval(run.timer);
    this._run = null;
    run.bus.disconnect();
    if (run.onPosition) run.onPosition(null);
  }

  preview(strokeId) {
    const ctx = this._ensureContext();
    synthStroke(ctx, this.master, strokeId, ctx.currentTime + 0.01);
  }
}
