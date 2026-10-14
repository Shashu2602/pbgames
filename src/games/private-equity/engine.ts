import { createStore, type Store } from '../../app/store';
import { sfx } from '../../engine/audio';
import { Keyboard } from '../../engine/input';
import { GameLoop } from '../../engine/loop';
import { FloatTexts, Particles, Shake } from '../../engine/particles';
import { ctx2d } from '../../engine/pixel';
import { drawText } from '../../engine/pixelfont';
import { createRng, shuffle, type Rng } from '../../engine/random';
import type { GameController } from '../types';
import { COLS, HIDDEN, pieceCells, ROWS, Well, type CellKind, type Piece, type Shape, type Upgrade } from './blocks';
import {
  BUILD_TIME,
  Economy,
  IMPROVEMENT_MSG,
  INTEREST_EVERY,
  NEWS,
  OFFER_AMOUNT,
  scoreParts,
  UPGRADE_INFO,
  type NewsKind,
} from './economy';
import { CELL, cellSprite } from './sprites';

export const BOARD_W = COLS * CELL + 8;
export const BOARD_H = (ROWS - HIDDEN) * CELL + 8;
const OX = 4;
const OY = 4;

export interface NewsItem {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'info';
}

export interface PeUi {
  value: number;
  eff: number;
  debt: number;
  rate: number;
  interestPaid: number;
  lines: number;
  timeLeft: number;
  next: { shape: Shape; up: Upgrade }[];
  offer: number | null;
  news: NewsItem[];
  improvement: { id: number; text: string; gain: number; up: Upgrade } | null;
  boost: number;
  height: number;
}

const GRAVITY = [0.8, 0.62, 0.48, 0.36];
const LOCK_DELAY = 0.5;
const DAS = 0.16;
const ARR = 0.05;
const SOFT = 0.035;

export class PEEngine {
  readonly ui: Store<PeUi>;
  private ctx: CanvasRenderingContext2D;
  private loop: GameLoop;
  private kb: Keyboard;
  private rng: Rng;
  private well: Well;
  private piece: Piece | null = null;
  private gravT = 0;
  private lockT = 0;
  private lockResets = 0;
  private das = { dir: 0, t: 0 };
  private softT = 0;
  private clearing: { rows: number[]; t: number } | null = null;
  private time = 0;
  private interestT = 0;
  private events: { t: number; kind: NewsKind; done: boolean }[];
  private offers: { t: number; done: boolean }[];
  private offerUntil = 0;
  private pendingFinance = false;
  private particles = new Particles();
  private texts = new FloatTexts();
  private shake = new Shake();
  private news: NewsItem[] = [];
  private newsId = 1;
  private improvement: PeUi['improvement'] = null;
  private flags = { value: false, debt: false };
  private ended = false;
  private uiTick = 0;
  topOut = false;

  constructor(
    canvas: HTMLCanvasElement,
    private ctl: GameController,
    readonly econ: Economy,
    private onEnd: (topOut: boolean) => void,
  ) {
    this.ctx = ctx2d(canvas);
    this.rng = createRng(ctl.seed ^ 0x5bd1e995);
    this.well = new Well(this.rng);
    const kinds = shuffle(this.rng, ['costs', 'demand', 'rates'] as NewsKind[]);
    kinds.push(this.rng() < 0.5 ? 'manager' : 'demand');
    this.events = [20, 50, 82, 106].map((t, i) => ({ t, kind: kinds[i], done: false }));
    this.offers = [34, 68, 96].map((t) => ({ t, done: false }));
    this.kb = new Keyboard(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyZ', 'KeyX', 'KeyB'], () => ctl.pause.paused);
    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: () => this.render(),
      isPaused: () => ctl.pause.paused,
      onResume: () => {
        this.kb.clear();
        this.das.dir = 0;
      },
    });
    this.ui = createStore<PeUi>(this.snapshot());
    this.piece = this.well.spawn();
    this.pushNews('Company acquired. Stack upgrade blocks — complete rows to improve the business!', 'info');
  }

  start() {
    this.kb.attach();
    this.loop.start();
  }

  destroy() {
    this.loop.stop();
    this.kb.detach();
  }

  /** Accept the current borrowing offer (B key or button). */
  acceptOffer() {
    if (this.ended || this.offerUntil <= this.time) return;
    this.offerUntil = 0;
    this.pendingFinance = true;
    sfx.play('powerup');
    if (!this.clearing) this.applyFinance();
    this.push();
  }

  /* ───────────────────────── update ───────────────────────── */
  private update(dt: number) {
    if (this.ended) return;
    this.time += dt;
    if (this.time >= BUILD_TIME) {
      this.finishBuild(false);
      return;
    }

    // interest every simulated half-year
    this.interestT += dt;
    if (this.interestT >= INTEREST_EVERY) {
      this.interestT -= INTEREST_EVERY;
      const c = this.econ.chargeInterest();
      if (c > 0.05) this.pushNews(`Interest paid on ₹${this.econ.debt.toFixed(1)} Cr of debt: −₹${c.toFixed(2)} Cr`, 'bad');
    }

    // scheduled news
    for (const ev of this.events) {
      if (!ev.done && this.time >= ev.t) {
        ev.done = true;
        this.applyNews(ev.kind);
        if (ev.kind === 'rates' && !this.flags.debt) {
          this.flags.debt = true;
          void this.ctl.educate('pe-debt', null);
          return;
        }
      }
    }
    // borrowing offers
    for (const of of this.offers) {
      if (!of.done && this.time >= of.t) {
        of.done = true;
        this.offerUntil = this.time + 12;
        sfx.play('news');
        this.pushNews(`OFFER: borrow ₹${OFFER_AMOUNT} Cr for an instant upgrade? Press B — or ignore it.`, 'info');
        if (!this.flags.debt) {
          this.flags.debt = true;
          void this.ctl.educate('pe-debt', null);
          return;
        }
      }
    }

    if (this.clearing) {
      this.clearing.t -= dt;
      if (this.clearing.t <= 0) {
        this.well.removeRows(this.clearing.rows);
        this.clearing = null;
        if (this.pendingFinance) this.applyFinance();
        if (!this.clearing && !this.piece) this.spawnNext();
      }
    } else {
      this.updatePiece(dt);
    }

    if (this.kb.consume('KeyB')) this.acceptOffer();

    this.particles.update(dt);
    this.texts.update(dt);
    this.shake.update(dt);
    this.kb.endFrame();
    if (++this.uiTick % 5 === 0) this.push();
    this.syncHud();
  }

  private updatePiece(dt: number) {
    const kb = this.kb;
    let p = this.piece;
    if (!p) return;

    // rotation
    if (kb.consume('ArrowUp', 'KeyX')) {
      const r = this.well.tryRotate(p, 1);
      if (r) {
        p = r;
        sfx.play('rotate');
        this.resetLock();
      }
    }
    if (kb.consume('KeyZ')) {
      const r = this.well.tryRotate(p, -1);
      if (r) {
        p = r;
        sfx.play('rotate');
        this.resetLock();
      }
    }

    // horizontal: every tap moves once (even sub-frame taps); holding auto-repeats
    const tapL = kb.consume('ArrowLeft');
    const tapR = kb.consume('ArrowRight');
    const left = kb.isDown('ArrowLeft');
    const right = kb.isDown('ArrowRight');
    const dir = left && !right ? -1 : right && !left ? 1 : 0;
    if (tapL !== tapR) {
      const d = tapL ? -1 : 1;
      this.das = { dir: d, t: 0 };
      const m = this.well.tryMove(p, d, 0);
      if (m) {
        p = m;
        sfx.play('move');
        this.resetLock();
      }
    } else if (dir !== 0) {
      if (this.das.dir !== dir) {
        this.das = { dir, t: 0 };
        const m = this.well.tryMove(p, dir, 0);
        if (m) {
          p = m;
          sfx.play('move');
          this.resetLock();
        }
      } else {
        this.das.t += dt;
        while (this.das.t >= DAS) {
          this.das.t -= ARR;
          const m = this.well.tryMove(p, dir, 0);
          if (!m) break;
          p = m;
          this.resetLock();
        }
      }
    } else this.das = { dir: 0, t: 0 };

    // hard drop
    if (kb.consume('Space')) {
      const y = this.well.dropY(p);
      const dist = y - p.y;
      p = { ...p, y };
      this.piece = p;
      sfx.play('drop');
      this.shake.kick(1.5, 0.12);
      for (const [x, yy] of pieceCells(p)) {
        if (yy >= HIDDEN) this.particles.burst(OX + x * CELL + 6, OY + (yy - HIDDEN) * CELL + 6, 1, { colors: ['#FFFFFF'], speed: [10, 30], gravity: 40, life: [0.15, 0.3] });
      }
      void dist;
      this.lockPiece();
      return;
    }

    // gravity / soft drop
    const soft = kb.isDown('ArrowDown');
    const interval = soft ? SOFT : GRAVITY[Math.min(3, Math.floor(this.time / 30))];
    this.gravT += dt;
    let landed = false;
    while (this.gravT >= interval) {
      this.gravT -= interval;
      const m = this.well.tryMove(p, 0, 1);
      if (m) {
        p = m;
        if (soft) this.softT += 1;
      } else {
        landed = true;
        this.gravT = 0;
        break;
      }
    }
    if (!this.well.tryMove(p, 0, 1)) landed = true;
    this.piece = p;

    if (landed) {
      this.lockT += dt;
      if (this.lockT >= LOCK_DELAY || this.lockResets > 15) this.lockPiece();
    } else {
      this.lockT = 0;
    }
  }

  private resetLock() {
    if (this.lockT > 0) {
      this.lockT = 0;
      this.lockResets++;
    }
  }

  private lockPiece() {
    const p = this.piece;
    if (!p) return;
    const res = this.well.lock(p);
    this.piece = null;
    this.lockT = 0;
    this.lockResets = 0;
    this.econ.onPieceLocked(res.newHoles);
    sfx.play('place');
    if (res.newHoles > 0 && this.econ.holesMade === res.newHoles) {
      this.ctl.callout('Gaps under blocks waste effort — poor management makes the business less efficient.', 'bad');
    }
    if (res.cleared.length) {
      this.handleClear(res.cleared, res.clearedKinds, false);
    } else {
      if (this.pendingFinance) this.applyFinance();
      if (!this.clearing) this.spawnNext();
    }
    if (this.well.height() >= 15) this.texts.add('OVERSTRETCHED!', BOARD_W / 2, 40, { color: '#B23A33', font: 'small', scale: 2 });
  }

  private handleClear(rows: number[], kinds: CellKind[][], financed: boolean) {
    const ups = kinds.map((r) => r.filter((c): c is Upgrade => c !== 'cost'));
    const { gain, top } = this.econ.onRowsCleared(ups, financed);
    const k = rows.length;
    this.clearing = { rows, t: 0.32 };
    sfx.play('line');
    if (k >= 3) this.shake.kick(3, 0.3);
    const text = financed ? 'FINANCED UPGRADE!' : k >= 4 ? 'MAJOR TRANSFORMATION!' : IMPROVEMENT_MSG[top];
    this.improvement = { id: this.newsId++, text, gain, up: top };
    this.pushNews(`${text} +₹${gain.toFixed(1)} Cr company value`, 'good');
    for (const y of rows) {
      const vy = OY + (y - HIDDEN) * CELL + 6;
      this.particles.burst(BOARD_W / 2, vy, 26, {
        colors: [UPGRADE_INFO[top].color, '#FFFFFF', '#F4C542'],
        speed: [40, 140],
        gravity: 80,
        life: [0.3, 0.7],
      });
    }
    this.texts.add(`+₹${gain.toFixed(1)}CR`, BOARD_W / 2, OY + (rows[0] - HIDDEN) * CELL - 4, { color: '#2E7A45', font: 'big', scale: 1 });
    this.push();
    if (!this.flags.value) {
      this.flags.value = true;
      void this.ctl.educate('pe-value', null);
    }
  }

  private spawnNext() {
    const p = this.well.spawn();
    if (!p) {
      this.topOut = true;
      this.finishBuild(true);
      return;
    }
    this.piece = p;
    this.gravT = 0;
  }

  private applyFinance() {
    this.pendingFinance = false;
    const y = this.well.lowestFilledRow();
    this.econ.borrow(OFFER_AMOUNT);
    this.pushNews(`Borrowed ₹${OFFER_AMOUNT} Cr. Debt is now ₹${this.econ.debt.toFixed(1)} Cr — interest will rise.`, 'info');
    const blocked = !!this.piece && pieceCells(this.piece).some(([, py]) => py === y);
    if (y < 0 || blocked) {
      this.texts.add(`+₹${(OFFER_AMOUNT * 1.15).toFixed(1)}CR UPGRADE`, BOARD_W / 2, 60, { color: '#B8841C', font: 'small', scale: 2 });
      this.improvement = { id: this.newsId++, text: 'FINANCED UPGRADE!', gain: OFFER_AMOUNT * 1.15, up: 'fin' };
      this.push();
      return;
    }
    for (let x = 0; x < COLS; x++) if (!this.well.grid[y][x]) this.well.grid[y][x] = 'fin';
    this.handleClear([y], [this.well.grid[y].slice() as CellKind[]], true);
  }

  private applyNews(kind: NewsKind) {
    const n = NEWS[kind];
    this.econ.news(kind);
    sfx.play('news');
    this.pushNews(`${n.title} — ${n.body}`, n.tone);
    this.ctl.banner('NEWS FLASH', n.title);
    if (kind === 'costs') {
      const ok = this.well.addCostRow(Math.floor(this.rng() * COLS));
      if (this.piece && this.well.collides(this.piece)) {
        const up = { ...this.piece, y: this.piece.y - 1 };
        this.piece = this.well.collides(up) ? null : up;
      }
      if (!ok || (!this.piece && !this.clearing)) {
        if (!this.piece) this.spawnNext();
      }
      this.shake.kick(2, 0.25);
    }
  }

  private finishBuild(topOut: boolean) {
    if (this.ended) return;
    this.ended = true;
    this.topOut = topOut;
    this.push();
    this.onEnd(topOut);
  }

  /* ───────────────────────── ui sync ───────────────────────── */
  private pushNews(text: string, tone: NewsItem['tone']) {
    this.news = [{ id: this.newsId++, text, tone }, ...this.news].slice(0, 6);
    this.push();
  }

  private snapshot(): PeUi {
    return {
      value: this.econ.value(),
      eff: this.econ.eff,
      debt: this.econ.debt,
      rate: this.econ.rate,
      interestPaid: this.econ.interestPaid,
      lines: this.econ.lines,
      timeLeft: Math.max(0, Math.ceil(BUILD_TIME - this.time)),
      next: this.well.queue.slice(0, 2),
      offer: this.offerUntil > this.time ? Math.ceil(this.offerUntil - this.time) : null,
      news: this.news,
      improvement: this.improvement,
      boost: this.econ.boostClears,
      height: this.well.height(),
    };
  }

  private push() {
    this.ui.set(this.snapshot());
  }

  private syncHud() {
    const progress = Math.min(1, this.time / BUILD_TIME);
    this.ctl.setScore(scoreParts(this.econ, progress, progress).total);
    this.ctl.setTimer(BUILD_TIME - this.time, 'down');
  }

  /* ───────────────────────── render ───────────────────────── */
  private render() {
    const ctx = this.ctx;
    const t = this.loop.time;
    ctx.save();
    ctx.translate(this.shake.x, this.shake.y);
    ctx.fillStyle = '#1d1a24';
    ctx.fillRect(-4, -4, BOARD_W + 8, BOARD_H + 8);
    ctx.fillStyle = '#F7F9FD';
    ctx.fillRect(OX, OY, COLS * CELL, (ROWS - HIDDEN) * CELL);
    ctx.fillStyle = '#ECF1F9';
    for (let x = 1; x < COLS; x++) ctx.fillRect(OX + x * CELL, OY, 1, (ROWS - HIDDEN) * CELL);
    for (let y = 1; y < ROWS - HIDDEN; y++) ctx.fillRect(OX, OY + y * CELL, COLS * CELL, 1);

    // danger zone
    if (this.well.height() >= 14) {
      ctx.fillStyle = `rgba(224,82,74,${0.1 + 0.08 * Math.sin(t * 8)})`;
      ctx.fillRect(OX, OY, COLS * CELL, 4 * CELL);
    }

    // locked cells
    for (let y = HIDDEN; y < ROWS; y++) {
      const flashing = this.clearing?.rows.includes(y);
      for (let x = 0; x < COLS; x++) {
        const k = this.well.grid[y][x];
        if (!k) continue;
        const px = OX + x * CELL;
        const py = OY + (y - HIDDEN) * CELL;
        if (flashing && Math.floor(t * 20) % 2 === 0) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(px, py, CELL, CELL);
        } else ctx.drawImage(cellSprite(k), px, py);
      }
    }

    // ghost + active piece
    const p = this.piece;
    if (p && !this.ended) {
      const gy = this.well.dropY(p);
      const info = UPGRADE_INFO[p.up];
      for (const [x, y] of pieceCells({ ...p, y: gy })) {
        if (y < HIDDEN) continue;
        const px = OX + x * CELL;
        const py = OY + (y - HIDDEN) * CELL;
        ctx.fillStyle = info.light;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
        ctx.globalAlpha = 1;
        ctx.fillStyle = info.dark;
        ctx.fillRect(px, py, CELL, 1);
        ctx.fillRect(px, py + CELL - 1, CELL, 1);
        ctx.fillRect(px, py, 1, CELL);
        ctx.fillRect(px + CELL - 1, py, 1, CELL);
      }
      for (const [x, y] of pieceCells(p)) {
        if (y < HIDDEN) continue;
        ctx.drawImage(cellSprite(p.up), OX + x * CELL, OY + (y - HIDDEN) * CELL);
      }
    }

    this.particles.draw(ctx);
    this.texts.draw(ctx);
    ctx.restore();

    if (this.ended) {
      ctx.fillStyle = 'rgba(23,23,23,0.55)';
      ctx.fillRect(0, 0, BOARD_W, BOARD_H);
      drawText(ctx, this.topOut ? 'OVERWHELMED' : 'TIME!', BOARD_W / 2, BOARD_H / 2 - 4, { color: '#FFFFFF', align: 'center' });
    }
  }
}
