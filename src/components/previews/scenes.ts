/**
 * Card preview scenes (160×100 virtual pixels). Each reuses the real game
 * sprites so the dashboard previews match what visitors will actually play.
 */
import type { ArtId } from '../../data/collectibles';
import type { GameId } from '../../data/games';
import { drawLabel } from '../../engine/pixelfont';
import * as CO from '../../games/collectibles/art';
import * as CR from '../../games/cryptocurrency/tokens';
import * as HD from '../../games/hedge-funds/sprites';
import type { CellKind } from '../../games/private-equity/blocks';
import { COMPANIES as PE_COMPANIES } from '../../games/private-equity/economy';
import * as PE from '../../games/private-equity/sprites';
import * as VC from '../../games/venture-capital/sprites';

const PE_CELL = PE.CELL;

export const PREVIEW_W = 160;
export const PREVIEW_H = 100;

type Scene = (ctx: CanvasRenderingContext2D, t: number, active: boolean) => void;

/* ───────────── 01 · Startup Run ───────────── */
interface Seg {
  t0: number;
  t1: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  h: number;
}
const VC_PATH: Seg[] = [
  { t0: 0, t1: 0.5, x0: -12, x1: 26, y0: 84, y1: 84, h: 0 },
  { t0: 0.5, t1: 1.05, x0: 26, x1: 50, y0: 84, y1: 62, h: 30 },
  { t0: 1.05, t1: 1.35, x0: 50, x1: 62, y0: 62, y1: 62, h: 0 },
  { t0: 1.35, t1: 1.9, x0: 62, x1: 100, y0: 62, y1: 48, h: 26 },
  { t0: 1.9, t1: 2.15, x0: 100, x1: 112, y0: 48, y1: 48, h: 0 },
  { t0: 2.15, t1: 2.75, x0: 112, x1: 142, y0: 48, y1: 84, h: 18 },
  { t0: 2.75, t1: 3.2, x0: 142, x1: 176, y0: 84, y1: 84, h: 0 },
];

const vcScene: Scene = (ctx, t, active) => {
  ctx.drawImage(VC.skyLayer(PREVIEW_W, PREVIEW_H), 0, 0);
  ctx.drawImage(VC.cloud(0), Math.round(((-t * 6) % 200) + 170) - 30, 8);
  ctx.drawImage(VC.cloud(1), Math.round(((-t * 4 + 90) % 220) + 190) - 40, 22);
  const mid = VC.midLayer(PREVIEW_W + 80, PREVIEW_H + 8, (x) => (x > 120 ? 3 : 1));
  ctx.drawImage(mid, active ? Math.round((t * 6) % 40) : 0, 0, PREVIEW_W, PREVIEW_H + 8, 0, -16, PREVIEW_W, PREVIEW_H + 8);
  // ground
  for (let x = 0; x < PREVIEW_W; x += 16) ctx.drawImage(VC.tileSprite('G', (x / 16) % 2), x, 84);
  // platforms
  for (let i = 0; i < 2; i++) ctx.drawImage(VC.tileSprite('='), 44 + i * 16, 62);
  for (let i = 0; i < 2; i++) ctx.drawImage(VC.tileSprite('S'), 96 + i * 16, 48);
  ctx.drawImage(VC.tileSprite('Q', Math.floor(t * 2) % 4 === 0 ? 1 : 0), 76, 26);
  // coins
  for (const [cx, cy, ph] of [
    [58, 46, 0],
    [110, 32, 1],
    [128, 70, 2],
  ]) {
    const bob = Math.round(Math.sin(t * 3 + ph) * 2);
    ctx.drawImage(VC.coinFrame(Math.floor(t * (active ? 10 : 4) + ph * 2)), cx - 7, cy - 7 + bob);
  }
  // hazard
  const wx = 130 + Math.round(Math.sin(t * (active ? 1.6 : 0.6)) * 12);
  ctx.drawImage(VC.noCustomers(Math.floor(t * 6)), wx, 69);
  drawLabel(ctx, 'NO CUSTOMERS', wx + 9, 60, { font: 'small', bg: '#E0524A', fg: '#FFFFFF' });

  // hero
  if (active) {
    const cyc = t % 3.2;
    const seg = VC_PATH.find((s) => cyc >= s.t0 && cyc < s.t1) ?? VC_PATH[0];
    const u = (cyc - seg.t0) / (seg.t1 - seg.t0);
    const x = seg.x0 + (seg.x1 - seg.x0) * u;
    const y = seg.y0 + (seg.y1 - seg.y0) * u - 4 * seg.h * u * (1 - u);
    const airborne = seg.h > 0;
    const pose = airborne ? (u < 0.5 ? 'jump' : 'fall') : 'run';
    ctx.drawImage(VC.personFrame(VC.VC_LOOK, pose, Math.floor(t * 12), 1), Math.round(x - 9), Math.round(y - 25));
  } else {
    const blink = t % 3 < 0.15;
    ctx.drawImage(VC.personFrame(VC.VC_LOOK, blink ? 'blink' : 'idle', Math.floor(t * 1.6), 1), 22, 84 - 25);
  }
};

/* ───────────── 02 · Crypto Slice ───────────── */
const cryptoScene: Scene = (ctx, t, active) => {
  ctx.drawImage(CR.arenaBackground(PREVIEW_W, PREVIEW_H), 0, 0);
  const defs = [CR.TOKENS.btc, CR.TOKENS.eth, CR.TOKENS.g1000x];
  const cycle = 1.8;
  const c = (t % cycle) / cycle;
  defs.forEach((def, i) => {
    let x: number;
    let y: number;
    let spin = 1;
    if (active) {
      const ph = ((t * 0.55 + i / 3) % 1 + 1) % 1;
      x = 18 + ph * 118 + i * 6;
      y = 104 - 4 * 74 * ph * (1 - ph);
      spin = Math.max(0.3, Math.abs(Math.cos(t * 3 + i)));
    } else {
      x = 34 + i * 46;
      y = 52 + Math.sin(t * 1.4 + i * 2) * 4;
    }
    const img = CR.coinSprite(def, 24);
    const w = Math.max(6, Math.round(img.width * spin));
    // BTC splits when the blade passes (active only)
    if (active && i === 0 && c > 0.18 && c < 0.6) {
      const k = (c - 0.18) * 60;
      ctx.drawImage(img, 0, 0, img.width, img.height / 2, Math.round(x - img.width / 2 - k * 0.6), Math.round(y - img.height / 2 - k * 0.3), img.width, img.height / 2);
      ctx.drawImage(img, 0, img.height / 2, img.width, img.height / 2, Math.round(x - img.width / 2 + k * 0.6), Math.round(y + k * 0.4), img.width, img.height / 2);
    } else {
      ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - img.height / 2), w, img.height);
    }
    if (def.claim) {
      const b = CR.claimBubble(def);
      ctx.drawImage(b, Math.round(Math.min(PREVIEW_W - b.width - 2, Math.max(2, x - b.width / 2))), Math.round(Math.max(2, y - 14 - b.height)));
    } else {
      drawLabel(ctx, def.label, Math.round(x), Math.round(y + 14), { font: 'small', bg: '#FFFFFF', fg: '#1d1a24', border: '#1d1a24' });
    }
  });
  // blade trail
  if (active && c < 0.3) {
    const k = c / 0.3;
    for (let s = 0; s <= 40; s++) {
      const u = (s / 40) * k;
      if (k - u > 0.45) continue;
      const bx = 6 + u * 150;
      const by = 22 + u * 60;
      const size = Math.max(1, Math.round(3 * (1 - (k - u) / 0.45)));
      ctx.fillStyle = '#F4C542';
      ctx.fillRect(Math.round(bx - size / 2 - 1), Math.round(by - size / 2 - 1), size + 2, size + 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(Math.round(bx - size / 2), Math.round(by - size / 2), size, size);
    }
  }
};

/* ───────────── 03 · Price Hunter ───────────── */
const COLLECT_ITEMS: ArtId[] = ['golden-chrono', 'thunder-lion', 'rocket-rex'];
const collectScene: Scene = (ctx, t, active) => {
  ctx.fillStyle = '#FBF9FE';
  ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
  ctx.fillStyle = '#ECE5F6';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(6 + i * 40, 6, 32, 1);
    ctx.fillRect(6 + i * 40, 6, 1, 60);
    ctx.fillRect(37 + i * 40, 6, 1, 60);
  }
  ctx.fillStyle = '#F1EBFA';
  ctx.fillRect(0, 82, PREVIEW_W, 18);
  // spotlight
  ctx.fillStyle = 'rgba(244,197,66,0.12)';
  for (let y = 0; y < 82; y += 2) {
    const half = 4 + (y / 82) * 30;
    if ((y / 2) % 2 === 0) ctx.fillRect(Math.round(80 - half), y, Math.round(half * 2), 2);
  }
  // pedestal
  ctx.fillStyle = '#1d1a24';
  ctx.fillRect(52, 70, 56, 5);
  ctx.fillRect(56, 75, 48, 22);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(53, 71, 54, 3);
  ctx.fillStyle = '#F6F3EC';
  ctx.fillRect(57, 75, 46, 21);
  ctx.fillStyle = '#E2B33C';
  ctx.fillRect(66, 81, 28, 8);
  ctx.fillStyle = '#FFF3C4';
  ctx.fillRect(67, 82, 26, 6);
  const idx = active ? Math.floor(t / 1.6) % COLLECT_ITEMS.length : 0;
  const art = CO.itemArt(COLLECT_ITEMS[idx]);
  const bob = Math.round(Math.sin(t * 2) * 1.5);
  ctx.drawImage(art, 80 - Math.round(art.width / 2), 70 - art.height + bob + 2);
  // sparkles
  for (let k = 0; k < 4; k++) {
    if (Math.sin((t * (active ? 4 : 1.6) + k * 1.7) * 2) < 0.5) continue;
    const sx = Math.round(80 + Math.cos(k * 2.1) * 40);
    const sy = Math.round(36 + Math.sin(k * 1.3) * 24);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(sx - 2, sy, 5, 1);
    ctx.fillRect(sx, sy - 2, 1, 5);
  }
  // price tag
  const reveal = active && t % 1.6 > 0.9;
  const values = ['₹6.8L', '₹1.6L', '₹24K'];
  const tag = reveal ? values[idx] : '₹ ? ? ?';
  drawLabel(ctx, tag, 132, 44, { font: 'big', bg: reveal ? '#6DBD81' : '#9369D0', fg: '#FFFFFF', border: '#1d1a24', padX: 3, padY: 3 });
  ctx.fillStyle = '#1d1a24';
  ctx.fillRect(131, 34, 1, 10);
  drawLabel(ctx, 'LOT 1/5', 22, 88, { font: 'small', bg: '#FFFFFF', fg: '#1d1a24', border: '#1d1a24' });
};

/* ───────────── 04 · Hedge Defense ───────────── */
const hedgeScene: Scene = (ctx, t, active) => {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
  const laneY = [6, 53];
  for (let l = 0; l < 2; l++) {
    for (let c = 0; c < 4; c++) {
      ctx.fillStyle = (l + c) % 2 === 0 ? '#F2F9F3' : '#FBFDFB';
      ctx.fillRect(22 + c * 34, laneY[l], 34, 46);
    }
  }
  // HQ column
  ctx.fillStyle = '#1d1a24';
  ctx.fillRect(0, 2, 22, 98);
  ctx.fillStyle = '#DCE3EE';
  ctx.fillRect(1, 3, 20, 96);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 ? '#F8E7B0' : '#BFE0F5';
    ctx.fillRect(4, 10 + i * 22, 6, 5);
    ctx.fillRect(12, 10 + i * 22, 6, 5);
  }
  const kinds = ['long', 'short'] as const;
  const evKinds = ['rally', 'down'] as const;
  for (let l = 0; l < 2; l++) {
    const bob = Math.round(Math.sin(t * 2 + l) * 1);
    ctx.drawImage(HD.tileSprite(kinds[l], Math.floor(t * 2)), 26, laneY[l] + 5 + bob);
    const travel = active ? ((t * 22 + l * 40) % 110) : 30 + l * 10;
    const ex = Math.round(PREVIEW_W - 8 - travel);
    ctx.drawImage(HD.eventSprite(evKinds[l], Math.floor(t * 3)), ex, laneY[l] + 8 + Math.round(Math.sin(t * 4 + l) * 1.5));
    if (active) {
      const span = Math.max(1, ex - 64);
      for (let k = 0; k < 2; k++) {
        const px = 64 + ((t * 70 + k * span * 0.5) % span);
        ctx.drawImage(HD.pulseSprite(kinds[l]), Math.round(px), laneY[l] + 20);
      }
    }
  }
  if (active) {
    const up = Math.floor(t * 2) % 2 === 0;
    drawLabel(ctx, up ? '+1.0' : '+0.8', 44, 2, { font: 'small', bg: '#3C8A50', fg: '#FFFFFF' });
  }
};

/* ───────────── 05 · Buy, Build, Exit ───────────── */
const PE_COMPANY = { ...PE_COMPANIES[0] };
const PE_FLOOR: (CellKind | null)[][] = [
  [null, null, null, null, null, null],
  ['ops', 'ops', null, 'tech', 'tech', 'people'],
  ['fin', 'mkt', 'mkt', null, 'people', 'people'],
];
const peScene: Scene = (ctx, t, active) => {
  ctx.fillStyle = '#EEF4FB';
  ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
  const ox = 10;
  const oy = 8;
  const W = 6;
  const H = 7;
  ctx.fillStyle = '#1d1a24';
  ctx.fillRect(ox - 2, oy - 2, W * PE_CELL + 4, H * PE_CELL + 4);
  ctx.fillStyle = '#F7F9FD';
  ctx.fillRect(ox, oy, W * PE_CELL, H * PE_CELL);
  const cycle = 3.2;
  const c = active ? (t % cycle) / cycle : 0.1;
  // bottom rows (row 6 gets completed by the falling piece)
  const rows = [
    ['ops', 'tech', 'people', null, 'fin', 'mkt'],
    ...PE_FLOOR.slice(1),
  ] as (CellKind | null)[][];
  const clearing = c > 0.62 && c < 0.8;
  rows.forEach((r, i) => {
    const y = oy + (H - rows.length + i) * PE_CELL;
    r.forEach((k, x) => {
      if (!k) return;
      if (i === 0 && clearing && Math.floor(t * 20) % 2 === 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(ox + x * PE_CELL, y, PE_CELL, PE_CELL);
      } else if (!(i === 0 && c >= 0.8)) ctx.drawImage(PE.cellSprite(k), ox + x * PE_CELL, y);
    });
  });
  // falling vertical I-piece into the gap at column 3
  if (c < 0.62) {
    const fall = Math.min(1, c / 0.55);
    const py = oy - 3 * PE_CELL + Math.round(fall * (H - 1) * PE_CELL);
    ctx.drawImage(PE.cellSprite('tech'), ox + 3 * PE_CELL, Math.min(oy + (H - 3) * PE_CELL, py));
  } else if (c < 0.8) {
    ctx.drawImage(PE.cellSprite('tech'), ox + 3 * PE_CELL, oy + (H - 3) * PE_CELL);
  }
  // company grows after the clear
  const floors = active ? (c >= 0.8 ? 2 : 1) : 1;
  ctx.save();
  ctx.translate(84, 0);
  drawCompanyPreview(ctx, floors, t, active && c >= 0.8);
  ctx.restore();
};

const peBuf = { c: null as HTMLCanvasElement | null };
function drawCompanyPreview(ctx: CanvasRenderingContext2D, floors: number, t: number, flash: boolean) {
  if (!peBuf.c) {
    peBuf.c = document.createElement('canvas');
    peBuf.c.width = 76;
    peBuf.c.height = 100;
  }
  const bctx = peBuf.c.getContext('2d') as CanvasRenderingContext2D;
  bctx.imageSmoothingEnabled = false;
  PE.drawCompany(bctx, 76, 100, PE_COMPANY, floors, 0.7, t, { crane: true, flash: flash ? 0.5 : 0 });
  ctx.drawImage(peBuf.c, 0, 0);
}

export const SCENES: Record<GameId, Scene> = {
  vc: vcScene,
  crypto: cryptoScene,
  collect: collectScene,
  hedge: hedgeScene,
  pe: peScene,
};
