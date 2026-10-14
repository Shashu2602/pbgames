import { drawText, type FontName } from './pixelfont';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  g: number;
  drag: number;
  shrink: boolean;
}

interface BurstOpts {
  colors: string[];
  speed?: [number, number];
  size?: [number, number];
  life?: [number, number];
  gravity?: number;
  drag?: number;
  angle?: number; // radians, centre of spread
  spread?: number; // radians; default full circle
  shrink?: boolean;
  vx?: number;
  vy?: number;
}

/** Square pixel particles — sparks, dust, coin bits, confetti. */
export class Particles {
  list: Particle[] = [];

  burst(x: number, y: number, count: number, o: BurstOpts) {
    const [s0, s1] = o.speed ?? [30, 90];
    const [z0, z1] = o.size ?? [1, 2];
    const [l0, l1] = o.life ?? [0.3, 0.7];
    const spread = o.spread ?? Math.PI * 2;
    const center = o.angle ?? 0;
    for (let i = 0; i < count; i++) {
      const a = center + (Math.random() - 0.5) * spread;
      const sp = s0 + Math.random() * (s1 - s0);
      const life = l0 + Math.random() * (l1 - l0);
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * sp + (o.vx ?? 0),
        vy: Math.sin(a) * sp + (o.vy ?? 0),
        life,
        max: life,
        size: Math.round(z0 + Math.random() * (z1 - z0)),
        color: o.colors[Math.floor(Math.random() * o.colors.length)],
        g: o.gravity ?? 160,
        drag: o.drag ?? 0.5,
        shrink: o.shrink ?? true,
      });
    }
    if (this.list.length > 900) this.list.splice(0, this.list.length - 900);
  }

  update(dt: number) {
    const list = this.list;
    let w = 0;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy += p.g * dt;
      const d = Math.exp(-p.drag * dt);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      list[w++] = p;
    }
    list.length = w;
  }

  draw(ctx: CanvasRenderingContext2D, camX = 0, camY = 0) {
    for (const p of this.list) {
      const t = p.life / p.max;
      const s = p.shrink ? Math.max(1, Math.round(p.size * Math.min(1, t * 1.6))) : p.size;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - camX - s / 2), Math.round(p.y - camY - s / 2), s, s);
    }
  }

  clear() {
    this.list.length = 0;
  }
}

export interface FloatText {
  text: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  outline: string;
  font: FontName;
  scale: number;
}

/** Rising score popups ("+10", "DOUBLE SLICE!"). */
export class FloatTexts {
  list: FloatText[] = [];

  add(
    text: string,
    x: number,
    y: number,
    o: { color?: string; outline?: string; font?: FontName; scale?: number; life?: number; vy?: number } = {},
  ) {
    const life = o.life ?? 0.9;
    this.list.push({
      text,
      x,
      y,
      vy: o.vy ?? -28,
      life,
      max: life,
      color: o.color ?? '#171717',
      outline: o.outline ?? '#ffffff',
      font: o.font ?? 'big',
      scale: o.scale ?? 1,
    });
    if (this.list.length > 40) this.list.shift();
  }

  update(dt: number) {
    this.list = this.list.filter((t) => {
      t.life -= dt;
      t.y += t.vy * dt;
      t.vy *= Math.exp(-2.2 * dt);
      return t.life > 0;
    });
  }

  draw(ctx: CanvasRenderingContext2D, camX = 0, camY = 0) {
    for (const t of this.list) {
      const age = t.max - t.life;
      const pop = age < 0.08 ? 1 + (0.08 - age) * 4 : 1;
      const alpha = t.life < 0.25 ? t.life / 0.25 : 1;
      drawText(ctx, t.text, Math.round(t.x - camX), Math.round(t.y - camY), {
        font: t.font,
        color: t.color,
        outline: t.outline,
        align: 'center',
        scale: Math.max(1, Math.round(t.scale * pop)),
        alpha,
      });
    }
  }

  clear() {
    this.list.length = 0;
  }
}

/** Camera / screen shake helper. */
export class Shake {
  private t = 0;
  private mag = 0;
  x = 0;
  y = 0;
  kick(mag: number, dur = 0.25) {
    this.mag = Math.max(this.mag, mag);
    this.t = Math.max(this.t, dur);
  }
  update(dt: number) {
    if (this.t > 0) {
      this.t -= dt;
      const m = this.mag * Math.max(0, this.t / 0.25);
      this.x = Math.round((Math.random() * 2 - 1) * m);
      this.y = Math.round((Math.random() * 2 - 1) * m);
      if (this.t <= 0) {
        this.mag = 0;
        this.x = this.y = 0;
      }
    }
  }
}
