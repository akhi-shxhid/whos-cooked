import type { SoundName } from "./stage.ts";

/**
 * Original sounds synthesized with the Web Audio API, so there are no
 * third-party audio files to license (PRD section 13).
 */
export interface SoundPlayer {
  play(name: SoundName): void;
  setEnabled(on: boolean): void;
  readonly enabled: boolean;
  /** Must be called from a user gesture on iOS before sound can play. */
  unlock(): void;
}

export function createSoundPlayer(initiallyEnabled: boolean): SoundPlayer {
  let ctx: AudioContext | null = null;
  let enabled = initiallyEnabled;

  const ensure = () => {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  };

  const tone = (
    a: AudioContext,
    { type, from, to, start = 0, dur, gain = 0.18, filter }: { type: OscillatorType; from: number; to?: number; start?: number; dur: number; gain?: number; filter?: number },
  ) => {
    const t0 = a.currentTime + start;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node: AudioNode = osc;
    if (filter) {
      const f = a.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = filter;
      osc.connect(f);
      node = f;
    }
    node.connect(g).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  };

  const recipes: Record<SoundName, (a: AudioContext) => void> = {
    tick: (a) => tone(a, { type: "square", from: 1500, dur: 0.03, gain: 0.08 }),
    pop: (a) => {
      tone(a, { type: "sine", from: 260, to: 980, dur: 0.12, gain: 0.25 });
      tone(a, { type: "triangle", from: 1400, to: 700, start: 0.05, dur: 0.1, gain: 0.08 });
    },
    butter: (a) => tone(a, { type: "sine", from: 660, to: 880, dur: 0.07, gain: 0.16 }),
    burn: (a) => tone(a, { type: "sawtooth", from: 180, to: 90, dur: 0.22, gain: 0.14, filter: 900 }),
    complete: (a) => {
      tone(a, { type: "triangle", from: 523, dur: 0.12 });
      tone(a, { type: "triangle", from: 784, start: 0.11, dur: 0.18 });
    },
    reveal: (a) => {
      [392, 523, 659, 784].forEach((f, i) => tone(a, { type: "triangle", from: f, start: i * 0.07, dur: 0.16, gain: 0.15 }));
    },
  };

  return {
    play(name) {
      if (!enabled) return;
      const a = ensure();
      if (a) recipes[name](a);
    },
    setEnabled(on) {
      enabled = on;
    },
    get enabled() {
      return enabled;
    },
    unlock() {
      if (enabled) ensure();
    },
  };
}
