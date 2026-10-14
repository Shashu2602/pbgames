import { createStore, type Store } from '../../app/store';
import type { EduId } from '../../data/education';
import { sfx } from '../../engine/audio';
import { clamp } from '../../engine/collisions';
import { formatTime } from '../../engine/format';
import { GameLoop } from '../../engine/loop';
import { FloatTexts, Particles, Shake } from '../../engine/particles';
import { ctx2d } from '../../engine/pixel';
import { drawLabel, drawText } from '../../engine/pixelfont';
import { createRng, range, shuffle } from '../../engine/random';
import type { GameController, Highlight } from '../types';
import * as S from './sprites';
import type { EventKind, Mood, TileKind } from './sprites';

export const VW = 480;
export const VH = 270;
export const COLS = 9;
export const LANES = 5;
export const CELL_W = 44;
export const CELL_H = 46;
export const GRID_X = 62;
export const GRID_Y = 38;
const FAIL_VALUE = 30;

export const STRATEGIES: Record<
  TileKind,
  { name: string; full: string; cost: number; cooldown: number; hp: number; good: string; bad: string; key: string }
> = {
  long: { name: 'LONG', full: 'LONG POSITION', cost: 60, cooldown: 4, hp: 100, good: 'RALLY ↑ = gain', bad: 'DOWNTURN ↓ = loss', key: '1' },
  short: { name: 'SHORT', full: 'SHORT POSITION', cost: 60, cooldown: 4, hp: 100, good: 'DOWNTURN ↓ = gain', bad: 'RALLY ↑ = big loss', key: '2' },
  diversify: { name: 'DIVERSIFY', full: 'DIVERSIFICATION', cost: 90, cooldown: 8, hp: 220, good: 'Softens a CRASH', bad: 'Small gains only', key: '3' },
  cash: { name: 'CASH', full: 'CASH RESERVE', cost: 50, cooldown: 6, hp: 80, good: '+25 points over time', bad: 'Misses rallies', key: '4' },
};
export const TILE_ORDER: TileKind[] = ['long', 'short', 'diversify', 'cash'];

const STRENGTH: Record<EventKind, number> = { rally: 40, down: 40, shock: 75 };
const SPEED: Record<EventKind, number> = { rally: 26, down: 24, shock: 17 };
const EVENT_NAME: Record<EventKind, string> = { rally: 'RALLY ↑', down: 'DOWNTURN ↓', shock: 'CRASH!' };
const EVENT_COLOR: Record<EventKind, string> = { rally: '#3C8A50', down: '#B23A33', shock: '#6440A3' };

interface WaveSpec {
  name: string;
  sub: string;
  edu: EduId;
  window: number;
  mix: Partial<Record<EventKind, number>>;
  laneSpeeds?: boolean;
}

const WAVES: WaveSpec[] = [
  { name: 'WAVE 1', sub: 'THE MARKET RALLY', edu: 'hf-long', window: 24, mix: { rally: 10, down: 2 } },
  { name: 'WAVE 2', sub: 'MARKET DOWNTURN', edu: 'hf-short', window: 30, mix: { down: 10, rally: 3, shock: 1 } },
  { name: 'WAVE 3', sub: 'MIXED MARKET', edu: 'hf-why', window: 34, mix: { rally: 6, down: 7, shock: 3 }, laneSpeeds: true },
];
const WAVE_STEPS = ['WAVE 1', 'WAVE 2', 'WAVE 3'];

/** Effect of one contact tick (0.5 s) — every strategy has a trade-off. */
type Mode = 'up' | 'down' | 'shock';
const CONTACT: Record<TileKind, Record<Mode, { ev: number; value: number; hp: number } | null>> = {
  long: { up: { ev: 12, value: 1.0, hp: 0 }, down: { ev: 6, value: -1.2, hp: 20 }, shock: { ev: 6, value: -2.5, hp: 35 } },
  short: { up: { ev: 5, value: -2.5, hp: 28 }, down: { ev: 12, value: 1.0, hp: 0 }, shock: { ev: 8, value: 0.5, hp: 25 } },
  diversify: { up: { ev: 10, value: 0.5, hp: 6 }, down: { ev: 10, value: -0.5, hp: 10 }, shock: { ev: 14, value: -0.4, hp: 12 } },
  cash: { up: null, down: { ev: 8, value: 0, hp: 20 }, shock: { ev: 8, value: 0, hp: 24 } },
};

interface Tile {
  kind: TileKind;
  col: number;
  lane: number;
  hp: number;
  maxHp: number;
  fireT: number;
  incomeT: number;
  flash: number;
  used: boolean;
  cost: number;
}

interface MEvent {
  id: number;
  kind: EventKind;
  lane: number;
  x: number;
  speed: number;
  strength: number;
  max: number;
  mode: 'up' | 'down';
  contactT: number;
  touching: boolean;
  passedCash: Set<Tile>;
  flash: number;
  wave: number;
  gone: boolean;
}

interface Pulse {
  kind: 'long' | 'short';
  lane: number;
  x: number;
  from: Tile;
}

interface Spawn {
  t: number;
  kind: EventKind;
  lane: number;
  speedMul: number;
}

export interface HedgeUi {
  sp: number;
  value: number;
  cooldown: Record<TileKind, number>;
  phase: 'tutorial' | 'play' | 'break' | 'won' | 'lost';
  wave: number;
}

export class HedgeEngine {
  readonly ui: Store<HedgeUi>;
  private ctx: CanvasRenderingContext2D;
  private loop: GameLoop;
  private time = 0;
  private phase: HedgeUi['phase'] = 'tutorial';
  private tutorialT = 0;
  private wave = 0;
  private waveT = 0;
  private breakT = 0;
  private spawns: Spawn[] = [];
  private spawnIdx = 0;
  private tiles: Tile[] = [];
  private events: MEvent[] = [];
  private pulses: Pulse[] = [];
  private nextId = 1;
  private particles = new Particles();
  private texts = new FloatTexts();
  private shake = new Shake();
  private sp = 200;
  private spT = 0;
  private value = 100;
  private history: number[] = [];
  private histT = 0;
  private cooldown: Record<TileKind, number> = { long: 0, short: 0, diversify: 0, cash: 0 };
  private hover: { col: number; lane: number; kind: TileKind | null } | null = null;
  private thinking = false;
  private celebrateT = 0;
  private endT = 0;
  private rng: () => number;
  private uiTick = 0;

  // stats
  private wavesDone = 0;
  private spent = 0;
  private spentUseful = 0;
  private kinds = new Set<TileKind>();
  private downsideTotal = 0;
  private downsideNeutral = 0;
  private gains = 0;
  private losses = 0;
  private eduShown = new Set<number>();
  private tips = new Set<string>();

  constructor(
    private canvas: HTMLCanvasElement,
    private ctl: GameController,
  ) {
    this.ctx = ctx2d(canvas);
    this.rng = createRng(ctl.seed);
    this.ui = createStore<HedgeUi>(this.snapshot());
    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: () => this.render(),
      isPaused: () => ctl.pause.paused,
    });
    ctl.setScoreLabel('SCORE');
    ctl.setTimer(0, 'up');
    this.syncHud();
  }

  start() {
    this.loop.start();
  }

  destroy() {
    this.loop.stop();
  }

  /* ───────────────────────── public API for the React layer ───────────────────────── */
  cellFromClient(clientX: number, clientY: number): { col: number; lane: number } | null {
    const r = this.canvas.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * VW;
    const y = ((clientY - r.top) / r.height) * VH;
    const col = Math.floor((x - GRID_X) / CELL_W);
    const lane = Math.floor((y - GRID_Y) / CELL_H);
    if (col < 0 || col >= COLS || lane < 0 || lane >= LANES) return null;
    return { col, lane };
  }

  setHover(cell: { col: number; lane: number } | null, kind: TileKind | null) {
    this.hover = cell ? { ...cell, kind } : null;
  }

  setThinking(on: boolean) {
    this.thinking = on;
  }

  tileAt(col: number, lane: number) {
    return this.tiles.find((t) => t.col === col && t.lane === lane);
  }

  canPlace(kind: TileKind, col: number, lane: number): string | null {
    if (this.phase === 'won' || this.phase === 'lost') return 'The game is over.';
    if (this.tileAt(col, lane)) return 'That square is taken.';
    if (this.cooldown[kind] > 0) return `${STRATEGIES[kind].full} is recharging — try again in a moment.`;
    if (this.sp < STRATEGIES[kind].cost) return `Not enough strategy points (${STRATEGIES[kind].cost} needed).`;
    return null;
  }

  place(kind: TileKind, col: number, lane: number): string | null {
    const why = this.canPlace(kind, col, lane);
    if (why) {
      sfx.play('error');
      return why;
    }
    const st = STRATEGIES[kind];
    this.sp -= st.cost;
    this.spent += st.cost;
    this.cooldown[kind] = st.cooldown;
    this.kinds.add(kind);
    this.tiles.push({ kind, col, lane, hp: st.hp, maxHp: st.hp, fireT: 0.3, incomeT: 10, flash: 0.3, used: false, cost: st.cost });
    sfx.play('place');
    const { x, y } = this.cellCenter(col, lane);
    this.particles.burst(x, y, 12, { colors: [S.TILE_COLORS[kind].body, '#FFFFFF'], speed: [30, 80], gravity: 60 });
    if (this.phase === 'tutorial') {
      this.ctl.callout('Placed! A tile reacts to market events that reach its lane.', 'good');
      this.startWave(0);
    }
    this.pushUi(true);
    return null;
  }

  /* ───────────────────────── waves ───────────────────────── */
  private startWave(i: number) {
    this.wave = i;
    this.waveT = 0;
    this.phase = 'play';
    const spec = WAVES[i];
    const kinds: EventKind[] = [];
    for (const [k, n] of Object.entries(spec.mix) as [EventKind, number][]) for (let j = 0; j < n; j++) kinds.push(k);
    let order: EventKind[];
    if (i === 0) {
      // rallies first, a couple of downturns late — foreshadowing wave 2
      order = [...kinds.filter((k) => k !== 'down'), ...kinds.filter((k) => k === 'down')];
    } else {
      order = shuffle(this.rng, kinds);
    }
    const laneBag: number[] = [];
    while (laneBag.length < order.length) laneBag.push(...shuffle(this.rng, [0, 1, 2, 3, 4]));
    for (let j = 1; j < laneBag.length; j++) if (laneBag[j] === laneBag[j - 1]) [laneBag[j], laneBag[(j + 2) % laneBag.length]] = [laneBag[(j + 2) % laneBag.length], laneBag[j]];
    const laneMul = spec.laneSpeeds ? shuffle(this.rng, [0.8, 1.15, 0.95, 1.3, 1.05]) : [1, 1, 1, 1, 1];
    const n = order.length;
    this.spawns = order.map((kind, j) => ({
      t: 1.2 + (j * (spec.window - 3)) / Math.max(1, n - 1) + range(this.rng, -0.4, 0.4),
      kind,
      lane: laneBag[j],
      speedMul: laneMul[laneBag[j]],
    }));
    this.spawns.sort((a, b) => a.t - b.t);
    this.spawnIdx = 0;
    this.ctl.banner(spec.name, spec.sub);
    sfx.play('alarm');
    if (i === 2) {
      this.eduShown.add(2);
      void this.ctl.educate('hf-why', null);
    }
  }

  private waveComplete() {
    this.wavesDone++;
    sfx.play('checkpoint');
    this.celebrateT = 2.5;
    if (this.wave >= WAVES.length - 1) {
      this.phase = 'won';
      this.endT = 2.6;
      this.ctl.banner('PORTFOLIO SURVIVED!', 'ALL THREE WAVES COMPLETE');
      sfx.play('finish');
      return;
    }
    this.phase = 'break';
    this.breakT = 3.2;
    this.ctl.banner(`${WAVES[this.wave].name} COMPLETE`, '+50 POINTS · GET READY');
  }

  /* ───────────────────────── update ───────────────────────── */
  private update(dt: number) {
    this.time += dt;
    const live = this.phase === 'play' || this.phase === 'break' || this.phase === 'tutorial';

    if (live) {
      for (const k of TILE_ORDER) this.cooldown[k] = Math.max(0, this.cooldown[k] - dt);
      this.spT += dt;
      if (this.spT >= 4) {
        this.spT -= 4;
        this.sp += 15;
      }
    }

    if (this.phase === 'tutorial') {
      this.tutorialT += dt;
      if (this.tutorialT > 16) {
        this.ctl.callout('Let’s go! Drag strategy cards onto the grid any time.', 'info');
        this.startWave(0);
      }
    } else if (this.phase === 'play') {
      this.waveT += dt;
      while (this.spawnIdx < this.spawns.length && this.spawns[this.spawnIdx].t <= this.waveT) this.spawn(this.spawns[this.spawnIdx++]);
      if (this.spawnIdx >= this.spawns.length && this.events.length === 0 && this.pulses.length === 0) this.waveComplete();
    } else if (this.phase === 'break') {
      this.breakT -= dt;
      if (this.breakT <= 0) this.startWave(this.wave + 1);
    } else if (this.phase === 'won' || this.phase === 'lost') {
      this.endT -= dt;
      if (this.endT <= 0) {
        this.finish();
        return;
      }
    }

    this.updateTiles(dt);
    this.updateEvents(dt);
    this.updatePulses(dt);
    this.learning();

    // history for the sparkline
    this.histT += dt;
    if (this.histT >= 0.5) {
      this.histT = 0;
      this.history.push(this.value);
      if (this.history.length > 90) this.history.shift();
    }
    this.celebrateT = Math.max(0, this.celebrateT - dt);

    if (this.value <= FAIL_VALUE && (this.phase === 'play' || this.phase === 'break')) {
      this.value = Math.max(0, this.value);
      this.phase = 'lost';
      this.endT = 2.4;
      this.shake.kick(5, 0.5);
      sfx.play('gameover');
      this.ctl.banner('MARKET OVERWHELMED!', 'PORTFOLIO VALUE FELL BELOW 30');
    }

    this.particles.update(dt);
    this.texts.update(dt);
    this.shake.update(dt);
    if (++this.uiTick % 4 === 0) this.pushUi(false);
    this.syncHud();
  }

  private spawn(s: Spawn) {
    const max = STRENGTH[s.kind];
    this.events.push({
      id: this.nextId++,
      kind: s.kind,
      lane: s.lane,
      x: VW + 4,
      speed: SPEED[s.kind] * s.speedMul,
      strength: max,
      max,
      mode: s.kind === 'rally' ? 'up' : 'down',
      contactT: 0.25,
      touching: false,
      passedCash: new Set(),
      flash: 0,
      wave: this.wave,
      gone: false,
    });
    this.downsideTotal += s.kind === 'rally' ? 0 : max;
  }

  private modeOf(e: MEvent): Mode {
    return e.kind === 'shock' ? 'shock' : e.mode;
  }

  private updateTiles(dt: number) {
    for (const t of this.tiles) {
      t.flash = Math.max(0, t.flash - dt);
      if (t.kind === 'cash' && this.phase !== 'won' && this.phase !== 'lost') {
        t.incomeT -= dt;
        if (t.incomeT <= 0) {
          t.incomeT = 10;
          this.sp += 25;
          t.used = this.markUsed(t);
          const { x, y } = this.cellCenter(t.col, t.lane);
          this.texts.add('+25 SP', x, y - 14, { color: '#8E6A1A' });
          this.particles.burst(x, y - 8, 8, { colors: ['#F4C542', '#FFF6DE'], speed: [20, 60], gravity: 80 });
          sfx.play('cash');
          if (!this.tips.has('cashIncome')) {
            this.tips.add('cashIncome');
            this.ctl.callout('Cash reserves give flexibility — more strategy points — but earn no market returns.', 'info');
          }
        }
      }
      if (t.kind === 'long' || t.kind === 'short') {
        t.fireT -= dt;
        if (t.fireT <= 0) {
          const right = GRID_X + (t.col + 1) * CELL_W;
          const want: Mode[] = t.kind === 'long' ? ['up'] : ['down', 'shock'];
          const target = this.events.some((e) => e.lane === t.lane && e.x > right - 10 && e.x < VW && want.includes(this.modeOf(e)));
          if (target) {
            this.pulses.push({ kind: t.kind, lane: t.lane, x: right - 6, from: t });
            t.fireT = 1.5;
            sfx.play('pulse');
          } else t.fireT = 0.2;
        }
      }
    }
  }

  private updateEvents(dt: number) {
    for (const e of this.events) {
      e.flash = Math.max(0, e.flash - dt);
      const front = e.x + 3;
      const mode = this.modeOf(e);
      // first tile in the way (rightmost overlapping)
      let blocker: Tile | null = null;
      for (const t of this.tiles) {
        if (t.lane !== e.lane) continue;
        const left = GRID_X + t.col * CELL_W + 4;
        const right = left + CELL_W - 8;
        if (front <= right && front + 26 >= left) {
          if (t.kind === 'cash' && mode === 'up') {
            if (!e.passedCash.has(t)) {
              e.passedCash.add(t);
              const { x, y } = this.cellCenter(t.col, t.lane);
              this.texts.add('MISSED GAIN', x, y - 18, { color: '#8F8E89', font: 'small', scale: 1 });
              if (!this.tips.has('cashMiss')) {
                this.tips.add('cashMiss');
                this.ctl.callout('Cash stays safe but misses out when prices rise.', 'info');
              }
            }
            continue;
          }
          if (!blocker || t.col > blocker.col) blocker = t;
        }
      }
      e.touching = !!blocker;
      if (blocker) {
        e.contactT -= dt;
        if (e.contactT <= 0) {
          e.contactT = 0.5;
          this.contact(e, blocker, mode);
        }
      } else {
        e.x -= e.speed * dt;
      }
      if (!e.gone && e.x < GRID_X - 18) this.reachHQ(e, mode);
    }
    this.events = this.events.filter((e) => {
      if (e.gone) return false;
      if (e.strength <= 0) {
        const { y } = this.cellCenter(0, e.lane);
        this.particles.burst(e.x + 18, y, 18, {
          colors: e.kind === 'rally' ? ['#6DBD81', '#A8DDB5', '#FFFFFF'] : ['#9E8F96', '#E0524A', '#FFFFFF'],
          speed: [40, 110],
          gravity: 40,
        });
        sfx.play(e.kind === 'rally' ? 'gain' : 'stomp');
        return false;
      }
      return e.x >= GRID_X - 18;
    });
  }

  private contact(e: MEvent, t: Tile, mode: Mode) {
    const r = CONTACT[t.kind][mode];
    if (!r) return;
    t.used = this.markUsed(t);
    const before = e.strength;
    e.strength -= r.ev;
    if (mode !== 'up') this.downsideNeutral += Math.min(before, r.ev);
    this.changeValue(r.value, t);
    if (r.hp) {
      t.hp -= r.hp;
      t.flash = 0.2;
    }
    e.flash = 0.15;
    const { x, y } = this.cellCenter(t.col, t.lane);
    this.particles.burst(x + 14, y, 5, { colors: [r.value >= 0 ? '#6DBD81' : '#E0524A', '#FFFFFF'], speed: [20, 60], gravity: 0 });

    // learning tips tied to what just happened
    if (t.kind === 'long' && mode === 'up') this.tip('longUp', 'Your long position gains when prices rise.', 'good');
    if (t.kind === 'long' && mode !== 'up') this.tip('longDown', 'Long positions lose value when prices fall.', 'bad');
    if (t.kind === 'short' && mode === 'up') this.tip('squeeze', 'Short positions lose money when prices rise — sometimes a lot!', 'bad');
    if (t.kind === 'short' && mode !== 'up') this.tip('shortDown', 'Your short position reacts differently from your long position.', 'good');
    if (t.kind === 'diversify' && mode === 'shock') this.tip('divShock', 'Diversification softens a crash — but cannot remove every loss.', 'good');

    if (t.hp <= 0) {
      this.tiles = this.tiles.filter((x) => x !== t);
      this.texts.add(t.kind === 'short' && mode === 'up' ? 'SQUEEZED!' : 'POSITION LOST', x, y - 16, { color: '#B23A33', font: 'small', scale: 2 });
      this.particles.burst(x, y, 16, { colors: [S.TILE_COLORS[t.kind].body, '#1d1a24'], speed: [40, 120] });
      this.shake.kick(2, 0.2);
      sfx.play('hit');
    }
  }

  private updatePulses(dt: number) {
    for (const p of this.pulses) {
      p.x += 150 * dt;
      const want: Mode[] = p.kind === 'long' ? ['up'] : ['down', 'shock'];
      for (const e of this.events) {
        if (e.lane !== p.lane) continue;
        if (p.x >= e.x + 2 && p.x <= e.x + 34 && want.includes(this.modeOf(e))) {
          const dmg = this.modeOf(e) === 'shock' ? 7 : 10;
          const before = e.strength;
          e.strength -= dmg;
          if (this.modeOf(e) !== 'up') this.downsideNeutral += Math.min(before, dmg);
          e.flash = 0.12;
          this.changeValue(0.8, p.from);
          p.from.used = this.markUsed(p.from);
          p.x = VW + 99;
          break;
        }
      }
    }
    this.pulses = this.pulses.filter((p) => p.x < VW + 10);
  }

  private reachHQ(e: MEvent, mode: Mode) {
    const y = this.cellCenter(0, e.lane).y;
    if (mode === 'up') {
      this.texts.add('MISSED RALLY', GRID_X + 6, y - 12, { color: '#8F8E89', font: 'small', scale: 1 });
    } else {
      const hit = e.strength * (mode === 'shock' ? 0.36 : 0.3);
      this.changeValue(-hit, null);
      this.shake.kick(3, 0.25);
      sfx.play('loss');
      this.particles.burst(GRID_X - 6, y, 16, { colors: ['#E0524A', '#1d1a24'], speed: [40, 100] });
      this.tip('hq', 'Unhedged! Losses from that downturn hit the portfolio directly.', 'bad');
    }
    e.gone = true;
  }

  private changeValue(d: number, t: Tile | null) {
    if (d === 0) return;
    this.value = clamp(this.value + d, 0, 180);
    if (d > 0) this.gains += d;
    else this.losses -= d;
    const at = t ? this.cellCenter(t.col, t.lane) : { x: GRID_X + 8, y: VH / 2 };
    if (Math.abs(d) >= 0.5) {
      const n = Math.max(1, Math.round(Math.abs(d)));
      this.texts.add(d > 0 ? `+${n}` : `-${n}`, at.x, at.y - 22, { color: d > 0 ? '#2E7A45' : '#B23A33', life: 0.8 });
    }
    if (Math.abs(d) >= 1) sfx.play(d > 0 ? 'gain' : 'loss');
  }

  private markUsed(t: Tile): boolean {
    if (!t.used) this.spentUseful += t.cost;
    return true;
  }

  private tip(key: string, text: string, tone: 'good' | 'bad' | 'info') {
    if (this.tips.has(key)) return;
    this.tips.add(key);
    this.ctl.callout(text, tone);
  }

  private learning() {
    if (this.phase !== 'play') return;
    const spec = WAVES[this.wave];
    if (this.eduShown.has(this.wave)) return;
    const want: EventKind = this.wave === 0 ? 'rally' : 'down';
    const e = this.events.find((x) => x.kind === want && x.x < VW - 40);
    if (e) {
      this.eduShown.add(this.wave);
      const { y } = this.cellCenter(0, e.lane);
      void this.ctl.educate(spec.edu, this.hl(e.x + 18, y, 30));
    }
  }

  /* ───────────────────────── scoring ───────────────────────── */
  private parts() {
    const v = this.value;
    // Portfolio-health points are earned as you survive: they build up wave by wave.
    const waveProgress = this.phase === 'play' && this.spawns.length ? this.spawnIdx / this.spawns.length : 0;
    const survived = Math.min(1, (this.wavesDone + waveProgress) / WAVES.length);
    const health = v <= FAIL_VALUE ? 0 : v <= 100 ? ((v - FAIL_VALUE) / (100 - FAIL_VALUE)) * 150 : 150 + Math.min(50, ((v - 100) / 60) * 50);
    const valuePts = health * survived;
    const risk = this.downsideTotal > 0 ? (this.downsideNeutral / this.downsideTotal) * 75 : 0;
    const diversity = this.kinds.size * 10;
    const eff = this.spent > 0 ? (this.spentUseful / this.spent) * 35 : 0;
    return { valuePts, waves: this.wavesDone * 50, risk: Math.min(75, risk), diversity, eff: Math.min(35, eff) };
  }

  private score(): number {
    if (this.phase === 'tutorial') return 0;
    const p = this.parts();
    return clamp(Math.round(p.valuePts + p.waves + p.risk + p.diversity + p.eff), 0, 500);
  }

  private syncHud() {
    this.ctl.setScore(this.score());
    this.ctl.setTimer(this.time, 'up');
    this.ctl.setProgress({ label: WAVE_STEPS[this.wave], value: this.wave / 2, steps: WAVE_STEPS, step: this.wave });
  }

  private snapshot(): HedgeUi {
    const cd = {} as Record<TileKind, number>;
    for (const k of TILE_ORDER) cd[k] = Math.round((this.cooldown[k] / STRATEGIES[k].cooldown) * 20) / 20;
    return { sp: this.sp, value: Math.round(this.value), cooldown: cd, phase: this.phase, wave: this.wave };
  }

  private pushUi(force: boolean) {
    const next = this.snapshot();
    const cur = this.ui.get();
    if (
      force ||
      cur.sp !== next.sp ||
      cur.value !== next.value ||
      cur.phase !== next.phase ||
      cur.wave !== next.wave ||
      TILE_ORDER.some((k) => cur.cooldown[k] !== next.cooldown[k])
    )
      this.ui.set(next);
  }

  private finish() {
    const won = this.wavesDone >= WAVES.length;
    const p = this.parts();
    this.phase = won ? 'won' : 'lost';
    this.ctl.finish({
      score: this.score(),
      outcome: won ? 'complete' : 'over',
      headline: won ? 'PORTFOLIO SURVIVED!' : 'MARKET OVERWHELMED!',
      subline: 'Hedge funds use sophisticated strategies, but they are not automatically safer investments.',
      breakdown: [
        { label: 'Remaining portfolio value', value: Math.round(p.valuePts), max: 200, note: `value ${Math.round(this.value)}` },
        { label: 'Waves completed', value: p.waves, max: 150, note: `${this.wavesDone}/3` },
        { label: 'Downside neutralised', value: Math.round(p.risk), max: 75, note: `${this.downsideTotal ? Math.round((this.downsideNeutral / this.downsideTotal) * 100) : 0}%` },
        { label: 'Avoided concentration', value: p.diversity, max: 40, note: `${this.kinds.size}/4 strategy types` },
        { label: 'Efficient use of resources', value: Math.round(p.eff), max: 35, note: `${this.spent ? Math.round((this.spentUseful / this.spent) * 100) : 0}% of SP put to work` },
      ],
      stat: { label: 'Final portfolio value', value: `${Math.round(this.value)}` },
      extraStats: [
        { label: 'Gains captured', value: `+${this.gains.toFixed(1)}` },
        { label: 'Time', value: formatTime(this.time) },
      ],
    });
  }

  private cellCenter(col: number, lane: number) {
    return { x: GRID_X + col * CELL_W + CELL_W / 2, y: GRID_Y + lane * CELL_H + CELL_H / 2 };
  }

  private hl(x: number, y: number, r: number): Highlight | null {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width) return null;
    const s = rect.width / VW;
    return { x: rect.left + x * s, y: rect.top + y * s, r: r * s };
  }

  private mood(): Mood {
    if (this.phase === 'won' || this.celebrateT > 0) return 'celebrate';
    if (this.thinking || this.phase === 'tutorial') return 'thinking';
    const h = this.history;
    if (h.length >= 4) {
      const d = this.value - h[h.length - 4];
      if (d > 0.8) return 'happy';
      if (d < -0.8) return 'worried';
    }
    return this.phase === 'lost' ? 'worried' : 'neutral';
  }

  /* ───────────────────────── render ───────────────────────── */
  private render() {
    const ctx = this.ctx;
    const t = this.loop.time;
    ctx.save();
    ctx.translate(this.shake.x, this.shake.y);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-8, -8, VW + 16, VH + 16);

    // grid
    for (let l = 0; l < LANES; l++) {
      for (let c = 0; c < COLS; c++) {
        ctx.fillStyle = (l + c) % 2 === 0 ? '#F2F9F3' : '#FBFDFB';
        ctx.fillRect(GRID_X + c * CELL_W, GRID_Y + l * CELL_H, CELL_W, CELL_H);
      }
      ctx.fillStyle = '#E2EFE5';
      ctx.fillRect(GRID_X, GRID_Y + l * CELL_H + CELL_H - 1, COLS * CELL_W, 1);
    }
    ctx.fillStyle = '#E2EFE5';
    ctx.fillRect(VW - 16, GRID_Y, 16, LANES * CELL_H);

    // top strip
    ctx.fillStyle = '#F6F6F2';
    ctx.fillRect(0, 0, VW, GRID_Y - 4);
    ctx.fillStyle = '#DDDDD7';
    ctx.fillRect(0, GRID_Y - 4, VW, 1);
    ctx.drawImage(S.manager(this.mood(), Math.floor(t * 3)), 4, 3);
    const status = this.statusLine();
    drawText(ctx, status.text, 262, 13, { color: status.color, align: 'center' });

    // HQ
    ctx.drawImage(S.hqSprite(VH, LANES, GRID_Y, CELL_H), 0, 0);
    drawLabel(ctx, 'PORTFOLIO HQ', 28, GRID_Y - 2 + LANES * CELL_H - 12, { font: 'small', bg: S.INK, fg: '#FFFFFF' });

    // tutorial target
    if (this.phase === 'tutorial') {
      const on = Math.floor(t * 3) % 2 === 0;
      const x = GRID_X + 1 * CELL_W;
      const y = GRID_Y + 2 * CELL_H;
      ctx.drawImage(S.ghostFrame(CELL_W, CELL_H, true), x, y);
      if (on) {
        ctx.fillStyle = 'rgba(109,189,129,0.25)';
        ctx.fillRect(x + 2, y + 2, CELL_W - 4, CELL_H - 4);
      }
      drawLabel(ctx, 'DROP LONG HERE', x + CELL_W / 2, y + CELL_H + 3, { font: 'small', bg: '#3C8A50', fg: '#FFFFFF' });
    }

    // tiles
    for (const tile of this.tiles) {
      const x = GRID_X + tile.col * CELL_W + 4;
      const y = GRID_Y + tile.lane * CELL_H + 4;
      const img = S.tileSprite(tile.kind, Math.floor(t * 2 + tile.col));
      ctx.drawImage(img, x, y);
      if (tile.flash > 0) {
        ctx.fillStyle = 'rgba(224,82,74,0.45)';
        ctx.fillRect(x + 1, y + 1, 34, 30);
      }
      if (tile.hp < tile.maxHp) {
        ctx.fillStyle = S.INK;
        ctx.fillRect(x + 2, y + 36, 32, 4);
        ctx.fillStyle = tile.hp / tile.maxHp > 0.4 ? '#6DBD81' : '#E0524A';
        ctx.fillRect(x + 3, y + 37, Math.max(0, Math.round(30 * (tile.hp / tile.maxHp))), 2);
      }
      if (tile.kind === 'cash') {
        const f = 1 - tile.incomeT / 10;
        ctx.fillStyle = '#C9A24A';
        ctx.fillRect(x + 2, y - 1, Math.round(32 * f), 2);
      }
    }

    // suggestions: which tile would handle the event coming down each lane
    if (this.phase === 'play') {
      for (let lane = 0; lane < LANES; lane++) {
        const h = this.hintFor(lane);
        if (!h) continue;
        const x = GRID_X + h.col * CELL_W;
        const y = GRID_Y + lane * CELL_H;
        const c = S.TILE_COLORS[h.kind];
        ctx.globalAlpha = Math.floor(t * 3) % 2 === 0 ? 0.42 : 0.22;
        ctx.drawImage(S.tileSprite(h.kind, 0), x + 4, y + 4);
        ctx.globalAlpha = 1;
        ctx.fillStyle = c.dark;
        for (let i = 0; i < CELL_W; i += 4) {
          ctx.fillRect(x + i, y, 2, 1);
          ctx.fillRect(x + i, y + CELL_H - 1, 2, 1);
        }
        for (let j = 0; j < CELL_H; j += 4) {
          ctx.fillRect(x, y + j, 1, 2);
          ctx.fillRect(x + CELL_W - 1, y + j, 1, 2);
        }
        drawLabel(ctx, `${STRATEGIES[h.kind].name}?`, x + CELL_W / 2, y + 2, { font: 'small', bg: c.dark, fg: '#FFFFFF' });
      }
    }

    // hover ghost
    if (this.hover && this.phase !== 'won' && this.phase !== 'lost') {
      const { col, lane, kind } = this.hover;
      const x = GRID_X + col * CELL_W;
      const y = GRID_Y + lane * CELL_H;
      if (kind) {
        const ok = !this.canPlace(kind, col, lane);
        ctx.globalAlpha = 0.55;
        ctx.drawImage(S.tileSprite(kind, 0), x + 4, y + 4);
        ctx.globalAlpha = 1;
        ctx.drawImage(S.ghostFrame(CELL_W, CELL_H, ok), x, y);
      }
    }

    // pulses
    for (const p of this.pulses) {
      const y = GRID_Y + p.lane * CELL_H + CELL_H / 2 - 4;
      ctx.fillStyle = p.kind === 'long' ? 'rgba(109,189,129,0.5)' : 'rgba(232,118,108,0.5)';
      ctx.fillRect(Math.round(p.x) - 10, y + 3, 8, 2);
      ctx.drawImage(S.pulseSprite(p.kind), Math.round(p.x) - 1, y);
    }

    // events
    for (const e of this.events) {
      const y = GRID_Y + e.lane * CELL_H + 8;
      const bob = Math.round(Math.sin(t * 4 + e.id) * 1.5);
      const x = Math.round(e.x);
      const img = S.eventSprite(e.kind, Math.floor(t * 3 + e.id));
      ctx.drawImage(img, x, y + bob);
      if (e.flash > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(x + 2, y + bob + 4, 34, 22);
      }
      // strength bar + label
      ctx.fillStyle = S.INK;
      ctx.fillRect(x + 4, y - 3, 30, 4);
      ctx.fillStyle = e.kind === 'rally' ? '#6DBD81' : e.kind === 'shock' ? '#9369D0' : '#E0524A';
      ctx.fillRect(x + 5, y - 2, Math.max(0, Math.round(28 * (e.strength / e.max))), 2);
      drawLabel(ctx, EVENT_NAME[e.kind], x + 19, y + 29 + bob, { font: 'small', bg: EVENT_COLOR[e.kind], fg: '#FFFFFF' });
    }

    this.particles.draw(ctx);
    this.texts.draw(ctx);
    ctx.restore();

    if (this.phase === 'lost') {
      ctx.fillStyle = 'rgba(224,82,74,0.12)';
      ctx.fillRect(0, 0, VW, VH);
    }
  }

  /** The one instruction a visitor needs right now. */
  private statusLine(): { text: string; color: string } {
    if (this.phase === 'tutorial') return { text: 'DRAG A LONG TILE ONTO THE GLOWING SQUARE', color: '#3C8A50' };
    if (this.phase === 'won') return { text: 'PORTFOLIO SURVIVED ALL THREE WAVES!', color: '#3C8A50' };
    if (this.phase === 'lost') return { text: 'MARKET OVERWHELMED - VALUE FELL BELOW 30', color: '#B23A33' };
    if (this.phase === 'break') return { text: 'WAVE COMPLETE! NEXT WAVE COMING...', color: S.INK };
    if (this.wave === 0) return { text: 'RALLY = PRICES RISING. LONG TILES GAIN!', color: '#3C8A50' };
    if (this.wave === 1) return { text: 'DOWNTURN = PRICES FALLING. SHORT TILES GAIN!', color: '#B23A33' };
    return { text: 'MIXED MARKET! PUT THE RIGHT TILE IN EACH LANE', color: '#6440A3' };
  }

  /** Suggests a tile for a lane whose incoming event has no matching strategy yet. */
  private hintFor(lane: number): { kind: TileKind; col: number } | null {
    const coming = this.events.filter((e) => e.lane === lane && e.x < VW - 24).sort((a, b) => a.x - b.x)[0];
    if (!coming) return null;
    const tiles = this.tiles.filter((t) => t.lane === lane);
    const has = (k: TileKind) => tiles.some((t) => t.kind === k);
    let kind: TileKind | null = null;
    if (coming.kind === 'rally' && !has('long')) kind = 'long';
    else if (coming.kind === 'down' && !has('short') && !has('diversify') && !has('cash')) kind = 'short';
    else if (coming.kind === 'shock' && !has('diversify') && !has('short')) kind = 'diversify';
    if (!kind) return null;
    // in front of existing tiles, so the new strategy meets the event first
    const front = tiles.reduce((m, t) => Math.max(m, t.col), 0);
    const col = Math.min(front + 1, COLS - 1);
    const eventCol = Math.floor((coming.x - GRID_X) / CELL_W);
    if (col >= eventCol || this.tileAt(col, lane)) return null;
    return { kind, col };
  }
}
