/**
 * Original procedural retro sound effects (Web Audio API, no audio files).
 * Muted by default; staff can switch sound on once and the choice is remembered.
 */
export type SfxName =
  | 'hover'
  | 'click'
  | 'select'
  | 'start'
  | 'jump'
  | 'land'
  | 'coin'
  | 'collect'
  | 'stomp'
  | 'hit'
  | 'fall'
  | 'checkpoint'
  | 'slice'
  | 'combo'
  | 'bad'
  | 'correct'
  | 'wrong'
  | 'place'
  | 'line'
  | 'reveal'
  | 'tick'
  | 'drum'
  | 'finish'
  | 'gameover'
  | 'freeze'
  | 'whoosh'
  | 'pulse'
  | 'gain'
  | 'loss'
  | 'alarm'
  | 'rotate'
  | 'move'
  | 'drop'
  | 'error'
  | 'cash'
  | 'powerup'
  | 'bump'
  | 'gate'
  | 'news';

interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  slideTo?: number;
  delay?: number;
  attack?: number;
}

interface NoiseOpts {
  vol?: number;
  freq?: number;
  slideTo?: number;
  q?: number;
  delay?: number;
  filter?: BiquadFilterType;
}

const NOTE = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98,
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private last = new Map<SfxName, number>();
  enabled = false;

  setEnabled(on: boolean) {
    this.enabled = on;
    if (on) this.ensure();
    else if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  private ensure(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.32;
        this.master.connect(this.ctx.destination);
        const len = Math.floor(this.ctx.sampleRate * 0.6);
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private tone(freq: number, dur: number, o: ToneOpts = {}) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type ?? 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slideTo), t0 + dur);
    const vol = o.vol ?? 0.15;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (o.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, o: NoiseOpts = {}) {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noiseBuf) return;
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.filter ?? 'bandpass';
    f.frequency.setValueAtTime(o.freq ?? 1200, t0);
    if (o.slideTo) f.frequency.exponentialRampToValueAtTime(o.slideTo, t0 + dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol ?? 0.15, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  private arp(notes: number[], step: number, o: ToneOpts & { len?: number } = {}) {
    notes.forEach((n, i) => this.tone(n, o.len ?? step * 1.4, { ...o, delay: (o.delay ?? 0) + i * step }));
  }

  play(name: SfxName) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const gap = name === 'hover' ? 0.07 : name === 'tick' || name === 'move' ? 0.035 : name === 'pulse' ? 0.05 : 0.02;
    if (now - (this.last.get(name) ?? -1) < gap) return;
    this.last.set(name, now);

    switch (name) {
      case 'hover':
        this.tone(1320, 0.035, { type: 'triangle', vol: 0.04 });
        break;
      case 'click':
        this.tone(520, 0.05, { vol: 0.08, slideTo: 780 });
        break;
      case 'select':
        this.tone(700, 0.07, { type: 'triangle', vol: 0.1, slideTo: 940 });
        break;
      case 'start':
        this.arp([NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6], 0.07, { vol: 0.1 });
        break;
      case 'jump':
        this.tone(280, 0.14, { vol: 0.09, slideTo: 720 });
        break;
      case 'land':
        this.noise(0.06, { filter: 'lowpass', freq: 500, vol: 0.12 });
        break;
      case 'coin':
        this.tone(NOTE.B5, 0.06, { vol: 0.08 });
        this.tone(NOTE.E6, 0.18, { vol: 0.08, delay: 0.06 });
        break;
      case 'collect':
        this.arp([NOTE.G5, NOTE.C6, NOTE.E6], 0.05, { vol: 0.07, type: 'square' });
        break;
      case 'bump':
        this.tone(180, 0.08, { vol: 0.12, slideTo: 120 });
        this.noise(0.05, { filter: 'lowpass', freq: 700, vol: 0.1 });
        break;
      case 'stomp':
        this.tone(240, 0.12, { vol: 0.12, slideTo: 90 });
        this.noise(0.08, { filter: 'lowpass', freq: 900, vol: 0.1 });
        break;
      case 'hit':
        this.tone(220, 0.25, { type: 'sawtooth', vol: 0.1, slideTo: 70 });
        this.noise(0.15, { freq: 800, vol: 0.1 });
        break;
      case 'fall':
        this.tone(700, 0.5, { type: 'triangle', vol: 0.12, slideTo: 90 });
        break;
      case 'checkpoint':
        this.arp([NOTE.E5, NOTE.A5, NOTE.D6], 0.08, { vol: 0.09 });
        break;
      case 'slice':
        this.noise(0.1, { freq: 2200, slideTo: 7000, q: 2.5, vol: 0.22 });
        break;
      case 'combo':
        this.arp([NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6], 0.045, { vol: 0.08 });
        break;
      case 'bad':
        this.tone(190, 0.28, { vol: 0.09 });
        this.tone(179, 0.28, { vol: 0.09 });
        break;
      case 'correct':
        this.tone(NOTE.G5, 0.08, { vol: 0.09 });
        this.tone(NOTE.C6, 0.22, { vol: 0.09, delay: 0.08 });
        break;
      case 'wrong':
        this.tone(330, 0.12, { vol: 0.09, slideTo: 300 });
        this.tone(247, 0.25, { vol: 0.09, delay: 0.12, slideTo: 220 });
        break;
      case 'place':
        this.tone(330, 0.06, { vol: 0.1 });
        this.noise(0.05, { filter: 'lowpass', freq: 600, vol: 0.12 });
        break;
      case 'line':
        this.arp([NOTE.C5, NOTE.G5, NOTE.C6, NOTE.G6], 0.05, { vol: 0.08 });
        this.noise(0.25, { filter: 'highpass', freq: 5000, vol: 0.05, delay: 0.1 });
        break;
      case 'reveal':
        this.tone(NOTE.C5, 0.5, { vol: 0.07, type: 'triangle' });
        this.tone(NOTE.E5, 0.5, { vol: 0.07, type: 'triangle' });
        this.tone(NOTE.G5, 0.6, { vol: 0.07, type: 'triangle' });
        this.tone(NOTE.C6, 0.7, { vol: 0.06, delay: 0.05 });
        break;
      case 'tick':
        this.tone(1200, 0.02, { vol: 0.04 });
        break;
      case 'drum':
        for (let i = 0; i < 10; i++) this.noise(0.05, { filter: 'lowpass', freq: 400, vol: 0.08 + i * 0.006, delay: i * 0.06 });
        break;
      case 'finish':
        this.arp([NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6], 0.09, { vol: 0.09 });
        this.arp([NOTE.G5, NOTE.C6, NOTE.E6], 0.12, { vol: 0.08, delay: 0.42, len: 0.3 });
        break;
      case 'gameover':
        this.arp([NOTE.G4, NOTE.E4, NOTE.C4], 0.16, { vol: 0.09, type: 'triangle', len: 0.3 });
        break;
      case 'freeze':
        this.tone(NOTE.G6, 0.3, { type: 'sine', vol: 0.08 });
        this.tone(NOTE.D6, 0.3, { type: 'sine', vol: 0.06, delay: 0.04 });
        this.noise(0.18, { filter: 'highpass', freq: 3000, vol: 0.06 });
        break;
      case 'whoosh':
        this.noise(0.22, { freq: 400, slideTo: 2200, q: 1.5, vol: 0.14 });
        break;
      case 'pulse':
        this.tone(660, 0.04, { type: 'triangle', vol: 0.04 });
        break;
      case 'gain':
        this.tone(880, 0.08, { type: 'triangle', vol: 0.06, slideTo: 1320 });
        break;
      case 'loss':
        this.tone(300, 0.12, { vol: 0.06, slideTo: 180 });
        break;
      case 'alarm':
        this.tone(880, 0.09, { vol: 0.07 });
        this.tone(660, 0.09, { vol: 0.07, delay: 0.1 });
        this.tone(880, 0.09, { vol: 0.07, delay: 0.2 });
        break;
      case 'rotate':
        this.tone(620, 0.035, { vol: 0.06 });
        break;
      case 'move':
        this.tone(420, 0.02, { vol: 0.035 });
        break;
      case 'drop':
        this.tone(160, 0.08, { vol: 0.1, slideTo: 90 });
        this.noise(0.06, { filter: 'lowpass', freq: 500, vol: 0.14 });
        break;
      case 'error':
        this.tone(150, 0.16, { vol: 0.08 });
        break;
      case 'cash':
        this.tone(NOTE.E6, 0.12, { vol: 0.07, type: 'triangle' });
        this.tone(NOTE.A5, 0.2, { vol: 0.06, type: 'triangle', delay: 0.05 });
        break;
      case 'powerup':
        this.arp([NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5, NOTE.A5, NOTE.C6, NOTE.D6, NOTE.E6], 0.035, { vol: 0.07 });
        break;
      case 'gate':
        this.tone(200, 0.4, { vol: 0.08, slideTo: 400, type: 'sawtooth' });
        this.arp([NOTE.C6, NOTE.E6], 0.1, { vol: 0.06, delay: 0.3 });
        break;
      case 'news':
        this.tone(NOTE.A5, 0.07, { vol: 0.06 });
        this.tone(NOTE.E5, 0.1, { vol: 0.06, delay: 0.08 });
        break;
    }
  }
}

export const sfx = new AudioEngine();
