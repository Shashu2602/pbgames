/** PRICE HUNTER — original pixel art for every fictional collectible + the auction stage. */
import type { ArtId } from '../../data/collectibles';
import { ctx2d, makeCanvas, memo, outlined, Painter } from '../../engine/pixel';
import { drawText } from '../../engine/pixelfont';

const INK = '#1d1a24';
const GOLD = '#E2B33C';
const GOLD_D = '#A9801C';
const GOLD_L = '#F6D97A';
const CREAM = '#FFF6DE';

function hourMarks(p: Painter, cx: number, cy: number, r: number, c: string) {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = cx + Math.sin(a) * r;
    const y = cy - Math.cos(a) * r;
    p.rect(Math.round(x - 1), Math.round(y - 1), i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1, c);
  }
}

const ART: Record<ArtId, (p: Painter) => void> = {
  'golden-chrono': (p) => {
    p.rect(25, 0, 14, 15, '#7A4A26');
    p.rect(25, 49, 14, 15, '#7A4A26');
    for (let y = 2; y < 14; y += 3) {
      p.px(27, y, '#C68A4E');
      p.px(36, y, '#C68A4E');
      p.px(27, y + 49, '#C68A4E');
      p.px(36, y + 49, '#C68A4E');
    }
    p.rect(51, 28, 5, 8, GOLD);
    p.rect(49, 20, 4, 4, GOLD_D);
    p.rect(49, 40, 4, 4, GOLD_D);
    p.disc(11, 11, 42, GOLD_D);
    p.disc(12, 12, 40, GOLD);
    p.ring(12, 12, 40, 2, GOLD_L);
    p.disc(16, 16, 32, CREAM);
    hourMarks(p, 32, 32, 13, INK);
    p.ring(22, 31, 9, 1, '#9A9A94');
    p.ring(33, 31, 9, 1, '#9A9A94');
    p.ring(27, 37, 9, 1, '#9A9A94');
    p.line(32, 32, 32, 19, INK);
    p.line(32, 32, 40, 36, INK);
    p.line(32, 32, 26, 22, '#E0524A');
    p.rect(31, 31, 3, 3, GOLD_D);
    p.rect(19, 15, 4, 2, '#FFFFFF');
  },
  'ocean-diver': (p) => {
    for (let i = 0; i < 4; i++) {
      p.rect(24, i * 4, 16, 3, '#AEB5C0');
      p.rect(24, 50 + i * 4, 16, 3, '#AEB5C0');
      p.rect(31, i * 4, 2, 3, '#8B929E');
      p.rect(31, 50 + i * 4, 2, 3, '#8B929E');
    }
    p.rect(51, 28, 5, 8, '#AEB5C0');
    p.disc(10, 10, 44, '#8B929E');
    p.disc(11, 11, 42, '#C9CED6');
    p.ring(13, 13, 38, 5, '#2F4A7A');
    p.rect(30, 14, 4, 3, '#E0524A');
    p.disc(18, 18, 28, '#1E2430');
    hourMarks(p, 32, 32, 11, '#CFF5D8');
    p.line(32, 32, 32, 21, '#FFFFFF');
    p.line(32, 32, 24, 37, '#FFFFFF');
    p.rect(31, 31, 3, 3, '#F29A38');
    // scratches
    p.line(15, 44, 20, 41, '#E8ECF2');
    p.line(44, 18, 47, 22, '#E8ECF2');
  },
  'peacock-rupee': (p) => {
    p.disc(4, 4, 56, '#9AA1AD');
    p.disc(5, 5, 54, '#D5D9E0');
    p.ring(8, 8, 48, 2, '#B9BFC9');
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      p.px(32 + Math.cos(a) * 25.5 - 0.5, 32 + Math.sin(a) * 25.5 - 0.5, '#8A919D');
    }
    // tail fan
    const fan = [
      [16, 22],
      [21, 15],
      [29, 12],
      [37, 13],
      [44, 18],
      [47, 26],
    ];
    for (const [x, y] of fan) {
      p.disc(x - 3, y - 3, 7, '#2E8B7A');
      p.disc(x - 1, y - 1, 3, '#5D91E5');
    }
    p.ellipse(26, 26, 9, 14, '#2E8B7A');
    p.rect(28, 20, 4, 8, '#3FAE99');
    p.disc(28, 17, 6, '#2E8B7A');
    p.rect(33, 19, 3, 1, '#F29A38');
    p.px(30, 18, '#FFFFFF');
    p.rect(30, 14, 1, 3, '#2E8B7A');
    p.rect(24, 40, 3, 6, '#7A7F8A');
    p.rect(33, 40, 3, 6, '#7A7F8A');
    p.rect(18, 46, 28, 2, '#9AA1AD');
    p.rect(12, 12, 6, 2, '#F2F4F7');
  },
  'double-strike': (p) => {
    p.disc(6, 6, 52, '#9C7A1E');
    p.disc(7, 7, 50, '#D9B44A');
    p.ring(10, 10, 44, 2, '#C29A32');
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      p.px(32 + Math.cos(a) * 23 - 0.5, 32 + Math.sin(a) * 23 - 0.5, '#9C7A1E');
    }
    const five = (dx: number, dy: number, c: string) => {
      p.rect(22 + dx, 18 + dy, 16, 4, c);
      p.rect(22 + dx, 18 + dy, 4, 12, c);
      p.rect(22 + dx, 28 + dy, 14, 4, c);
      p.rect(34 + dx, 30 + dy, 4, 10, c);
      p.rect(22 + dx, 40 + dy, 14, 4, c);
    };
    five(3, 2, '#B8952E');
    five(0, 0, '#7A5C12');
    p.rect(14, 14, 6, 2, '#F6E3A6');
  },
  'thunder-lion': (p) => {
    p.rect(9, 1, 46, 62, GOLD_D);
    p.rect(10, 2, 44, 60, GOLD);
    p.rect(13, 5, 38, 6, '#FFF3D0');
    drawText(p.ctx, 'THUNDER', 32, 7, { font: 'small', color: INK, align: 'center' });
    p.rect(13, 13, 38, 30, '#8FD3F4');
    p.rect(13, 13, 38, 10, '#B7E4F9');
    p.disc(19, 18, 22, '#E07A2A');
    p.disc(23, 22, 14, '#F6C27A');
    p.rect(26, 26, 2, 2, INK);
    p.rect(33, 26, 2, 2, INK);
    p.rect(29, 30, 3, 2, '#7A3F12');
    p.line(44, 15, 39, 26, '#F4C542');
    p.line(39, 26, 45, 26, '#F4C542');
    p.line(45, 26, 40, 38, '#F4C542');
    p.rect(13, 45, 38, 14, '#FFF3D0');
    p.rect(16, 48, 24, 2, '#C9C5BA');
    p.rect(16, 52, 18, 2, '#C9C5BA');
    p.rect(42, 47, 6, 6, '#E0524A');
  },
  'captain-monsoon': (p) => {
    p.rect(10, 1, 44, 62, '#2F4A7A');
    p.rect(11, 2, 42, 60, '#8FD3F4');
    p.rect(11, 2, 42, 12, '#E0524A');
    drawText(p.ctx, 'CAPTAIN', 30, 4, { font: 'small', color: '#FFFFFF', align: 'center' });
    drawText(p.ctx, 'MONSOON', 30, 9, { font: 'small', color: '#F4C542', align: 'center' });
    p.rect(45, 3, 7, 7, '#FFFFFF');
    drawText(p.ctx, '1', 48, 4, { font: 'small', color: INK, align: 'center' });
    // rain
    for (let i = 0; i < 9; i++) p.line(14 + i * 5, 16 + (i % 3) * 6, 12 + i * 5, 21 + (i % 3) * 6, '#5D91E5');
    // flying hero
    p.rect(22, 30, 18, 6, '#F4C542');
    p.rect(16, 28, 10, 12, '#E0524A');
    p.disc(38, 26, 8, '#F2C29B');
    p.rect(38, 25, 8, 2, INK);
    p.rect(40, 36, 10, 3, '#2F4A7A');
    p.rect(20, 36, 8, 3, '#2F4A7A');
    p.rect(13, 50, 38, 9, '#FFF6DE');
    p.rect(16, 53, 20, 2, '#C9C5BA');
    // spine wear
    p.rect(11, 20, 1, 4, '#FFFFFF');
    p.rect(11, 40, 1, 3, '#FFFFFF');
  },
  'signed-bat': (p) => {
    for (let i = 0; i < 6; i++) p.rect(28, 1 + i * 3, 8, 2, i % 2 ? '#1E1A22' : '#E0524A');
    p.rect(30, 19, 4, 4, '#C9A26C');
    p.rect(21, 23, 22, 40, '#C9A26C');
    p.rect(22, 23, 20, 39, '#F1D9A6');
    for (let y = 27; y < 60; y += 5) p.rect(25, y, 1, 3, '#E2C487');
    p.rect(24, 26, 16, 6, '#E0524A');
    p.rect(26, 28, 12, 2, '#FFFFFF');
    // signature
    p.line(25, 44, 29, 39, '#3463B0');
    p.line(29, 39, 31, 46, '#3463B0');
    p.line(31, 46, 35, 40, '#3463B0');
    p.line(35, 40, 39, 45, '#3463B0');
    p.line(26, 49, 38, 48, '#3463B0');
    // match marks
    p.rect(30, 55, 3, 2, '#C9A26C');
    p.rect(35, 57, 2, 2, '#C9A26C');
  },
  'neon-comet': (p) => {
    p.rect(4, 50, 56, 8, '#FFFFFF');
    p.rect(4, 54, 56, 2, '#9BE564');
    p.rect(4, 58, 56, 2, '#C9C5BA');
    p.rect(8, 22, 26, 28, '#FFFFFF');
    p.rect(8, 14, 16, 10, '#FFFFFF');
    p.rect(34, 34, 24, 16, '#FFFFFF');
    p.rect(52, 40, 8, 10, '#FFFFFF');
    p.rect(8, 14, 16, 4, '#9369D0');
    p.rect(8, 40, 50, 6, '#9369D0');
    p.rect(26, 22, 6, 18, '#9369D0');
    for (let i = 0; i < 4; i++) p.rect(28 + i * 5, 26 + i * 2, 4, 2, '#5E6470');
    // comet logo
    p.rect(14, 30, 4, 4, '#F4C542');
    p.line(18, 31, 25, 27, '#F4C542');
    p.line(18, 33, 24, 31, '#F29A38');
    p.rect(4, 12, 4, 6, '#9BE564');
  },
  'rocket-rex': (p) => {
    p.rect(31, 1, 2, 8, '#8F8E89');
    p.disc(29, 0, 6, '#E0524A');
    p.rect(18, 8, 28, 18, '#5D91E5');
    p.rect(18, 8, 28, 3, '#8FB5F0');
    p.rect(22, 13, 7, 7, '#F4C542');
    p.rect(35, 13, 7, 7, '#F4C542');
    p.rect(24, 15, 3, 3, INK);
    p.rect(37, 15, 3, 3, INK);
    p.rect(26, 22, 12, 2, INK);
    p.rect(14, 28, 36, 22, '#E0524A');
    p.rect(14, 28, 36, 3, '#F07A6E');
    p.disc(25, 33, 14, '#F6F6F2');
    p.line(32, 40, 36, 36, INK);
    p.rect(6, 30, 8, 5, '#B3B1AB');
    p.rect(50, 30, 8, 5, '#B3B1AB');
    p.rect(4, 35, 6, 6, '#8F8E89');
    p.rect(54, 35, 6, 6, '#8F8E89');
    p.rect(18, 50, 10, 12, '#5D91E5');
    p.rect(36, 50, 10, 12, '#5D91E5');
    // paint loss
    p.rect(16, 44, 4, 3, '#B3B1AB');
    p.rect(42, 31, 3, 2, '#B3B1AB');
    p.rect(20, 11, 3, 2, '#B3B1AB');
  },
  'inverted-airmail': (p) => {
    p.rect(6, 6, 52, 52, '#FFFFFF');
    for (let i = 0; i < 52; i += 4) {
      p.rect(6 + i, 6, 2, 2, '#F1EBFA');
      p.rect(6 + i, 56, 2, 2, '#F1EBFA');
      p.rect(6, 6 + i, 2, 2, '#F1EBFA');
      p.rect(56, 6 + i, 2, 2, '#F1EBFA');
    }
    p.rect(11, 11, 42, 42, '#3463B0');
    p.rect(14, 14, 36, 30, '#FFF6DE');
    // upside-down biplane
    p.rect(20, 30, 24, 3, '#E0524A');
    p.rect(20, 22, 24, 3, '#E0524A');
    p.rect(26, 25, 12, 5, '#E0524A');
    p.rect(22, 25, 2, 5, '#8E5C2C');
    p.rect(40, 25, 2, 5, '#8E5C2C');
    p.rect(38, 26, 8, 2, '#E0524A');
    p.rect(44, 24, 2, 6, '#E0524A');
    p.rect(18, 26, 2, 2, '#8F8E89');
    drawText(p.ctx, '12', 32, 46, { font: 'big', color: '#FFFFFF', align: 'center' });
    p.rect(40, 50, 4, 2, '#DADDE6');
  },
  'brass-compass': (p) => {
    p.rect(28, 2, 8, 6, '#A9801C');
    p.disc(4, 6, 56, '#8E6A1A');
    p.disc(5, 7, 54, '#C9A24A');
    p.ring(8, 10, 48, 2, '#E2C26A');
    p.disc(12, 14, 40, '#FFF6DE');
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      p.px(32 + Math.sin(a) * 17 - 0.5, 34 - Math.cos(a) * 17 - 0.5, '#9A9A94');
    }
    // rose
    for (let i = 0; i < 9; i++) {
      p.rect(31, 20 + i, 2, 1, '#E0524A');
      p.rect(31, 36 + i, 2, 1, INK);
    }
    p.rect(30, 22, 4, 4, '#E0524A');
    p.rect(19, 33, 26, 2, INK);
    p.rect(30, 32, 4, 4, '#C9A24A');
    drawText(p.ctx, 'N', 32, 15, { font: 'small', color: '#E0524A', align: 'center' });
    // glare
    p.line(18, 24, 24, 18, '#FFFFFF');
    p.line(19, 26, 26, 19, '#FFFFFF');
  },
  'retro-cartridge': (p) => {
    p.rect(8, 6, 48, 52, '#8F8E89');
    p.rect(8, 6, 48, 4, '#B3B1AB');
    for (let i = 0; i < 6; i++) p.rect(12 + i * 7, 10, 4, 3, '#6D6C67');
    p.rect(13, 16, 38, 34, '#5D91E5');
    p.rect(13, 16, 38, 8, '#3463B0');
    drawText(p.ctx, 'STAR QUEST', 32, 18, { font: 'small', color: '#F4C542', align: 'center' });
    p.rect(19, 30, 10, 12, '#F29A38');
    p.disc(20, 26, 8, '#F2C29B');
    p.rect(35, 36, 10, 6, '#6DBD81');
    p.rect(40, 28, 4, 4, '#F4C542');
    p.rect(8, 52, 48, 6, '#6D6C67');
    // shrink-wrap shine + dented corner
    p.line(14, 48, 24, 38, '#FFFFFF');
    p.line(40, 22, 48, 14, '#FFFFFF');
    p.rect(52, 52, 4, 6, '#F6F6F2');
  },
};

export function itemArt(id: ArtId): HTMLCanvasElement {
  return memo(`collect|${id}`, () => {
    const c = makeCanvas(64, 64);
    ART[id](new Painter(ctx2d(c)));
    return outlined(c, INK);
  });
}

export function itemArtURL(id: ArtId): string {
  return memo(`collecturl|${id}`, () => itemArt(id)).toDataURL();
}

/* ───────────────────────── Auction stage ───────────────────────── */
export const STAGE_W = 176;
export const STAGE_H = 128;

function stageBackdrop(): HTMLCanvasElement {
  return memo('collect-stage-bg', () => {
    const c = makeCanvas(STAGE_W, STAGE_H);
    const p = new Painter(ctx2d(c));
    p.rect(0, 0, STAGE_W, STAGE_H, '#FBF9FE');
    // wall panels
    for (let i = 0; i < 4; i++) {
      const x = 8 + i * 42;
      p.frame(x, 10, 34, 70, '#ECE5F6');
      p.frame(x + 3, 13, 28, 64, '#F3EEFA');
    }
    p.rect(0, 84, STAGE_W, 2, '#E3D9F2');
    // floor
    p.rect(0, 100, STAGE_W, 28, '#F1EBFA');
    for (let x = 0; x < STAGE_W; x += 12) p.rect(x, 100, 1, 28, '#E8DFF5');
    p.rect(0, 100, STAGE_W, 1, '#D9CCEE');
    return c;
  });
}

function pedestal(p: Painter, cx: number, top: number) {
  const w = 52;
  const x = Math.round(cx - w / 2);
  p.rect(x - 4, top, w + 8, 6, INK);
  p.rect(x - 3, top + 1, w + 6, 4, '#FFFFFF');
  p.rect(x - 3, top + 4, w + 6, 1, GOLD);
  p.rect(x, top + 6, w, 30, INK);
  p.rect(x + 1, top + 6, w - 2, 30, '#F6F3EC');
  p.rect(x + 1, top + 6, 6, 30, '#FFFFFF');
  p.rect(x + w - 9, top + 6, 8, 30, '#E6E0D2');
  p.rect(x - 4, top + 34, w + 8, 6, INK);
  p.rect(x - 3, top + 35, w + 6, 4, '#FFFFFF');
  p.rect(x + 10, top + 16, w - 20, 10, GOLD);
  p.rect(x + 11, top + 17, w - 22, 8, '#FFF3C4');
}

function spotlight(ctx: CanvasRenderingContext2D, fromX: number, toX: number, flicker: number) {
  ctx.fillStyle = `rgba(244,197,66,${0.07 + flicker * 0.02})`;
  for (let y = 0; y < 100; y += 2) {
    const t = y / 100;
    const cx = fromX + (toX - fromX) * t;
    const half = 4 + t * 32;
    if ((y / 2) % 2 === 0) ctx.fillRect(Math.round(cx - half), y, Math.round(half * 2), 2);
  }
}

/** Draws the auction stage. `items` = one (normal lot) or two (authenticity round). */
export function drawStage(
  ctx: CanvasRenderingContext2D,
  t: number,
  items: { id: ArtId; tag?: string; dim?: boolean }[],
  lotLabel: string,
) {
  ctx.clearRect(0, 0, STAGE_W, STAGE_H);
  ctx.drawImage(stageBackdrop(), 0, 0);
  const flick = Math.sin(t * 7) * 0.5 + 0.5;
  const centers = items.length === 2 ? [50, 126] : [STAGE_W / 2];
  for (const cx of centers) spotlight(ctx, cx < STAGE_W / 2 ? 10 : STAGE_W - 10, cx, flick);
  const p = new Painter(ctx);
  items.forEach((it, i) => {
    const cx = centers[i];
    const scale = items.length === 2 ? 0.75 : 1;
    pedestal(p, cx, 68);
    const art = itemArt(it.id);
    const bob = Math.round(Math.sin(t * 2 + i) * 1.5);
    const w = Math.round(art.width * scale);
    const h = Math.round(art.height * scale);
    ctx.globalAlpha = it.dim ? 0.45 : 1;
    ctx.drawImage(art, Math.round(cx - w / 2), 66 - h + bob, w, h);
    ctx.globalAlpha = 1;
    // holo shimmer for cards
    if (it.id === 'thunder-lion') {
      const sx = ((t * 40) % 90) - 20;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let k = 0; k < 6; k++) ctx.fillRect(Math.round(cx - w / 2 + sx + k), 66 - h + bob + 6 + k * 8, 2, 7);
    }
    // sparkles
    for (let k = 0; k < 4; k++) {
      const ph = t * 1.6 + k * 1.7 + i;
      const on = Math.sin(ph * 2) > 0.55;
      if (!on) continue;
      const sx = Math.round(cx + Math.cos(k * 2.1 + i) * (w / 2 + 6));
      const sy = Math.round(66 - h / 2 + Math.sin(k * 1.3) * (h / 2));
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(sx - 2, sy, 5, 1);
      ctx.fillRect(sx, sy - 2, 1, 5);
      ctx.fillStyle = GOLD_L;
      ctx.fillRect(sx, sy, 1, 1);
    }
    if (it.tag) {
      const tw = it.tag.length * 6 + 6;
      ctx.fillStyle = INK;
      ctx.fillRect(Math.round(cx - tw / 2) - 1, 113, tw + 2, 12);
      ctx.fillStyle = '#9369D0';
      ctx.fillRect(Math.round(cx - tw / 2), 114, tw, 10);
      drawText(ctx, it.tag, cx, 116, { color: '#FFFFFF', align: 'center' });
    }
  });
  void lotLabel;
}
