/**
 * STARTUP RUN level: one continuous city in five stages
 *   IDEA → SEED → BUILD → GROWTH → EXIT
 * Built from small helpers so every gap and platform is easy to reason about.
 * Units: tiles are 16 px; the world is 17 tiles tall; street level is row 15.
 */
import type { ItemKind } from './sprites';

export const T = 16;
export const ROWS = 17;
export const STREET = 15;

export type WalkerKind = 'nocust' | 'bug';

export interface ItemDef {
  kind: ItemKind;
  x: number;
  y: number;
}

export type EnemyDef =
  | { type: 'walker'; kind: WalkerKind; x: number; y: number; min: number; max: number }
  | { type: 'flame'; mode: 'bob' | 'patrol'; x: number; y: number; range: number; phase: number }
  | { type: 'crusher'; x: number; y: number }
  | { type: 'spike'; x: number; y: number };

export interface MoverDef {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  w: number;
  period: number;
  phase: number;
}

export type DecorDef =
  | { kind: 'garage' | 'billboard' | 'lamp' | 'tower'; x: number; y: number }
  | { kind: 'tree'; x: number; y: number; v: number }
  | { kind: 'sign'; x: number; y: number; text: string; color: string };

export interface CheckpointDef {
  x: number;
  label: string;
  /** Stage index this checkpoint begins (null = respawn flag only). */
  stage: number | null;
  points: number;
  npc?: 'elder' | 'growth';
  npcX?: number;
}

export interface Level {
  cols: number;
  tiles: string[][];
  qblocks: { tx: number; ty: number; item: ItemKind }[];
  items: ItemDef[];
  enemies: EnemyDef[];
  movers: MoverDef[];
  decor: DecorDef[];
  checkpoints: CheckpointDef[];
  gate: { x: number; need: number };
  riskTriggerX: number;
  demoDayX: number;
  finishX: number;
  towerX: number;
  stageStarts: number[];
  spawn: { x: number; y: number };
}

export const STAGE_NAMES = ['THE IDEA', 'SEED FUNDING', 'BUILDING THE BUSINESS', 'GROWTH FUNDING', 'THE EXIT'];
export const STAGE_STEPS = ['IDEA', 'SEED', 'BUILD', 'GROWTH', 'EXIT'];

export function buildLevel(): Level {
  const cols = 372;
  const tiles: string[][] = Array.from({ length: ROWS }, () => Array<string>(cols).fill('.'));
  const set = (x: number, y: number, ch: string) => {
    if (x >= 0 && x < cols && y >= 0 && y < ROWS) tiles[y][x] = ch;
  };
  /** Solid street/terrain from `top` down to the bottom of the world. */
  const ground = (x0: number, x1: number, top = STREET) => {
    for (let x = x0; x <= x1; x++) for (let y = top; y < ROWS; y++) set(x, y, y === top ? 'G' : 'D');
  };
  /** A building: roof row on top, facade below. */
  const roof = (x0: number, x1: number, top: number) => {
    for (let x = x0; x <= x1; x++) for (let y = top; y < ROWS; y++) set(x, y, y === top ? 'R' : 'W');
  };
  const row = (x0: number, x1: number, y: number, ch: string) => {
    for (let x = x0; x <= x1; x++) set(x, y, ch);
  };

  const items: ItemDef[] = [];
  const it = (kind: ItemKind, tx: number, ty: number) => items.push({ kind, x: tx * T + 8, y: ty * T + 8 });
  const qblocks: Level['qblocks'] = [];
  const q = (tx: number, ty: number, item: ItemKind) => {
    set(tx, ty, 'Q');
    qblocks.push({ tx, ty, item });
  };
  const enemies: EnemyDef[] = [];
  const walker = (kind: WalkerKind, tx: number, minT: number, maxT: number, groundRow = STREET) =>
    enemies.push({
      type: 'walker',
      kind,
      x: tx * T,
      y: groundRow * T - (kind === 'bug' ? 11 : 15),
      min: minT * T,
      max: (maxT + 1) * T,
    });
  let phase = 0;
  const bobFlame = (txCenter: number, amp = 88) =>
    enemies.push({ type: 'flame', mode: 'bob', x: txCenter * T, y: ROWS * T + 6, range: amp, phase: (phase += 1.7) });
  const patrolFlame = (tx0: number, tx1: number, rowY: number) =>
    enemies.push({ type: 'flame', mode: 'patrol', x: tx0 * T, y: rowY * T, range: (tx1 - tx0) * T, phase: (phase += 1.3) });
  const crusher = (tx: number, rowY: number) => enemies.push({ type: 'crusher', x: tx * T, y: rowY * T });
  const spike = (tx: number, groundRow = STREET) => enemies.push({ type: 'spike', x: tx * T, y: groundRow * T - 15 });
  const movers: MoverDef[] = [];
  const mover = (tx0: number, ty0: number, tx1: number, ty1: number, wTiles: number, period: number, ph = 0) =>
    movers.push({ x0: tx0 * T, y0: ty0 * T, x1: tx1 * T, y1: ty1 * T, w: wTiles * T, period, phase: ph });
  const decor: DecorDef[] = [];
  const sign = (tx: number, text: string, color: string, groundRow = STREET) =>
    decor.push({ kind: 'sign', x: tx * T, y: groundRow * T - 30, text, color });

  /* ───── STAGE 1 · THE IDEA (cols 0–69) ───── */
  ground(0, 17);
  decor.push({ kind: 'garage', x: 4, y: STREET * T - 80 });
  decor.push({ kind: 'tree', x: 120, y: STREET * T - 34, v: 0 });
  it('deck', 9, 13);
  set(11, 14, 'C');
  q(14, 11, 'deck');
  // gap 18–19
  ground(20, 35);
  row(22, 26, 11, '=');
  spike(24);
  it('deck', 24, 10);
  walker('nocust', 30, 28, 35);
  q(31, 11, 'money');
  q(32, 11, 'money');
  ground(36, 38, 13);
  ground(39, 41, 12);
  it('deck', 40, 9);
  // gap 42–44
  ground(45, 80);
  row(48, 52, 11, 'B');
  q(50, 11, 'money');
  it('deck', 50, 8);
  walker('nocust', 49, 47, 53);
  spike(56);
  decor.push({ kind: 'lamp', x: 59 * T, y: STREET * T - 46 });
  sign(63, 'PITCH DAY', '#F4C542');
  decor.push({ kind: 'billboard', x: 65 * T, y: STREET * T - 54 });
  it('deck', 67, 12);

  /* ───── STAGE 2 · SEED FUNDING (cols 70–147) ───── */
  it('money', 75, 13);
  it('money', 77, 12);
  // wide gap 81–91: ride the moving platform
  mover(81, 12, 88, 12, 3, 4.6);
  it('money', 84, 9);
  it('money', 87, 9);
  ground(92, 94);
  // pit 95–96 with a jumping burn-rate flame
  bobFlame(96);
  ground(97, 117);
  it('money', 98, 12);
  row(101, 103, 12, '=');
  row(104, 106, 9, '=');
  it('money', 105, 7);
  walker('nocust', 110, 108, 116);
  q(112, 11, 'money');
  q(113, 11, 'money');
  q(114, 11, 'money');
  // pit 118–120 with a lift up to a high ledge
  mover(118, 14, 118, 9, 3, 5.2, 0.5);
  ground(121, 126, 10);
  it('money', 123, 8);
  it('money', 125, 8);
  ground(127, 165);
  sign(128, 'SEED FUND', '#6DBD81');
  it('money', 130, 13);
  it('money', 133, 11);
  it('money', 135, 12);
  patrolFlame(129, 138, 10);
  const gate = { x: 142 * T, need: 6 };

  /* ───── STAGE 3 · BUILDING THE BUSINESS (cols 148–237) ───── */
  sign(150, 'INCUBATOR', '#9369D0');
  it('customer', 153, 13);
  it('team', 155, 12);
  walker('bug', 158, 156, 161);
  set(162, 14, 'X');
  set(162, 13, 'X');
  set(163, 14, 'X');
  set(163, 13, 'X');
  // gap 166–168
  ground(169, 189);
  walker('nocust', 173, 171, 178);
  row(174, 178, 11, '=');
  it('product', 175, 10);
  it('product', 177, 10);
  q(181, 11, 'revenue');
  crusher(184, 8);
  it('revenue', 186, 13);
  sign(188, 'DEMO DAY', '#F29A38');
  // pit 190–192 with a flame
  bobFlame(191.5);
  ground(193, 210);
  decor.push({ kind: 'tree', x: 193 * T, y: STREET * T - 34, v: 1 });
  walker('bug', 200, 196, 205);
  it('team', 197, 12);
  it('team', 201, 11);
  patrolFlame(196, 205, 9);
  it('product', 204, 12);
  ground(207, 208, 13);
  ground(209, 210, 12);
  it('customer', 208, 11);
  it('customer', 210, 10);
  // gap 211–214
  ground(215, 251);
  crusher(220, 8);
  walker('nocust', 225, 222, 230);
  it('revenue', 226, 12);
  it('customer', 229, 13);
  it('revenue', 233, 12);
  sign(234, 'SERIES A', '#5D91E5');
  decor.push({ kind: 'lamp', x: 244 * T, y: STREET * T - 46 });

  /* ───── STAGE 4 · GROWTH FUNDING (cols 238–337): rooftops ───── */
  it('globe', 247, 12);
  roof(253, 260, 12);
  it('money', 256, 10);
  // gap 261–263
  roof(264, 271, 11);
  walker('bug', 268, 266, 271, 11);
  it('globe', 268, 9);
  // gap 272–278: moving girder
  mover(272, 10, 276, 10, 3, 4.2);
  it('money', 275, 7);
  roof(279, 286, 12);
  crusher(283, 6);
  it('globe', 281, 10);
  it('money', 285, 10);
  // gap 287–289
  roof(290, 297, 10);
  walker('nocust', 294, 292, 297, 10);
  it('globe', 296, 8);
  // gap 298–301: lift to a high girder
  mover(298, 13, 298, 7, 3, 5, 0.25);
  row(302, 306, 6, 'S');
  it('money', 303, 4);
  it('globe', 305, 4);
  roof(302, 312, 12);
  walker('nocust', 308, 305, 312, 12);
  // gap 313–315 with a flame
  bobFlame(314.5, 120);
  roof(316, 324, 11);
  patrolFlame(317, 323, 8);
  it('globe', 320, 9);
  it('money', 323, 9);
  // gap 325–328: small moving girder
  mover(325, 11, 326, 11, 3, 3);
  roof(329, 333, 12);
  roof(334, 334, 13);
  roof(335, 336, 14);

  /* ───── STAGE 5 · THE EXIT (cols 338–371) ───── */
  ground(337, 371);
  sign(340, 'IPO AHEAD', '#F29A38');
  it('money', 342, 12);
  it('money', 344, 11);
  it('money', 346, 12);
  decor.push({ kind: 'lamp', x: 347 * T, y: STREET * T - 46 });
  const towerX = 350 * T;
  decor.push({ kind: 'tower', x: towerX, y: STREET * T - 232 });

  const checkpoints: CheckpointDef[] = [
    { x: 70 * T, label: 'SEED', stage: 1, points: 40, npc: 'elder', npcX: 72 * T },
    { x: 148 * T, label: 'BUILD', stage: 2, points: 40 },
    { x: 238 * T, label: 'GROWTH', stage: 3, points: 40, npc: 'growth', npcX: 240 * T },
    { x: 291 * T, label: 'SAVE', stage: null, points: 0 },
    { x: 338 * T, label: 'EXIT', stage: 4, points: 30 },
  ];

  return {
    cols,
    tiles,
    qblocks,
    items,
    enemies,
    movers,
    decor,
    checkpoints,
    gate,
    riskTriggerX: 151 * T,
    demoDayX: 188 * T,
    finishX: towerX + 54,
    towerX,
    stageStarts: [0, 70 * T, 148 * T, 238 * T, 338 * T],
    spawn: { x: 3 * T, y: STREET * T - 20 },
  };
}

export const SOLID = new Set(['G', 'D', 'B', 'C', 'R', 'W', 'X', 'Q', 'U']);
export const ONE_WAY = new Set(['=', 'S']);
