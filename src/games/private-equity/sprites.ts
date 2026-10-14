/** BUY, BUILD, EXIT — original pixel art: upgrade blocks + a growing company building. */
import { ctx2d, makeCanvas, memo, Painter } from '../../engine/pixel';
import { drawText } from '../../engine/pixelfont';
import type { CellKind } from './blocks';
import type { Company } from './economy';
import { UPGRADE_INFO } from './economy';

export const CELL = 12;
const INK = '#1d1a24';

/** 12×12 upgrade block with a tiny icon. */
export function cellSprite(kind: CellKind): HTMLCanvasElement {
  return memo(`pecell|${kind}`, () => {
    const c = makeCanvas(CELL, CELL);
    const p = new Painter(ctx2d(c));
    const info = UPGRADE_INFO[kind];
    p.rect(0, 0, CELL, CELL, info.dark);
    p.rect(0, 0, CELL - 1, CELL - 1, info.color);
    p.rect(0, 0, CELL - 1, 1, info.light);
    p.rect(0, 0, 1, CELL - 1, info.light);
    const w = '#FFFFFF';
    const d = info.dark;
    switch (kind) {
      case 'tech':
        p.rect(4, 4, 4, 4, d);
        p.rect(5, 5, 2, 2, w);
        for (const [x, y] of [
          [3, 5],
          [3, 6],
          [8, 5],
          [8, 6],
          [5, 3],
          [6, 3],
          [5, 8],
          [6, 8],
        ])
          p.px(x, y, w);
        break;
      case 'people':
        p.rect(5, 2, 2, 2, w);
        p.rect(4, 5, 4, 4, w);
        p.rect(5, 6, 2, 1, d);
        break;
      case 'ops':
        p.rect(4, 4, 4, 4, w);
        p.rect(5, 2, 2, 2, w);
        p.rect(5, 8, 2, 2, w);
        p.rect(2, 5, 2, 2, w);
        p.rect(8, 5, 2, 2, w);
        p.rect(5, 5, 2, 2, d);
        break;
      case 'mkt':
        p.rect(3, 5, 2, 2, w);
        p.rect(5, 4, 1, 4, w);
        p.rect(6, 3, 1, 6, w);
        p.rect(7, 2, 1, 8, w);
        p.px(9, 4, w);
        p.px(9, 7, w);
        break;
      case 'fin':
        p.disc(3, 3, 6, w);
        p.rect(5, 4, 2, 1, d);
        p.rect(5, 6, 2, 1, d);
        p.px(6, 7, d);
        break;
      case 'cost':
        p.line(2, 3, 5, 6, INK);
        p.line(5, 6, 4, 9, INK);
        p.line(7, 2, 9, 5, '#5E5D58');
        break;
    }
    return c;
  });
}

export function cellURL(kind: CellKind): string {
  return memo(`pecellurl|${kind}`, () => {
    const c = makeCanvas(CELL, CELL);
    c.getContext('2d')!.drawImage(cellSprite(kind), 0, 0);
    return c;
  }).toDataURL();
}

/** Company building — grows with improvements; windows light up with efficiency. */
export function drawCompany(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  company: Company,
  floors: number,
  eff: number,
  t: number,
  opts: { sold?: boolean; crane?: boolean; flash?: number } = {},
) {
  const p = new Painter(ctx);
  ctx.clearRect(0, 0, w, h);
  // sky + ground
  p.rect(0, 0, w, h, '#EEF4FB');
  p.rect(0, h - 12, w, 12, '#D9D6CE');
  p.rect(0, h - 12, w, 1, '#BDB6A6');
  const pal = company.palette;
  const bw = 64;
  const bx = Math.round((w - bw) / 2);
  const baseH = 30;
  const floorH = 11;
  const ground = h - 12;
  const topY = ground - baseH - floors * floorH;

  // upper floors (improvements)
  for (let i = 0; i < floors; i++) {
    const y = ground - baseH - (i + 1) * floorH;
    p.rect(bx + 4, y, bw - 8, floorH, INK);
    p.rect(bx + 5, y + 1, bw - 10, floorH - 1, i % 2 ? '#F2F5FA' : '#E6ECF5');
    for (let k = 0; k < 6; k++) {
      const lit = (k * 3 + i * 5) % 10 < Math.round(eff * 10);
      p.rect(bx + 9 + k * 8, y + 3, 5, 5, lit ? '#F8E7B0' : '#BFE0F5');
    }
  }
  // roof furniture
  if (floors > 0) {
    p.rect(bx + 2, topY - 3, bw - 4, 3, INK);
    p.rect(bx + 3, topY - 2, bw - 6, 2, pal.accent);
  }

  // ground-floor storefront by company type
  const gy = ground - baseH;
  p.rect(bx, gy, bw, baseH, INK);
  p.rect(bx + 1, gy + 1, bw - 2, baseH - 1, pal.wall);
  if (company.id === 'bakery' || company.id === 'spice') {
    for (let i = 0; i < bw - 2; i += 6) p.rect(bx + 1 + i, gy + 1, 3, 7, pal.roof);
    p.rect(bx + 1, gy + 8, bw - 2, 1, INK);
    p.rect(bx + 4, gy + 19, 20, 9, '#BFE0F5');
    p.rect(bx + 27, gy + 18, 10, baseH - 18, '#8E5C2C');
    p.rect(bx + 40, gy + 19, 20, 9, '#BFE0F5');
    if (company.id === 'bakery') {
      p.disc(bx + 7, gy + 21, 6, '#E2A72E');
      p.disc(bx + 14, gy + 21, 6, '#C9752A');
    } else {
      p.rect(bx + 7, gy + 21, 4, 6, '#E0524A');
      p.rect(bx + 13, gy + 21, 4, 6, '#F4C542');
    }
  } else if (company.id === 'textile') {
    for (let i = 0; i < 4; i++) {
      const x = bx + 2 + i * 15;
      for (let j = 0; j < 6; j++) p.rect(x + j, gy - 6 + j, 1, 6 - j, pal.roof);
      p.rect(x, gy - 6, 1, 6, INK);
    }
    for (let i = 0; i < 5; i++) p.rect(bx + 5 + i * 12, gy + 6, 7, 8, '#BFE0F5');
    p.rect(bx + 26, gy + 17, 12, baseH - 17, '#5E6470');
    p.rect(bx + bw - 10, gy - 20, 6, 20, '#8F8E89');
    const puff = Math.floor(t * 2) % 3;
    p.disc(bx + bw - 12 + puff, gy - 28 - puff * 2, 7, '#DADDE6');
  } else {
    p.rect(bx + 4, gy + 8, 24, baseH - 8, '#5E6470');
    for (let i = 0; i < 5; i++) p.rect(bx + 5, gy + 10 + i * 4, 22, 1, '#8A909C');
    p.rect(bx + 34, gy + 8, 24, 10, '#BFE0F5');
    // little delivery van
    const vx = bx + bw + 2 - ((t * 10) % 20);
    p.rect(vx - 30, ground - 8, 14, 6, pal.accent);
    p.rect(vx - 30, ground - 8, 5, 3, '#BFE0F5');
    p.rect(vx - 28, ground - 2, 3, 2, INK);
    p.rect(vx - 20, ground - 2, 3, 2, INK);
  }
  // name sign
  const short = company.name.split(' ')[0].toUpperCase();
  const sw = short.length * 4 + 4;
  const sy = company.id === 'textile' ? gy + 1 : gy + 9;
  p.rect(bx + bw / 2 - sw / 2 - 1, sy, sw + 2, 8, INK);
  p.rect(bx + bw / 2 - sw / 2, sy + 1, sw, 6, '#FFFFFF');
  drawText(ctx, short, bx + bw / 2, sy + 1.5, { font: 'small', color: INK, align: 'center' });

  // crane while building
  if (opts.crane && !opts.sold) {
    const cx = bx + bw - 6;
    const top = Math.max(4, topY - 24);
    p.rect(cx, top, 2, ground - top, '#F29A38');
    p.rect(cx - 26, top, 34, 2, '#F29A38');
    const swing = Math.round(Math.sin(t * 1.5) * 4);
    p.rect(cx - 20 + swing, top + 2, 1, 10, '#6D6C67');
    p.rect(cx - 23 + swing, top + 12, 7, 5, UPGRADE_INFO.tech.color);
  }

  if (opts.flash && opts.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.6, opts.flash)})`;
    ctx.fillRect(bx, topY - 4, bw, ground - topY + 4);
  }

  if (opts.sold) {
    const sx = bx + bw / 2 - 22;
    const syy = Math.max(2, topY - 22);
    p.rect(sx, syy, 44, 15, INK);
    p.rect(sx + 1, syy + 1, 42, 13, '#F4C542');
    drawText(ctx, 'SOLD!', sx + 22, syy + 4, { color: INK, align: 'center' });
  }
}

/** Small preview of a piece shape for the NEXT box. */
export function drawPiecePreview(ctx: CanvasRenderingContext2D, matrix: number[][], kind: CellKind, cx: number, cy: number) {
  const rows = matrix.filter((r) => r.some(Boolean));
  const firstCol = Math.min(...rows.map((r) => r.findIndex(Boolean)));
  const lastCol = Math.max(...rows.map((r) => r.length - 1 - [...r].reverse().findIndex(Boolean)));
  const w = (lastCol - firstCol + 1) * CELL;
  const h = rows.length * CELL;
  const ox = Math.round(cx - w / 2);
  const oy = Math.round(cy - h / 2);
  const img = cellSprite(kind);
  rows.forEach((r, y) =>
    r.forEach((v, x) => {
      if (v && x >= firstCol && x <= lastCol) ctx.drawImage(img, ox + (x - firstCol) * CELL, oy + y * CELL);
    }),
  );
}
