/**
 * Pixel-art toolkit. Sprites are drawn once (procedurally or from string maps)
 * into small offscreen canvases, outlined automatically for bold silhouettes,
 * cached, and blitted with nearest-neighbour scaling.
 */
export type Palette = Record<string, string>;

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

const cache = new Map<string, HTMLCanvasElement>();
export function memo(key: string, build: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) {
    c = build();
    cache.set(key, c);
  }
  return c;
}

/** Sprite from rows of characters; '.' and ' ' are transparent. */
export function spriteFromRows(rows: string[], pal: Palette): HTMLCanvasElement {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const c = makeCanvas(w, h);
  const ctx = ctx2d(c);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

/** Returns a new canvas (1px larger on each side) with an outline around opaque pixels. */
export function outlined(src: HTMLCanvasElement, color = '#1d1a24', diagonal = false): HTMLCanvasElement {
  const w = src.width + 2;
  const h = src.height + 2;
  const out = makeCanvas(w, h);
  const ctx = ctx2d(out);
  const sctx = src.getContext('2d') as CanvasRenderingContext2D;
  const data = sctx.getImageData(0, 0, src.width, src.height).data;
  const solid = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < src.width && y < src.height && data[(y * src.width + x) * 4 + 3] > 40;
  ctx.fillStyle = color;
  for (let y = -1; y <= src.height; y++) {
    for (let x = -1; x <= src.width; x++) {
      if (solid(x, y)) continue;
      const n =
        solid(x - 1, y) ||
        solid(x + 1, y) ||
        solid(x, y - 1) ||
        solid(x, y + 1) ||
        (diagonal && (solid(x - 1, y - 1) || solid(x + 1, y - 1) || solid(x - 1, y + 1) || solid(x + 1, y + 1)));
      if (n) ctx.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  ctx.drawImage(src, 1, 1);
  return out;
}

export function flipH(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = makeCanvas(src.width, src.height);
  const ctx = ctx2d(c);
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
}

/** Tints every opaque pixel with a flat colour (hit flashes, silhouettes). */
export function silhouette(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const c = makeCanvas(src.width, src.height);
  const ctx = ctx2d(c);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Build a sprite procedurally with a Painter, optionally outlined. */
export function paint(w: number, h: number, draw: (p: Painter) => void, outline?: string | false): HTMLCanvasElement {
  const c = makeCanvas(w, h);
  draw(new Painter(ctx2d(c)));
  return outline === false ? c : outlined(c, outline ?? '#1d1a24');
}

/** Small immediate-mode pixel drawing API (integer pixels, no anti-aliasing). */
export class Painter {
  constructor(public ctx: CanvasRenderingContext2D) {}

  px(x: number, y: number, c: string) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  rect(x: number, y: number, w: number, h: number, c: string) {
    if (w <= 0 || h <= 0) return;
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  /** 1px rectangle border. */
  frame(x: number, y: number, w: number, h: number, c: string) {
    this.rect(x, y, w, 1, c);
    this.rect(x, y + h - 1, w, 1, c);
    this.rect(x, y, 1, h, c);
    this.rect(x + w - 1, y, 1, h, c);
  }

  /** Filled disc inside the d×d box at (x,y). Symmetric for any diameter. */
  disc(x: number, y: number, d: number, c: string) {
    const r = d / 2;
    this.ctx.fillStyle = c;
    for (let j = 0; j < d; j++) {
      const dy = j + 0.5 - r;
      const half = Math.sqrt(Math.max(0, r * r - dy * dy));
      const x0 = Math.round(r - half);
      const x1 = Math.round(r + half);
      if (x1 > x0) this.ctx.fillRect(Math.round(x) + x0, Math.round(y) + j, x1 - x0, 1);
    }
  }

  /** Ring of thickness t inside the d×d box at (x,y). */
  ring(x: number, y: number, d: number, t: number, c: string) {
    const r = d / 2;
    const ri = r - t;
    this.ctx.fillStyle = c;
    for (let j = 0; j < d; j++) {
      const dy = j + 0.5 - r;
      const ho = Math.sqrt(Math.max(0, r * r - dy * dy));
      const ox0 = Math.round(r - ho);
      const ox1 = Math.round(r + ho);
      if (Math.abs(dy) < ri) {
        const hi = Math.sqrt(Math.max(0, ri * ri - dy * dy));
        const ix0 = Math.round(r - hi);
        const ix1 = Math.round(r + hi);
        if (ix0 > ox0) this.ctx.fillRect(Math.round(x) + ox0, Math.round(y) + j, ix0 - ox0, 1);
        if (ox1 > ix1) this.ctx.fillRect(Math.round(x) + ix1, Math.round(y) + j, ox1 - ix1, 1);
      } else if (ox1 > ox0) {
        this.ctx.fillRect(Math.round(x) + ox0, Math.round(y) + j, ox1 - ox0, 1);
      }
    }
  }

  ellipse(x: number, y: number, w: number, h: number, c: string) {
    const rx = w / 2;
    const ry = h / 2;
    this.ctx.fillStyle = c;
    for (let j = 0; j < h; j++) {
      const dy = (j + 0.5 - ry) / ry;
      const half = rx * Math.sqrt(Math.max(0, 1 - dy * dy));
      const x0 = Math.round(rx - half);
      const x1 = Math.round(rx + half);
      if (x1 > x0) this.ctx.fillRect(Math.round(x) + x0, Math.round(y) + j, x1 - x0, 1);
    }
  }

  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    this.ctx.fillStyle = c;
    for (let guard = 0; guard < 2000; guard++) {
      this.ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Draw a string-map at (x,y). */
  map(x: number, y: number, rows: string[], pal: Palette) {
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.' || ch === ' ') continue;
        const col = pal[ch];
        if (!col) continue;
        this.ctx.fillStyle = col;
        this.ctx.fillRect(x + i, y + j, 1, 1);
      }
    }
  }

  blit(img: CanvasImageSource, x: number, y: number) {
    this.ctx.drawImage(img, Math.round(x), Math.round(y));
  }
}

/** Shade a hex colour: amt > 0 lightens, amt < 0 darkens. */
export function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amt >= 0) {
    r = Math.round(r + (255 - r) * amt);
    g = Math.round(g + (255 - g) * amt);
    b = Math.round(b + (255 - b) * amt);
  } else {
    r = Math.round(r * (1 + amt));
    g = Math.round(g * (1 + amt));
    b = Math.round(b * (1 + amt));
  }
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
