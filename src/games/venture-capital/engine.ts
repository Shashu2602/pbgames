import { createElement } from 'react';
import { sfx } from '../../engine/audio';
import { clamp, damp, overlaps, type Rect } from '../../engine/collisions';
import { formatTime } from '../../engine/format';
import { Keyboard } from '../../engine/input';
import { GameLoop } from '../../engine/loop';
import { FloatTexts, Particles, Shake } from '../../engine/particles';
import { ctx2d, makeCanvas } from '../../engine/pixel';
import { drawLabel, drawText, textWidth } from '../../engine/pixelfont';
import { createRng, shuffle } from '../../engine/random';
import type { ChoiceConfig, GameController, Highlight } from '../types';
import { DECISIONS, type StartupPair } from './decisions';
import {
  buildLevel,
  ONE_WAY,
  ROWS,
  SOLID,
  STAGE_NAMES,
  STAGE_STEPS,
  STREET,
  T,
  type CheckpointDef,
  type DecorDef,
  type Level,
  type MoverDef,
  type WalkerKind,
} from './level';
import * as S from './sprites';

export const VW = 480;
export const VH = 272;
const TIME_LIMIT = 150;

// Movement tuning (px, seconds). Forgiving: coyote time + jump buffer + variable jump height.
const WALK = 100;
const RUN = 152;
const ACC_GROUND = 950;
const ACC_AIR = 650;
const DECEL_GROUND = 1150;
const DECEL_AIR = 260;
const JUMP_V = 335;
const HOLD_G = 760;
const FALL_G = 1550;
const MAX_FALL = 430;

const POINTS = { exit: 70, items: 120, decision: 30, stomp: 4, hit: 10, pit: 15, timeBonusMax: 70 };

interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  dir: 1 | -1;
  onGround: boolean;
  coyote: number;
  buffer: number;
  holding: boolean;
  runT: number;
  invuln: number;
  hurtT: number;
  landT: number;
  dist: number;
  platform: Mover | null;
  fallSpeed: number;
}

interface Mover extends MoverDef {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

interface Walker {
  kind: WalkerKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  min: number;
  max: number;
  alive: boolean;
  squashT: number;
}

interface Flame {
  mode: 'bob' | 'patrol';
  x0: number;
  y0: number;
  range: number;
  phase: number;
  x: number;
  y: number;
  visible: boolean;
}

interface Crusher {
  x: number;
  y: number;
  topY: number;
  floorY: number;
  state: 'wait' | 'warn' | 'fall' | 'stay' | 'rise';
  timer: number;
  vy: number;
}

interface Item {
  kind: S.ItemKind;
  x: number;
  y: number;
  taken: boolean;
  phase: number;
}

interface Pop {
  kind: S.ItemKind;
  x: number;
  y: number;
  t: number;
}

interface Checkpoint extends CheckpointDef {
  reached: boolean;
  reachedAt: number;
  groundY: number;
  raise: number;
}

type HazardKind = 'nocust' | 'bug' | 'burn' | 'crush' | 'idea';

const HAZARD_TIPS: Record<HazardKind, string> = {
  nocust: 'No customers = no business. Startups must find real buyers.',
  bug: 'Buggy, low-quality products drive customers away.',
  burn: 'Burn rate: how fast a startup spends its cash. Too fast = trouble.',
  crush: 'Weak demand can crush even a clever idea.',
  idea: 'Not every idea is a good business. Investors test ideas carefully.',
};

const ITEM_TIPS: Partial<Record<S.ItemKind, string>> = {
  deck: 'Pitch decks explain a startup\'s idea to investors.',
  money: 'Seed money pays for building and testing the first product.',
  customer: 'Real customers prove that people want the product.',
  product: 'Product upgrades make the startup more competitive.',
  team: 'Startups hire team members to grow faster.',
  revenue: 'Revenue milestones show the business can earn money.',
  globe: 'Growth funding can help a startup reach new markets.',
};

function decorSprite(d: DecorDef): HTMLCanvasElement {
  switch (d.kind) {
    case 'garage':
      return S.garage();
    case 'billboard':
      return S.billboard();
    case 'lamp':
      return S.lamp();
    case 'tower':
      return S.exitTower();
    case 'tree':
      return S.tree(d.v);
    case 'sign':
      return S.signboard(d.text, d.color);
  }
}

export class StartupRunEngine {
  private ctx: CanvasRenderingContext2D;
  private loop: GameLoop;
  private kb: Keyboard;
  private level: Level;
  private tiles: string[][];
  private tileCanvas: HTMLCanvasElement;
  private levelW: number;
  private sky: HTMLCanvasElement;
  private far: HTMLCanvasElement;
  private mid: HTMLCanvasElement;

  private player: Player;
  private movers: Mover[];
  private walkers: Walker[] = [];
  private flames: Flame[] = [];
  private crushers: Crusher[] = [];
  private spikes: Rect[] = [];
  private items: Item[];
  private pops: Pop[] = [];
  private bumps = new Map<string, number>();
  private checkpoints: Checkpoint[];
  private respawn: { x: number; y: number };
  private gate = { open: false, anim: 0, nearT: 0, lastNag: -10 };

  private particles = new Particles();
  private texts = new FloatTexts();
  private shake = new Shake();
  private camX = 0;
  private time = 0;
  private timeLeft = TIME_LIMIT;
  private stage = 0;
  private state: 'play' | 'finishing' | 'celebrate' | 'done' = 'play';
  private celebrateT = 0;

  // scoring
  private progressPts = 0;
  private itemsTaken = 0;
  private moneyTaken = 0;
  private totalItems: number;
  private decisionsRight = 0;
  private decisionsMade = 0;
  private stomps = 0;
  private hits = 0;
  private pits = 0;
  private penalty = 0;

  private decisions: StartupPair[];
  private goodFirst: boolean[];
  private flags = { intro: false, risk: false, demo: false };
  private tipsShown = new Set<string>();

  constructor(
    private canvas: HTMLCanvasElement,
    private ctl: GameController,
  ) {
    this.ctx = ctx2d(canvas);
    this.level = buildLevel();
    this.tiles = this.level.tiles.map((r) => r.slice());
    this.levelW = this.level.cols * T;
    const rng = createRng(ctl.seed);
    this.decisions = shuffle(rng, DECISIONS).slice(0, 3);
    this.goodFirst = this.decisions.map(() => rng() < 0.5);

    this.sky = S.skyLayer(VW, VH);
    this.far = S.farLayer(Math.ceil(VW + (this.levelW - VW) * 0.2) + 4, VH);
    const starts = this.level.stageStarts;
    this.mid = S.midLayer(Math.ceil(VW + (this.levelW - VW) * 0.5) + 4, VH, (lx) => {
      const worldCenter = (lx - VW / 2) / 0.5 + VW / 2;
      let s = 0;
      for (let i = 0; i < starts.length; i++) if (worldCenter >= starts[i] - 120) s = i;
      return s;
    });
    this.tileCanvas = this.renderTiles();

    const sp = this.level.spawn;
    this.player = {
      x: sp.x,
      y: sp.y,
      w: 10,
      h: 20,
      vx: 0,
      vy: 0,
      dir: 1,
      onGround: true,
      coyote: 0,
      buffer: 0,
      holding: false,
      runT: 0,
      invuln: 0,
      hurtT: 0,
      landT: 0,
      dist: 0,
      platform: null,
      fallSpeed: 0,
    };
    this.respawn = { ...sp };

    this.movers = this.level.movers.map((m) => ({ ...m, x: m.x0, y: m.y0, dx: 0, dy: 0 }));
    for (const e of this.level.enemies) {
      if (e.type === 'walker') {
        const big = e.kind === 'nocust';
        this.walkers.push({
          kind: e.kind,
          x: e.x,
          y: e.y,
          w: big ? 14 : 13,
          h: big ? 14 : 9,
          vx: big ? -30 : -46,
          vy: 0,
          min: e.min,
          max: e.max,
          alive: true,
          squashT: 0,
        });
      } else if (e.type === 'flame') {
        this.flames.push({ mode: e.mode, x0: e.x, y0: e.y, range: e.range, phase: e.phase, x: e.x, y: e.y, visible: false });
      } else if (e.type === 'crusher') {
        this.crushers.push({ x: e.x, y: e.y, topY: e.y, floorY: this.floorBelow(e.x + 12, e.y + 24), state: 'wait', timer: 0, vy: 0 });
      } else {
        this.spikes.push({ x: e.x + 2, y: e.y + 5, w: 12, h: 10 });
      }
    }
    this.items = this.level.items.map((i, n) => ({ ...i, taken: false, phase: n * 0.7 }));
    this.totalItems = this.level.items.length + this.level.qblocks.length;
    this.checkpoints = this.level.checkpoints.map((c) => ({
      ...c,
      reached: false,
      reachedAt: 0,
      groundY: this.floorBelow(c.x + 6, 0),
      raise: 0,
    }));

    this.kb = new Keyboard(
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'ShiftLeft', 'ShiftRight'],
      () => ctl.pause.paused,
    );
    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: () => this.render(),
      isPaused: () => ctl.pause.paused,
      onResume: () => this.kb.clear(),
    });

    ctl.setScoreLabel('SCORE');
    ctl.setTimer(this.timeLeft, 'down');
    this.syncHud();
  }

  start() {
    this.kb.attach();
    this.loop.start();
  }

  destroy() {
    this.loop.stop();
    this.kb.detach();
  }

  /* ───────────────────────── world queries ───────────────────────── */
  private tile(tx: number, ty: number): string {
    if (ty < 0 || ty >= ROWS) return '.';
    if (tx < 0 || tx >= this.level.cols) return 'G';
    return this.tiles[ty][tx];
  }

  private solidAt(px: number, py: number) {
    return SOLID.has(this.tile(Math.floor(px / T), Math.floor(py / T)));
  }

  private floorBelow(px: number, py: number): number {
    const tx = Math.floor(px / T);
    for (let ty = Math.max(0, Math.floor(py / T)); ty < ROWS; ty++) {
      const ch = this.tile(tx, ty);
      if (SOLID.has(ch) || ONE_WAY.has(ch)) return ty * T;
    }
    return ROWS * T + 64;
  }

  private renderTiles(): HTMLCanvasElement {
    const c = makeCanvas(this.levelW, ROWS * T);
    const ctx = ctx2d(c);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < this.level.cols; x++) {
        const ch = this.tiles[y][x];
        if (ch === '.' || ch === 'Q' || ch === 'U') continue;
        ctx.drawImage(S.tileSprite(ch as S.TileChar, (x * 7 + y * 3) % 5), x * T, y * T);
      }
    }
    // Gaps: a dark void below street level so pits never read as walkable floor.
    for (let x = 0; x < this.level.cols; x++) {
      if (this.tiles[ROWS - 1][x] !== '.') continue;
      const top = STREET * T;
      ctx.fillStyle = '#3B3550';
      ctx.fillRect(x * T, top, T, ROWS * T - top);
      ctx.fillStyle = '#2A2638';
      ctx.fillRect(x * T, top + 10, T, ROWS * T - top - 10);
      ctx.fillStyle = '#F29A38';
      for (let i = 0; i < T; i += 4) if ((x * T + i) % 8 === 0) ctx.fillRect(x * T + i, top, 4, 2);
    }
    return c;
  }

  /* ───────────────────────── main update ───────────────────────── */
  private update(dt: number) {
    this.time += dt;

    if (!this.flags.intro && this.time > 0.45) {
      this.flags.intro = true;
      const p = this.player;
      this.script(() => this.ctl.educate('vc-what', this.hl(p.x + p.w / 2, p.y + 6, 34)));
      return;
    }

    if (this.state === 'play') {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.endGame('over');
        return;
      }
    }

    this.updateMovers(dt);
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    if (this.state === 'play') this.interact();
    if (this.state === 'celebrate') this.updateCelebration(dt);

    this.updatePops(dt);
    for (const [k, t] of this.bumps) {
      const nt = t - dt;
      if (nt <= 0) this.bumps.delete(k);
      else this.bumps.set(k, nt);
    }
    if (!this.gate.open && this.moneyTaken >= this.level.gate.need) this.openGate();
    if (this.gate.open && this.gate.anim < 1) this.gate.anim = Math.min(1, this.gate.anim + dt * 1.6);
    for (const cp of this.checkpoints) if (cp.reached && cp.raise < 1) cp.raise = Math.min(1, cp.raise + dt * 2);

    // camera
    const p = this.player;
    const target = clamp(p.x + p.w / 2 - VW * 0.42 + p.dir * 24, 0, this.levelW - VW);
    this.camX = clamp(this.camX + (target - this.camX) * damp(5, dt), 0, this.levelW - VW);

    this.particles.update(dt);
    this.texts.update(dt);
    this.shake.update(dt);
    this.kb.endFrame();
    this.syncHud();
  }

  private updateMovers(dt: number) {
    for (const m of this.movers) {
      const s = 0.5 - 0.5 * Math.cos(((this.time + m.phase * m.period) / m.period) * Math.PI * 2);
      const nx = m.x0 + (m.x1 - m.x0) * s;
      const ny = m.y0 + (m.y1 - m.y0) * s;
      m.dx = nx - m.x;
      m.dy = ny - m.y;
      m.x = nx;
      m.y = ny;
    }
    void dt;
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    const kb = this.kb;
    const controllable = this.state === 'play' && p.hurtT < 0.22;

    // ride moving platforms
    if (p.platform) {
      p.x += p.platform.dx;
      p.y += p.platform.dy;
    }

    let dir = 0;
    if (controllable) {
      if (kb.isDown('ArrowLeft', 'KeyA')) dir -= 1;
      if (kb.isDown('ArrowRight', 'KeyD')) dir += 1;
    }
    const jumpPressed = controllable && kb.consume('Space', 'KeyW', 'ArrowUp');
    const jumpHeld = controllable && kb.isDown('Space', 'KeyW', 'ArrowUp');
    const shift = kb.isDown('ShiftLeft', 'ShiftRight');

    if (dir !== 0 && p.onGround && dir === p.dir) p.runT += dt;
    else if (dir === 0 || dir !== p.dir) p.runT = 0;
    const max = p.runT > 0.45 || shift ? RUN : WALK;

    if (dir !== 0) {
      p.dir = dir as 1 | -1;
      if (Math.sign(p.vx) === dir && Math.abs(p.vx) > max) {
        // Above the cap (e.g. run → walk): ease down to it, never accelerate further.
        p.vx = dir * Math.max(max, Math.abs(p.vx) - 500 * dt);
      } else {
        const turning = Math.sign(p.vx) !== 0 && Math.sign(p.vx) !== dir;
        const acc = (p.onGround ? ACC_GROUND : ACC_AIR) * (turning ? 1.8 : 1);
        p.vx += dir * acc * dt;
        if (dir > 0 && p.vx > max) p.vx = max;
        if (dir < 0 && p.vx < -max) p.vx = -max;
      }
    } else {
      const dec = (p.onGround ? DECEL_GROUND : DECEL_AIR) * dt;
      p.vx = Math.abs(p.vx) <= dec ? 0 : p.vx - Math.sign(p.vx) * dec;
    }

    // jump: buffered + coyote time
    if (jumpPressed) p.buffer = 0.13;
    else p.buffer -= dt;
    if (p.onGround) p.coyote = 0.1;
    else p.coyote -= dt;
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -JUMP_V - Math.min(40, Math.abs(p.vx) * 0.18);
      p.onGround = false;
      p.coyote = 0;
      p.buffer = 0;
      p.holding = true;
      p.platform = null;
      sfx.play('jump');
      this.particles.burst(p.x + p.w / 2, p.y + p.h, 5, { colors: ['#E6E2D6', '#FFFFFF'], speed: [20, 60], angle: -Math.PI / 2, spread: 2.4, gravity: 60, life: [0.2, 0.35] });
    }
    if (p.holding && !jumpHeld) {
      if (p.vy < 0) p.vy *= 0.45;
      p.holding = false;
    }
    const g = p.vy < 0 && p.holding ? HOLD_G : FALL_G;
    p.vy = Math.min(p.vy + g * dt, MAX_FALL);
    if (p.vy > 0) p.fallSpeed = p.vy;

    const wasGround = p.onGround;
    this.moveX(dt);
    const prevBottom = p.y + p.h;
    this.moveY(dt, prevBottom);

    if (p.onGround && !wasGround) {
      if (p.fallSpeed > 260) {
        p.landT = 0.12;
        sfx.play('land');
        this.particles.burst(p.x + p.w / 2, p.y + p.h, 6, { colors: ['#E6E2D6', '#FFFFFF'], speed: [25, 70], angle: -Math.PI / 2, spread: 3, gravity: 80, life: [0.2, 0.4] });
      }
      p.fallSpeed = 0;
    }
    p.landT = Math.max(0, p.landT - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.dist += Math.abs(p.vx) * dt;

    // fell into a gap
    if (p.y > VH + 40 && this.state === 'play') this.fellInPit();
  }

  private moveX(dt: number) {
    const p = this.player;
    p.x += p.vx * dt;
    if (p.x < 0) {
      p.x = 0;
      p.vx = 0;
    }
    if (p.x + p.w > this.levelW) {
      p.x = this.levelW - p.w;
      p.vx = 0;
    }
    const top = Math.floor(p.y / T);
    const bottom = Math.floor((p.y + p.h - 0.01) / T);
    if (p.vx > 0) {
      const tx = Math.floor((p.x + p.w) / T);
      for (let ty = top; ty <= bottom; ty++)
        if (SOLID.has(this.tile(tx, ty))) {
          p.x = tx * T - p.w;
          p.vx = 0;
          break;
        }
    } else if (p.vx < 0) {
      const tx = Math.floor(p.x / T);
      for (let ty = top; ty <= bottom; ty++)
        if (SOLID.has(this.tile(tx, ty))) {
          p.x = (tx + 1) * T;
          p.vx = 0;
          break;
        }
    }
    if (!this.gate.open) {
      const g = this.gateRect();
      if (overlaps(p, g)) {
        if (p.x + p.w / 2 < g.x + g.w / 2) p.x = g.x - p.w;
        else p.x = g.x + g.w;
        p.vx = 0;
        this.gateBlocked();
      }
    }
  }

  private moveY(dt: number, prevBottom: number) {
    const p = this.player;
    p.y += p.vy * dt;
    p.onGround = false;
    const left = Math.floor((p.x + 1) / T);
    const right = Math.floor((p.x + p.w - 1) / T);
    if (p.vy >= 0) {
      const ty = Math.floor((p.y + p.h) / T);
      for (let tx = left; tx <= right; tx++) {
        const ch = this.tile(tx, ty);
        if (SOLID.has(ch) || (ONE_WAY.has(ch) && prevBottom <= ty * T + 0.5)) {
          p.y = ty * T - p.h;
          p.vy = 0;
          p.onGround = true;
          break;
        }
      }
    } else {
      const ty = Math.floor(p.y / T);
      let hit = -1;
      let best = Infinity;
      for (let tx = left; tx <= right; tx++) {
        if (SOLID.has(this.tile(tx, ty))) {
          const d = Math.abs(tx * T + 8 - (p.x + p.w / 2));
          if (d < best) {
            best = d;
            hit = tx;
          }
        }
      }
      if (hit >= 0) {
        p.y = (ty + 1) * T;
        p.vy = 0;
        p.holding = false;
        this.bumpBlock(hit, ty);
      }
    }

    // one-way moving platforms
    let on: Mover | null = null;
    if (p.vy >= 0) {
      for (const m of this.movers) {
        if (p.x + p.w > m.x + 1 && p.x < m.x + m.w - 1 && prevBottom <= m.y + 3 && p.y + p.h >= m.y) {
          p.y = m.y - p.h;
          p.vy = 0;
          p.onGround = true;
          on = m;
          break;
        }
      }
    }
    p.platform = on;
  }

  private updateEnemies(dt: number) {
    const near = (x: number) => x > this.camX - 160 && x < this.camX + VW + 160;
    for (const w of this.walkers) {
      if (!w.alive) {
        w.squashT -= dt;
        continue;
      }
      if (!near(w.x)) continue;
      w.vy = Math.min(w.vy + 1200 * dt, 400);
      w.x += w.vx * dt;
      const dir = Math.sign(w.vx);
      const ahead = dir > 0 ? w.x + w.w : w.x;
      const wall = this.solidAt(ahead + dir, w.y + w.h / 2);
      const footX = ahead + dir * 2;
      const ground = this.solidAt(footX, w.y + w.h + 2) || ONE_WAY.has(this.tile(Math.floor(footX / T), Math.floor((w.y + w.h + 2) / T)));
      if (w.x < w.min || w.x + w.w > w.max || wall || !ground) {
        w.vx = -w.vx;
        w.x = clamp(w.x, w.min, w.max - w.w);
      }
      w.y += w.vy * dt;
      const fy = Math.floor((w.y + w.h) / T);
      if (this.solidAt(w.x + w.w / 2, w.y + w.h)) {
        w.y = fy * T - w.h;
        w.vy = 0;
      }
      if (w.y > VH + 50) w.alive = false;
    }

    for (const f of this.flames) {
      if (f.mode === 'bob') {
        const s = Math.sin(((this.time + f.phase) * Math.PI * 2) / 2.8);
        f.visible = s > 0.05;
        f.x = f.x0;
        f.y = f.y0 - f.range * Math.max(0, s);
      } else {
        f.visible = true;
        f.x = f.x0 + f.range * (0.5 - 0.5 * Math.cos((this.time + f.phase) * 0.85));
        f.y = f.y0 + Math.sin(this.time * 5 + f.phase) * 3;
      }
    }

    const p = this.player;
    for (const c of this.crushers) {
      switch (c.state) {
        case 'wait': {
          c.timer -= dt;
          const pc = p.x + p.w / 2;
          if (c.timer <= 0 && pc > c.x - 8 && pc < c.x + 32 && p.y > c.y + 20 && near(c.x)) {
            c.state = 'warn';
            c.timer = 0.38;
          }
          break;
        }
        case 'warn':
          c.timer -= dt;
          if (c.timer <= 0) {
            c.state = 'fall';
            c.vy = 0;
          }
          break;
        case 'fall':
          c.vy += 2300 * dt;
          c.y += c.vy * dt;
          if (c.y + 24 >= c.floorY) {
            c.y = c.floorY - 24;
            c.state = 'stay';
            c.timer = 0.85;
            if (near(c.x)) {
              this.shake.kick(3, 0.25);
              sfx.play('stomp');
              this.particles.burst(c.x + 12, c.floorY, 12, { colors: ['#D6D4CE', '#B3B1AB'], speed: [30, 90], angle: -Math.PI / 2, spread: 3, gravity: 120 });
            }
          }
          break;
        case 'stay':
          c.timer -= dt;
          if (c.timer <= 0) c.state = 'rise';
          break;
        case 'rise':
          c.y -= 55 * dt;
          if (c.y <= c.topY) {
            c.y = c.topY;
            c.state = 'wait';
            c.timer = 0.7;
          }
          break;
      }
    }
  }

  /* ───────────────────────── interactions ───────────────────────── */
  private interact() {
    const p = this.player;
    const pb: Rect = { x: p.x, y: p.y, w: p.w, h: p.h };

    // collectibles
    for (const it of this.items) {
      if (it.taken) continue;
      if (Math.abs(it.x - (p.x + p.w / 2)) < 11 && Math.abs(it.y - (p.y + p.h / 2)) < 15) this.collect(it.kind, it.x, it.y, it);
    }

    // hazards
    for (const w of this.walkers) {
      if (!w.alive) continue;
      const wb: Rect = { x: w.x, y: w.y, w: w.w, h: w.h };
      if (!overlaps(pb, wb)) continue;
      const prevBottom = p.y + p.h - p.vy / 60;
      if (p.vy > 30 && prevBottom <= w.y + 7) {
        w.alive = false;
        w.squashT = 0.5;
        p.vy = this.kb.isDown('Space', 'KeyW', 'ArrowUp') ? -330 : -240;
        p.holding = this.kb.isDown('Space', 'KeyW', 'ArrowUp');
        this.stomps++;
        sfx.play('stomp');
        this.texts.add(`+${POINTS.stomp} SOLVED!`, w.x + w.w / 2, w.y - 6, { color: '#3C8A50' });
        this.particles.burst(w.x + w.w / 2, w.y + w.h / 2, 12, {
          colors: w.kind === 'nocust' ? ['#E0524A', '#F07A6E', '#FFFFFF'] : ['#5B3F8C', '#8C6BC4', '#FFFFFF'],
          speed: [40, 110],
        });
      } else {
        this.hit(w.kind, w.x + w.w / 2);
      }
    }
    for (const f of this.flames) {
      if (!f.visible) continue;
      if (overlaps(pb, { x: f.x - 4, y: f.y + 3, w: 8, h: 10 })) this.hit('burn', f.x);
    }
    for (const c of this.crushers) {
      if (overlaps(pb, { x: c.x + 1, y: c.y + 1, w: 22, h: 23 })) this.hit('crush', c.x + 12);
    }
    for (const s of this.spikes) if (overlaps(pb, s)) this.hit('idea', s.x + s.w / 2);

    // checkpoints & stages
    const pc = p.x + p.w / 2;
    for (const cp of this.checkpoints) if (!cp.reached && pc >= cp.x) this.reachCheckpoint(cp);

    // learning moment: first startup risks
    if (!this.flags.risk && pc >= this.level.riskTriggerX) {
      this.flags.risk = true;
      const bug = this.walkers.find((w) => w.kind === 'bug' && w.alive && w.x > p.x);
      const target = bug ? { x: bug.x + bug.w / 2, y: bug.y + 2 } : { x: pc + 120, y: STREET * T - 10 };
      this.script(() => this.ctl.educate('vc-risk', this.hl(target.x, target.y, 30)));
    }
    if (!this.flags.demo && pc >= this.level.demoDayX) {
      this.flags.demo = true;
      this.script(() => this.askDecision(1));
    }

    if (pc >= this.level.finishX) this.startFinish();
  }

  private collect(kind: S.ItemKind, x: number, y: number, it?: Item) {
    if (it) it.taken = true;
    this.itemsTaken++;
    if (kind === 'money') this.moneyTaken++;
    sfx.play(kind === 'money' ? 'coin' : 'collect');
    const pts = POINTS.items / this.totalItems;
    this.texts.add(`+${pts.toFixed(1)}`, x, y - 10, { color: '#B8641A' });
    this.particles.burst(x, y, 8, {
      colors: kind === 'money' ? ['#F4C542', '#FFF3C4', '#E2A72E'] : ['#FFFFFF', '#F29A38', '#F4C542'],
      speed: [30, 80],
      gravity: 40,
      life: [0.25, 0.5],
    });
    const tip = ITEM_TIPS[kind];
    if (tip && !this.tipsShown.has(kind)) {
      this.tipsShown.add(kind);
      this.ctl.callout(tip, 'good');
    }
  }

  private bumpBlock(tx: number, ty: number) {
    const ch = this.tile(tx, ty);
    this.bumps.set(`${tx},${ty}`, 0.14);
    if (ch === 'Q') {
      this.tiles[ty][tx] = 'U';
      const q = this.level.qblocks.find((b) => b.tx === tx && b.ty === ty);
      this.pops.push({ kind: q?.item ?? 'money', x: tx * T + 8, y: ty * T - 6, t: 0 });
      sfx.play('bump');
    } else {
      sfx.play('bump');
    }
  }

  private updatePops(dt: number) {
    for (const pop of this.pops) {
      pop.t += dt;
      pop.y -= (60 - pop.t * 160) * dt;
      if (pop.t > 0.42 && pop.t - dt <= 0.42) this.collect(pop.kind, pop.x, pop.y);
    }
    this.pops = this.pops.filter((p) => p.t <= 0.42);
  }

  private hit(kind: HazardKind, fromX: number) {
    const p = this.player;
    if (p.invuln > 0 || this.state !== 'play') return;
    this.hits++;
    this.penalty += POINTS.hit;
    p.invuln = 1.5;
    p.hurtT = 0.45;
    p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 95;
    p.vy = -190;
    p.holding = false;
    p.platform = null;
    sfx.play('hit');
    this.shake.kick(3, 0.25);
    this.texts.add(`-${POINTS.hit}`, p.x + p.w / 2, p.y - 8, { color: '#E0524A' });
    this.particles.burst(p.x + p.w / 2, p.y + p.h / 2, 10, { colors: ['#E0524A', '#FFFFFF'], speed: [40, 100] });
    if (!this.tipsShown.has(kind)) {
      this.tipsShown.add(kind);
      this.ctl.callout(HAZARD_TIPS[kind], 'bad');
    }
  }

  private fellInPit() {
    const p = this.player;
    this.pits++;
    this.penalty += POINTS.pit;
    sfx.play('fall');
    p.x = this.respawn.x;
    p.y = this.respawn.y;
    p.vx = 0;
    p.vy = 0;
    p.invuln = 1.6;
    p.platform = null;
    this.camX = clamp(p.x - VW * 0.42, 0, this.levelW - VW);
    this.texts.add(`-${POINTS.pit} BACK TO CHECKPOINT`, p.x + p.w / 2, p.y - 14, { color: '#E0524A', font: 'small', scale: 2 });
    if (!this.tipsShown.has('pit')) {
      this.tipsShown.add('pit');
      this.ctl.callout('Oops! Checkpoints save your progress — try that jump again.', 'info');
    }
  }

  private gateRect(): Rect {
    return { x: this.level.gate.x, y: STREET * T - 112, w: 40, h: 112 };
  }

  private gateBlocked() {
    this.gate.nearT += 1 / 60;
    const need = this.level.gate.need - this.moneyTaken;
    if (this.time - this.gate.lastNag > 4) {
      this.gate.lastNag = this.time;
      sfx.play('error');
      this.ctl.callout(`Seed round not closed: collect ${need} more ₹ coin${need === 1 ? '' : 's'} to unlock the city.`, 'info');
    }
    if (this.gate.nearT > 12) {
      this.openGate();
      this.ctl.callout('An investor took a chance on you — this time!', 'good');
    }
  }

  private openGate() {
    if (this.gate.open) return;
    this.gate.open = true;
    sfx.play('gate');
    const g = this.gateRect();
    this.texts.add('SEED ROUND CLOSED!', g.x + 20, g.y - 10, { color: '#3C8A50', scale: 1 });
    this.particles.burst(g.x + 20, g.y + 20, 24, { colors: ['#6DBD81', '#F4C542', '#FFFFFF'], speed: [40, 120] });
  }

  private reachCheckpoint(cp: Checkpoint) {
    cp.reached = true;
    cp.reachedAt = this.time;
    this.respawn = { x: cp.x - 6, y: cp.groundY - this.player.h };
    this.progressPts += cp.points;
    sfx.play('checkpoint');
    if (cp.points) this.texts.add(`+${cp.points} STAGE`, cp.x + 10, cp.groundY - 70, { color: '#B8641A' });
    if (cp.stage !== null && cp.stage > this.stage) {
      this.stage = cp.stage;
      this.ctl.banner(`STAGE 0${cp.stage + 1}`, STAGE_NAMES[cp.stage]);
    }
    if (cp.stage === 1) {
      const nx = (cp.npcX ?? cp.x) + 8;
      this.script(async () => {
        await this.ctl.educate('vc-seed', this.hl(nx, cp.groundY - 14, 30));
        await this.askDecision(0);
      });
    } else if (cp.stage === 3) {
      const nx = (cp.npcX ?? cp.x) + 8;
      this.script(async () => {
        await this.ctl.educate('vc-growth', this.hl(nx, cp.groundY - 14, 30));
        await this.askDecision(2);
      });
    } else if (cp.stage === 4) {
      this.ctl.callout('The EXIT tower is ahead — an acquisition or a public listing.', 'info');
    } else if (cp.stage === null) {
      this.ctl.callout('Checkpoint saved.', 'good');
    }
  }

  private async askDecision(i: number) {
    const pair = this.decisions[i];
    const goodFirst = this.goodFirst[i];
    const cards = goodFirst ? [pair.good, pair.hype] : [pair.hype, pair.good];
    const cfg: ChoiceConfig = {
      kicker: `INVESTMENT DECISION ${i + 1} / 3`,
      title: 'WHICH STARTUP DESERVES A CLOSER LOOK?',
      prompt: 'You only have time to study one of these startups more closely. Click a card (or press 1 / 2).',
      options: cards.map((c, j) => ({
        tag: `STARTUP ${'AB'[j]}`,
        title: c.name,
        subtitle: c.pitch,
        lines: c.lines,
        art: createElement('img', {
          src: S.startupLogo(c.name[0], c.color),
          alt: '',
          className: 'pixelated',
          style: { width: 72, height: 72 },
        }),
      })),
      feedback: (idx) => {
        const good = (idx === 0) === goodFirst;
        return good
          ? { tone: 'good', title: 'SMART PICK!', points: `+${POINTS.decision}`, body: pair.why }
          : { tone: 'bad', title: 'RISKY PICK', points: '+0', body: pair.whyNot };
      },
    };
    const idx = await this.ctl.choose(cfg);
    this.decisionsMade++;
    if ((idx === 0) === goodFirst) this.decisionsRight++;
    this.syncHud();
  }

  private startFinish() {
    if (this.state !== 'play') return;
    this.state = 'finishing';
    const p = this.player;
    p.vx = 0;
    p.invuln = 0;
    sfx.play('checkpoint');
    this.script(async () => {
      await this.ctl.educate('vc-exit', this.hl(this.level.towerX + 70, 90, 80));
      this.state = 'celebrate';
      this.celebrateT = 0;
    });
  }

  private updateCelebration(dt: number) {
    const p = this.player;
    this.celebrateT += dt;
    if (p.onGround && this.celebrateT < 2.4) {
      p.vy = -230;
      p.onGround = false;
    }
    if (Math.floor(this.celebrateT * 3) !== Math.floor((this.celebrateT - dt) * 3)) {
      const fx = this.level.towerX + 20 + Math.random() * 100;
      const fy = 30 + Math.random() * 60;
      this.particles.burst(fx, fy, 26, {
        colors: ['#F29A38', '#F4C542', '#9369D0', '#6DBD81', '#5D91E5', '#FFFFFF'],
        speed: [40, 120],
        gravity: 60,
        life: [0.5, 1],
      });
      sfx.play('pulse');
    }
    if (this.celebrateT > 2.8) this.endGame('complete');
  }

  /* ───────────────────────── scoring ───────────────────────── */
  private timeBonus(): number {
    return this.state === 'celebrate' || this.state === 'done' ? Math.min(POINTS.timeBonusMax, Math.round(this.timeLeft * 1.2)) : 0;
  }

  private score(): number {
    const raw =
      Math.min(150, this.progressPts) +
      (this.state === 'celebrate' || this.state === 'done' ? POINTS.exit : 0) +
      (this.itemsTaken * POINTS.items) / this.totalItems +
      this.decisionsRight * POINTS.decision +
      this.stomps * POINTS.stomp +
      this.timeBonus() -
      this.penalty;
    return clamp(Math.round(raw), 0, 500);
  }

  private syncHud() {
    this.ctl.setScore(this.score());
    this.ctl.setTimer(this.timeLeft, 'down');
    this.ctl.setProgress({ label: STAGE_NAMES[this.stage], value: this.stage / 4, steps: STAGE_STEPS, step: this.stage });
  }

  private endGame(outcome: 'complete' | 'over') {
    if (this.state === 'done') return;
    const finished = outcome === 'complete';
    if (finished) this.state = 'done';
    const items = (this.itemsTaken * POINTS.items) / this.totalItems;
    const tb = finished ? Math.min(POINTS.timeBonusMax, Math.round(this.timeLeft * 1.2)) : 0;
    const score = this.score();
    this.state = 'done';
    this.ctl.finish({
      score,
      outcome,
      headline: finished ? 'EXIT REACHED!' : 'RUNWAY RAN OUT',
      subline: finished
        ? 'Your startup reached an exit. In real life, many never do.'
        : 'Time ran out before the exit — many real startups run out of money too.',
      breakdown: [
        { label: 'Startup stages reached', value: Math.min(150, this.progressPts), max: 150 },
        { label: 'Exit reached', value: finished ? POINTS.exit : 0, max: POINTS.exit },
        { label: 'Milestones collected', value: Math.round(items), max: POINTS.items, note: `${this.itemsTaken}/${this.totalItems}` },
        { label: 'Smart startup picks', value: this.decisionsRight * POINTS.decision, max: 3 * POINTS.decision, note: `${this.decisionsRight}/3` },
        { label: 'Runway bonus (time left)', value: tb, max: POINTS.timeBonusMax },
        { label: 'Problems stomped', value: this.stomps * POINTS.stomp },
        { label: 'Hazard penalties', value: -this.penalty, note: `${this.hits} hits · ${this.pits} falls` },
      ],
      stat: { label: 'Milestones collected', value: `${this.itemsTaken} / ${this.totalItems}` },
      extraStats: [
        { label: 'Smart picks', value: `${this.decisionsRight} / 3` },
        { label: 'Time used', value: formatTime(TIME_LIMIT - this.timeLeft) },
      ],
    });
  }

  /* ───────────────────────── helpers ───────────────────────── */
  private script(fn: () => Promise<void>) {
    this.ctl.pause.add('scene');
    fn()
      .catch(() => undefined)
      .finally(() => {
        this.ctl.pause.remove('scene');
        this.kb.clear();
      });
  }

  private hl(wx: number, wy: number, r: number): Highlight | null {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width) return null;
    const s = rect.width / VW;
    return { x: rect.left + (wx - Math.round(this.camX)) * s, y: rect.top + wy * s, r: r * s };
  }

  /* ───────────────────────── render ───────────────────────── */
  private render() {
    const ctx = this.ctx;
    const cam = Math.round(this.camX);
    const t = this.loop.time;
    ctx.save();
    ctx.translate(this.shake.x, this.shake.y);

    ctx.drawImage(this.sky, 0, 0);
    for (let i = 0; i < 6; i++) {
      const span = VW + 120;
      const x = ((((i * 97 + 30 - cam * 0.08 - this.time * 4) % span) + span) % span) - 60;
      ctx.drawImage(S.cloud(i), Math.round(x), 14 + ((i * 37) % 70));
    }
    ctx.drawImage(this.far, Math.round(cam * 0.2), 0, VW, VH, 0, 0, VW, VH);
    ctx.drawImage(this.mid, Math.round(cam * 0.5), 0, VW, VH, 0, 0, VW, VH);

    // decor
    for (const d of this.level.decor) {
      const img = decorSprite(d);
      const dx = d.x - cam;
      if (dx > VW + 10 || dx + img.width < -10) continue;
      ctx.drawImage(img, dx, d.kind === 'lamp' ? d.y - 2 : d.kind === 'tree' ? d.y - 2 : d.y);
    }

    // tiles
    ctx.drawImage(this.tileCanvas, cam, 0, VW, VH, 0, 0, VW, VH);
    const shine = Math.floor(t * 2) % 4 === 0 ? 1 : 0;
    for (const q of this.level.qblocks) {
      const x = q.tx * T - cam;
      if (x < -T || x > VW) continue;
      const bump = this.bumps.get(`${q.tx},${q.ty}`) ?? 0;
      const off = bump > 0 ? Math.round(Math.sin((bump / 0.14) * Math.PI) * 4) : 0;
      ctx.drawImage(S.tileSprite(this.tiles[q.ty][q.tx] === 'Q' ? 'Q' : 'U', shine), x, q.ty * T - off);
    }

    // checkpoints + npcs
    for (const cp of this.checkpoints) {
      const x = cp.x - cam;
      if (x < -60 || x > VW + 60) continue;
      ctx.drawImage(S.flagPole(cp.raise, cp.reached ? '#6DBD81' : '#F29A38', cp.label), x - 4, cp.groundY - 86);
      if (cp.npc) {
        const look = cp.npc === 'elder' ? S.ELDER_LOOK : S.GROWTH_LOOK;
        const nx = (cp.npcX ?? cp.x) - cam;
        ctx.drawImage(S.personFrame(look, 'idle', Math.floor(t * 2), -1), nx, cp.groundY - 25);
        if (cp.reached && this.time - cp.reachedAt < 5) {
          drawLabel(ctx, cp.npc === 'elder' ? 'SEED ₹!' : 'SERIES A!', nx + 9, cp.groundY - 40, { font: 'big', bg: '#FFFFFF', fg: S.INK, border: S.INK, padX: 3, padY: 2 });
        } else if (!cp.reached) {
          drawLabel(ctx, 'INVESTOR', nx + 9, cp.groundY - 36, { font: 'small', bg: '#FFFFFF', fg: S.INK, border: S.INK });
        }
      }
    }

    // gate
    const g = this.gateRect();
    if (g.x - cam > -60 && g.x - cam < VW + 20) {
      ctx.drawImage(S.gateSprite(this.gate.anim, this.moneyTaken, this.level.gate.need), g.x - cam, g.y);
    }

    // moving platforms
    for (const m of this.movers) {
      const x = Math.round(m.x - cam);
      if (x > VW || x + m.w < 0) continue;
      const y = Math.round(m.y);
      if (m.x0 === m.x1) {
        ctx.fillStyle = '#6D6C67';
        ctx.fillRect(x + 4, 0, 1, y);
        ctx.fillRect(x + m.w - 5, 0, 1, y);
      }
      for (let i = 0; i < m.w / T; i++) ctx.drawImage(S.tileSprite('S'), x + i * T, y);
    }

    // items
    for (const it of this.items) {
      if (it.taken) continue;
      const x = it.x - cam;
      if (x < -16 || x > VW + 16) continue;
      const bob = Math.round(Math.sin(t * 3 + it.phase) * 2);
      const img = it.kind === 'money' ? S.coinFrame(Math.floor(t * 9 + it.phase * 3)) : S.itemSprite(it.kind);
      ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(it.y - img.height / 2 + bob));
      if (it.kind !== 'money' && Math.floor(t * 3 + it.phase) % 4 === 0) {
        ctx.drawImage(S.sparkle(Math.floor(t * 8)), Math.round(x + 4), Math.round(it.y - 10 + bob));
      }
    }
    for (const pop of this.pops) {
      const img = pop.kind === 'money' ? S.coinFrame(Math.floor(pop.t * 20)) : S.itemSprite(pop.kind);
      ctx.drawImage(img, Math.round(pop.x - cam - img.width / 2), Math.round(pop.y - img.height / 2));
    }

    // hazards
    for (const s of this.spikes) {
      const x = s.x - 2 - cam;
      if (x < -20 || x > VW + 20) continue;
      ctx.drawImage(S.badIdea(), x - 1, s.y - 6);
      drawLabel(ctx, 'BAD IDEA', x + 8, s.y - 15, { font: 'small', bg: '#6D6C67', fg: '#FFFFFF' });
    }
    for (const w of this.walkers) {
      const x = Math.round(w.x - cam);
      if (x < -40 || x > VW + 40) continue;
      if (!w.alive) {
        if (w.squashT > 0) {
          ctx.fillStyle = w.kind === 'nocust' ? '#B23A33' : '#3E2A63';
          ctx.fillRect(x, Math.round(w.y + w.h - 4), w.w, 4);
        }
        continue;
      }
      const frame = Math.floor(t * 6);
      const img = w.kind === 'nocust' ? S.noCustomers(frame) : S.bug(frame);
      ctx.save();
      if (w.vx < 0) {
        ctx.translate(x + w.w / 2, 0);
        ctx.scale(-1, 1);
        ctx.translate(-(x + w.w / 2), 0);
      }
      ctx.drawImage(img, x - (w.kind === 'nocust' ? 2 : 1), Math.round(w.y - 2));
      ctx.restore();
      if (w.kind === 'nocust') {
        drawLabel(ctx, 'NO CUSTOMERS', x + w.w / 2, Math.round(w.y) - 10, { font: 'small', bg: '#E0524A', fg: '#FFFFFF' });
      } else {
        drawLabel(ctx, 'BUGS', x + w.w / 2, Math.round(w.y) - 9, { font: 'small', bg: '#5B3F8C', fg: '#FFFFFF' });
      }
    }
    for (const f of this.flames) {
      if (!f.visible) continue;
      const x = Math.round(f.x - cam);
      if (x < -20 || x > VW + 20) continue;
      ctx.drawImage(S.flame(Math.floor(t * 10)), x - 7, Math.round(f.y - 2));
      drawLabel(ctx, 'BURN RATE', x, Math.round(f.y) - 10, { font: 'small', bg: '#E8562A', fg: '#FFFFFF' });
    }
    for (const c of this.crushers) {
      const x = Math.round(c.x - cam);
      if (x < -40 || x > VW + 40) continue;
      const jitter = c.state === 'warn' ? Math.round(Math.sin(t * 60)) : 0;
      ctx.drawImage(S.crusher(c.state === 'fall' || c.state === 'stay' ? 'angry' : 'idle'), x - 1 + jitter, Math.round(c.y) - 1);
      drawLabel(ctx, 'WEAK DEMAND', x + 12, Math.round(c.y) - 9, { font: 'small', bg: '#6D6C67', fg: '#FFFFFF' });
    }

    // player
    const p = this.player;
    const blink = p.invuln > 0 && this.state === 'play' && Math.floor(t * 14) % 2 === 0;
    if (!blink) {
      const frame = this.playerFrame(t);
      ctx.drawImage(frame, Math.round(p.x + p.w / 2 - 9 - cam), Math.round(p.y + p.h - 25));
    }

    this.particles.draw(ctx, cam, 0);
    this.texts.draw(ctx, cam, 0);
    ctx.restore();

    this.drawMiniHud(ctx);
  }

  private playerFrame(t: number): HTMLCanvasElement {
    const p = this.player;
    const look = S.VC_LOOK;
    if (this.state === 'celebrate' || this.state === 'finishing') return S.personFrame(look, 'cheer', Math.floor(t * 4), 1);
    if (p.hurtT > 0) return S.personFrame(look, 'hurt', 0, p.dir);
    if (!p.onGround) return S.personFrame(look, p.vy < 0 ? 'jump' : 'fall', 0, p.dir);
    if (p.landT > 0) return S.personFrame(look, 'land', 0, p.dir);
    const speed = Math.abs(p.vx);
    if (speed > 112) return S.personFrame(look, 'run', Math.floor(p.dist / 9), p.dir);
    if (speed > 6) return S.personFrame(look, 'walk', Math.floor(p.dist / 7), p.dir);
    const blinkNow = t % 3.2 < 0.12;
    return blinkNow ? S.personFrame(look, 'blink', 0, p.dir) : S.personFrame(look, 'idle', Math.floor(t * 1.6), p.dir);
  }

  private drawMiniHud(ctx: CanvasRenderingContext2D) {
    const money = `${this.moneyTaken}`;
    const items = `${this.itemsTaken}/${this.totalItems}`;
    const deckX = 23 + textWidth(money) + 8;
    const w = deckX + 15 + textWidth(items) + 6;
    ctx.fillStyle = S.INK;
    ctx.fillRect(5, 5, w, 17);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(6, 6, w - 2, 15);
    ctx.drawImage(S.coinFrame(0), 8, 7);
    drawText(ctx, money, 23, 10, { color: S.INK });
    ctx.drawImage(S.itemSprite('deck'), deckX, 7);
    drawText(ctx, items, deckX + 15, 10, { color: S.INK });
    if (this.stage === 1 && !this.gate.open) {
      const need = this.level.gate.need;
      drawLabel(ctx, `SEED ROUND ₹${Math.min(this.moneyTaken, need)}/${need}`, 64, 26, { font: 'small', bg: '#6DBD81', fg: S.INK, padX: 3, padY: 2 });
    }
  }
}
