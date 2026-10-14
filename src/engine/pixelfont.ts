/**
 * Two original bitmap fonts for in-canvas text. Drawing text from bitmaps keeps
 * every letter on the pixel grid (canvas fillText would blur when upscaled).
 *  - 'big'   5×7 glyphs (labels, popups, banners)
 *  - 'small' 3×5 glyphs (tiny tags under sprites)
 */
import { makeCanvas, ctx2d, outlined } from './pixel';

type Glyphs = Record<string, number[]>;

const G5: Glyphs = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1c, 0x12, 0x11, 0x11, 0x11, 0x12, 0x1c],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x11, 0x0a, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
  '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  '?': [0x0e, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  '-': [0, 0, 0, 0x1f, 0, 0, 0],
  '+': [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  '%': [0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03],
  '/': [0, 0x01, 0x02, 0x04, 0x08, 0x10, 0],
  "'": [0x0c, 0x04, 0x08, 0, 0, 0, 0],
  '"': [0x0a, 0x0a, 0, 0, 0, 0, 0],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  '=': [0, 0, 0x1f, 0, 0x1f, 0, 0],
  '#': [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  '*': [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0],
  '<': [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
  '>': [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
  '×': [0, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0],
  '₹': [0x1f, 0x06, 0x1f, 0x0c, 0x06, 0x03, 0x01],
  '↑': [0x04, 0x0e, 0x15, 0x04, 0x04, 0x04, 0x04],
  '↓': [0x04, 0x04, 0x04, 0x04, 0x15, 0x0e, 0x04],
  _: [0, 0, 0, 0, 0, 0, 0x1f],
  '✓': [0, 0x01, 0x02, 0x12, 0x14, 0x08, 0],
};

const G3: Glyphs = {
  A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6],
  E: [7, 4, 6, 4, 7], F: [7, 4, 6, 4, 4], G: [3, 4, 5, 5, 3], H: [5, 5, 7, 5, 5],
  I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 2], K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7],
  M: [5, 7, 7, 5, 5], N: [6, 5, 5, 5, 5], O: [2, 5, 5, 5, 2], P: [6, 5, 6, 4, 4],
  Q: [2, 5, 5, 6, 3], R: [6, 5, 6, 5, 5], S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2],
  U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5],
  Y: [5, 5, 2, 2, 2], Z: [7, 1, 2, 4, 7],
  '0': [7, 5, 5, 5, 7], '1': [2, 6, 2, 2, 7], '2': [6, 1, 2, 4, 7], '3': [6, 1, 2, 1, 6],
  '4': [5, 5, 7, 1, 1], '5': [7, 4, 6, 1, 6], '6': [3, 4, 7, 5, 7], '7': [7, 1, 1, 2, 2],
  '8': [7, 5, 7, 5, 7], '9': [7, 5, 7, 1, 6],
  ' ': [0, 0, 0, 0, 0], '!': [2, 2, 2, 0, 2], '?': [6, 1, 2, 0, 2], '.': [0, 0, 0, 0, 2],
  ',': [0, 0, 0, 2, 4], ':': [0, 2, 0, 2, 0], '-': [0, 0, 7, 0, 0], '+': [0, 2, 7, 2, 0],
  '%': [5, 1, 2, 4, 5], '/': [1, 1, 2, 4, 4], "'": [2, 2, 0, 0, 0], '(': [1, 2, 2, 2, 1],
  ')': [4, 2, 2, 2, 4], '=': [0, 7, 0, 7, 0], $: [3, 6, 2, 3, 6], '×': [0, 5, 2, 5, 0],
  '₹': [7, 1, 7, 2, 1], '↑': [2, 7, 2, 2, 2], '↓': [2, 2, 2, 7, 2], '#': [5, 7, 5, 7, 5],
  '<': [1, 2, 4, 2, 1], '>': [4, 2, 1, 2, 4], '&': [2, 5, 2, 5, 3], '"': [5, 5, 0, 0, 0],
  '*': [5, 2, 5, 0, 0], '✓': [0, 1, 5, 2, 0], _: [0, 0, 0, 0, 7],
};

export type FontName = 'big' | 'small';

const FONTS: Record<FontName, { g: Glyphs; w: number; h: number }> = {
  big: { g: G5, w: 5, h: 7 },
  small: { g: G3, w: 3, h: 5 },
};

export function glyphHeight(font: FontName) {
  return FONTS[font].h;
}

export function textWidth(text: string, font: FontName = 'big') {
  const f = FONTS[font];
  return text.length === 0 ? 0 : text.length * (f.w + 1) - 1;
}

const cache = new Map<string, HTMLCanvasElement>();

/** Renders text to a cached canvas. */
export function textCanvas(text: string, font: FontName, color: string, outline?: string): HTMLCanvasElement {
  const t = text.toUpperCase();
  const key = `${font}|${color}|${outline ?? ''}|${t}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const f = FONTS[font];
  const c = makeCanvas(Math.max(1, textWidth(t, font)), f.h);
  const ctx = ctx2d(c);
  ctx.fillStyle = color;
  let x = 0;
  for (const ch of t) {
    const rows = f.g[ch] ?? f.g['?'];
    for (let y = 0; y < f.h; y++) {
      const bits = rows[y];
      for (let i = 0; i < f.w; i++) {
        if (bits & (1 << (f.w - 1 - i))) ctx.fillRect(x + i, y, 1, 1);
      }
    }
    x += f.w + 1;
  }
  const out = outline ? outlined(c, outline, true) : c;
  if (cache.size > 600) {
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
  cache.set(key, out);
  return out;
}

export interface TextOpts {
  font?: FontName;
  color?: string;
  outline?: string;
  align?: 'left' | 'center' | 'right';
  scale?: number;
  alpha?: number;
}

/** Draws pixel text; (x,y) is the top edge at the alignment anchor. Returns drawn width. */
export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, opts: TextOpts = {}) {
  const { font = 'big', color = '#171717', outline, align = 'left', scale = 1, alpha = 1 } = opts;
  const img = textCanvas(text, font, color, outline);
  const w = img.width * scale;
  const h = img.height * scale;
  let dx = x;
  if (align === 'center') dx = x - w / 2;
  else if (align === 'right') dx = x - w;
  const prevAlpha = ctx.globalAlpha;
  if (alpha !== 1) ctx.globalAlpha = prevAlpha * alpha;
  ctx.drawImage(img, Math.round(dx), Math.round(y - (outline ? scale : 0)), w, h);
  ctx.globalAlpha = prevAlpha;
  return w;
}

/** Text inside a rounded pill/label. Returns {w,h}. */
export function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  opts: { font?: FontName; fg?: string; bg?: string; border?: string; padX?: number; padY?: number } = {},
) {
  const { font = 'small', fg = '#ffffff', bg = '#171717', border, padX = 2, padY = 1 } = opts;
  const tw = textWidth(text, font);
  const th = glyphHeight(font);
  const w = tw + padX * 2;
  const h = th + padY * 2;
  const x = Math.round(cx - w / 2);
  const yy = Math.round(y);
  if (border) {
    ctx.fillStyle = border;
    ctx.fillRect(x, yy - 1, w, h + 2);
    ctx.fillRect(x - 1, yy, w + 2, h);
  }
  ctx.fillStyle = bg;
  ctx.fillRect(x, yy, w, h);
  drawText(ctx, text, x + padX, yy + padY, { font, color: fg });
  return { w, h };
}
