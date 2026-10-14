/**
 * Pixel-art "visual example" strips for the learning moments.
 * Each is drawn once on a 120×44 canvas and shown upscaled as a crisp image.
 */
import { memo as memoCanvas, makeCanvas, ctx2d, Painter } from '../engine/pixel';
import { drawText } from '../engine/pixelfont';
import type { EduVisual } from '../data/education';
import * as VC from '../games/venture-capital/sprites';

const W = 120;
const H = 44;
const INK = '#1d1a24';
const GREEN = '#6DBD81';
const GREEN_D = '#3C8A50';
const RED = '#E0524A';
const RED_D = '#A8332D';
const GOLD = '#F4C542';
const GOLD_D = '#B8841C';
const BLUE = '#5D91E5';
const PURPLE = '#9369D0';
const ORANGE = '#F29A38';
const GREY = '#B3B1AB';

function arrowR(p: Painter, x0: number, x1: number, y: number, c = INK) {
  p.rect(x0, y, x1 - x0 - 2, 2, c);
  p.rect(x1 - 4, y - 2, 2, 6, c);
  p.rect(x1 - 2, y - 1, 2, 4, c);
}
function arrowL(p: Painter, x0: number, x1: number, y: number, c = INK) {
  p.rect(x0 + 2, y, x1 - x0 - 2, 2, c);
  p.rect(x0 + 2, y - 2, 2, 6, c);
  p.rect(x0, y - 1, 2, 4, c);
}
function label(p: Painter, text: string, cx: number, y: number, color = INK) {
  drawText(p.ctx, text, cx, y, { font: 'small', color, align: 'center' });
}
function coin(p: Painter, x: number, y: number, d: number, fill = GOLD, edge = GOLD_D) {
  p.disc(x, y, d, INK);
  p.disc(x + 1, y + 1, d - 2, edge);
  p.disc(x + 2, y + 2, d - 4, fill);
}
function pie(p: Painter, x: number, y: number, d: number, frac: number, a: string, b: string) {
  const r = d / 2;
  for (let j = 0; j < d; j++)
    for (let i = 0; i < d; i++) {
      const dx = i + 0.5 - r;
      const dy = j + 0.5 - r;
      const dist = Math.hypot(dx, dy);
      if (dist > r) continue;
      if (dist > r - 1) {
        p.px(x + i, y + j, INK);
        continue;
      }
      let ang = Math.atan2(dx, -dy) / (Math.PI * 2);
      if (ang < 0) ang += 1;
      p.px(x + i, y + j, ang < frac ? a : b);
    }
}
function tile(p: Painter, x: number, y: number, s: number, fill: string, up: boolean) {
  p.rect(x, y, s, s, INK);
  p.rect(x + 1, y + 1, s - 2, s - 2, fill);
  p.rect(x + 1, y + 1, s - 2, 2, '#FFFFFF66');
  const cx = x + s / 2 - 1;
  if (up) {
    p.rect(cx, y + 5, 2, s - 9, '#FFFFFF');
    p.rect(cx - 2, y + 7, 6, 1, '#FFFFFF');
    p.rect(cx - 1, y + 6, 4, 1, '#FFFFFF');
  } else {
    p.rect(cx, y + 4, 2, s - 9, '#FFFFFF');
    p.rect(cx - 2, y + s - 7, 6, 1, '#FFFFFF');
    p.rect(cx - 1, y + s - 6, 4, 1, '#FFFFFF');
  }
}
function shop(p: Painter, x: number, y: number, w: number, h: number, awning: string) {
  p.rect(x, y + 4, w, h - 4, INK);
  p.rect(x + 1, y + 5, w - 2, h - 6, '#F6E7D2');
  for (let i = 0; i < w; i += 4) p.rect(x + i, y, 2, 5, awning);
  p.rect(x, y, w, 1, INK);
  p.rect(x + 3, y + h - 9, 6, 8, '#8E5C2C');
  p.rect(x + w - 10, y + 8, 7, 5, '#BFE0F5');
}
function building(p: Painter, x: number, y: number, w: number, h: number, c: string) {
  p.rect(x, y, w, h, INK);
  p.rect(x + 1, y + 1, w - 2, h - 1, c);
  for (let yy = y + 3; yy < y + h - 3; yy += 4) for (let xx = x + 3; xx < x + w - 3; xx += 4) p.rect(xx, yy, 2, 2, '#FFFFFF');
}
function monitor(p: Painter, x: number, y: number) {
  p.rect(x, y, 12, 9, INK);
  p.rect(x + 1, y + 1, 10, 6, '#8FD3F4');
  p.rect(x + 5, y + 9, 2, 2, INK);
  p.rect(x + 3, y + 11, 6, 1, INK);
}

const DRAW: Record<EduVisual, (p: Painter) => void> = {
  ownership: (p) => {
    p.blit(VC.personFrame(VC.ELDER_LOOK, 'idle', 0, 1), 4, 14);
    label(p, 'INVESTOR', 17, 1);
    coin(p, 36, 1, 10);
    arrowR(p, 24, 62, 14, GREEN_D);
    label(p, 'MONEY', 43, 19, GREEN_D);
    p.blit(VC.personFrame(VC.VC_LOOK, 'idle', 0, -1), 64, 14);
    label(p, 'STARTUP', 73, 1);
    arrowL(p, 24, 62, 32, ORANGE);
    label(p, 'SHARES', 43, 37, '#B8641A');
    pie(p, 92, 10, 24, 0.25, ORANGE, '#E9EEF6');
    label(p, 'PART-OWNER', 100, 37);
  },
  seed: (p) => {
    coin(p, 8, 12, 16);
    label(p, 'SEED ₹', 16, 34);
    arrowR(p, 28, 44, 19);
    p.ellipse(48, 26, 22, 8, '#8E5C2C');
    p.rect(58, 12, 2, 15, GREEN_D);
    p.ellipse(50, 10, 9, 6, GREEN);
    p.ellipse(60, 6, 9, 6, GREEN);
    label(p, 'BUILD', 59, 36);
    arrowR(p, 74, 90, 19);
    p.blit(VC.itemSprite('product'), 94, 11);
    label(p, 'TEST', 101, 34);
  },
  risk: (p) => {
    for (let i = 0; i < 10; i++) {
      const x = 3 + i * 11.6;
      const bright = i === 6;
      const dim = i === 2 || i === 8;
      const glass = bright ? GOLD : dim ? '#F3E3A6' : '#D6D4CE';
      p.disc(x, 8, 9, INK);
      p.disc(x + 1, 9, 7, glass);
      p.rect(x + 2, 16, 5, 4, INK);
      p.rect(x + 3, 16, 3, 3, GREY);
      if (!bright && !dim) {
        p.line(x + 4, 10, x + 3, 12, '#6D6C67');
        p.line(x + 3, 12, x + 5, 14, '#6D6C67');
      }
      if (bright) {
        p.rect(x + 4, 3, 1, 3, GOLD_D);
        p.rect(x - 2, 11, 2, 1, GOLD_D);
        p.rect(x + 10, 11, 2, 1, GOLD_D);
      }
    }
    label(p, 'MANY FAIL - A FEW SUCCEED', 60, 27);
    label(p, '(ILLUSTRATIVE)', 60, 35, '#696969');
  },
  growth: (p) => {
    building(p, 6, 20, 16, 14, '#F6D7B8');
    building(p, 40, 10, 22, 24, '#CDEBD8');
    building(p, 82, 0, 28, 34, '#D3E5F7');
    p.rect(0, 34, W, 1, INK);
    arrowR(p, 24, 38, 27, ORANGE);
    arrowR(p, 64, 80, 20, ORANGE);
    p.blit(VC.itemSprite('team'), 24, 6);
    p.blit(VC.itemSprite('globe'), 65, 0);
    label(p, 'HIRE - EXPAND - NEW MARKETS', 60, 38);
  },
  exit: (p) => {
    building(p, 4, 14, 22, 26, '#F6D7B8');
    label(p, 'STARTUP', 15, 6);
    arrowR(p, 28, 58, 13, INK);
    arrowR(p, 28, 58, 31, INK);
    // handshake
    p.rect(62, 9, 10, 6, '#F2C29B');
    p.rect(70, 7, 10, 6, '#C98E66');
    p.rect(60, 9, 3, 6, BLUE);
    p.rect(79, 7, 3, 6, GREEN);
    label(p, 'ACQUIRED', 102, 9);
    // bell (public listing)
    p.rect(68, 24, 6, 2, GOLD_D);
    p.disc(64, 25, 14, GOLD);
    p.rect(64, 32, 14, 3, GOLD);
    p.rect(62, 35, 18, 2, GOLD_D);
    p.rect(70, 37, 2, 2, INK);
    label(p, 'PUBLIC', 102, 26);
    label(p, 'LISTING', 102, 33);
  },
  crypto: (p) => {
    const nodes = [
      [6, 4],
      [6, 30],
      [102, 4],
      [102, 30],
    ];
    for (const [x, y] of nodes) p.line(x + 6, y + 5, 60, 22, '#9A9A94');
    for (const [x, y] of nodes) monitor(p, x, y);
    coin(p, 48, 10, 24);
    p.rect(57, 15, 2, 14, INK);
    p.rect(55, 16, 6, 2, INK);
    p.rect(55, 21, 7, 2, INK);
    p.rect(55, 26, 6, 2, INK);
    p.rect(61, 18, 2, 3, INK);
    p.rect(62, 23, 2, 3, INK);
    label(p, 'DIGITAL ASSET', 60, 38);
  },
  chain: (p) => {
    for (let i = 0; i < 4; i++) {
      const x = 4 + i * 30;
      p.rect(x, 4, 20, 16, INK);
      p.rect(x + 1, 5, 18, 14, i % 2 ? '#E3D7F2' : '#FDF6DC');
      p.rect(x + 3, 8, 10, 1, GREY);
      p.rect(x + 3, 11, 12, 1, GREY);
      p.rect(x + 13, 13, 2, 2, GREEN_D);
      p.rect(x + 15, 11, 2, 2, GREEN_D);
      if (i < 3) {
        p.ring(x + 19, 9, 6, 1, '#6D6C67');
        p.ring(x + 23, 9, 6, 1, '#6D6C67');
      }
      monitor(p, x + 4, 28);
      p.rect(x + 10, 21, 1, 6, '#9A9A94');
    }
  },
  scam: (p) => {
    coin(p, 2, 10, 22, '#F07A6E', RED_D);
    p.rect(10, 15, 2, 7, '#FFFFFF');
    p.rect(10, 24, 2, 2, '#FFFFFF');
    p.rect(14, 15, 2, 7, '#FFFFFF');
    p.rect(14, 24, 2, 2, '#FFFFFF');
    p.rect(26, 2, 68, 22, INK);
    p.rect(27, 3, 66, 20, '#FFF4F2');
    p.rect(24, 18, 4, 3, INK);
    p.rect(22, 20, 3, 2, INK);
    drawText(p.ctx, 'GUARANTEED', 60, 5, { color: RED_D, align: 'center' });
    drawText(p.ctx, '1000X!', 60, 14, { color: RED_D, align: 'center' });
    // warning triangle
    for (let j = 0; j < 16; j++) p.rect(107 - j / 1.8, 6 + j, (j / 1.8) * 2 + 1, 1, j === 15 ? INK : GOLD);
    p.rect(106, 11, 2, 6, INK);
    p.rect(106, 19, 2, 2, INK);
    label(p, 'RED FLAG', 104, 27, RED_D);
    label(p, 'NO ONE CAN GUARANTEE PROFIT', 62, 38);
  },
  mystery: (p) => {
    coin(p, 6, 8, 26, '#D6D4CE', '#8F8E89');
    drawText(p.ctx, '?', 19, 14, { color: INK, align: 'center', scale: 2 });
    label(p, 'NO INFO', 19, 37);
    arrowR(p, 38, 54, 21);
    p.ring(58, 6, 22, 3, INK);
    p.disc(61, 9, 16, '#DDF1FB');
    p.rect(77, 26, 3, 3, INK);
    p.rect(80, 29, 3, 3, INK);
    p.rect(83, 32, 4, 4, '#8E5C2C');
    label(p, 'WAIT &', 106, 14);
    label(p, 'RESEARCH', 104, 22);
  },
  volatility: (p) => {
    p.rect(4, 2, 1, 38, INK);
    p.rect(4, 39, 114, 1, INK);
    const pts = [
      [6, 30],
      [16, 12],
      [26, 34],
      [36, 8],
      [46, 28],
      [56, 4],
      [66, 36],
      [76, 14],
      [86, 32],
      [96, 9],
      [106, 26],
      [116, 17],
    ];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const c = y1 < y0 ? GREEN_D : RED;
      p.line(x0, y0, x1, y1, c);
      p.line(x0, y0 + 1, x1, y1 + 1, c);
    }
  },
  collect: (p) => {
    p.rect(44, 26, 32, 4, INK);
    p.rect(46, 30, 28, 12, '#E9E5DA');
    p.rect(44, 42, 32, 2, INK);
    p.disc(50, 6, 20, INK);
    p.disc(51, 7, 18, GOLD);
    p.disc(53, 9, 14, '#FFF8E3');
    p.rect(59, 10, 2, 6, INK);
    p.rect(60, 15, 4, 2, INK);
    p.rect(56, 0, 8, 6, '#8E5C2C');
    label(p, 'RARITY', 18, 8, PURPLE);
    label(p, 'CONDITION', 18, 22, PURPLE);
    label(p, 'DEMAND', 100, 8, PURPLE);
    label(p, 'PROOF', 100, 22, PURPLE);
    label(p, 'AGE', 100, 36, PURPLE);
    label(p, 'HISTORY', 18, 36, PURPLE);
  },
  proof: (p) => {
    p.rect(6, 4, 36, 30, INK);
    p.rect(7, 5, 34, 28, '#FFFFFF');
    for (let i = 0; i < 4; i++) p.rect(10, 9 + i * 4, 22 - (i % 2) * 6, 1, GREY);
    p.disc(28, 20, 11, RED);
    p.rect(31, 24, 2, 2, '#FFFFFF');
    p.rect(33, 22, 2, 2, '#FFFFFF');
    label(p, 'VERIFIED', 24, 37, GREEN_D);
    drawText(p.ctx, 'VS', 60, 16, { color: INK, align: 'center' });
    p.rect(78, 4, 36, 30, INK);
    p.rect(79, 5, 34, 28, '#F3F1EA');
    drawText(p.ctx, '?', 96, 12, { color: '#9A9A94', align: 'center', scale: 2 });
    label(p, 'NO PROOF', 96, 37, RED_D);
  },
  long: (p) => {
    p.rect(4, 39, 52, 1, INK);
    p.line(6, 34, 20, 26, GREEN_D);
    p.line(20, 26, 30, 29, GREEN_D);
    p.line(30, 29, 52, 8, GREEN_D);
    p.line(6, 35, 20, 27, GREEN_D);
    p.line(30, 30, 52, 9, GREEN_D);
    label(p, 'PRICE UP', 30, 0, GREEN_D);
    arrowR(p, 56, 68, 20);
    tile(p, 70, 10, 22, GREEN, true);
    label(p, 'LONG', 81, 35);
    drawText(p.ctx, '+', 108, 13, { color: GREEN_D, align: 'center', scale: 2 });
    label(p, 'GAIN', 108, 30, GREEN_D);
  },
  short: (p) => {
    p.rect(4, 39, 52, 1, INK);
    p.line(6, 8, 22, 18, RED);
    p.line(22, 18, 32, 14, RED);
    p.line(32, 14, 52, 34, RED);
    p.line(6, 9, 22, 19, RED);
    p.line(32, 15, 52, 35, RED);
    label(p, 'PRICE DOWN', 30, 0, RED_D);
    arrowR(p, 56, 68, 20);
    tile(p, 70, 10, 22, RED, false);
    label(p, 'SHORT', 81, 35);
    drawText(p.ctx, '+', 108, 6, { color: GREEN_D, align: 'center', scale: 2 });
    label(p, 'IF ↓', 108, 22, GREEN_D);
    label(p, '- IF ↑', 108, 31, RED_D);
  },
  hedge: (p) => {
    tile(p, 6, 8, 22, GREEN, true);
    label(p, 'LONG', 17, 33);
    drawText(p.ctx, '+', 38, 15, { color: INK, align: 'center' });
    tile(p, 48, 8, 22, RED, false);
    label(p, 'SHORT', 59, 33);
    drawText(p.ctx, '=', 80, 15, { color: INK, align: 'center' });
    // shield
    p.rect(90, 4, 24, 18, INK);
    p.rect(91, 5, 22, 16, BLUE);
    for (let j = 0; j < 10; j++) p.rect(90 + j, 22 + j, 24 - j * 2, 1, j === 9 ? INK : BLUE);
    p.rect(101, 8, 2, 16, '#FFFFFF');
    p.rect(95, 13, 14, 2, '#FFFFFF');
    label(p, 'NOT RISK-FREE', 60, 39, RED_D);
  },
  pe: (p) => {
    shop(p, 4, 12, 26, 22, ORANGE);
    label(p, 'BUY', 17, 37);
    arrowR(p, 32, 44, 22);
    p.blit(VC.itemSprite('product'), 47, 13);
    label(p, 'IMPROVE', 55, 37);
    arrowR(p, 66, 78, 22);
    shop(p, 82, 4, 34, 30, BLUE);
    p.rect(93, 16, 18, 8, INK);
    p.rect(94, 17, 16, 6, GOLD);
    drawText(p.ctx, 'SOLD', 102, 18, { font: 'small', color: INK, align: 'center' });
    label(p, 'SELL', 99, 37);
  },
  value: (p) => {
    const cols = [BLUE, GREEN, ORANGE, PURPLE, GOLD];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 6; c++) {
        if (r === 0 && c > 3) continue;
        const x = 6 + c * 8;
        const y = 34 - r * 8;
        p.rect(x, y, 8, 8, INK);
        p.rect(x + 1, y + 1, 6, 6, cols[(r + c) % 5]);
        p.rect(x + 1, y + 1, 6, 1, '#FFFFFF88');
      }
    arrowR(p, 58, 72, 22);
    p.rect(78, 30, 6, 10, GREEN);
    p.rect(88, 22, 6, 18, GREEN);
    p.rect(98, 12, 6, 28, GREEN_D);
    p.rect(76, 40, 34, 1, INK);
    label(p, 'VALUE ↑', 92, 2, GREEN_D);
  },
  debt: (p) => {
    p.rect(58, 18, 4, 22, INK);
    p.rect(50, 40, 20, 2, INK);
    // tilted beam
    p.line(14, 26, 106, 12, INK);
    p.line(14, 27, 106, 13, INK);
    p.rect(12, 26, 26, 14, INK);
    p.rect(13, 27, 24, 12, '#5E6470');
    drawText(p.ctx, 'DEBT', 25, 30, { font: 'small', color: '#FFFFFF', align: 'center' });
    shop(p, 88, 0, 22, 12, BLUE);
    label(p, 'GAINS ↑', 98, 18, GREEN_D);
    label(p, 'LOSSES ↑', 98, 28, RED_D);
  },
};

const urls = new Map<EduVisual, string>();
function urlFor(v: EduVisual): string {
  let u = urls.get(v);
  if (!u) {
    const c = memoCanvas(`edu|${v}`, () => {
      const cv = makeCanvas(W, H);
      DRAW[v](new Painter(ctx2d(cv)));
      return cv;
    });
    u = c.toDataURL();
    urls.set(v, u);
  }
  return u;
}

export function EduVisualArt({ visual, scale = 3 }: { visual: EduVisual; scale?: number }) {
  return (
    <img
      src={urlFor(visual)}
      alt=""
      aria-hidden
      className="pixelated block max-w-full"
      style={{ width: W * scale, height: 'auto' }}
    />
  );
}
