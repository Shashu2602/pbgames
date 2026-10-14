/**
 * PRICE HUNTER maths.
 * Scoring compares guesses in log space, so ₹10,000 off on a ₹20,000 item
 * counts the same as ₹10 lakh off on a ₹20 lakh item. The curve is gradual:
 *   within 5% → full points · 1.5× off → ~74% · 2× off → ~42% · 3× off → ~11%
 */
export const MIN_GUESS = 100;
export const MAX_GUESS = 10_00_00_000;

export function pointsFor(guess: number, actual: number, max: number): number {
  if (!(guess > 0) || !(actual > 0)) return 0;
  const ratio = Math.max(guess / actual, actual / guess);
  if (ratio <= 1.05) return max;
  const x = Math.log(ratio);
  return Math.round(max * Math.exp(-1.8 * x * x));
}

/** "Accuracy" shown to the player: how close the guess is, as a percentage. */
export function accuracyPct(guess: number, actual: number): number {
  if (!(guess > 0) || !(actual > 0)) return 0;
  return Math.round((100 * Math.min(guess, actual)) / Math.max(guess, actual));
}

/** Slider position (0..1000) ↔ rupees on a logarithmic scale. */
export const SLIDER_STEPS = 1000;
export function sliderToValue(pos: number, [lo, hi]: [number, number]): number {
  const t = pos / SLIDER_STEPS;
  return niceRound(Math.exp(Math.log(lo) + t * (Math.log(hi) - Math.log(lo))));
}
export function valueToSlider(v: number, [lo, hi]: [number, number]): number {
  const c = Math.min(hi, Math.max(lo, v));
  return Math.round(((Math.log(c) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * SLIDER_STEPS);
}
export function logFraction(v: number, [lo, hi]: [number, number]): number {
  const c = Math.min(hi, Math.max(lo, v));
  return (Math.log(c) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
}

/** Round to 2 significant figures so slider values look like real prices. */
export function niceRound(v: number): number {
  if (v < 100) return Math.round(v);
  const mag = Math.pow(10, Math.floor(Math.log10(v)) - 1);
  return Math.round(v / mag) * mag;
}

export type ParseResult = { ok: true; value: number } | { ok: false; error: string };

/** Parses "1,20,000", "120000", "1.2L", "50k", "2 cr". Rejects anything else. */
export function parseRupees(raw: string): ParseResult {
  const s = raw.trim().toLowerCase().replace(/₹|rs\.?|inr/g, '').replace(/[,\s]/g, '');
  if (!s) return { ok: false, error: 'Enter an amount in rupees.' };
  const m = /^(\d+(?:\.\d+)?)(k|l|lakh|lakhs|cr|crore|crores)?$/.exec(s);
  if (!m) return { ok: false, error: 'Use numbers only (you can also type 50k, 1.2L or 2cr).' };
  let v = Number.parseFloat(m[1]);
  const unit = m[2];
  if (unit === 'k') v *= 1_000;
  else if (unit === 'l' || unit === 'lakh' || unit === 'lakhs') v *= 1_00_000;
  else if (unit === 'cr' || unit === 'crore' || unit === 'crores') v *= 1_00_00_000;
  if (!Number.isFinite(v) || v <= 0) return { ok: false, error: 'The amount must be more than ₹0.' };
  if (v < MIN_GUESS) return { ok: false, error: 'The smallest guess allowed is ₹100.' };
  if (v > MAX_GUESS) return { ok: false, error: 'That’s over ₹10 crore — try a smaller guess.' };
  return { ok: true, value: Math.round(v) };
}

/** Nice tick marks for the slider (₹1K, ₹10K, ₹1L, …) inside a range. */
export function ticksFor([lo, hi]: [number, number]): number[] {
  const out: number[] = [];
  for (let e = 2; e <= 9; e++) {
    for (const m of [1]) {
      const v = m * Math.pow(10, e);
      if (v >= lo && v <= hi) out.push(v);
    }
  }
  return out;
}
