/**
 * STARTUP RUN — original procedural pixel art.
 * Every sprite is drawn with the Painter into a tiny canvas, auto-outlined, cached.
 */
import { ctx2d, flipH, makeCanvas, memo, outlined, paint, Painter, shade, type Palette } from '../../engine/pixel';
import { drawText, textWidth } from '../../engine/pixelfont';

export const INK = '#1d1a24';
export const TILE = 16;

/* ───────────────────────── People ───────────────────────── */
type Expr = 'smile' | 'blink' | 'open' | 'hurt' | 'grin';
type ArmPose = 'down' | 'swingF' | 'swingB' | 'fwdUp' | 'out' | 'cheer' | 'brace' | 'hold';

export interface Pose {
  bob: number;
  lean: number;
  back: [number, number];
  front: [number, number];
  arm: ArmPose;
  face: Expr;
}

const HEADS = {
  vc: [
    '...hhhhh..',
    '.hhHHHHhhh',
    'hhhhhhhhhh',
    'hhhssshhss',
    'hhSssswess',
    'hhSsssssss',
    '.hsssbsmms',
    '..ssssssS.',
    '....SSS...',
  ],
  elder: [
    '...hhhhh..',
    '..hHHHhhh.',
    '.hhhhhhhhh',
    'hhhsssssss',
    'hhSsskweks',
    'hhSsssssss',
    '.hsssshhhs',
    '..sssssmS.',
    '....SSS...',
  ],
  bun: [
    'hh.hhhhh..',
    'hhhhHHhhh.',
    'hhhhhhhhhh',
    '.hhssshhss',
    '.hhsssweSs',
    '.hhsssssss',
    '..hssbsmms',
    '..ssssssS.',
    '....SSS...',
  ],
};

function headRows(kind: keyof typeof HEADS, face: Expr): string[] {
  const r = HEADS[kind].slice();
  const eyeRow = 4;
  const mouthRow = kind === 'elder' ? 7 : 6;
  if (face === 'blink' || face === 'grin') r[eyeRow] = r[eyeRow].replace('we', 'hh');
  if (face === 'open') r[mouthRow] = r[mouthRow].replace('mm', 'MM').replace('m', 'M');
  if (face === 'hurt') {
    r[eyeRow] = r[eyeRow].replace('we', 'ee');
    r[mouthRow] = r[mouthRow].replace('bsmm', 'bmmm').replace('mm', 'mm');
  }
  if (face === 'grin') {
    r[mouthRow] = r[mouthRow].replace('smm', 'MMM');
    r[mouthRow + 1] = r[mouthRow + 1].replace('ssssssS', 'sssMMsS');
  }
  return r;
}

export interface Look {
  head: keyof typeof HEADS;
  pal: Palette;
  suit: string;
  suitSh: string;
  suitHi: string;
  tee: string;
  teeSh: string;
  pants: string;
  pantsSh: string;
  shoe: string;
  pack?: { body: string; hi: string; sh: string; strap: string };
  prop?: 'briefcase' | 'cheque';
}

const SKIN = { s: '#F2C29B', S: '#D9A07A', w: '#FFFFFF', e: '#1E1A22', m: '#B5544A', M: '#6E2A24', b: '#F2A08A', k: INK };

export const VC_LOOK: Look = {
  head: 'vc',
  pal: { ...SKIN, h: '#3B2A20', H: '#6A4A36' },
  suit: '#2F4A7A',
  suitSh: '#22375C',
  suitHi: '#4A6CA8',
  tee: '#F29A38',
  teeSh: '#D07E25',
  pants: '#E8DCC2',
  pantsSh: '#C9BB9E',
  shoe: '#5A3A22',
  pack: { body: '#E0782A', hi: '#F6B25E', sh: '#B85E1C', strap: '#7A3F12' },
};

export const ELDER_LOOK: Look = {
  head: 'elder',
  pal: { ...SKIN, s: '#E9B88F', S: '#CF9670', h: '#BDBDB8', H: '#E4E4DF' },
  suit: '#6B6F7A',
  suitSh: '#545862',
  suitHi: '#868B97',
  tee: '#FFFFFF',
  teeSh: '#DADAD4',
  pants: '#4A4E58',
  pantsSh: '#3A3E47',
  shoe: '#2B1D14',
  prop: 'briefcase',
};

export const GROWTH_LOOK: Look = {
  head: 'bun',
  pal: { ...SKIN, s: '#C98E66', S: '#A9714E', b: '#D98B70', h: '#1E1A22', H: '#3A3440' },
  suit: '#2E8B7A',
  suitSh: '#226B5E',
  suitHi: '#3FAE99',
  tee: '#F6F1E6',
  teeSh: '#DCD5C5',
  pants: '#2F3542',
  pantsSh: '#232833',
  shoe: '#1E1A22',
  prop: 'cheque',
};

const TORSO = ['.nnnnoo.', 'nnnnNooL', 'nnnnNoon', 'Nnnnnoon', 'Nnnnnnon', 'Nnnnnnnn', 'Nnnnnnnn', 'NNNNNNNN'];

function drawLeg(p: Painter, x: number, leg: [number, number], pants: string, shoe: string, bob: number) {
  const [dx, lift] = leg;
  const top = 18 + Math.min(0, bob);
  const thighDx = Math.trunc(dx / 2);
  p.rect(x + thighDx, top, 2, 21 - top, pants);
  const shinBottom = 22 - lift;
  if (shinBottom >= 21) p.rect(x + dx, 21, 2, shinBottom - 20, pants);
  p.rect(x + dx, 23 - lift, 3, 1, shoe);
}

function drawArm(p: Painter, arm: ArmPose, by: number, look: Look, side: 'front' | 'back') {
  const skin = look.pal.s;
  const a = side === 'front' ? look.suitHi : look.suitSh;
  const b = side === 'front' ? look.suit : look.suitSh;
  const y = 11 + by;
  switch (arm) {
    case 'down':
      p.rect(8, y, 2, 4, a);
      p.rect(8, y, 1, 4, b);
      p.rect(8, y + 4, 2, 2, skin);
      break;
    case 'hold':
      p.rect(8, y, 2, 3, a);
      p.rect(9, y + 3, 2, 1, a);
      p.rect(10, y + 3, 2, 2, skin);
      break;
    case 'swingF':
      p.rect(9, y, 2, 3, a);
      p.rect(10, y + 2, 2, 2, a);
      p.rect(11, y + 4, 2, 2, skin);
      break;
    case 'swingB':
      p.rect(7, y, 2, 3, a);
      p.rect(6, y + 2, 2, 2, a);
      p.rect(5, y + 4, 2, 2, skin);
      break;
    case 'fwdUp':
      p.rect(9, y, 2, 2, a);
      p.rect(11, y - 2, 2, 3, a);
      p.rect(13, y - 3, 2, 2, skin);
      break;
    case 'out':
      p.rect(9, y, 2, 2, a);
      p.rect(11, y, 2, 2, a);
      p.rect(13, y - 1, 2, 2, skin);
      break;
    case 'brace':
      p.rect(9, y, 2, 2, a);
      p.rect(11, y - 3, 2, 3, a);
      p.rect(12, y - 5, 2, 2, skin);
      break;
    case 'cheer':
      if (side === 'front') {
        p.rect(12, y - 6, 2, 7, a);
        p.rect(12, y - 8, 2, 2, skin);
      } else {
        p.rect(2, y - 6, 2, 7, a);
        p.rect(2, y - 8, 2, 2, skin);
      }
      break;
  }
}

function drawProp(p: Painter, look: Look, by: number) {
  if (look.prop === 'briefcase') {
    p.rect(9, 15 + by, 6, 5, '#7A4A26');
    p.rect(9, 15 + by, 6, 1, '#9A6236');
    p.rect(11, 14 + by, 2, 1, '#3A2414');
    p.rect(11, 17 + by, 2, 1, '#E8C25A');
  } else if (look.prop === 'cheque') {
    p.rect(9, 12 + by, 7, 5, '#FFFFFF');
    p.rect(9, 12 + by, 7, 1, '#6DBD81');
    p.rect(10, 14 + by, 4, 1, '#9A9A94');
    p.rect(13, 15 + by, 2, 1, '#2E8B7A');
  }
}

/** Draws a person into a 16×24 box (feet on row 23). */
function drawPerson(p: Painter, pose: Pose, look: Look) {
  const by = pose.bob;
  const pal: Palette = {
    ...look.pal,
    n: look.suit,
    N: look.suitSh,
    L: look.suitHi,
    o: look.tee,
    O: look.teeSh,
  };
  if (pose.arm === 'cheer') drawArm(p, 'cheer', by, look, 'back');
  if (look.pack) {
    const k = look.pack;
    p.rect(1, 11 + by, 4, 7, k.body);
    p.rect(1, 11 + by, 4, 2, k.hi);
    p.rect(1, 11 + by, 1, 7, k.sh);
    p.rect(2, 15 + by, 2, 2, k.sh);
  }
  drawLeg(p, 5, pose.back, look.pantsSh, shade(look.shoe, -0.25), by);
  drawLeg(p, 8, pose.front, look.pants, look.shoe, by);
  p.map(4, 10 + by, TORSO, pal);
  if (look.pack) p.rect(5, 10 + by, 1, 4, look.pack.strap);
  p.map(4 + pose.lean, 1 + by, headRows(look.head, pose.face), pal);
  drawArm(p, pose.arm, by, look, 'front');
  drawProp(p, look, by);
}

const P = (
  bob: number,
  back: [number, number],
  front: [number, number],
  arm: ArmPose,
  face: Expr = 'smile',
  lean = 0,
): Pose => ({ bob, lean, back, front, arm, face });

export const POSES = {
  idle: [P(0, [0, 0], [0, 0], 'down'), P(1, [0, 0], [0, 0], 'down')],
  blink: [P(0, [0, 0], [0, 0], 'down', 'blink')],
  walk: [
    P(0, [-1, 0], [1, 0], 'swingB'),
    P(-1, [0, 1], [0, 0], 'down'),
    P(0, [1, 0], [-1, 0], 'swingF'),
    P(-1, [0, 0], [0, 1], 'down'),
  ],
  run: [
    P(0, [-2, 1], [2, 0], 'swingB', 'smile', 1),
    P(-1, [-1, 2], [1, 1], 'down', 'smile', 1),
    P(0, [2, 0], [-2, 1], 'swingF', 'smile', 1),
    P(-1, [1, 1], [-1, 2], 'down', 'smile', 1),
  ],
  jump: [P(0, [-1, 2], [1, 3], 'fwdUp', 'open')],
  fall: [P(0, [-1, 0], [1, 1], 'out', 'open')],
  land: [P(2, [-1, 1], [1, 1], 'down')],
  hurt: [P(0, [-1, 0], [1, 0], 'brace', 'hurt', -1)],
  cheer: [P(0, [0, 0], [0, 0], 'cheer', 'grin'), P(-1, [-1, 1], [1, 1], 'cheer', 'grin')],
};
export type PoseName = keyof typeof POSES;

/** 18×26 outlined frame (feet bottom at y=24). dir 1 = facing right. */
export function personFrame(look: Look, name: PoseName, i: number, dir: 1 | -1): HTMLCanvasElement {
  const list = POSES[name];
  const idx = ((i % list.length) + list.length) % list.length;
  const key = `person|${look.head}|${look.suit}|${name}|${idx}|${dir}`;
  return memo(key, () => {
    const right = paint(16, 24, (p) => drawPerson(p, list[idx], look), INK);
    return dir === 1 ? right : flipH(right);
  });
}

/* ───────────────────────── Hazards ───────────────────────── */
export function noCustomers(frame: number): HTMLCanvasElement {
  return memo(`nocust|${frame % 2}`, () =>
    paint(16, 15, (p) => {
      const red = '#E0524A';
      p.rect(1, 1, 14, 11, red);
      p.rect(1, 1, 14, 2, '#F07A6E');
      p.rect(1, 10, 14, 2, '#B23A33');
      p.rect(3, 4, 4, 3, '#FFFFFF');
      p.rect(9, 4, 4, 3, '#FFFFFF');
      p.rect(5, 5, 2, 2, INK);
      p.rect(11, 5, 2, 2, INK);
      p.rect(3, 3, 2, 1, INK);
      p.rect(5, 2, 2, 1, INK);
      p.rect(11, 3, 2, 1, INK);
      p.rect(9, 2, 2, 1, INK);
      p.rect(6, 9, 4, 1, INK);
      p.px(5, 10, INK);
      p.px(10, 10, INK);
      if (frame % 2 === 0) {
        p.rect(2, 12, 4, 2, '#5A2420');
        p.rect(10, 12, 4, 2, '#5A2420');
      } else {
        p.rect(3, 12, 4, 2, '#5A2420');
        p.rect(9, 12, 4, 2, '#5A2420');
      }
    }),
  );
}

export function bug(frame: number): HTMLCanvasElement {
  return memo(`bug|${frame % 2}`, () =>
    paint(15, 11, (p) => {
      p.ellipse(1, 2, 11, 7, '#5B3F8C');
      p.rect(3, 3, 4, 1, '#8C6BC4');
      p.rect(2, 4, 2, 1, '#8C6BC4');
      p.rect(6, 2, 1, 7, '#3E2A63');
      p.disc(10, 3, 5, '#2A2238');
      p.px(12, 4, '#F4C542');
      p.px(13, 3, '#2A2238');
      p.px(14, 2, '#2A2238');
      p.px(12, 2, '#2A2238');
      p.px(13, 1, '#2A2238');
      const o = frame % 2 === 0 ? 0 : 1;
      for (let i = 0; i < 3; i++) {
        p.rect(2 + i * 3 + o, 9, 1, 2, '#2A2238');
      }
    }),
  );
}

export function flame(frame: number): HTMLCanvasElement {
  return memo(`flame|${frame % 3}`, () =>
    paint(12, 16, (p) => {
      const f = frame % 3;
      const tipX = [5, 6, 5][f];
      p.ellipse(1, 5, 10, 11, '#E8562A');
      p.rect(tipX - 1, 2, 3, 4, '#E8562A');
      p.rect(tipX, 0, 1, 3, '#E8562A');
      p.rect(f === 1 ? 2 : 8, 3, 1, 3, '#E8562A');
      p.ellipse(3, 7, 6, 8, '#F29A38');
      p.rect(tipX - 1, 5, 2, 3, '#F29A38');
      p.ellipse(4, 10, 4, 5, '#F4C542');
      // burning banknote
      p.rect(3, 10, 6, 3, '#6DBD81');
      p.rect(4, 11, 1, 1, '#3C8A50');
      p.rect(7, 11, 1, 1, '#3C8A50');
      p.rect(8, 10, 1, 1, '#2B2B2B');
    }),
  );
}

export function crusher(face: 'idle' | 'angry'): HTMLCanvasElement {
  return memo(`crusher|${face}`, () =>
    paint(24, 24, (p) => {
      p.rect(0, 0, 24, 24, '#8F8E89');
      p.rect(0, 0, 24, 2, '#B3B1AB');
      p.rect(0, 0, 2, 24, '#A3A19B');
      p.rect(0, 21, 24, 3, '#6D6C67');
      for (const [x, y] of [
        [3, 3],
        [19, 3],
        [3, 18],
        [19, 18],
      ])
        p.rect(x, y, 2, 2, '#5E5D58');
      // down arrow
      p.rect(10, 4, 4, 5, '#E0524A');
      p.rect(8, 9, 8, 1, '#E0524A');
      p.rect(9, 10, 6, 1, '#E0524A');
      p.rect(10, 11, 4, 1, '#E0524A');
      p.rect(11, 12, 2, 1, '#E0524A');
      // face
      p.rect(6, 15, 4, 3, '#FFFFFF');
      p.rect(14, 15, 4, 3, '#FFFFFF');
      p.rect(face === 'angry' ? 8 : 7, 16, 2, 2, INK);
      p.rect(face === 'angry' ? 14 : 15, 16, 2, 2, INK);
      if (face === 'angry') {
        p.rect(5, 13, 3, 1, INK);
        p.rect(8, 14, 2, 1, INK);
        p.rect(16, 13, 3, 1, INK);
        p.rect(14, 14, 2, 1, INK);
      } else {
        p.rect(6, 14, 4, 1, INK);
        p.rect(14, 14, 4, 1, INK);
      }
      p.rect(9, 19, 6, 1, INK);
    }),
  );
}

export function badIdea(): HTMLCanvasElement {
  return memo('badidea', () =>
    paint(16, 15, (p) => {
      // spikes
      for (let i = 0; i < 4; i++) {
        p.rect(1 + i * 4, 12, 3, 3, '#8F8E89');
        p.rect(2 + i * 4, 10, 1, 2, '#B3B1AB');
      }
      p.rect(0, 13, 16, 2, '#6D6C67');
      // cracked bulb
      p.disc(3, 0, 10, '#E7E3C8');
      p.rect(5, 2, 2, 3, '#FFFFFF');
      p.line(8, 1, 7, 4, '#6D6C67');
      p.line(7, 4, 9, 6, '#6D6C67');
      p.rect(6, 9, 4, 2, '#8F8E89');
      p.rect(6, 10, 4, 1, '#6D6C67');
      p.rect(5, 6, 2, 1, INK);
      p.rect(9, 6, 2, 1, INK);
      p.px(10, 5, INK);
      p.px(5, 5, INK);
    }),
  );
}

/* ───────────────────────── Collectibles ───────────────────────── */
export type ItemKind = 'deck' | 'money' | 'customer' | 'product' | 'team' | 'revenue' | 'globe';

export function coinFrame(i: number): HTMLCanvasElement {
  const widths = [12, 10, 6, 2, 6, 10];
  const idx = ((i % widths.length) + widths.length) % widths.length;
  return memo(`coin|${idx}`, () =>
    paint(12, 12, (p) => {
      const w = widths[idx];
      const x = (12 - w) / 2;
      p.ellipse(x, 0, w, 12, '#E2A72E');
      if (w > 2) p.ellipse(x + 1, 1, w - 2, 10, '#F4C542');
      if (w >= 10) {
        p.rect(4, 3, 4, 1, '#B8841C');
        p.rect(4, 5, 4, 1, '#B8841C');
        p.rect(6, 3, 2, 3, '#B8841C');
        p.rect(5, 6, 1, 1, '#B8841C');
        p.rect(6, 7, 1, 1, '#B8841C');
        p.rect(7, 8, 1, 1, '#B8841C');
        p.rect(3, 2, 1, 3, '#FFF3C4');
      } else if (w >= 6) {
        p.rect(5, 3, 2, 6, '#B8841C');
      }
    }),
  );
}

export function itemSprite(kind: ItemKind): HTMLCanvasElement {
  return memo(`item|${kind}`, () =>
    paint(12, 12, (p) => {
      switch (kind) {
        case 'deck':
          p.rect(5, 9, 1, 3, '#8A5A2E');
          p.rect(2, 10, 1, 2, '#8A5A2E');
          p.rect(9, 10, 1, 2, '#8A5A2E');
          p.rect(0, 1, 12, 8, '#FFFFFF');
          p.rect(0, 1, 12, 1, '#F29A38');
          p.rect(2, 6, 2, 2, '#F4C542');
          p.rect(5, 4, 2, 4, '#F29A38');
          p.rect(8, 3, 2, 5, '#6DBD81');
          break;
        case 'money':
          return;
        case 'customer':
          p.disc(3, 0, 6, '#F2C29B');
          p.rect(4, 2, 1, 1, INK);
          p.rect(7, 2, 1, 1, INK);
          p.rect(4, 4, 4, 1, '#B5544A');
          p.rect(3, 0, 6, 1, '#3B2A20');
          p.ellipse(1, 6, 10, 8, '#6DBD81');
          p.rect(5, 7, 2, 3, '#FFFFFF');
          p.rect(4, 8, 4, 1, '#FFFFFF');
          break;
        case 'team':
          p.disc(3, 0, 6, '#C98E66');
          p.rect(4, 2, 1, 1, INK);
          p.rect(7, 2, 1, 1, INK);
          p.rect(3, 0, 6, 2, '#1E1A22');
          p.ellipse(1, 6, 10, 8, '#5D91E5');
          p.rect(7, 8, 3, 3, '#FFFFFF');
          p.rect(8, 9, 1, 1, '#F29A38');
          break;
        case 'product':
          p.disc(1, 1, 10, '#8EA2C2');
          for (const [x, y] of [
            [5, 0],
            [5, 10],
            [0, 5],
            [10, 5],
          ])
            p.rect(x, y, 2, 2, '#8EA2C2');
          p.disc(4, 4, 4, '#E9EEF6');
          p.rect(5, 2, 2, 7, '#3463B0');
          p.rect(3, 4, 6, 1, '#3463B0');
          p.rect(4, 3, 4, 1, '#3463B0');
          break;
        case 'revenue':
          p.rect(0, 11, 12, 1, '#3C8A50');
          p.rect(1, 7, 2, 4, '#6DBD81');
          p.rect(4, 5, 2, 6, '#6DBD81');
          p.rect(7, 3, 2, 8, '#6DBD81');
          p.rect(10, 1, 2, 10, '#3C8A50');
          p.rect(1, 2, 4, 1, '#F29A38');
          p.rect(4, 1, 2, 1, '#F29A38');
          p.rect(6, 0, 1, 3, '#F29A38');
          break;
        case 'globe':
          p.disc(0, 0, 12, '#5D91E5');
          p.rect(3, 2, 3, 3, '#6DBD81');
          p.rect(2, 5, 3, 2, '#6DBD81');
          p.rect(7, 6, 3, 3, '#6DBD81');
          p.rect(8, 3, 2, 1, '#6DBD81');
          p.rect(2, 2, 2, 1, '#B9D3F7');
          break;
      }
    }),
  );
}

/* ───────────────────────── Tiles ───────────────────────── */
export type TileChar = 'G' | 'D' | 'B' | 'C' | '=' | 'S' | 'R' | 'W' | 'X' | 'Q' | 'U';

export function tileSprite(t: TileChar, variant = 0): HTMLCanvasElement {
  return memo(`tile|${t}|${variant}`, () => {
    const c = makeCanvas(16, 16);
    const p = new Painter(ctx2d(c));
    switch (t) {
      case 'G':
        p.rect(0, 0, 16, 16, '#D9B88E');
        p.rect(0, 0, 16, 3, '#ECE8DE');
        p.rect(0, 3, 16, 1, '#BDB6A6');
        p.rect(variant % 2 ? 7 : 15, 0, 1, 3, '#CFC9BC');
        p.rect(0, 4, 16, 1, '#C49E74');
        p.rect(3, 8, 2, 1, '#C39A6E');
        p.rect(10, 11, 3, 1, '#C39A6E');
        p.rect(6, 13, 1, 1, '#E6C9A2');
        break;
      case 'D':
        p.rect(0, 0, 16, 16, '#D3AF83');
        p.rect(2 + (variant % 3) * 3, 3, 2, 1, '#BF966A');
        p.rect(9, 9, 3, 1, '#BF966A');
        p.rect(4, 12, 1, 1, '#E6C9A2');
        p.rect(12, 5, 1, 1, '#E6C9A2');
        break;
      case 'B': {
        p.rect(0, 0, 16, 16, '#F3D2B8');
        const brick = '#E8935A';
        for (let row = 0; row < 4; row++) {
          const off = row % 2 ? 4 : 0;
          for (let col = -1; col < 3; col++) {
            const x = col * 8 + off;
            p.rect(x + 1, row * 4 + 1, 7, 3, brick);
            p.rect(x + 1, row * 4 + 3, 7, 1, '#C9743F');
          }
        }
        p.rect(0, 0, 16, 1, '#F7E1CF');
        break;
      }
      case 'C':
        p.rect(0, 0, 16, 16, '#D9A86C');
        p.frame(0, 0, 16, 16, '#9C6D3A');
        p.rect(7, 0, 2, 16, '#F2D7A6');
        p.rect(1, 1, 14, 1, '#E8C08A');
        p.rect(2, 11, 3, 3, '#9C6D3A');
        p.rect(3, 12, 1, 1, '#F2D7A6');
        break;
      case '=':
        p.rect(0, 0, 16, 5, '#C68A4E');
        p.rect(0, 0, 16, 1, '#E2AA6E');
        p.rect(0, 4, 16, 1, '#8E5C2C');
        p.rect(3, 2, 1, 1, '#6E441E');
        p.rect(12, 2, 1, 1, '#6E441E');
        p.rect(2, 5, 1, 3, '#B07A44');
        p.rect(13, 5, 1, 3, '#B07A44');
        break;
      case 'S':
        p.rect(0, 0, 16, 6, '#F29A38');
        p.rect(0, 0, 16, 1, '#F8C27E');
        p.rect(0, 5, 16, 1, '#B8641A');
        p.rect(3, 2, 2, 2, '#B8641A');
        p.rect(11, 2, 2, 2, '#B8641A');
        break;
      case 'R':
        p.rect(0, 0, 16, 16, '#9CA6B8');
        p.rect(0, 0, 16, 3, '#C9CFDA');
        p.rect(0, 3, 16, 1, '#7D879A');
        p.rect(1, 6, 6, 6, '#BFE0F5');
        p.rect(9, 6, 6, 6, '#BFE0F5');
        p.rect(1, 6, 6, 1, '#E8F5FC');
        p.rect(9, 6, 6, 1, '#E8F5FC');
        break;
      case 'W':
        p.rect(0, 0, 16, 16, '#8F9AAE');
        p.rect(1, 2, 6, 6, variant % 3 === 0 ? '#F8E7B0' : '#BFE0F5');
        p.rect(9, 2, 6, 6, variant % 4 === 1 ? '#F8E7B0' : '#BFE0F5');
        p.rect(1, 10, 6, 5, '#BFE0F5');
        p.rect(9, 10, 6, 5, variant % 5 === 2 ? '#F8E7B0' : '#BFE0F5');
        p.rect(0, 0, 1, 16, '#7D879A');
        break;
      case 'X':
        p.rect(0, 0, 16, 16, '#3A3F4B');
        p.frame(0, 0, 16, 16, '#262A33');
        for (let r = 0; r < 4; r++) {
          p.rect(2, 2 + r * 3, 12, 2, '#4C5363');
          p.px(11, 2 + r * 3, r % 2 ? '#6DBD81' : '#F4C542');
          p.px(13, 2 + r * 3, '#5D91E5');
        }
        break;
      case 'Q': {
        p.rect(0, 0, 16, 16, '#F4C542');
        p.frame(0, 0, 16, 16, '#B8841C');
        p.rect(1, 1, 14, 1, '#FBE39A');
        p.rect(1, 1, 1, 14, '#FBE39A');
        p.rect(1, 14, 14, 1, '#D9A42E');
        // lightbulb icon
        p.disc(5, 3, 6, '#FFFFFF');
        p.rect(6, 9, 4, 2, '#8F8E89');
        p.rect(7, 11, 2, 1, '#6D6C67');
        p.rect(6, 4, 1, 2, '#FFF7D6');
        if (variant === 1) {
          p.rect(11, 2, 2, 1, '#FFFFFF');
          p.rect(12, 1, 1, 3, '#FFFFFF');
        }
        break;
      }
      case 'U':
        p.rect(0, 0, 16, 16, '#C9A26C');
        p.frame(0, 0, 16, 16, '#8E6A3C');
        p.rect(3, 3, 2, 2, '#8E6A3C');
        p.rect(11, 3, 2, 2, '#8E6A3C');
        p.rect(3, 11, 2, 2, '#8E6A3C');
        p.rect(11, 11, 2, 2, '#8E6A3C');
        break;
    }
    return c;
  });
}

/* ───────────────────────── Decor ───────────────────────── */
export function signboard(text: string, color: string): HTMLCanvasElement {
  return memo(`sign|${text}|${color}`, () => {
    const tw = textWidth(text, 'big');
    const w = tw + 10;
    const c = makeCanvas(w, 30);
    const p = new Painter(ctx2d(c));
    p.rect(4, 13, 2, 17, '#6D6C67');
    p.rect(w - 6, 13, 2, 17, '#6D6C67');
    p.rect(0, 0, w, 14, INK);
    p.rect(1, 1, w - 2, 12, color);
    p.rect(1, 1, w - 2, 1, shade(color, 0.35));
    drawText(p.ctx, text, 5, 3.5, { color: INK });
    return c;
  });
}

export function billboard(): HTMLCanvasElement {
  return memo('billboard', () => {
    const c = makeCanvas(60, 54);
    const p = new Painter(ctx2d(c));
    p.rect(14, 34, 3, 20, '#6D6C67');
    p.rect(43, 34, 3, 20, '#6D6C67');
    p.rect(0, 0, 60, 36, INK);
    p.rect(2, 2, 56, 32, '#FFFFFF');
    p.rect(2, 2, 56, 6, '#F29A38');
    drawText(p.ctx, 'PITCH DAY', 30, 3, { color: INK, align: 'center', font: 'small' });
    p.rect(8, 24, 6, 7, '#F4C542');
    p.rect(17, 19, 6, 12, '#F29A38');
    p.rect(26, 14, 6, 17, '#6DBD81');
    p.rect(35, 11, 6, 20, '#5D91E5');
    p.line(7, 22, 40, 9, INK);
    p.rect(46, 12, 8, 2, '#C9C5BA');
    p.rect(46, 16, 6, 2, '#C9C5BA');
    p.rect(46, 20, 8, 2, '#C9C5BA');
    return c;
  });
}

export function garage(): HTMLCanvasElement {
  return memo('garage', () => {
    const c = makeCanvas(104, 80);
    const p = new Painter(ctx2d(c));
    // roof
    for (let i = 0; i < 14; i++) p.rect(10 - i * 0.7 + 4, 6 + i, 88 + i * 1.4 - 8, 1, i < 2 ? '#B8641A' : '#E07A4A');
    p.rect(6, 20, 92, 60, '#F6E7D2');
    p.rect(6, 20, 92, 2, '#E3CDB0');
    // door
    p.rect(24, 36, 56, 44, '#5A4636');
    p.rect(26, 38, 52, 42, '#2F2A33');
    // inside: desk + laptop + lamp glow
    p.rect(30, 66, 44, 3, '#C68A4E');
    p.rect(33, 69, 2, 11, '#8E5C2C');
    p.rect(69, 69, 2, 11, '#8E5C2C');
    p.rect(44, 58, 14, 8, '#C9CFDA');
    p.rect(45, 59, 12, 6, '#8FD3F4');
    p.rect(42, 66, 18, 1, '#9CA6B8');
    p.rect(32, 46, 10, 12, '#F8E7B0');
    p.rect(64, 50, 8, 16, '#E8935A');
    // half-open roller shutter
    p.rect(26, 38, 52, 6, '#B3B1AB');
    p.rect(26, 40, 52, 1, '#8F8E89');
    p.rect(26, 42, 52, 1, '#8F8E89');
    // sign
    p.rect(22, 24, 60, 10, INK);
    p.rect(23, 25, 58, 8, '#F29A38');
    drawText(p.ctx, 'GARAGE LABS', 52, 26, { color: INK, align: 'center', font: 'small' });
    // window
    p.rect(84, 44, 10, 12, '#BFE0F5');
    p.frame(84, 44, 10, 12, '#9C8C78');
    return c;
  });
}

export function lamp(): HTMLCanvasElement {
  return memo('lamp', () =>
    paint(8, 46, (p) => {
      p.rect(3, 6, 2, 40, '#5E6470');
      p.rect(0, 0, 8, 6, '#5E6470');
      p.rect(1, 4, 6, 2, '#F8E7B0');
      p.rect(2, 44, 4, 2, '#3F444E');
    }),
  );
}

export function tree(v: number): HTMLCanvasElement {
  return memo(`tree|${v}`, () =>
    paint(22, 34, (p) => {
      p.rect(9, 20, 4, 14, '#8E5C2C');
      const g = v % 2 ? '#7CC48E' : '#6DBD81';
      p.disc(1, 4, 20, g);
      p.disc(4, 0, 14, shade(g, 0.15));
      p.rect(6, 4, 3, 2, shade(g, 0.4));
    }),
  );
}

export function flagPole(raised: number, color: string, label: string): HTMLCanvasElement {
  const r = Math.round(raised * 10) / 10;
  return memo(`flag|${r}|${color}|${label}`, () => {
    const c = makeCanvas(44, 86);
    const p = new Painter(ctx2d(c));
    p.rect(4, 4, 3, 82, '#6D6C67');
    p.disc(3, 0, 5, '#F4C542');
    const fy = 8 + Math.round((1 - r) * 50);
    p.rect(7, fy, 30, 18, INK);
    p.rect(8, fy + 1, 28, 16, color);
    if (r >= 1) {
      p.rect(17, fy + 10, 2, 2, INK);
      p.rect(19, fy + 12, 2, 2, INK);
      p.rect(21, fy + 10, 2, 2, INK);
      p.rect(23, fy + 8, 2, 2, INK);
      p.rect(25, fy + 6, 2, 2, INK);
    } else {
      drawText(p.ctx, label, 22, fy + 6, { color: INK, align: 'center', font: 'small' });
    }
    p.rect(0, 84, 12, 2, '#3F444E');
    return c;
  });
}

export function gateSprite(open: number, have: number, need: number): HTMLCanvasElement {
  const o = Math.round(open * 8) / 8;
  return memo(`gate|${o}|${have}|${need}`, () => {
    const c = makeCanvas(40, 112);
    const p = new Painter(ctx2d(c));
    // pillars
    p.rect(0, 16, 8, 96, '#B3B1AB');
    p.rect(32, 16, 8, 96, '#B3B1AB');
    p.rect(0, 16, 8, 2, '#D6D4CE');
    p.rect(32, 16, 8, 2, '#D6D4CE');
    // header
    p.rect(0, 0, 40, 18, INK);
    p.rect(1, 1, 38, 16, have >= need ? '#6DBD81' : '#F4C542');
    drawText(p.ctx, `₹${Math.min(have, need)}/${need}`, 20, 6, { color: INK, align: 'center' });
    // bars slide up when opening
    const barTop = 18 - Math.round(o * 80);
    for (let i = 0; i < 5; i++) {
      const bx = 9 + i * 5;
      const top = Math.max(18, barTop);
      const bottom = 112 - Math.round(o * 94);
      if (bottom > top) {
        p.rect(bx, top, 3, bottom - top, '#5E6470');
        p.rect(bx, top, 1, bottom - top, '#8A909C');
      }
    }
    return c;
  });
}

export function exitTower(): HTMLCanvasElement {
  return memo('exittower', () => {
    const W = 140;
    const H = 232;
    const c = makeCanvas(W, H);
    const p = new Painter(ctx2d(c));
    // antenna + flags
    p.rect(68, 0, 3, 26, '#6D6C67');
    p.rect(71, 2, 16, 10, '#F29A38');
    p.rect(71, 2, 16, 2, '#F8C27E');
    // tower body
    p.rect(14, 24, 112, 208, INK);
    p.rect(16, 26, 108, 206, '#E9EEF6');
    // glass grid
    for (let y = 60; y < 200; y += 14) {
      for (let x = 22; x < 118; x += 16) {
        p.rect(x, y, 12, 10, (x + y) % 3 === 0 ? '#8FC7EE' : '#BFE0F5');
        p.rect(x, y, 12, 2, '#E8F5FC');
      }
    }
    // crown
    p.rect(16, 26, 108, 28, '#F29A38');
    p.rect(16, 26, 108, 3, '#F8C27E');
    drawText(p.ctx, 'EXIT', 70, 31, { color: INK, align: 'center', scale: 2 });
    // banner
    p.rect(22, 202, 96, 12, INK);
    p.rect(23, 203, 94, 10, '#F4C542');
    drawText(p.ctx, 'IPO / ACQUISITION', 70, 205, { color: INK, align: 'center', font: 'small' });
    // door
    p.rect(52, 214, 36, 18, '#2F4A7A');
    p.rect(54, 216, 15, 16, '#8FC7EE');
    p.rect(71, 216, 15, 16, '#8FC7EE');
    p.rect(55, 217, 2, 10, '#E8F5FC');
    return c;
  });
}

/** Floating "IDEA" coin that pops out of an idea block. */
export function sparkle(frame: number): HTMLCanvasElement {
  return memo(`sparkle|${frame % 4}`, () =>
    paint(
      7,
      7,
      (p) => {
        const f = frame % 4;
        const s = f === 0 || f === 2 ? 3 : 2;
        p.rect(3, 3 - s, 1, s * 2 + 1, '#FFFFFF');
        p.rect(3 - s, 3, s * 2 + 1, 1, '#FFFFFF');
        p.px(3, 3, '#F4C542');
      },
      false,
    ),
  );
}

/* ───────────────────────── Background layers ───────────────────────── */
export function skyLayer(w: number, h: number): HTMLCanvasElement {
  return memo(`sky|${w}|${h}`, () => {
    const c = makeCanvas(w, h);
    const p = new Painter(ctx2d(c));
    const bands = ['#CBE6F4', '#D3EAF6', '#DBEFF8', '#E3F3FA', '#EBF7FB', '#F3FAFC'];
    const bh = Math.ceil(h / bands.length);
    bands.forEach((col, i) => {
      p.rect(0, i * bh, w, bh, col);
      if (i > 0) for (let x = (i % 2) * 2; x < w; x += 4) p.px(x, i * bh, bands[i - 1]);
    });
    return c;
  });
}

export function cloud(v: number): HTMLCanvasElement {
  return memo(`cloud|${v}`, () =>
    paint(
      v % 2 ? 46 : 34,
      18,
      (p) => {
        const w = v % 2 ? 46 : 34;
        p.ellipse(0, 7, w, 11, '#FFFFFF');
        p.disc(6, 0, 16, '#FFFFFF');
        p.disc(w / 2 - 4, 2, 14, '#FFFFFF');
        p.rect(4, 16, w - 8, 2, '#E3F1F9');
      },
      false,
    ),
  );
}

const PASTELS = ['#F6D7B8', '#CDEBD8', '#E3D7F2', '#D3E5F7', '#F8E7B0', '#F5D3D0'];

function building(p: Painter, x: number, groundY: number, w: number, h: number, color: string, theme: number, seed: number) {
  const top = groundY - h;
  p.rect(x, top, w, h, shade(color, -0.12));
  p.rect(x + 1, top + 1, w - 2, h - 1, color);
  p.rect(x + 1, top + 1, w - 2, 2, shade(color, 0.3));
  const win = theme >= 3 ? '#E8F5FC' : '#FFFFFF';
  const winDark = shade(color, -0.25);
  const cols = Math.max(1, Math.floor((w - 6) / 8));
  for (let yy = top + 8; yy < groundY - 10; yy += theme >= 3 ? 9 : 12) {
    for (let i = 0; i < cols; i++) {
      const lit = (i * 7 + yy + seed) % 5 === 0;
      p.rect(x + 4 + i * 8, yy, 4, theme >= 3 ? 5 : 6, lit ? '#F8E7B0' : (i + yy) % 3 === 0 ? winDark : win);
    }
  }
  // roof furniture
  if (theme === 0) {
    for (let i = 0; i < 6; i++) p.rect(x - 2 + i, top - 6 + i, w + 4 - i * 2, 1, '#E07A4A');
  } else if (theme === 2 && w > 30) {
    p.disc(x + w / 2 - 7, top - 7, 14, '#E9EEF6');
    p.rect(x + w / 2 - 7, top - 1, 14, 2, shade(color, -0.12));
    p.rect(x + w / 2, top - 14, 1, 7, '#6D6C67');
  } else if (theme >= 3) {
    p.rect(x + w / 2, top - 12, 1, 12, '#8F8E89');
    p.rect(x + 3, top - 4, 8, 4, '#B3B1AB');
  } else {
    p.rect(x + 4, top - 5, 6, 5, '#B3B1AB');
  }
}

/** Far skyline (parallax 0.2). */
export function farLayer(len: number, h: number): HTMLCanvasElement {
  return memo(`far|${len}|${h}`, () => {
    const c = makeCanvas(len, h);
    const p = new Painter(ctx2d(c));
    let x = 0;
    let i = 0;
    while (x < len) {
      const w = 24 + ((i * 37) % 40);
      const bh = 60 + ((i * 53) % 90);
      p.rect(x, h - 40 - bh, w, bh + 40, i % 2 ? '#DCE4EF' : '#D3DDEA');
      for (let yy = h - 30 - bh; yy < h - 40; yy += 10)
        for (let xx = x + 4; xx < x + w - 4; xx += 7) p.rect(xx, yy, 2, 3, '#EAF0F7');
      x += w + ((i * 11) % 6);
      i++;
    }
    return c;
  });
}

/** Mid buildings (parallax 0.5). `stageAt(layerX)` returns theme 0..4. */
export function midLayer(len: number, h: number, stageAt: (lx: number) => number): HTMLCanvasElement {
  return memo(`mid|${len}|${h}`, () => {
    const c = makeCanvas(len, h);
    const p = new Painter(ctx2d(c));
    const groundY = h - 30;
    let x = -10;
    let i = 0;
    while (x < len) {
      const theme = stageAt(x);
      const w = [44, 50, 54, 46, 60][theme] + ((i * 29) % 26);
      const hRange = [
        [36, 60],
        [60, 100],
        [70, 110],
        [110, 175],
        [120, 190],
      ][theme];
      const bh = hRange[0] + ((i * 61) % (hRange[1] - hRange[0]));
      building(p, x, groundY, w, bh, PASTELS[(i + theme) % PASTELS.length], theme, i * 13);
      x += w + 4 + ((i * 7) % 10);
      i++;
    }
    p.rect(0, groundY, len, h - groundY, '#E6E2D6');
    return c;
  });
}

/** Startup logo used on the decision cards. */
export function startupLogo(letter: string, color: string): string {
  const c = makeCanvas(16, 16);
  const p = new Painter(ctx2d(c));
  p.rect(1, 0, 14, 16, INK);
  p.rect(0, 1, 16, 14, INK);
  p.rect(1, 1, 14, 14, color);
  p.rect(1, 1, 14, 2, shade(color, 0.35));
  drawText(p.ctx, letter, 8, 4.5, { color: INK, align: 'center' });
  return outlined(c, '#FFFFFF').toDataURL();
}
