import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Landmark, Newspaper, Star } from 'lucide-react';
import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../app/store';
import { Confetti } from '../../components/anim';
import { sfx } from '../../engine/audio';
import { PixelCanvas } from '../../engine/canvas';
import { formatCr } from '../../engine/format';
import { ctx2d, makeCanvas } from '../../engine/pixel';
import { createRng, shuffle } from '../../engine/random';
import type { GameProps } from '../types';
import { shapeMatrix, type Upgrade } from './blocks';
import { BUILD_TIME, COMPANIES, Economy, FINANCING, OFFER_AMOUNT, scoreParts, UPGRADE_INFO, type Company } from './economy';
import { BOARD_H, BOARD_W, PEEngine } from './engine';
import { cellURL, drawCompany, drawPiecePreview } from './sprites';

const ACCENT = '#5D91E5';
const STEPS = ['BUY', 'BUILD', 'EXIT'];
type Phase = 'buy' | 'build' | 'exit';

function companyArt(c: Company): string {
  const cv = makeCanvas(120, 90);
  drawCompany(ctx2d(cv), 120, 90, c, 0, c.efficiency, 0);
  return cv.toDataURL();
}

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export function BuyBuildExit({ controller }: GameProps) {
  const [phase, setPhase] = useState<Phase>('buy');
  const [econ, setEcon] = useState<Economy | null>(null);
  const [topOut, setTopOut] = useState(false);
  const [elapsed, setElapsed] = useState(BUILD_TIME);

  useEffect(() => {
    controller.setScoreLabel('SCORE');
    controller.setProgress({ label: STEPS[phase === 'buy' ? 0 : phase === 'build' ? 1 : 2], value: phase === 'buy' ? 0 : phase === 'build' ? 0.5 : 1, steps: STEPS, step: phase === 'buy' ? 0 : phase === 'build' ? 1 : 2 });
    if (phase !== 'build') controller.setTimer(null);
  }, [controller, phase]);

  /* ── PHASE 1 · BUY ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await new Promise((r) => window.setTimeout(r, 700));
      if (cancelled) return;
      await controller.educate('pe-what', null);
      if (cancelled) return;
      const rng = createRng(controller.seed);
      const steady = shuffle(rng, COMPANIES.filter((c) => c.id === 'bakery' || c.id === 'spice'))[0];
      const growth = shuffle(rng, COMPANIES.filter((c) => c.id === 'textile' || c.id === 'logistics'))[0];
      const pair = rng() < 0.5 ? [steady, growth] : [growth, steady];
      const ci = await controller.choose({
        kicker: 'PHASE 1 · BUY',
        title: 'WHICH ESTABLISHED COMPANY WILL YOU BUY?',
        prompt: 'Both are private businesses with a simulated value of ₹40 Cr. Compare them — neither choice is “wrong”.',
        options: pair.map((c) => ({
          tag: c.growth >= 1.3 ? 'HIGH GROWTH · RISKIER' : c.growth >= 1.15 ? 'GROWTH' : 'STEADY',
          title: c.name,
          subtitle: c.kind,
          lines: [
            `Business value: ₹${c.value} Cr (simulated)`,
            `Debt level: ${c.existingDebt <= 5 ? 'Low' : c.existingDebt <= 8 ? 'Medium' : 'High'} (₹${c.existingDebt} Cr existing loans)`,
            `Operational efficiency: ${Math.round(c.efficiency * 100)}%`,
            `Growth potential: ${stars(c.stars)}`,
          ],
          art: createElement('img', { src: companyArt(c), alt: '', className: 'pixelated rounded-lg border-2 border-line', style: { width: 280, height: 210 } }),
        })),
        feedback: (i) => ({
          tone: 'neutral',
          title: `YOU BOUGHT ${pair[i].name.toUpperCase()}`,
          body: `${pair[i].note} Next: decide how to pay for it.`,
        }),
      });
      if (cancelled) return;
      const company = pair[ci];
      const fi = await controller.choose({
        kicker: 'PHASE 1 · BUY',
        title: 'HOW WILL YOU PAY THE REMAINING PRICE?',
        prompt: `The company already carries ₹${company.existingDebt} Cr of loans. Choose how much of the rest to borrow.`,
        options: FINANCING.map((f) => {
          const newDebt = f.share * (company.value - company.existingDebt);
          const debt = company.existingDebt + newDebt;
          const equity = company.value - debt;
          return {
            tag: f.id === 'low' ? 'LOW DEBT' : f.id === 'mid' ? 'MEDIUM DEBT' : 'HIGH DEBT',
            title: f.label,
            subtitle: `Borrow ${Math.round(f.share * 100)}% of the rest`,
            lines: [`Your money (equity): ₹${equity.toFixed(1)} Cr`, `Total debt: ₹${debt.toFixed(1)} Cr`, f.note],
            art: createElement(
              'div',
              { className: 'flex h-5 w-56 overflow-hidden rounded-md border-2 border-ink' },
              createElement('div', { style: { width: `${(equity / company.value) * 100}%`, background: '#6DBD81' } }),
              createElement('div', { style: { flex: 1, background: '#E0524A' } }),
            ),
          };
        }),
        feedback: (i) => ({
          tone: 'neutral',
          title: FINANCING[i].id === 'high' ? 'BOLD — AND RISKY' : FINANCING[i].id === 'low' ? 'CAREFUL CHOICE' : 'BALANCED CHOICE',
          body: 'Borrowed money can increase both potential gains and losses. Now improve the company before you sell it!',
        }),
      });
      if (cancelled) return;
      setEcon(new Economy(company, FINANCING[fi]));
      setPhase('build');
      controller.banner('PHASE 2 · BUILD', 'COMPLETE ROWS TO IMPROVE THE COMPANY');
    })();
    return () => {
      cancelled = true;
    };
  }, [controller]);

  if (phase === 'buy' || !econ) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-2xl border-[3px] border-ink bg-paper px-10 py-8 text-center shadow-[8px_8px_0_#5D91E5]">
          <div className="font-pixel text-[0.75rem] text-pe">PHASE 1</div>
          <div className="mt-2 font-pixel text-[1.6rem]">BUY</div>
          <p className="mt-3 max-w-[30rem] text-[1.1rem] text-ink-2">Choose an established private company and how to pay for it.</p>
        </div>
      </div>
    );
  }

  if (phase === 'build') {
    return (
      <BuildPhase
        controller={controller}
        econ={econ}
        onEnd={(top, time) => {
          setTopOut(top);
          setElapsed(time);
          window.setTimeout(() => setPhase('exit'), 1200);
        }}
      />
    );
  }

  return <ExitPhase controller={controller} econ={econ} topOut={topOut} elapsed={elapsed} />;
}

/* ───────────────────────── PHASE 2 · BUILD ───────────────────────── */
function BuildPhase({ controller, econ, onEnd }: GameProps & { econ: Economy; onEnd: (topOut: boolean, time: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<PEEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let elapsedActive = 0;
    const eng = new PEEngine(canvas, controller, econ, (top) => {
      elapsedActive = top ? Math.min(BUILD_TIME, BUILD_TIME - eng.ui.get().timeLeft) : BUILD_TIME;
      sfx.play(top ? 'gameover' : 'finish');
      onEnd(top, elapsedActive);
    });
    setEngine(eng);
    eng.start();
    if (import.meta.env.DEV) (window as unknown as { __game?: unknown }).__game = eng;
    return () => eng.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, econ]);

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_auto_1fr] gap-6 px-6 pt-5">
        <div className="min-h-0 overflow-y-auto">{engine && <CompanyPanel engine={engine} econ={econ} />}</div>
        <div className="relative h-full min-h-0" style={{ aspectRatio: `${BOARD_W} / ${BOARD_H}` }}>
          <PixelCanvas width={BOARD_W} height={BOARD_H} canvasRef={canvasRef} canvasClassName="rounded-lg shadow-[8px_8px_0_#5D91E5]" />
        </div>
        <div className="min-h-0 overflow-y-auto">{engine && <FinancePanel engine={engine} />}</div>
      </div>
      {engine && <NewsTicker engine={engine} />}
    </div>
  );
}

function CompanyPanel({ engine, econ }: { engine: PEEngine; econ: Economy }) {
  const ui = useStore(engine.ui);
  const ref = useRef<HTMLCanvasElement>(null);
  const data = useRef(ui);
  data.current = ui;
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    if (ui.improvement) setFlash(1);
  }, [ui.improvement?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = ctx2d(c);
    let raf = 0;
    let fl = 1;
    const loop = (now: number) => {
      fl = Math.max(0, fl - 0.03);
      const d = data.current;
      drawCompany(ctx, 120, 96, econ.company, Math.min(6, Math.floor(d.lines / 2)), d.eff, now / 1000, { crane: true, flash: fl * 0 });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [econ.company]);

  const valueDelta = ui.value - econ.company.value;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border-[3px] border-ink bg-paper p-4">
        <div className="text-[0.78rem] font-bold uppercase tracking-wider text-ink-2">Your company</div>
        <div className="text-[1.35rem] font-bold leading-tight">{econ.company.name}</div>
        <div className="text-[0.92rem] text-ink-2">{econ.company.kind}</div>
        <div className="mt-3 overflow-hidden rounded-lg border-2 border-line bg-[#EEF4FB]">
          <canvas ref={ref} width={120} height={96} className="pixelated mx-auto block h-[min(30vh,15rem)] w-auto max-w-full" />
        </div>
      </div>
      <div className="rounded-2xl border-[3px] border-ink bg-paper p-4" style={{ boxShadow: `6px 6px 0 ${ACCENT}` }}>
        <div className="font-pixel text-[0.58rem] text-ink-2">COMPANY VALUE (SIMULATED)</div>
        <div className="tabular mt-1 text-[2.2rem] font-bold leading-none">{formatCr(ui.value)}</div>
        <div className={`mt-1 text-[0.95rem] font-bold ${valueDelta >= 0 ? 'text-good' : 'text-bad'}`}>
          {formatCr(valueDelta, true)} since you bought it
        </div>
        <div className="mt-3 flex items-center justify-between text-[0.85rem] font-bold uppercase tracking-wider text-ink-2">
          <span>Efficiency</span>
          <span className="tabular text-ink">{Math.round(ui.eff * 100)}%</span>
        </div>
        <div className="mt-1 h-3 overflow-hidden rounded-full border-2 border-ink bg-paper-2">
          <div className="h-full transition-[width] duration-300" style={{ width: `${ui.eff * 100}%`, background: '#6DBD81' }} />
        </div>
        <div className="mt-3 flex justify-between text-[0.95rem]">
          <span className="font-semibold text-ink-2">Improvements</span>
          <b>{ui.lines} rows</b>
        </div>
        <div className="flex justify-between text-[0.95rem]">
          <span className="font-semibold text-ink-2">Growth potential</span>
          <b className="tracking-wider">{stars(econ.company.stars)}</b>
        </div>
        {ui.boost > 0 && (
          <div className="mt-2 rounded-md bg-[#E7F5EA] px-2 py-1 text-[0.85rem] font-bold text-good">
            Strong demand: next {ui.boost} improvement{ui.boost > 1 ? 's' : ''} ×1.5
          </div>
        )}
      </div>
      <AnimatePresence mode="wait">
        {ui.improvement && flash > 0 && (
          <motion.div
            key={ui.improvement.id}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border-[3px] border-ink px-4 py-3"
            style={{ background: UPGRADE_INFO[ui.improvement.up].light }}
          >
            <div className="font-pixel text-[0.72rem] leading-relaxed">{ui.improvement.text}</div>
            <div className="mt-1 text-[1.05rem] font-bold">+{formatCr(ui.improvement.gain)} company value</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FinancePanel({ engine }: { engine: PEEngine }) {
  const ui = useStore(engine.ui);
  const nextRef = useRef<HTMLCanvasElement>(null);
  const nextKey = ui.next.map((n) => `${n.shape}${n.up}`).join('|');

  useEffect(() => {
    const c = nextRef.current;
    if (!c) return;
    const ctx = ctx2d(c);
    ctx.clearRect(0, 0, c.width, c.height);
    ui.next.forEach((n, i) => drawPiecePreview(ctx, shapeMatrix(n.shape), n.up, 34, 18 + i * 36));
  }, [nextKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const ratio = ui.debt / Math.max(1, ui.value);
  const zone = ratio < 0.4 ? { label: 'MANAGEABLE', color: '#6DBD81' } : ratio < 0.65 ? { label: 'ELEVATED', color: '#F4C542' } : { label: 'RISKY', color: '#E0524A' };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="rounded-2xl border-[3px] border-ink bg-paper p-3">
          <div className="font-pixel text-[0.55rem] text-ink-2">NEXT</div>
          <canvas ref={nextRef} width={68} height={72} className="pixelated mt-1 block h-[8.5rem] w-[8rem]" />
        </div>
        <div className="flex-1 rounded-2xl border-2 border-line bg-paper p-3 text-[0.85rem]">
          <div className="font-pixel text-[0.55rem] text-ink-2">UPGRADE BLOCKS</div>
          <ul className="mt-2 space-y-1">
            {(['tech', 'people', 'ops', 'mkt', 'fin'] as Upgrade[]).map((u) => (
              <li key={u} className="flex items-center gap-2 font-semibold">
                <img src={cellURL(u)} alt="" className="pixelated h-5 w-5" />
                {UPGRADE_INFO[u].label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border-[3px] border-ink bg-paper p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-pixel text-[0.58rem] text-ink-2">
            <Landmark size={16} /> DEBT METER
          </span>
          <span className="rounded-md border-2 border-ink px-1.5 py-0.5 font-pixel text-[0.5rem]" style={{ background: zone.color }}>
            {zone.label}
          </span>
        </div>
        <div className="tabular mt-1 text-[1.8rem] font-bold leading-none">{formatCr(ui.debt)}</div>
        <div className="relative mt-2 h-4 overflow-hidden rounded-full border-2 border-ink bg-paper-2">
          <div className="absolute inset-y-0 left-0" style={{ width: '40%', background: '#E7F5EA' }} />
          <div className="absolute inset-y-0" style={{ left: '40%', width: '25%', background: '#FDF6DC' }} />
          <div className="absolute inset-y-0 right-0" style={{ width: '35%', background: '#FCEBE9' }} />
          <div className="absolute inset-y-0 left-0 transition-[width] duration-300" style={{ width: `${Math.min(1, ratio) * 100}%`, background: zone.color }} />
        </div>
        <div className="mt-1 flex justify-between text-[0.78rem] font-semibold text-ink-2">
          <span>debt ÷ company value</span>
          <span className="tabular">{Math.round(ratio * 100)}%</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[0.9rem]">
          <div className="rounded-lg bg-paper-2 px-2 py-1.5">
            <div className="text-[0.72rem] font-bold uppercase text-ink-2">Interest rate</div>
            <b className={ui.rate > 0.1 ? 'text-bad' : ''}>{(ui.rate * 100).toFixed(0)}% / yr</b>
          </div>
          <div className="rounded-lg bg-paper-2 px-2 py-1.5">
            <div className="text-[0.72rem] font-bold uppercase text-ink-2">Interest paid</div>
            <b>{formatCr(ui.interestPaid)}</b>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {ui.offer !== null && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="rounded-2xl border-[3px] border-ink p-4"
            style={{ background: '#FDF6DC', boxShadow: '6px 6px 0 #F4C542' }}
          >
            <div className="font-pixel text-[0.62rem]">BORROWING OFFER · {ui.offer}s</div>
            <p className="mt-2 text-[0.98rem] leading-snug">
              Borrow <b>₹{OFFER_AMOUNT} Cr</b> for an instant financed upgrade. It adds value now — but raises your debt and future interest.
            </p>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => engine.acceptOffer()}
              className="btn-arcade mt-3 w-full py-2.5 font-pixel text-[0.68rem]"
              style={{ ['--btn-bg' as string]: '#F4C542' }}
            >
              BORROW <span className="key-cap">B</span>
            </button>
            <div className="mt-1.5 text-center text-[0.8rem] font-semibold text-ink-2">Optional — ignore it to keep debt lower.</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-2xl border-2 border-line bg-paper p-3 text-[0.88rem] font-semibold">
        <div className="font-pixel text-[0.55rem] text-ink-2">CONTROLS</div>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
          <span><span className="key-cap">←</span> <span className="key-cap">→</span> move</span>
          <span><span className="key-cap">↑</span> rotate</span>
          <span><span className="key-cap">↓</span> soft drop</span>
          <span><span className="key-cap">SPACE</span> drop</span>
          <span><span className="key-cap">B</span> borrow</span>
          <span><span className="key-cap">P</span> pause</span>
        </div>
      </div>
    </div>
  );
}

function NewsTicker({ engine }: { engine: PEEngine }) {
  const ui = useStore(engine.ui);
  const latest = ui.news[0];
  return (
    <div className="mx-6 mb-4 mt-3 flex shrink-0 items-center gap-3 overflow-hidden rounded-xl border-[3px] border-ink bg-ink px-4 py-2.5 text-paper">
      <span className="flex shrink-0 items-center gap-2 rounded-md bg-pe px-2 py-1 font-pixel text-[0.6rem] text-ink">
        <Newspaper size={15} /> NEWS
      </span>
      <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-bad" aria-hidden />
      <AnimatePresence mode="wait">
        {latest && (
          <motion.span
            key={latest.id}
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -18, opacity: 0 }}
            className={`truncate text-[1.05rem] font-semibold ${latest.tone === 'bad' ? 'text-[#F6B2AB]' : latest.tone === 'good' ? 'text-[#A8DDB5]' : 'text-paper'}`}
            aria-live="polite"
          >
            {latest.text}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── PHASE 3 · EXIT ───────────────────────── */
function ExitPhase({ controller, econ, topOut, elapsed }: GameProps & { econ: Economy; topOut: boolean; elapsed: number }) {
  const st = useMemo(() => econ.statement(), [econ]);
  const frac = topOut ? Math.max(0, Math.min(1, elapsed / BUILD_TIME)) : 1;
  const parts = useMemo(() => scoreParts(econ, frac, frac), [econ, frac]);
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLCanvasElement>(null);
  const positive = st.gain >= 0;

  useEffect(() => {
    controller.setScore(parts.total);
    controller.banner('PHASE 3 · EXIT', 'SELLING THE BUSINESS');
    sfx.play('reveal');
    const t = window.setInterval(() => setShown((n) => n + 1), 260);
    return () => window.clearInterval(t);
  }, [controller, parts.total]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = ctx2d(c);
    let raf = 0;
    const loop = (now: number) => {
      drawCompany(ctx, 120, 96, econ.company, Math.min(6, Math.floor(econ.lines / 2)), econ.eff, now / 1000, { sold: true });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [econ]);

  const rows: { label: string; value: number; sign?: '+' | '−' | '='; strong?: boolean; sub?: boolean }[] = [
    { label: 'Purchase price (business value at entry)', value: st.purchase },
    { label: 'paid with your money (equity)', value: st.equity, sub: true },
    { label: 'paid with borrowed money', value: st.debt0, sub: true },
    { label: 'Improvement costs while you owned it', value: st.improveCost },
    { label: 'Interest paid on debt', value: st.interestPaid },
    ...(st.borrowed > 0 ? [{ label: 'Extra money borrowed for upgrades', value: st.borrowed }] : []),
    ...(st.repaid > 0 ? [{ label: 'Debt repaid by financing upgrades', value: st.repaid }] : []),
    { label: 'Illustrative sale value at exit', value: st.sale, sign: '+' as const, strong: true },
    { label: 'Outstanding debt repaid at sale', value: st.debt, sign: '−' as const },
    { label: 'Money returned to you (equity proceeds)', value: st.proceeds, sign: '=' as const, strong: true },
    { label: 'Total you put in (equity + costs + interest)', value: st.invested, sign: '−' as const },
  ];

  const finish = () => {
    controller.finish({
      score: parts.total,
      outcome: topOut ? 'over' : 'complete',
      headline: 'BUSINESS EXIT COMPLETE!',
      subline: positive
        ? 'This simulated exit made a profit — real exits can just as easily lose money.'
        : 'This simulated exit lost money — a profitable exit is never guaranteed.',
      breakdown: [
        { label: 'Completed improvement rows', value: parts.rows, max: 150, note: `${econ.lines} rows` },
        { label: 'Operational efficiency', value: Math.round(parts.efficiency), max: 80, note: `${Math.round(econ.eff * 100)}%` },
        { label: 'Sensible funding choice', value: parts.funding, max: 40, note: econ.financing.label },
        { label: 'Manageable debt at exit', value: Math.round(parts.debt), max: 60, note: `${Math.round(econ.debtRatio() * 100)}% of value` },
        { label: 'Reached the exit phase', value: Math.round(parts.exit), max: 70, note: topOut ? 'stack overflowed early' : 'full holding period' },
        { label: 'Simulated return on your money', value: Math.round(parts.outcome), max: 100, note: `${st.roe >= 0 ? '+' : ''}${Math.round(st.roe * 100)}%` },
      ],
      stat: { label: 'Simulated gain / loss', value: formatCr(st.gain, true) },
      extraStats: [
        { label: 'Sale value', value: formatCr(st.sale) },
        { label: 'Return on equity', value: `${st.roe >= 0 ? '+' : ''}${Math.round(st.roe * 100)}%` },
      ],
    });
  };

  return (
    <div className="absolute inset-0 grid grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Confetti fire={positive && shown > rows.length ? 1 : 0} />
      <div className="flex flex-col gap-4">
        <motion.h2
          initial={{ scale: 1.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-pixel text-[1.5rem] leading-snug"
        >
          BUSINESS EXIT COMPLETE!
        </motion.h2>
        <div className="overflow-hidden rounded-2xl border-[3px] border-ink bg-paper shadow-[8px_8px_0_#5D91E5]">
          <canvas ref={ref} width={120} height={96} className="pixelated block w-full" />
        </div>
        <p className="rounded-xl border-2 border-line bg-paper p-4 text-[1.05rem] leading-snug">
          Private equity investors may eventually sell their ownership through an acquisition, another investor, or a public listing.{' '}
          <b>A profitable exit is not guaranteed.</b>
        </p>
        {topOut && (
          <p className="rounded-xl bg-[#FCEBE9] p-3 text-[0.98rem] font-semibold">
            The upgrade stack overflowed early — the business was sold before the full holding period.
          </p>
        )}
      </div>

      <div className="flex flex-col rounded-2xl border-[3px] border-ink bg-paper p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="font-pixel text-[0.8rem]">EXIT STATEMENT</h3>
          <span className="text-[0.85rem] font-semibold text-ink-2">simulated · ₹ crore</span>
        </div>
        <ul className="mt-3 flex-1 space-y-1">
          {rows.map((r, i) => (
            <motion.li
              key={r.label}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: i < shown ? 1 : 0, x: i < shown ? 0 : 16 }}
              className={`flex items-baseline justify-between gap-4 border-b border-dashed border-line py-1.5 ${r.sub ? 'pl-5 text-[0.95rem] text-ink-2' : 'text-[1.05rem]'} ${r.strong ? 'font-bold' : ''}`}
            >
              <span>
                {r.sign && <span className="mr-2 inline-block w-4 font-pixel text-[0.7rem]">{r.sign}</span>}
                {r.label}
              </span>
              <span className="tabular">{formatCr(r.value)}</span>
            </motion.li>
          ))}
        </ul>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: shown > rows.length ? 1 : 0, scale: shown > rows.length ? 1 : 0.9 }}
          className="mt-3 flex items-center justify-between rounded-xl border-[3px] border-ink px-4 py-3"
          style={{ background: positive ? '#E7F5EA' : '#FCEBE9' }}
        >
          <span className="font-pixel text-[0.72rem]">SIMULATED {positive ? 'GAIN' : 'LOSS'}</span>
          <span className="tabular text-[1.8rem] font-bold">
            {formatCr(st.gain, true)}
            <span className="ml-2 text-[1rem] text-ink-2">
              ({st.roe >= 0 ? '+' : ''}
              {Math.round(st.roe * 100)}% on your money)
            </span>
          </span>
        </motion.div>
        <button
          type="button"
          onClick={finish}
          disabled={shown <= rows.length}
          className="btn-arcade mt-4 w-full py-3.5 font-pixel text-[0.85rem]"
          style={{ ['--btn-bg' as string]: ACCENT }}
        >
          SEE RESULTS <ArrowRight size={18} />
        </button>
        <div className="mt-2 flex items-center justify-center gap-1 text-[0.82rem] text-ink-2">
          <Star size={14} /> Gain = money returned − money put in. All values are fictional.
        </div>
      </div>
    </div>
  );
}
