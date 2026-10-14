/**
 * Falling-block puzzle core (pure logic, no rendering).
 * Standard 10-wide well, 7-bag randomiser, SRS-style rotation with wall kicks,
 * lock delay, line clears, "cost rows" (garbage) and top-out detection.
 */
import { Bag, type Rng } from '../../engine/random';

export const COLS = 10;
export const ROWS = 20; // two hidden spawn rows on top
export const HIDDEN = 2;
export const VISIBLE = ROWS - HIDDEN;

export type Shape = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
export type Upgrade = 'tech' | 'people' | 'ops' | 'mkt' | 'fin';
export type CellKind = Upgrade | 'cost';

export const UPGRADES: Upgrade[] = ['tech', 'people', 'ops', 'mkt', 'fin'];

const SHAPES: Record<Shape, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

function rotateCW(m: number[][]): number[][] {
  const n = m.length;
  return m.map((_, r) => m.map((__, c) => m[n - 1 - c][r]));
}

const ROTATIONS: Record<Shape, number[][][]> = Object.fromEntries(
  (Object.keys(SHAPES) as Shape[]).map((s) => {
    const r0 = SHAPES[s];
    const r1 = rotateCW(r0);
    const r2 = rotateCW(r1);
    const r3 = rotateCW(r2);
    return [s, [r0, r1, r2, r3]];
  }),
) as Record<Shape, number[][][]>;

// SRS kick tables (x right, y DOWN — SRS "up" values are negated).
const KICKS_JLSTZ: Record<string, [number, number][]> = {
  '0>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1>0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1>2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '2>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '3>2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3>0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};
const KICKS_I: Record<string, [number, number][]> = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

export interface Piece {
  shape: Shape;
  up: Upgrade;
  rot: number;
  x: number;
  y: number;
}

export function pieceCells(p: Piece): [number, number][] {
  const m = ROTATIONS[p.shape][p.rot];
  const out: [number, number][] = [];
  for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) if (m[r][c]) out.push([p.x + c, p.y + r]);
  return out;
}

export function shapeMatrix(shape: Shape): number[][] {
  return ROTATIONS[shape][0];
}

export interface LockResult {
  cleared: number[];
  clearedKinds: CellKind[][];
  newHoles: number;
}

export class Well {
  grid: (CellKind | null)[][] = Array.from({ length: ROWS }, () => Array<CellKind | null>(COLS).fill(null));
  private shapeBag: Bag<Shape>;
  private upBag: Bag<Upgrade>;
  queue: { shape: Shape; up: Upgrade }[] = [];

  constructor(rng: Rng) {
    this.shapeBag = new Bag<Shape>(rng, ['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
    this.upBag = new Bag<Upgrade>(rng, UPGRADES);
    while (this.queue.length < 4) this.queue.push({ shape: this.shapeBag.next(), up: this.upBag.next() });
  }

  /** Next piece at the spawn position, or null if the well is topped out. */
  spawn(): Piece | null {
    const n = this.queue.shift()!;
    this.queue.push({ shape: this.shapeBag.next(), up: this.upBag.next() });
    const w = ROTATIONS[n.shape][0][0].length;
    const p: Piece = { shape: n.shape, up: n.up, rot: 0, x: Math.floor((COLS - w) / 2), y: n.shape === 'I' ? 0 : 0 };
    return this.collides(p) ? null : p;
  }

  collides(p: Piece): boolean {
    for (const [x, y] of pieceCells(p)) {
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y >= 0 && this.grid[y][x]) return true;
    }
    return false;
  }

  tryMove(p: Piece, dx: number, dy: number): Piece | null {
    const n = { ...p, x: p.x + dx, y: p.y + dy };
    return this.collides(n) ? null : n;
  }

  tryRotate(p: Piece, dir: 1 | -1): Piece | null {
    if (p.shape === 'O') return p;
    const to = (p.rot + dir + 4) % 4;
    const table = p.shape === 'I' ? KICKS_I : KICKS_JLSTZ;
    for (const [kx, ky] of table[`${p.rot}>${to}`]) {
      const n = { ...p, rot: to, x: p.x + kx, y: p.y + ky };
      if (!this.collides(n)) return n;
    }
    return null;
  }

  dropY(p: Piece): number {
    let y = p.y;
    while (!this.collides({ ...p, y: y + 1 })) y++;
    return y;
  }

  holes(): number {
    let h = 0;
    for (let x = 0; x < COLS; x++) {
      let seen = false;
      for (let y = 0; y < ROWS; y++) {
        if (this.grid[y][x]) seen = true;
        else if (seen) h++;
      }
    }
    return h;
  }

  /** Height of the stack in rows (0 = empty). */
  height(): number {
    for (let y = 0; y < ROWS; y++) if (this.grid[y].some(Boolean)) return ROWS - y;
    return 0;
  }

  fullRows(): number[] {
    const rows: number[] = [];
    for (let y = 0; y < ROWS; y++) if (this.grid[y].every(Boolean)) rows.push(y);
    return rows;
  }

  lock(p: Piece): LockResult {
    const before = this.holes();
    for (const [x, y] of pieceCells(p)) if (y >= 0) this.grid[y][x] = p.up;
    const cleared = this.fullRows();
    const clearedKinds = cleared.map((y) => this.grid[y].slice() as CellKind[]);
    const newHoles = Math.max(0, this.holes() - before);
    return { cleared, clearedKinds, newHoles };
  }

  removeRows(rows: number[]) {
    const keep = this.grid.filter((_, y) => !rows.includes(y));
    while (keep.length < ROWS) keep.unshift(Array<CellKind | null>(COLS).fill(null));
    this.grid = keep;
  }

  /** Pushes a "cost row" in from the bottom (one gap). Returns false if it tops out. */
  addCostRow(gap: number): boolean {
    const top = this.grid.shift()!;
    const row = Array<CellKind | null>(COLS).fill('cost');
    row[gap] = null;
    this.grid.push(row);
    return !top.some(Boolean);
  }

  /** Index of the lowest row that has at least one block (for financed upgrades). */
  lowestFilledRow(): number {
    for (let y = ROWS - 1; y >= 0; y--) if (this.grid[y].some(Boolean)) return y;
    return -1;
  }
}
