/**
 * Balanced, seeded spawn schedule. Every run has exactly the same number of
 * each token type (so scores are fair), while positions, timing and order vary.
 */
import { createRng, range, shuffle, stratified, type Rng } from '../../engine/random';
import { LOOKALIKES, MYSTERIES, SCAMS } from './tokens';

export const VW = 480;
export const VH = 270;
export const ROUND_STARTS = [0, 40, 85];
export const GAME_LENGTH = 130;
export const GRAVITY = [210, 270, 340];

export interface Launch {
  def: string;
  x: number;
  vx: number;
  vy: number;
  d: number;
  spin: number;
}

export interface SpawnEvent {
  t: number;
  round: number;
  combo?: boolean;
  tokens: Launch[];
}

function launch(rng: Rng, def: string, x: number, round: number, apexY: number, d: number, towardCenter = 0.45): Launch {
  const g = GRAVITY[round];
  const y0 = VH + d / 2 + 4;
  const vy = -Math.sqrt(2 * g * (y0 - apexY));
  const flight = (2 * -vy) / g;
  const vx = ((VW / 2 - x) / flight) * towardCenter * range(rng, 0.5, 1.2) + range(rng, -12, 12);
  return { def, x, vx, vy, d, spin: range(rng, 1.2, 2.6) * (rng() < 0.5 ? -1 : 1) };
}

const established = (i: number) => (i % 2 === 0 ? 'btc' : 'eth');

export function buildSchedule(seed: number): SpawnEvent[] {
  const rng = createRng(seed);
  const events: SpawnEvent[] = [];
  let aCount = 0;
  const nextA = () => established(aCount++);
  const scamBag = shuffle(rng, [...SCAMS, ...SCAMS]);
  let scamI = 0;
  const nextScam = () => scamBag[scamI++ % scamBag.length];
  const mystBag = shuffle(rng, [...MYSTERIES, ...MYSTERIES, ...MYSTERIES, ...MYSTERIES]);
  let mystI = 0;
  const nextMyst = () => mystBag[mystI++ % mystBag.length];
  const pickDef = (k: 'A' | 'B' | 'C') => (k === 'A' ? nextA() : k === 'B' ? nextScam() : nextMyst());

  /* ── Round 1 · slow, one token at a time: A×13 B×2 C×1 ── */
  const r1: ('A' | 'B' | 'C')[] = ['A', 'A', 'A', 'A', 'A', 'A', 'B', 'A', 'A', 'A', 'C', 'A', 'A', 'B', 'A', 'A'];
  const r1x = stratified(rng, r1.length, 90, 390, 0.7);
  r1.forEach((k, i) => {
    const t = 2 + i * 2.3 + range(rng, -0.25, 0.25);
    events.push({
      t: i === 0 ? 2 : t,
      round: 0,
      tokens: [launch(rng, pickDef(k), i === 0 ? 240 : r1x[i], 0, range(rng, 70, 120), k === 'A' ? 34 : 32, 0.35)],
    });
  });

  /* ── Round 2 · more tokens, mixed, faster: A×20 B×7 C×5 ── */
  const r2bag = shuffle(rng, [...Array(20).fill('A'), ...Array(7).fill('B'), ...Array(5).fill('C')] as ('A' | 'B' | 'C')[]);
  const sizes2 = [2, 2, 3, 2, 2, 3, 2, 2, 3, 2, 2, 3, 2, 2];
  let k2 = 0;
  sizes2.forEach((n, i) => {
    const t = ROUND_STARTS[1] + 1.5 + i * 3.05 + range(rng, -0.2, 0.2);
    const xs = stratified(rng, n, 70, 410, 0.6);
    const tokens: Launch[] = [];
    for (let j = 0; j < n; j++) {
      const k = r2bag[k2++];
      tokens.push(launch(rng, pickDef(k), xs[j], 1, range(rng, 55, 130), k === 'A' ? 32 : 30));
    }
    events.push({ t, round: 1, tokens });
  });

  /* ── Round 3 · fast combo waves + misleading look-alikes: A×27 B×9 C×5 ── */
  const looks = shuffle(rng, [...LOOKALIKES, ...LOOKALIKES]);
  let lookI = 0;
  const mixed: ('A' | 'B' | 'C' | 'L')[] = shuffle(rng, ['A', 'A', 'B', 'B', 'B', 'B', 'B', 'L', 'L', 'C', 'C', 'C', 'C', 'C']);
  // 5 combo waves interleaved with 8 mixed events
  const plan: ('wave' | 'mixed')[] = ['mixed', 'wave', 'mixed', 'mixed', 'wave', 'mixed', 'wave', 'mixed', 'mixed', 'wave', 'mixed', 'wave', 'mixed'];
  const mixedSizes = [2, 2, 2, 2, 2, 2, 1, 1];
  let mI = 0;
  let waveN = 0;
  let mixedN = 0;
  plan.forEach((kind, i) => {
    const t = ROUND_STARTS[2] + 2 + i * 3.25 + range(rng, -0.15, 0.15);
    if (kind === 'wave') {
      const withLook = waveN === 1 || waveN === 3;
      const apex = range(rng, 70, 105);
      const xs = [118, 179, 240, 301, 362].map((x) => x + range(rng, -8, 8));
      const tokens = xs.map((x, j) =>
        launch(rng, withLook && j === 2 ? looks[lookI++ % looks.length] : nextA(), x, 2, apex + Math.abs(j - 2) * 9 + range(rng, -4, 4), 30, 0.12),
      );
      events.push({ t, round: 2, combo: true, tokens });
      waveN++;
    } else {
      const n = mixedSizes[mixedN++] ?? 1;
      const xs = stratified(rng, n, 70, 410, 0.6);
      const tokens: Launch[] = [];
      for (let j = 0; j < n && mI < mixed.length; j++) {
        const k = mixed[mI++];
        const def = k === 'L' ? looks[lookI++ % looks.length] : pickDef(k);
        tokens.push(launch(rng, def, xs[j], 2, range(rng, 50, 120), 30));
      }
      events.push({ t, round: 2, tokens });
    }
  });

  return events.sort((a, b) => a.t - b.t);
}

/** Totals by kind (used to normalise the score to 500). */
export function scheduleTotals(events: SpawnEvent[], kindOf: (def: string) => 'A' | 'B' | 'C') {
  const totals = { A: 0, B: 0, C: 0 };
  for (const e of events) for (const t of e.tokens) totals[kindOf(t.def)]++;
  return totals;
}
