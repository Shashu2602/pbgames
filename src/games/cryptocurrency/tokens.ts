/**
 * CRYPTO SLICE token catalogue + original pixel coin art.
 *  A = established network (slice)          — BTC, ETH
 *  B = obvious scam warning signs (avoid)    — fictional, promise guaranteed profits
 *  C = mystery / not enough information (let it pass)
 * The game rewards spotting warning signs, never predicting prices.
 */
import { makeCanvas, ctx2d, memo, outlined, Painter, shade } from '../../engine/pixel';
import { drawText, textWidth } from '../../engine/pixelfont';

export type TokenKind = 'A' | 'B' | 'C';
type Glyph = 'btc' | 'eth' | 'rocket' | 'dollar' | 'lock' | 'eye' | 'q' | 'btc2x' | 'ethmax' | 'clock' | 'mask';

export interface TokenDef {
  id: string;
  kind: TokenKind;
  label: string;
  fill: string;
  edge: string;
  glyph: Glyph;
  /** Two-line speech bubble showing the warning sign (B) or the missing info (C). */
  claim?: [string, string];
  /** The phrase quoted back to the player when they slice it. */
  sign?: string;
}

export const TOKENS: Record<string, TokenDef> = {
  btc: { id: 'btc', kind: 'A', label: 'BTC', fill: '#F7A93B', edge: '#C47712', glyph: 'btc' },
  eth: { id: 'eth', kind: 'A', label: 'ETH', fill: '#9AA6E0', edge: '#5C68A8', glyph: 'eth' },

  g1000x: {
    id: 'g1000x',
    kind: 'B',
    label: 'GUARANTEED1000X',
    fill: '#F07A6E',
    edge: '#B23A33',
    glyph: 'rocket',
    claim: ['GUARANTEED', '1000X!'],
    sign: '"GUARANTEED" RETURNS',
  },
  instantrich: {
    id: 'instantrich',
    kind: 'B',
    label: 'INSTANTRICH',
    fill: '#E987C0',
    edge: '#A84D84',
    glyph: 'dollar',
    claim: ['GET RICH', 'TODAY!'],
    sign: 'GET-RICH-QUICK PROMISE',
  },
  norisk: {
    id: 'norisk',
    kind: 'B',
    label: 'NORISKCOIN',
    fill: '#7FD1C1',
    edge: '#3E8F80',
    glyph: 'lock',
    claim: ['ZERO RISK', 'PROMISED!'],
    sign: '"NO RISK" PROMISE',
  },
  secret: {
    id: 'secret',
    kind: 'B',
    label: 'SECRETPROFIT',
    fill: '#B9A2E8',
    edge: '#7458B8',
    glyph: 'eye',
    claim: ['SECRET', 'PROFITS!'],
    sign: 'SECRET-PROFIT CLAIM',
  },
  pumpnow: {
    id: 'pumpnow',
    kind: 'B',
    label: 'PUMPNOW',
    fill: '#F6B25E',
    edge: '#B8641A',
    glyph: 'clock',
    claim: ['BUY NOW!', '5 MIN LEFT'],
    sign: 'PRESSURE TO BUY NOW',
  },
  anonyield: {
    id: 'anonyield',
    kind: 'B',
    label: 'ANONYIELD',
    fill: '#8C8FA3',
    edge: '#55586A',
    glyph: 'mask',
    claim: ['ANON TEAM', '2X DAILY!'],
    sign: 'ANONYMOUS TEAM + 2X DAILY',
  },
  // Round-3 look-alikes: dressed like established coins, but the warning sign gives them away.
  btc2x: {
    id: 'btc2x',
    kind: 'B',
    label: 'BTC2X',
    fill: '#F7A93B',
    edge: '#C47712',
    glyph: 'btc2x',
    claim: ['2X YOUR BTC', 'GUARANTEED!'],
    sign: 'A LOOK-ALIKE PROMISING 2X',
  },
  ethmax: {
    id: 'ethmax',
    kind: 'B',
    label: 'ETHMAX',
    fill: '#9AA6E0',
    edge: '#5C68A8',
    glyph: 'ethmax',
    claim: ['RISK-FREE', '100% RETURN'],
    sign: 'A LOOK-ALIKE PROMISING NO RISK',
  },

  mystery1: { id: 'mystery1', kind: 'C', label: 'ZORB?', fill: '#D6D4CE', edge: '#8F8E89', glyph: 'q', claim: ['NEW TOKEN', 'NO INFO'] },
  mystery2: { id: 'mystery2', kind: 'C', label: 'KLYP?', fill: '#D6D4CE', edge: '#8F8E89', glyph: 'q', claim: ['NO WEBSITE', 'NO TEAM?'] },
  mystery3: { id: 'mystery3', kind: 'C', label: 'XQT?', fill: '#D6D4CE', edge: '#8F8E89', glyph: 'q', claim: ['UNKNOWN', 'PROJECT'] },
};

export const SCAMS = ['g1000x', 'instantrich', 'norisk', 'secret', 'pumpnow', 'anonyield'];
export const LOOKALIKES = ['btc2x', 'ethmax'];
export const MYSTERIES = ['mystery1', 'mystery2', 'mystery3'];

const INK = '#1d1a24';
const WHITE = '#FFFFFF';

function glyph(p: Painter, g: Glyph, cx: number, cy: number, s: number, ink: string) {
  // s = glyph unit (1 for small coins, 2 for large coins)
  const R = (x: number, y: number, w: number, h: number, c = ink) => p.rect(cx + x * s, cy + y * s, w * s, h * s, c);
  switch (g) {
    case 'btc':
    case 'btc2x':
      R(-3, -4, 2, 8);
      R(-3, -4, 5, 1);
      R(-3, -1, 5, 1);
      R(-3, 3, 5, 1);
      R(2, -3, 1, 2);
      R(2, 0, 1, 3);
      R(-2, -5, 1, 1);
      R(0, -5, 1, 1);
      R(-2, 4, 1, 1);
      R(0, 4, 1, 1);
      if (g === 'btc2x') {
        R(3, -6, 1, 1, WHITE);
        R(4, -5, 1, 1, WHITE);
        R(3, -4, 1, 1, WHITE);
      }
      break;
    case 'eth':
    case 'ethmax':
      for (let i = 0; i < 4; i++) R(-i, -5 + i, 1 + i * 2, 1, WHITE);
      R(-3, -1, 7, 1, ink);
      for (let i = 0; i < 3; i++) R(-2 + i, 1 + i, 5 - i * 2, 1, shade(ink, 0.2));
      R(0, 4, 1, 1, shade(ink, 0.2));
      if (g === 'ethmax') {
        R(3, -5, 1, 3, WHITE);
        R(2, -4, 3, 1, WHITE);
      }
      break;
    case 'rocket':
      R(-1, -5, 2, 1, WHITE);
      R(-2, -4, 4, 6, WHITE);
      R(-1, -2, 2, 2, ink);
      R(-4, 0, 2, 3, WHITE);
      R(2, 0, 2, 3, WHITE);
      R(-1, 2, 2, 2, '#F4C542');
      R(-1, 4, 2, 1, '#E8562A');
      break;
    case 'dollar':
      R(0, -5, 1, 10, WHITE);
      R(-2, -3, 5, 1, WHITE);
      R(-3, -2, 1, 2, WHITE);
      R(-2, 0, 4, 1, WHITE);
      R(2, 1, 1, 2, WHITE);
      R(-3, 3, 5, 1, WHITE);
      break;
    case 'lock':
      R(-2, -5, 4, 1, WHITE);
      R(-3, -4, 1, 3, WHITE);
      R(2, -4, 1, 3, WHITE);
      R(-4, -1, 8, 6, WHITE);
      R(-1, 1, 2, 2, ink);
      break;
    case 'eye':
      R(-3, -2, 6, 1, WHITE);
      R(-4, -1, 8, 3, WHITE);
      R(-3, 2, 6, 1, WHITE);
      R(-1, -1, 2, 3, ink);
      break;
    case 'clock':
      R(-3, -4, 6, 8, WHITE);
      R(-4, -3, 8, 6, WHITE);
      R(0, -3, 1, 3, ink);
      R(0, 0, 3, 1, ink);
      break;
    case 'mask':
      R(-4, -2, 8, 3, WHITE);
      R(-3, -1, 2, 1, ink);
      R(1, -1, 2, 1, ink);
      R(-1, 1, 2, 2, WHITE);
      break;
    case 'q':
      R(-2, -5, 4, 1, WHITE);
      R(-3, -4, 1, 2, WHITE);
      R(2, -4, 1, 3, WHITE);
      R(0, -1, 2, 1, WHITE);
      R(0, 0, 1, 2, WHITE);
      R(0, 3, 1, 1, WHITE);
      break;
  }
}

/** Coin sprite of diameter d (outlined → d+2). */
export function coinSprite(def: TokenDef, d: number): HTMLCanvasElement {
  return memo(`ctok|${def.id}|${d}`, () => {
    const c = makeCanvas(d, d);
    const p = new Painter(ctx2d(c));
    p.disc(0, 0, d, def.edge);
    p.disc(2, 2, d - 4, def.fill);
    // rim notches
    const r = d / 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      p.px(r + Math.cos(a) * (r - 1) - 0.5, r + Math.sin(a) * (r - 1) - 0.5, shade(def.edge, -0.25));
    }
    // shine
    p.rect(Math.round(d * 0.28), Math.round(d * 0.2), 2, 3, shade(def.fill, 0.55));
    p.rect(Math.round(d * 0.2), Math.round(d * 0.32), 2, 2, shade(def.fill, 0.4));
    const s = d >= 28 ? 2 : 1;
    glyph(p, def.glyph, Math.floor(r), Math.floor(r), s, shade(def.edge, -0.35));
    return outlined(c, INK);
  });
}

/** Speech bubble with the token's warning sign / missing info. */
export function claimBubble(def: TokenDef): HTMLCanvasElement {
  return memo(`cbub|${def.id}`, () => {
    const [a, b] = def.claim ?? ['', ''];
    const scam = def.kind === 'B';
    const w = Math.max(textWidth(a), textWidth(b)) + 8;
    const h = 7 * 2 + 3 + 6;
    const c = makeCanvas(w + 2, h + 6);
    const p = new Painter(ctx2d(c));
    const border = scam ? '#B23A33' : '#8F8E89';
    p.rect(1, 0, w, h + 2, border);
    p.rect(0, 1, w + 2, h, border);
    p.rect(1, 1, w, h, scam ? '#FFF4F2' : '#F6F6F2');
    // tail
    p.rect(w / 2 - 2, h + 1, 5, 2, border);
    p.rect(w / 2 - 1, h + 3, 3, 2, border);
    p.rect(w / 2, h + 5, 1, 1, border);
    const col = scam ? '#B23A33' : '#696969';
    drawText(p.ctx, a, w / 2 + 1, 4, { color: col, align: 'center' });
    drawText(p.ctx, b, w / 2 + 1, 13, { color: col, align: 'center' });
    return c;
  });
}

/** Faint background art: a chain of blocks + grid, pre-rendered once. */
export function arenaBackground(w: number, h: number): HTMLCanvasElement {
  return memo(`carena|${w}|${h}`, () => {
    const c = makeCanvas(w, h);
    const p = new Painter(ctx2d(c));
    p.rect(0, 0, w, h, '#FBFAF4');
    for (let x = 0; x < w; x += 16) p.rect(x, 0, 1, h, '#F0EDE2');
    for (let y = 0; y < h; y += 16) p.rect(0, y, w, 1, '#F0EDE2');
    // faint chain of blocks
    for (let i = 0; i < 7; i++) {
      const x = 22 + i * 66;
      const y = 120 + (i % 2) * 14;
      p.frame(x, y, 34, 26, '#ECE6D2');
      p.frame(x + 1, y + 1, 32, 24, '#F2EEDF');
      p.rect(x + 6, y + 8, 18, 2, '#EEE8D6');
      p.rect(x + 6, y + 14, 12, 2, '#EEE8D6');
      if (i < 6) {
        p.ring(x + 33, y + 9 + (i % 2 ? -7 : 7) / 2, 8, 1, '#E9E2CB');
        p.ring(x + 40, y + 9 + (i % 2 ? -7 : 7) / 2, 8, 1, '#E9E2CB');
      }
    }
    return c;
  });
}
