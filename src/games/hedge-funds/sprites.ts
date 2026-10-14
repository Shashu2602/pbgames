/** HEDGE DEFENSE — original procedural pixel art. */
import { ctx2d, makeCanvas, memo, outlined, paint, Painter, shade } from '../../engine/pixel';
import { drawText } from '../../engine/pixelfont';

export const INK = '#1d1a24';
export type TileKind = 'long' | 'short' | 'diversify' | 'cash';
export type EventKind = 'rally' | 'down' | 'shock';

export const TILE_COLORS: Record<TileKind, { body: string; dark: string; light: string }> = {
  long: { body: '#6DBD81', dark: '#3C8A50', light: '#A8DDB5' },
  short: { body: '#E8766C', dark: '#B23A33', light: '#F6B2AB' },
  diversify: { body: '#5D91E5', dark: '#3463B0', light: '#A9C6F3' },
  cash: { body: '#F4E3B5', dark: '#C9A24A', light: '#FFF6DE' },
};

function arrowUp(p: Painter, x: number, y: number, c: string) {
  // trend line + arrow head
  p.line(x, y + 16, x + 6, y + 10, c);
  p.line(x + 6, y + 10, x + 10, y + 13, c);
  p.line(x + 10, y + 13, x + 18, y + 4, c);
  p.line(x + 1, y + 16, x + 7, y + 10, c);
  p.line(x + 11, y + 13, x + 19, y + 4, c);
  p.rect(x + 14, y + 2, 6, 2, c);
  p.rect(x + 18, y + 2, 2, 6, c);
}

function arrowDown(p: Painter, x: number, y: number, c: string) {
  p.line(x, y + 2, x + 6, y + 8, c);
  p.line(x + 6, y + 8, x + 10, y + 5, c);
  p.line(x + 10, y + 5, x + 18, y + 14, c);
  p.line(x + 1, y + 2, x + 7, y + 8, c);
  p.line(x + 11, y + 5, x + 19, y + 14, c);
  p.rect(x + 14, y + 15, 6, 2, c);
  p.rect(x + 18, y + 11, 2, 6, c);
}

/** 34×34 strategy tile (outlined → 36×36). */
export function tileSprite(kind: TileKind, frame = 0): HTMLCanvasElement {
  return memo(`htile|${kind}|${frame % 2}`, () =>
    paint(34, 34, (p) => {
      const c = TILE_COLORS[kind];
      p.rect(0, 2, 34, 32, c.dark);
      p.rect(0, 0, 34, 30, c.body);
      p.rect(2, 2, 30, 3, c.light);
      p.rect(2, 2, 3, 26, c.light);
      const bob = frame % 2;
      if (kind === 'long') {
        arrowUp(p, 7, 6 - bob, '#FFFFFF');
        drawText(p.ctx, 'LONG', 17, 23, { font: 'small', color: c.dark, align: 'center' });
      } else if (kind === 'short') {
        arrowDown(p, 7, 5 + bob, '#FFFFFF');
        drawText(p.ctx, 'SHORT', 17, 23, { font: 'small', color: c.dark, align: 'center' });
      } else if (kind === 'diversify') {
        const cols = ['#F4C542', '#6DBD81', '#E8766C', '#FFFFFF'];
        const cx = 17;
        const cy = 13;
        for (let j = -8; j <= 8; j++)
          for (let i = -8; i <= 8; i++) {
            if (i * i + j * j > 64) continue;
            const a = Math.atan2(j, i) + Math.PI + bob * 0.4;
            p.px(cx + i, cy + j, cols[Math.floor((a / (Math.PI * 2)) * 4) % 4]);
          }
        p.ring(cx - 9, cy - 9, 18, 1, c.dark);
        drawText(p.ctx, 'MIX', 17, 24, { font: 'small', color: '#FFFFFF', align: 'center' });
      } else {
        for (let i = 0; i < 3; i++) {
          p.rect(6, 15 - i * 4 - bob, 18, 5, '#6DBD81');
          p.rect(6, 15 - i * 4 - bob, 18, 1, '#A8DDB5');
          p.rect(13, 16 - i * 4 - bob, 4, 2, '#3C8A50');
        }
        p.disc(21, 13, 9, '#F4C542');
        p.disc(23, 15, 5, '#E2A72E');
        drawText(p.ctx, 'CASH', 17, 23, { font: 'small', color: '#8E6A1A', align: 'center' });
      }
    }),
  );
}

export function tileURL(kind: TileKind): string {
  return memo(`htileurl|${kind}`, () => tileSprite(kind, 0)).toDataURL();
}

/** Market event cloud ~36×30. mode only matters for the whipsaw. */
export function eventSprite(kind: EventKind, frame: number): HTMLCanvasElement {
  const f = frame % 2;
  return memo(`hevt|${kind}|${f}`, () =>
    paint(36, 30, (p) => {
      const pal =
        kind === 'rally'
          ? { a: '#A8DDB5', b: '#6DBD81', c: '#3C8A50' }
          : kind === 'down'
            ? { a: '#C9C3C8', b: '#9E8F96', c: '#6E5D66' }
            : { a: '#C7B2EE', b: '#9369D0', c: '#5E3E99' };
      // cloud puffs
      p.disc(2, 9, 14, pal.b);
      p.disc(10, 2 + f, 18, pal.b);
      p.disc(20, 6, 15, pal.b);
      p.ellipse(1, 12, 34, 14, pal.b);
      p.disc(12, 4 + f, 10, pal.a);
      p.rect(4, 22, 28, 3, pal.c);
      // face
      const sad = kind === 'down' || kind === 'shock';
      p.rect(11, 12, 3, 3, INK);
      p.rect(22, 12, 3, 3, INK);
      p.px(12, 12, '#FFFFFF');
      p.px(23, 12, '#FFFFFF');
      if (sad) {
        p.rect(15, 19, 6, 1, INK);
        p.px(14, 20, INK);
        p.px(21, 20, INK);
        p.rect(10, 10, 4, 1, INK);
        p.rect(22, 10, 4, 1, INK);
      } else {
        p.rect(15, 19, 6, 1, INK);
        p.px(14, 18, INK);
        p.px(21, 18, INK);
      }
      // symbol
      const up = kind === 'rally';
      if (kind === 'shock') {
        p.line(29, 0, 25, 8, '#F4C542');
        p.line(25, 8, 30, 8, '#F4C542');
        p.line(30, 8, 26, 16, '#F4C542');
      } else if (up) {
        p.rect(28, 2, 4, 10, '#FFFFFF');
        p.rect(26, 4, 8, 2, '#FFFFFF');
        p.rect(27, 3, 6, 1, '#FFFFFF');
        p.rect(29, 1, 2, 1, '#FFFFFF');
      } else {
        p.rect(28, 2, 4, 10, '#E0524A');
        p.rect(26, 10, 8, 2, '#E0524A');
        p.rect(27, 12, 6, 1, '#E0524A');
        p.rect(29, 13, 2, 1, '#E0524A');
      }
      if (kind === 'down' || kind === 'shock') {
        for (let i = 0; i < 4; i++) p.rect(6 + i * 7 + f, 26, 1, 3, kind === 'down' ? '#5D91E5' : '#C7B2EE');
      }
    }),
  );
}

export function eventURL(kind: EventKind): string {
  return memo(`hevturl|${kind}`, () => eventSprite(kind, 0)).toDataURL();
}

export type Mood = 'neutral' | 'happy' | 'worried' | 'thinking' | 'celebrate';

/** Hedge-fund manager at a desk (outlined ~30×30). */
export function manager(mood: Mood, frame: number): HTMLCanvasElement {
  const f = frame % 2;
  return memo(`hmgr|${mood}|${f}`, () =>
    paint(28, 28, (p) => {
      const skin = '#C98E66';
      // chair back
      p.rect(3, 9, 22, 12, '#3A3F4B');
      // body: suit + green tie
      const armsUp = mood === 'celebrate';
      p.rect(7, 13, 14, 10, '#2F3542');
      p.rect(12, 13, 4, 3, '#FFFFFF');
      p.rect(13, 14, 2, 6, '#6DBD81');
      if (armsUp) {
        p.rect(3, 4 - f, 3, 10, '#2F3542');
        p.rect(22, 4 - f, 3, 10, '#2F3542');
        p.rect(3, 2 - f, 3, 2, skin);
        p.rect(22, 2 - f, 3, 2, skin);
      } else if (mood === 'thinking') {
        p.rect(18, 9, 3, 6, '#2F3542');
        p.rect(17, 8, 3, 2, skin);
      }
      // head
      p.rect(9, 1, 10, 11, skin);
      p.rect(9, 0, 10, 3, '#1E1A22');
      p.rect(8, 1, 2, 6, '#1E1A22');
      // glasses
      p.rect(10, 5, 3, 3, INK);
      p.rect(15, 5, 3, 3, INK);
      p.rect(13, 6, 2, 1, INK);
      p.px(11, 6, mood === 'worried' ? '#FFFFFF' : '#A9C6F3');
      p.px(16, 6, mood === 'worried' ? '#FFFFFF' : '#A9C6F3');
      // mouth
      if (mood === 'happy' || mood === 'celebrate') {
        p.rect(12, 9, 4, 1, INK);
        p.px(11, 8, INK);
        p.px(16, 8, INK);
      } else if (mood === 'worried') {
        p.rect(12, 9, 4, 1, INK);
        p.px(11, 10, INK);
        p.px(16, 10, INK);
        p.rect(19, 3 + f, 1, 2, '#8FD3F4');
      } else if (mood === 'thinking') {
        p.rect(13, 9, 3, 1, INK);
      } else {
        p.rect(12, 9, 4, 1, INK);
      }
      // desk + laptop with a chart
      p.rect(0, 21, 28, 7, '#8E5C2C');
      p.rect(0, 21, 28, 2, '#B07A44');
      p.rect(5, 14, 12, 8, '#C9CFDA');
      p.rect(6, 15, 10, 6, '#1E2430');
      const chart = mood === 'worried' ? [2, 3, 4, 5] : [5, 4, 3, 1];
      chart.forEach((h, i) => p.rect(7 + i * 2, 15 + h, 1, 1, mood === 'worried' ? '#E0524A' : '#6DBD81'));
    }),
  );
}

/** Portfolio HQ column, drawn once for the left edge of the field. */
export function hqSprite(h: number, lanes: number, laneY: number, laneH: number): HTMLCanvasElement {
  return memo(`hhq|${h}|${lanes}`, () => {
    const c = makeCanvas(58, h);
    const p = new Painter(ctx2d(c));
    p.rect(0, laneY - 6, 58, h - laneY + 6, INK);
    p.rect(1, laneY - 5, 54, h - laneY + 4, '#DCE3EE');
    p.rect(1, laneY - 5, 54, 3, '#F2F5FA');
    p.rect(52, laneY - 5, 3, h - laneY + 4, '#B9C3D3');
    for (let i = 0; i < lanes; i++) {
      const y = laneY + i * laneH;
      // lane gate
      p.rect(34, y + 10, 21, laneH - 18, INK);
      p.rect(35, y + 11, 19, laneH - 20, '#5E6470');
      p.rect(35, y + 11, 19, 2, '#8A909C');
      // windows
      p.rect(6, y + 8, 8, 6, '#BFE0F5');
      p.rect(18, y + 8, 8, 6, (i * 7) % 3 === 0 ? '#F8E7B0' : '#BFE0F5');
      p.rect(6, y + 22, 8, 6, (i * 5) % 4 === 1 ? '#F8E7B0' : '#BFE0F5');
      p.rect(18, y + 22, 8, 6, '#BFE0F5');
      p.rect(1, y + laneH - 2, 54, 1, '#C3CCDA');
    }
    return c;
  });
}

/** Ghost/cursor outline for placement. */
export function ghostFrame(w: number, h: number, ok: boolean): HTMLCanvasElement {
  return memo(`hghost|${w}|${h}|${ok}`, () => {
    const c = makeCanvas(w, h);
    const p = new Painter(ctx2d(c));
    const col = ok ? '#3C8A50' : '#E0524A';
    for (let i = 0; i < w; i += 4) {
      p.rect(i, 0, 2, 2, col);
      p.rect(i, h - 2, 2, 2, col);
    }
    for (let j = 0; j < h; j += 4) {
      p.rect(0, j, 2, 2, col);
      p.rect(w - 2, j, 2, 2, col);
    }
    return c;
  });
}

export function pulseSprite(kind: 'long' | 'short'): HTMLCanvasElement {
  return memo(`hpulse|${kind}`, () =>
    outlined(
      paint(
        6,
        6,
        (p) => {
          const c = kind === 'long' ? '#6DBD81' : '#E8766C';
          p.disc(0, 0, 6, c);
          p.rect(2, 1, 2, 4, '#FFFFFF');
          p.rect(1, 2, 4, 2, '#FFFFFF');
        },
        false,
      ),
      INK,
    ),
  );
}

export { shade };
