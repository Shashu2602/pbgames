import { sfx } from '../../engine/audio';
import { clamp, distPointToSegment } from '../../engine/collisions';
import { GameLoop } from '../../engine/loop';
import { FloatTexts, Particles, Shake } from '../../engine/particles';
import { ctx2d, shade } from '../../engine/pixel';
import { drawLabel } from '../../engine/pixelfont';
import type { GameController, Highlight } from '../types';
import { buildSchedule, GAME_LENGTH, GRAVITY, ROUND_STARTS, scheduleTotals, VH, VW, type SpawnEvent } from './schedule';
import { arenaBackground, claimBubble, coinSprite, TOKENS, type TokenDef } from './tokens';

export { VW, VH };

const W = { slicedA: 220, avoidedB: 80, skippedC: 50, combo: 70, accuracy: 80 };
/** Flat penalties so slicing a warning-sign token is clearly felt. */
const PENALTY = { scam: 12, mystery: 6 };
const ROUND_NAMES = ['SLOW START', 'MIXED MARKET', 'FAST & TRICKY'];
const ROUND_STEPS = ['ROUND 1', 'ROUND 2', 'ROUND 3'];

interface Token {
  def: TokenDef;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  d: number;
  spin: number;
  spinV: number;
  round: number;
  rising: boolean;
  done: boolean;
}

interface Half {
  img: HTMLCanvasElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  rotV: number;
  cut: number;
  side: 0 | 1;
  g: number;
}

interface TrailPt {
  x: number;
  y: number;
  t: number;
}

interface Ring {
  x: number;
  y: number;
  t: number;
  color: string;
}

export class CryptoSliceEngine {
  private ctx: CanvasRenderingContext2D;
  private loop: GameLoop;
  private schedule: SpawnEvent[];
  private nextEvent = 0;
  private totals: { A: number; B: number; C: number };
  private tokens: Token[] = [];
  private halves: Half[] = [];
  private rings: Ring[] = [];
  private particles = new Particles();
  private texts = new FloatTexts();
  private shake = new Shake();
  private time = 0;
  private round = 0;
  private flashRed = 0;

  // input
  private swiping = false;
  private pointerId = -1;
  private last: TrailPt | null = null;
  private trail: TrailPt[] = [];
  private segQueue: [number, number, number, number][] = [];
  private group: { count: number; lastT: number; x: number; y: number } | null = null;

  // stats
  private slicedA = 0;
  private slicedB = 0;
  private slicedC = 0;
  private avoidedB = 0;
  private skippedC = 0;
  private missedA = 0;
  private comboPts = 0;
  private bestCombo = 0;
  private combos = 0;

  private flags = { what: false, chain: false, scam: false, mystery: false, vol: false, ended: false };
  private tips = new Set<string>();
  private detach: () => void = () => undefined;

  constructor(
    private canvas: HTMLCanvasElement,
    private ctl: GameController,
  ) {
    this.ctx = ctx2d(canvas);
    this.schedule = buildSchedule(ctl.seed);
    this.totals = scheduleTotals(this.schedule, (d) => TOKENS[d].kind);
    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: () => this.render(),
      isPaused: () => ctl.pause.paused,
      onResume: () => this.endSwipe(),
    });
    ctl.setScoreLabel('WALLET');
    ctl.setTimer(GAME_LENGTH, 'down');
    this.syncHud();
  }

  start() {
    this.attachPointer();
    this.loop.start();
  }

  destroy() {
    this.loop.stop();
    this.detach();
  }

  /* ───────────────────────── input ───────────────────────── */
  private attachPointer() {
    const c = this.canvas;
    const toV = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * VW, y: ((e.clientY - r.top) / r.height) * VH };
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (this.ctl.pause.paused) return;
      e.preventDefault();
      this.swiping = true;
      this.pointerId = e.pointerId;
      try {
        c.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const p = toV(e);
      this.last = { ...p, t: performance.now() };
      this.trail = [this.last];
    };
    const move = (e: PointerEvent) => {
      if (!this.swiping || e.pointerId !== this.pointerId) return;
      if (this.ctl.pause.paused) {
        this.endSwipe();
        return;
      }
      const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
      const list = events.length ? events : [e];
      for (const ev of list) {
        const p = toV(ev);
        const now = performance.now();
        if (this.last) {
          const dx = p.x - this.last.x;
          const dy = p.y - this.last.y;
          if (dx * dx + dy * dy >= 1.5) {
            this.segQueue.push([this.last.x, this.last.y, p.x, p.y]);
            if (dx * dx + dy * dy > 64 && Math.random() < 0.5) {
              this.particles.burst(p.x, p.y, 1, { colors: ['#FFFFFF', '#F4C542'], speed: [10, 40], gravity: 30, life: [0.15, 0.3], size: [1, 2] });
            }
          }
        }
        this.last = { ...p, t: now };
        this.trail.push(this.last);
      }
      if (this.trail.length > 40) this.trail.splice(0, this.trail.length - 40);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      this.endSwipe();
    };
    c.addEventListener('pointerdown', down);
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('lostpointercapture', up);
    const noCtx = (e: Event) => e.preventDefault();
    c.addEventListener('contextmenu', noCtx);
    this.detach = () => {
      c.removeEventListener('pointerdown', down);
      c.removeEventListener('pointermove', move);
      c.removeEventListener('pointerup', up);
      c.removeEventListener('pointercancel', up);
      c.removeEventListener('lostpointercapture', up);
      c.removeEventListener('contextmenu', noCtx);
    };
  }

  private endSwipe() {
    this.swiping = false;
    this.pointerId = -1;
    this.last = null;
    this.finishCombo();
  }

  /* ───────────────────────── update ───────────────────────── */
  private update(dt: number) {
    this.time += dt;
    const t = this.time;

    // round changes
    const r = t >= ROUND_STARTS[2] ? 2 : t >= ROUND_STARTS[1] ? 1 : 0;
    if (r !== this.round) {
      this.round = r;
      this.ctl.banner(`ROUND 0${r + 1}`, ROUND_NAMES[r]);
      sfx.play('checkpoint');
      if (r === 2 && !this.flags.vol) {
        this.flags.vol = true;
        void this.ctl.educate('cr-vol', null);
        return;
      }
    }

    // spawns
    while (this.nextEvent < this.schedule.length && this.schedule[this.nextEvent].t <= t) {
      const ev = this.schedule[this.nextEvent++];
      for (const l of ev.tokens) {
        const def = TOKENS[l.def];
        this.tokens.push({
          def,
          x: l.x,
          y: VH + l.d / 2 + 4,
          vx: l.vx,
          vy: l.vy,
          r: l.d / 2,
          d: l.d,
          spin: Math.random() * Math.PI,
          spinV: l.spin,
          round: ev.round,
          rising: true,
          done: false,
        });
      }
      if (ev.combo) sfx.play('whoosh');
    }

    // physics
    for (const tk of this.tokens) {
      const g = GRAVITY[tk.round];
      tk.vy += g * dt;
      tk.x += tk.vx * dt;
      tk.y += tk.vy * dt;
      tk.spin += tk.spinV * dt;
      if (tk.vy > 0) tk.rising = false;
      if (tk.x < tk.r && tk.vx < 0) tk.vx = -tk.vx * 0.6;
      if (tk.x > VW - tk.r && tk.vx > 0) tk.vx = -tk.vx * 0.6;
      if (!tk.rising && tk.y - tk.r > VH + 6) this.resolveMissed(tk);
    }

    // slicing (segments queued by pointer events)
    for (const seg of this.segQueue) this.processSegment(seg);
    this.segQueue.length = 0;
    if (this.group && performance.now() - this.group.lastT > 320) this.finishCombo();

    this.tokens = this.tokens.filter((k) => !k.done);

    for (const h of this.halves) {
      h.vy += h.g * dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.rot += h.rotV * dt;
    }
    this.halves = this.halves.filter((h) => h.y < VH + 40);
    this.rings = this.rings.filter((rg) => (rg.t += dt) < 0.35);
    this.particles.update(dt);
    this.texts.update(dt);
    this.shake.update(dt);
    this.flashRed = Math.max(0, this.flashRed - dt);

    this.learningMoments();

    if (t >= GAME_LENGTH && !this.flags.ended && (this.tokens.length === 0 || t >= GAME_LENGTH + 4)) {
      this.flags.ended = true;
      this.endGame();
      return;
    }
    this.syncHud();
  }

  private learningMoments() {
    const t = this.time;
    if (!this.flags.what && t > 2.7) {
      const tk = this.tokens.find((k) => k.def.kind === 'A');
      if (tk) {
        this.flags.what = true;
        void this.ctl.educate('cr-what', this.hl(tk.x, tk.y, tk.r + 10));
        return;
      }
    }
    if (!this.flags.chain && t > 9.6) {
      const tk = this.tokens.find((k) => k.def.id === 'eth') ?? this.tokens.find((k) => k.def.kind === 'A');
      this.flags.chain = true;
      void this.ctl.educate('cr-chain', tk ? this.hl(tk.x, tk.y, tk.r + 10) : null);
      return;
    }
    if (!this.flags.scam) {
      const tk = this.tokens.find((k) => k.def.kind === 'B' && k.y < VH - 50);
      if (tk) {
        this.flags.scam = true;
        void this.ctl.educate('cr-scam', this.hl(tk.x, tk.y - 14, tk.r + 26));
        return;
      }
    }
    if (!this.flags.mystery) {
      const tk = this.tokens.find((k) => k.def.kind === 'C' && k.y < VH - 50);
      if (tk) {
        this.flags.mystery = true;
        void this.ctl.educate('cr-mystery', this.hl(tk.x, tk.y - 14, tk.r + 26));
      }
    }
  }

  private processSegment([ax, ay, bx, by]: [number, number, number, number]) {
    for (const tk of this.tokens) {
      if (tk.done) continue;
      if (distPointToSegment(tk.x, tk.y, ax, ay, bx, by) <= tk.r + 2) {
        this.slice(tk, Math.atan2(by - ay, bx - ax));
      }
    }
  }

  private slice(tk: Token, angle: number) {
    tk.done = true;
    const before = this.score();
    const img = coinSprite(tk.def, tk.d);
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    for (const side of [0, 1] as const) {
      const s = side === 0 ? -1 : 1;
      this.halves.push({
        img,
        x: tk.x,
        y: tk.y,
        vx: tk.vx * 0.5 + nx * s * 70 + (Math.random() - 0.5) * 20,
        vy: Math.min(tk.vy, 0) * 0.3 + ny * s * 70 - 30,
        rot: 0,
        rotV: s * (2 + Math.random() * 3),
        cut: angle,
        side,
        g: 420,
      });
    }
    this.rings.push({ x: tk.x, y: tk.y, t: 0, color: tk.def.kind === 'A' ? '#FFFFFF' : '#E0524A' });
    this.particles.burst(tk.x, tk.y, 14, {
      colors: [tk.def.fill, tk.def.edge, '#FFFFFF'],
      speed: [50, 140],
      gravity: 260,
      life: [0.3, 0.7],
      size: [1, 3],
    });

    if (tk.def.kind === 'A') {
      this.slicedA++;
      sfx.play('slice');
      if (!this.group) this.group = { count: 0, lastT: 0, x: tk.x, y: tk.y };
      this.group.count++;
      this.group.lastT = performance.now();
      this.group.x = tk.x;
      this.group.y = tk.y;
      const gain = this.score() - before;
      this.texts.add(`+${Math.max(1, Math.round(gain))}`, tk.x, tk.y - tk.r - 6, { color: '#2E7A45' });
    } else if (tk.def.kind === 'B') {
      this.slicedB++;
      this.finishCombo();
      sfx.play('bad');
      this.shake.kick(4, 0.3);
      this.flashRed = 0.35;
      const loss = before - this.score();
      this.texts.add(`-${Math.max(1, Math.round(loss))}`, tk.x, tk.y - tk.r - 8, { color: '#E0524A', scale: 2 });
      this.texts.add(`WARNING SIGN: ${tk.def.sign ?? 'GUARANTEED RETURNS'}`, clamp(tk.x, 120, VW - 120), clamp(tk.y + tk.r + 6, 20, VH - 20), {
        color: '#B23A33',
        font: 'small',
        scale: 2,
        life: 1.6,
      });
      if (!this.tips.has('B')) {
        this.tips.add('B');
        this.ctl.callout('That token promised guaranteed profits — a classic warning sign. Let those fall.', 'bad');
      }
    } else {
      this.slicedC++;
      this.finishCombo();
      sfx.play('wrong');
      this.shake.kick(2, 0.2);
      this.texts.add('TOO HASTY!', tk.x, tk.y - tk.r - 8, { color: '#8F8E89', scale: 2, life: 1.2 });
      if (!this.tips.has('C')) {
        this.tips.add('C');
        this.ctl.callout('No information yet? Smart investors research first — let "?" tokens pass.', 'info');
      }
    }
  }

  private finishCombo() {
    const g = this.group;
    this.group = null;
    if (!g || g.count < 2) return;
    const k = g.count;
    this.combos++;
    this.bestCombo = Math.max(this.bestCombo, k);
    const add = (k - 1) * 8;
    this.comboPts += add;
    const label = k === 2 ? 'DOUBLE SLICE!' : k === 3 ? '3X COMBO!' : k === 4 ? '4X COMBO!' : 'PERFECT SWIPE!';
    this.texts.add(label, VW / 2, 54, { color: '#F4C542', outline: '#1d1a24', scale: 3, life: 1.3, vy: -10 });
    sfx.play('combo');
    if (k >= 3) this.shake.kick(k >= 5 ? 5 : 3, 0.3);
    this.particles.burst(g.x, g.y, 22, {
      colors: ['#F4C542', '#FFFFFF', '#F29A38'],
      speed: [60, 160],
      gravity: 120,
      life: [0.4, 0.8],
    });
  }

  private resolveMissed(tk: Token) {
    tk.done = true;
    if (tk.def.kind === 'A') {
      this.missedA++;
      return;
    }
    const x = clamp(tk.x, 30, VW - 30);
    if (tk.def.kind === 'B') {
      this.avoidedB++;
      this.texts.add('AVOIDED ✓', x, VH - 18, { color: '#2E7A45', font: 'small', scale: 2 });
      sfx.play('gain');
      if (!this.tips.has('avoid')) {
        this.tips.add('avoid');
        this.ctl.callout('Nice! You avoided a token with an obvious warning sign.', 'good');
      }
    } else {
      this.skippedC++;
      this.texts.add('SMART SKIP ✓', x, VH - 18, { color: '#2E7A45', font: 'small', scale: 2 });
      sfx.play('gain');
    }
  }

  /* ───────────────────────── scoring ───────────────────────── */
  private engagement() {
    return Math.min(1, this.slicedA / Math.max(1, 0.6 * this.totals.A));
  }

  private parts() {
    const e = this.engagement();
    const total = this.slicedA + this.slicedB + this.slicedC;
    const acc = total === 0 ? 1 : this.slicedA / total;
    return {
      a: (W.slicedA * this.slicedA) / this.totals.A,
      b: ((W.avoidedB * this.avoidedB) / Math.max(1, this.totals.B)) * e,
      c: ((W.skippedC * this.skippedC) / Math.max(1, this.totals.C)) * e,
      combo: Math.min(W.combo, this.comboPts),
      acc: W.accuracy * acc * e,
      accPct: acc,
      penalty: PENALTY.scam * this.slicedB + PENALTY.mystery * this.slicedC,
    };
  }

  private score(): number {
    const p = this.parts();
    return clamp(Math.round(p.a + p.b + p.c + p.combo + p.acc - p.penalty), 0, 500);
  }

  private syncHud() {
    this.ctl.setScore(this.score());
    this.ctl.setTimer(Math.max(0, GAME_LENGTH - this.time), 'down');
    const r = this.round;
    this.ctl.setProgress({ label: ROUND_STEPS[r], value: r / 2, steps: ROUND_STEPS, step: r });
  }

  private endGame() {
    this.finishCombo();
    const p = this.parts();
    this.ctl.finish({
      score: this.score(),
      outcome: 'complete',
      headline: 'MARKET CLOSED!',
      subline: 'You spotted warning signs at arcade speed. Real investing needs much more research than that.',
      breakdown: [
        { label: 'Established networks sliced', value: Math.round(p.a), max: W.slicedA, note: `${this.slicedA}/${this.totals.A}` },
        { label: 'Scam warning signs avoided', value: Math.round(p.b), max: W.avoidedB, note: `${this.avoidedB}/${this.totals.B}` },
        { label: 'Mystery tokens skipped', value: Math.round(p.c), max: W.skippedC, note: `${this.skippedC}/${this.totals.C}` },
        { label: 'Combo bonus', value: Math.round(p.combo), max: W.combo, note: `${this.combos} combos` },
        { label: 'Accuracy', value: Math.round(p.acc), max: W.accuracy, note: `${Math.round(p.accPct * 100)}%` },
        { label: 'Warning-sign tokens sliced', value: -Math.round(p.penalty), note: `${this.slicedB} scam · ${this.slicedC} mystery` },
      ],
      stat: { label: 'Slice accuracy', value: `${Math.round(p.accPct * 100)}%` },
      extraStats: [
        { label: 'Best combo', value: this.bestCombo ? `${this.bestCombo}x` : '—' },
        { label: 'Scams avoided', value: `${this.avoidedB} / ${this.totals.B}` },
      ],
    });
  }

  private hl(x: number, y: number, r: number): Highlight | null {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width) return null;
    const s = rect.width / VW;
    return { x: rect.left + x * s, y: rect.top + y * s, r: r * s };
  }

  /* ───────────────────────── render ───────────────────────── */
  private render() {
    const ctx = this.ctx;
    const t = this.loop.time;
    ctx.save();
    ctx.translate(this.shake.x, this.shake.y);
    ctx.drawImage(arenaBackground(VW, VH), 0, 0);

    // background price line (wild in round 3)
    ctx.fillStyle = this.round === 2 ? '#F3DCD8' : '#EDE7D3';
    const amp = this.round === 2 ? 34 : 10;
    for (let x = 0; x < VW; x += 2) {
      const y =
        200 +
        Math.sin(x * 0.03 + t * 0.6) * amp * 0.6 +
        Math.sin(x * 0.11 + t * 1.3) * amp * 0.4 * (this.round === 2 ? 1.6 : 0.5);
      ctx.fillRect(x, Math.round(y), 2, 2);
    }

    // tokens
    for (const tk of this.tokens) this.drawToken(ctx, tk);

    // halves
    for (const h of this.halves) {
      const s = h.img.width;
      ctx.save();
      ctx.translate(Math.round(h.x), Math.round(h.y));
      ctx.rotate(h.rot);
      ctx.rotate(h.cut);
      ctx.beginPath();
      ctx.rect(-s, h.side === 0 ? -s : 0, s * 2, s);
      ctx.clip();
      ctx.rotate(-h.cut);
      ctx.drawImage(h.img, -s / 2, -s / 2);
      ctx.restore();
    }

    for (const rg of this.rings) {
      const rr = 6 + rg.t * 90;
      ctx.strokeStyle = rg.color;
      ctx.globalAlpha = 1 - rg.t / 0.35;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rg.x, rg.y, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    this.particles.draw(ctx);
    this.drawTrail(ctx);
    this.texts.draw(ctx);
    ctx.restore();

    if (this.flashRed > 0) {
      ctx.fillStyle = `rgba(224,82,74,${(this.flashRed / 0.35) * 0.18})`;
      ctx.fillRect(0, 0, VW, VH);
    }

    // in-arena HUD
    drawLabel(ctx, `ROUND ${this.round + 1}/3`, 34, 6, { font: 'big', bg: '#FFFFFF', fg: '#1d1a24', border: '#1d1a24', padX: 4, padY: 3 });
    if (this.group && this.group.count >= 2) {
      drawLabel(ctx, `COMBO X${this.group.count}`, VW - 52, 6, { font: 'big', bg: '#F4C542', fg: '#1d1a24', border: '#1d1a24', padX: 4, padY: 3 });
    }
  }

  private drawToken(ctx: CanvasRenderingContext2D, tk: Token) {
    const img = coinSprite(tk.def, tk.d);
    const sx = Math.max(0.28, Math.abs(Math.cos(tk.spin)));
    const w = Math.max(4, Math.round(img.width * sx));
    const x = Math.round(tk.x);
    const y = Math.round(tk.y);
    // edge-on: draw a thicker rim so it still reads as a coin
    if (sx < 0.5) {
      ctx.fillStyle = shade(tk.def.edge, -0.2);
      ctx.fillRect(x - Math.round(w / 2) - 1, y - Math.round(img.height / 2) + 2, w + 2, img.height - 4);
    }
    ctx.drawImage(img, x - Math.round(w / 2), y - Math.round(img.height / 2), w, img.height);

    // label under the coin
    if (tk.def.kind === 'A') {
      drawLabel(ctx, tk.def.label, x, y + tk.r + 3, { font: 'big', bg: '#FFFFFF', fg: '#1d1a24', border: '#1d1a24', padX: 2, padY: 2 });
    } else {
      drawLabel(ctx, tk.def.label, x, y + tk.r + 3, {
        font: 'small',
        bg: tk.def.kind === 'B' ? '#B23A33' : '#8F8E89',
        fg: '#FFFFFF',
        padX: 2,
        padY: 1,
      });
    }
    // warning-sign bubble
    if (tk.def.claim) {
      const b = claimBubble(tk.def);
      let by = y - tk.r - b.height - 1;
      if (by < 2) by = 2;
      const bx = clamp(x - Math.round(b.width / 2), 2, VW - b.width - 2);
      ctx.drawImage(b, bx, by);
    }
  }

  private drawTrail(ctx: CanvasRenderingContext2D) {
    const now = performance.now();
    this.trail = this.trail.filter((p) => now - p.t < 130);
    const pts = this.trail;
    if (pts.length < 2) return;
    // Two passes (glow, then core) so the blade reads as one continuous stroke.
    for (const pass of [0, 1]) {
      ctx.fillStyle = pass === 0 ? '#F4C542' : '#FFFFFF';
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const age = Math.min(1, (now - b.t) / 130);
        const core = Math.max(1, Math.round(4 * (1 - age) * (0.4 + (0.6 * i) / pts.length)));
        const size = pass === 0 ? core + 2 : core;
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        const steps = Math.max(1, Math.ceil(dist));
        for (let s = 0; s <= steps; s++) {
          const x = a.x + ((b.x - a.x) * s) / steps;
          const y = a.y + ((b.y - a.y) * s) / steps;
          ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
        }
      }
    }
  }
}
