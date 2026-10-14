/** Formatting helpers. All money in the arcade is simulated and shown in INR. */
const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('en-IN');

/** ₹8,50,000 (Indian digit grouping). */
export function formatINR(value: number): string {
  if (!Number.isFinite(value)) return '₹0';
  return `₹${inr.format(Math.round(value))}`;
}

/** Short form: ₹8.5L, ₹1.2Cr, ₹45K. */
export function formatINRShort(value: number): string {
  const v = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (v >= 1e7) return `${sign}₹${trim(v / 1e7)} Cr`;
  if (v >= 1e5) return `${sign}₹${trim(v / 1e5)} L`;
  if (v >= 1e3) return `${sign}₹${trim(v / 1e3)}K`;
  return `${sign}₹${Math.round(v)}`;
}

function trim(n: number): string {
  return n >= 100 ? Math.round(n).toString() : n >= 10 ? n.toFixed(1).replace(/\.0$/, '') : n.toFixed(2).replace(/0$/, '').replace(/\.0$/, '');
}

/** ₹ Crore amounts used in Buy, Build, Exit (one decimal). */
export function formatCr(value: number, signed = false): string {
  const sign = value < 0 ? '−' : signed && value > 0 ? '+' : '';
  return `${sign}₹${Math.abs(value).toFixed(1)} Cr`;
}

export function formatNumber(n: number): string {
  return num.format(Math.round(n));
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export const pad2 = (n: number) => String(n).padStart(2, '0');
