/**
 * BUY, BUILD, EXIT — simulated company economics (all figures fictional, ₹ crore).
 *
 * Entry:   business value V0 = existing debt + new borrowing + your equity
 * During:  completed rows raise operating value; efficiency moves the sale multiple;
 *          interest is charged on all debt every simulated half-year (12 s)
 * Exit:    sale value S;  equity proceeds = S − outstanding debt
 *          simulated gain = proceeds − equity invested − improvement costs − interest paid
 */
import type { Upgrade } from './blocks';

export interface Company {
  id: 'bakery' | 'textile' | 'logistics' | 'spice';
  name: string;
  kind: string;
  value: number;
  existingDebt: number;
  efficiency: number;
  growth: number;
  stars: number;
  sensitivity: number;
  note: string;
  palette: { wall: string; roof: string; accent: string };
}

export const COMPANIES: Company[] = [
  {
    id: 'bakery',
    name: 'Sunrise Bakeries',
    kind: 'Established bakery chain (22 shops)',
    value: 40,
    existingDebt: 4,
    efficiency: 0.68,
    growth: 1.0,
    stars: 2,
    sensitivity: 0.8,
    note: 'Steady and efficient, but slower growth.',
    palette: { wall: '#F6E7D2', roof: '#E07A4A', accent: '#F29A38' },
  },
  {
    id: 'textile',
    name: 'Indigo Threads',
    kind: 'Regional clothing manufacturer',
    value: 40,
    existingDebt: 10,
    efficiency: 0.46,
    growth: 1.35,
    stars: 4,
    sensitivity: 1.3,
    note: 'Old machines and more debt, but big export potential.',
    palette: { wall: '#D3E5F7', roof: '#3463B0', accent: '#5D91E5' },
  },
  {
    id: 'logistics',
    name: 'Metro Movers',
    kind: 'City delivery & logistics firm',
    value: 40,
    existingDebt: 7,
    efficiency: 0.56,
    growth: 1.18,
    stars: 3,
    sensitivity: 1.05,
    note: 'Busy routes, messy operations — room to improve.',
    palette: { wall: '#E8F5EB', roof: '#3C8A50', accent: '#6DBD81' },
  },
  {
    id: 'spice',
    name: 'Spice Route Foods',
    kind: 'Packaged spices & snacks maker',
    value: 40,
    existingDebt: 5,
    efficiency: 0.62,
    growth: 1.1,
    stars: 3,
    sensitivity: 0.95,
    note: 'Loved brand, steady demand, average factory.',
    palette: { wall: '#FDF6DC', roof: '#B8641A', accent: '#F4C542' },
  },
];

export interface Financing {
  id: 'low' | 'mid' | 'high';
  label: string;
  share: number;
  points: number;
  note: string;
}

export const FINANCING: Financing[] = [
  { id: 'low', label: 'Mostly our own money', share: 0.25, points: 40, note: 'Lower debt and interest — but more of your own money is at risk.' },
  { id: 'mid', label: 'Balanced', share: 0.5, points: 30, note: 'Half borrowed, half your own money.' },
  { id: 'high', label: 'Mostly borrowed', share: 0.75, points: 10, note: 'Less of your own money, heavy debt and interest — bigger potential gains AND losses.' },
];

export const BASE_RATE = 0.09;
export const BUILD_TIME = 120;
export const YEARS = 5;
export const INTEREST_EVERY = 12; // seconds per simulated half-year
export const ROW_GAIN = 1.1;
export const PIECE_COST = 0.12;
export const OFFER_AMOUNT = 4;

export type NewsKind = 'costs' | 'demand' | 'rates' | 'manager';

export const NEWS: Record<NewsKind, { title: string; body: string; tone: 'good' | 'bad' }> = {
  costs: { title: 'HIGHER OPERATING COSTS', body: 'Rent and raw materials got pricier — a cost row appears and efficiency dips.', tone: 'bad' },
  demand: { title: 'STRONGER CUSTOMER DEMAND', body: 'Sales are up! Your next 3 improvements are worth 50% more.', tone: 'good' },
  rates: { title: 'INTEREST RATES RISE', body: 'Borrowing costs jump from 9% to 12% — debt just got more expensive.', tone: 'bad' },
  manager: { title: 'NEW MANAGER HIRED', body: 'A strong operations manager joins — efficiency improves.', tone: 'good' },
};

export const IMPROVEMENT_MSG: Record<Upgrade, string> = {
  tech: 'NEW TECHNOLOGY INSTALLED!',
  people: 'EMPLOYEES TRAINED!',
  ops: 'OPERATIONS IMPROVED!',
  mkt: 'REVENUE POTENTIAL INCREASED!',
  fin: 'FINANCING OPTIMISED!',
};

export const UPGRADE_INFO: Record<Upgrade | 'cost', { label: string; color: string; dark: string; light: string }> = {
  tech: { label: 'Technology', color: '#5D91E5', dark: '#3463B0', light: '#A9C6F3' },
  people: { label: 'Employees & training', color: '#6DBD81', dark: '#3C8A50', light: '#A8DDB5' },
  ops: { label: 'Operations', color: '#F29A38', dark: '#B8641A', light: '#F8C27E' },
  mkt: { label: 'Marketing & sales', color: '#9369D0', dark: '#6440A3', light: '#C7B2EE' },
  fin: { label: 'Financing', color: '#F4C542', dark: '#B8841C', light: '#FBE39A' },
  cost: { label: 'Cost overrun', color: '#A3A19B', dark: '#6D6C67', light: '#C9C7C1' },
};

export class Economy {
  vOps: number;
  eff: number;
  readonly eff0: number;
  debt: number;
  readonly debt0: number;
  readonly equity: number;
  rate = BASE_RATE;
  interestPaid = 0;
  improveCost = 0;
  borrowed = 0;
  repaid = 0;
  boostClears = 0;
  lines = 0;
  pieces = 0;
  holesMade = 0;

  constructor(
    readonly company: Company,
    readonly financing: Financing,
  ) {
    this.vOps = company.value;
    this.eff = company.efficiency;
    this.eff0 = company.efficiency;
    const newDebt = financing.share * (company.value - company.existingDebt);
    this.debt0 = company.existingDebt + newDebt;
    this.debt = this.debt0;
    this.equity = company.value - this.debt0;
  }

  private mult(e: number) {
    return 0.7 + 0.6 * e;
  }

  /** Illustrative company value right now (= sale value at exit). */
  value(): number {
    return (this.vOps * this.mult(this.eff)) / this.mult(this.eff0);
  }

  onPieceLocked(newHoles: number) {
    this.pieces++;
    this.improveCost += PIECE_COST;
    if (newHoles > 0) {
      this.holesMade += newHoles;
      this.eff = Math.max(0.2, this.eff - 0.004 * newHoles);
    }
  }

  /** Returns the value added (₹ Cr) and the headline type. */
  onRowsCleared(rows: Upgrade[][], financed = false): { gain: number; top: Upgrade } {
    const k = rows.length;
    const comboMul = [1, 1, 1.15, 1.3, 1.5][Math.min(4, k)];
    const boost = this.boostClears > 0 ? 1.5 : 1;
    if (this.boostClears > 0) this.boostClears = Math.max(0, this.boostClears - k);
    let gain = ROW_GAIN * this.company.growth * k * comboMul * boost * (financed ? 1.3 : 1);
    const counts: Record<Upgrade, number> = { tech: 0, people: 0, ops: 0, mkt: 0, fin: 0 };
    for (const r of rows) for (const c of r) if (c in counts) counts[c]++;
    const top = (Object.keys(counts) as Upgrade[]).sort((a, b) => counts[b] - counts[a])[0];
    this.eff = Math.min(0.95, this.eff + 0.015 * k);
    if (top === 'tech' || top === 'ops') this.eff = Math.min(0.95, this.eff + 0.01 * k);
    if (top === 'people') {
      this.eff = Math.min(0.95, this.eff + 0.005 * k);
      gain += 0.3 * k;
    }
    if (top === 'mkt') gain += 0.5 * k;
    if (top === 'fin') {
      const pay = Math.min(this.debt, 1 * k);
      this.debt -= pay;
      this.repaid += pay;
    }
    this.vOps += gain;
    this.lines += k;
    return { gain, top };
  }

  chargeInterest(): number {
    const c = this.debt * this.rate * 0.5;
    this.interestPaid += c;
    return c;
  }

  borrow(amount: number) {
    this.debt += amount;
    this.borrowed += amount;
    // the financed upgrade itself adds value (bought with the borrowed money)
    this.vOps += amount * 1.15;
  }

  news(kind: NewsKind) {
    const s = this.company.sensitivity;
    if (kind === 'costs') this.eff = Math.max(0.2, this.eff - 0.03 * s);
    if (kind === 'demand') {
      this.boostClears = 3;
      this.vOps += 1.5 * s;
    }
    if (kind === 'rates') this.rate = BASE_RATE + 0.03;
    if (kind === 'manager') this.eff = Math.min(0.95, this.eff + 0.03);
  }

  debtRatio(): number {
    return this.debt / Math.max(1, this.value());
  }

  statement() {
    const sale = this.value();
    const proceeds = sale - this.debt;
    const invested = this.equity + this.improveCost + this.interestPaid;
    const gain = proceeds - invested;
    return {
      purchase: this.company.value,
      equity: this.equity,
      debt0: this.debt0,
      improveCost: this.improveCost,
      interestPaid: this.interestPaid,
      borrowed: this.borrowed,
      repaid: this.repaid,
      debt: this.debt,
      sale,
      proceeds,
      invested,
      gain,
      roe: gain / Math.max(0.1, this.equity),
    };
  }
}

/** 500-point score. Financial return is only one part of it. */
export function scoreParts(e: Economy, progress: number, survivedFrac: number) {
  const st = e.statement();
  const rows = Math.min(150, e.lines * 10);
  const efficiency = 80 * Math.min(1, Math.max(0, (e.eff - 0.4) / 0.5)) * progress;
  const funding = e.financing.points;
  const r = e.debtRatio();
  const debt = (r <= 0.35 ? 60 : r >= 0.85 ? 10 : 60 - ((r - 0.35) / 0.5) * 50) * progress;
  const exit = 70 * survivedFrac;
  const outcome = 100 * Math.min(1, Math.max(0, st.roe / 0.6)) * progress;
  return { rows, efficiency, funding, debt, exit, outcome, total: Math.max(0, Math.min(500, Math.round(rows + efficiency + funding + debt + exit + outcome))) };
}
