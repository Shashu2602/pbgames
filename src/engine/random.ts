/**
 * Seeded randomness. Every game builds its run from a seed so spawn patterns
 * vary between visitors while the *composition* of each run stays balanced.
 */
export type Rng = () => number;

/** mulberry32 — small, fast, good enough for gameplay. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

export const range = (rng: Rng, min: number, max: number) => min + rng() * (max - min);
export const rangeInt = (rng: Rng, min: number, max: number) => Math.floor(range(rng, min, max + 1));
export const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)];
export const chance = (rng: Rng, p: number) => rng() < p;

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A "bag" randomizer: deals every item once before reshuffling. Keeps runs fair. */
export class Bag<T> {
  private queue: T[] = [];
  constructor(
    private rng: Rng,
    private items: readonly T[],
  ) {}
  next(): T {
    if (this.queue.length === 0) this.queue = shuffle(this.rng, this.items);
    return this.queue.pop() as T;
  }
  peek(n: number): T[] {
    while (this.queue.length < n) this.queue = [...shuffle(this.rng, this.items), ...this.queue];
    return this.queue.slice(-n).reverse();
  }
}

/** Evenly spread values across [min,max] with jitter, then shuffle — balanced positions. */
export function stratified(rng: Rng, count: number, min: number, max: number, jitter = 0.8): number[] {
  const step = (max - min) / count;
  const vals: number[] = [];
  for (let i = 0; i < count; i++) {
    vals.push(min + step * (i + 0.5 + (rng() - 0.5) * jitter));
  }
  return shuffle(rng, vals);
}
