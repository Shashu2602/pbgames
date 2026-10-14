import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, BadgeCheck, CircleAlert, Lock } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Confetti } from '../../components/anim';
import {
  AUTH_PAIRS,
  CATEGORY_LABEL,
  CATEGORY_RANGE,
  COLLECTIBLES,
  FACTOR_CLUE,
  FACTOR_TEXT,
  type AuthPair,
  type Collectible,
} from '../../data/collectibles';
import { sfx } from '../../engine/audio';
import { PixelCanvas } from '../../engine/canvas';
import { formatINR } from '../../engine/format';
import { ctx2d } from '../../engine/pixel';
import { createRng, pick, shuffle } from '../../engine/random';
import type { GameProps } from '../types';
import { drawStage, STAGE_H, STAGE_W } from './art';
import {
  accuracyPct,
  logFraction,
  parseRupees,
  pointsFor,
  SLIDER_STEPS,
  sliderToValue,
  ticksFor,
  valueToSlider,
} from './scoring';

const ACCENT = '#9369D0';
const GUESS_TIME = 30;
const CHOOSE_TIME = 20;
const AUTH_PROOF_PTS = 40;
const AUTH_VALUE_PTS = 60;
const LOT_STEPS = ['LOT 1', 'LOT 2', 'LOT 3', 'LOT 4', 'LOT 5'];

type Lot =
  | { kind: 'guess'; item: Collectible; max: number }
  | { kind: 'auth'; item: Collectible; pair: AuthPair; strongSide: 0 | 1; max: number };

interface LotResult {
  name: string;
  guess: number;
  value: number;
  points: number;
  accuracy: number;
  proofPts?: number;
  proofRight?: boolean;
}

type Phase = 'curtain' | 'choose' | 'chosen' | 'guess' | 'reveal';

function buildLots(seed: number): Lot[] {
  const rng = createRng(seed);
  const pair = pick(rng, AUTH_PAIRS);
  const pool = COLLECTIBLES.filter((c) => c.id !== pair.item);
  const low = shuffle(rng, pool.filter((c) => c.value < 50_000));
  const mid = shuffle(rng, pool.filter((c) => c.value >= 50_000 && c.value <= 2_00_000));
  const high = shuffle(rng, pool.filter((c) => c.value > 2_00_000));
  const chosen: Collectible[] = [];
  const take = (list: Collectible[]) => {
    const it = list.find((c) => !chosen.includes(c) && !chosen.some((x) => x.category === c.category));
    if (it) chosen.push(it);
  };
  take(low);
  take(mid);
  take(high);
  take(shuffle(rng, pool));
  for (const c of shuffle(rng, pool)) if (chosen.length < 4 && !chosen.includes(c)) chosen.push(c);
  const order = shuffle(rng, chosen);
  const authItem = COLLECTIBLES.find((c) => c.id === pair.item) as Collectible;
  const lots: Lot[] = order.map((item) => ({ kind: 'guess', item, max: 100 }));
  lots.splice(2, 0, { kind: 'auth', item: authItem, pair, strongSide: rng() < 0.5 ? 0 : 1, max: AUTH_VALUE_PTS });
  return lots;
}

const geoMid = ([lo, hi]: [number, number]) => Math.sqrt(lo * hi);

export function PriceHunter({ controller }: GameProps) {
  const lots = useMemo(() => buildLots(controller.seed), [controller.seed]);
  const [lotIndex, setLotIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('curtain');
  const [results, setResults] = useState<LotResult[]>([]);
  const [proof, setProof] = useState<{ choice: number | null; right: boolean; pts: number } | null>(null);
  const [guess, setGuess] = useState(0);
  /** null = the box mirrors the slider; a string = the visitor is typing. */
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [revealStep, setRevealStep] = useState(0);
  const [confetti, setConfetti] = useState(0);
  const timeLeft = useRef(GUESS_TIME);
  const lot = lots[lotIndex];
  const range = CATEGORY_RANGE[lot.item.category];
  const shownTotal = results.reduce((s, r) => s + r.points + (r.proofPts ?? 0), 0) + (proof && phase !== 'reveal' ? proof.pts : 0);
  const flags = useRef({ intro: false, auth: false });
  const lockRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    controller.setScoreLabel('SCORE');
    controller.setProgress({ label: LOT_STEPS[lotIndex], value: lotIndex / 4, steps: LOT_STEPS, step: lotIndex });
  }, [controller, lotIndex]);

  useEffect(() => {
    controller.setScore(shownTotal);
  }, [controller, shownTotal]);

  /* ── start of each lot: curtain, learning moments, reset guess ── */
  useEffect(() => {
    setPhase('curtain');
    setProof(null);
    setError('');
    setRevealStep(0);
    const start = geoMid(range);
    setGuess(sliderToValue(valueToSlider(start, range), range));
    setText(null);
    controller.setTimer(null);
    let cancelled = false;
    const t = window.setTimeout(async () => {
      if (cancelled) return;
      sfx.play('whoosh');
      if (!flags.current.intro) {
        flags.current.intro = true;
        await controller.educate('co-what', stageHighlight());
      }
      if (lot.kind === 'auth' && !flags.current.auth) {
        flags.current.auth = true;
        await controller.educate('co-auth', stageHighlight());
      }
      if (cancelled) return;
      timeLeft.current = lot.kind === 'auth' ? CHOOSE_TIME : GUESS_TIME;
      setPhase(lot.kind === 'auth' ? 'choose' : 'guess');
    }, 900);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotIndex]);

  /* ── countdown that respects every pause (overlays, pause menu, lost focus) ── */
  useEffect(() => {
    if (phase !== 'guess' && phase !== 'choose') {
      controller.setTimer(null);
      return;
    }
    let raf = 0;
    let last = performance.now();
    let lastTick = Math.ceil(timeLeft.current);
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!controller.pause.paused) {
        timeLeft.current -= dt;
        const whole = Math.ceil(timeLeft.current);
        if (whole !== lastTick && whole <= 5 && whole > 0) sfx.play('tick');
        lastTick = whole;
        controller.setTimer(Math.max(0, timeLeft.current), 'down');
        if (timeLeft.current <= 0) {
          if (phase === 'guess') lockRef.current();
          else choose(null);
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lotIndex]);

  const stageRef = useRef<HTMLDivElement>(null);
  const stageHighlight = () => {
    const el = stageRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.45, r: Math.min(r.width, r.height) * 0.3 };
  };

  /* ── authenticity choice ── */
  const choose = useCallback(
    (side: number | null) => {
      if (lot.kind !== 'auth' || phase !== 'choose') return;
      const right = side === lot.strongSide;
      const pts = right ? AUTH_PROOF_PTS : 0;
      setProof({ choice: side, right, pts });
      setPhase('chosen');
      sfx.play(right ? 'correct' : side === null ? 'error' : 'wrong');
    },
    [lot, phase],
  );

  const toGuess = () => {
    timeLeft.current = GUESS_TIME;
    setPhase('guess');
  };

  /* ── guessing ── */
  const commitText = (raw: string): number | null => {
    const r = parseRupees(raw);
    if (!r.ok) {
      setError(r.error);
      sfx.play('error');
      return null;
    }
    setError('');
    setGuess(r.value);
    setText(null);
    return r.value;
  };

  const lock = () => {
    if (phase !== 'guess') return;
    let g = guess;
    if (text !== null) {
      const typed = parseRupees(text);
      if (!typed.ok) {
        setError(typed.error);
        sfx.play('error');
        if (timeLeft.current > 0) return;
      } else g = typed.value;
    }
    const value = lot.item.value;
    const points = pointsFor(g, value, lot.max);
    const accuracy = accuracyPct(g, value);
    setGuess(g);
    setResults((rs) => [
      ...rs,
      {
        name: lot.item.name,
        guess: g,
        value,
        points,
        accuracy,
        proofPts: lot.kind === 'auth' ? proof?.pts ?? 0 : undefined,
        proofRight: lot.kind === 'auth' ? proof?.right ?? false : undefined,
      },
    ]);
    setPhase('reveal');
    setRevealStep(0);
    sfx.play('drum');
    window.setTimeout(() => setRevealStep(1), 800);
    window.setTimeout(() => {
      setRevealStep(2);
      sfx.play(points >= lot.max * 0.6 ? 'correct' : 'reveal');
      if (accuracy >= 90) setConfetti((n) => n + 1);
    }, 2100);
  };
  lockRef.current = lock;

  const next = () => {
    if (lotIndex < lots.length - 1) {
      sfx.play('click');
      setLotIndex((i) => i + 1);
    } else {
      finish();
    }
  };

  const finish = () => {
    const total = results.reduce((s, r) => s + r.points + (r.proofPts ?? 0), 0);
    const avg = Math.round(results.reduce((s, r) => s + r.accuracy, 0) / Math.max(1, results.length));
    const best = results.slice().sort((a, b) => b.accuracy - a.accuracy)[0];
    const authRes = results.find((r) => r.proofPts !== undefined);
    controller.finish({
      score: total,
      outcome: 'complete',
      headline: 'AUCTION CLOSED!',
      subline: 'All values were simulated — real collectible prices depend on buyers, timing and proof.',
      breakdown: results.flatMap((r, i) =>
        r.proofPts !== undefined
          ? [
              { label: `Lot ${i + 1} · Proof check`, value: r.proofPts, max: AUTH_PROOF_PTS, note: r.proofRight ? 'correct' : 'missed' },
              { label: `Lot ${i + 1} · ${r.name}`, value: r.points, max: AUTH_VALUE_PTS, note: `${r.accuracy}% accurate` },
            ]
          : [{ label: `Lot ${i + 1} · ${r.name}`, value: r.points, max: 100, note: `${r.accuracy}% accurate` }],
      ),
      stat: { label: 'Average accuracy', value: `${avg}%` },
      extraStats: [
        { label: 'Closest guess', value: best ? `${best.accuracy}%` : '—' },
        { label: 'Proof check', value: authRes?.proofRight ? 'Correct ✓' : 'Missed' },
      ],
    });
  };

  // Enter key: lock / next
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (controller.pause.paused) return;
      if (e.key === 'Enter') {
        if (phase === 'guess') {
          e.preventDefault();
          lock();
        } else if (phase === 'reveal' && revealStep === 2) {
          e.preventDefault();
          next();
        }
      }
      if (phase === 'choose' && (e.key === '1' || e.key === '2' || e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'b')) {
        const side = e.key === '1' || e.key.toLowerCase() === 'a' ? 0 : 1;
        choose(side);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const stageItems =
    lot.kind === 'auth'
      ? [
          { id: lot.item.id, tag: 'A', dim: phase !== 'choose' && phase !== 'curtain' && lot.strongSide !== 0 },
          { id: lot.item.id, tag: 'B', dim: phase !== 'choose' && phase !== 'curtain' && lot.strongSide !== 1 },
        ]
      : [{ id: lot.item.id }];
  const lotLabel = `LOT ${lotIndex + 1}/5`;
  const last = results[results.length - 1];

  return (
    <div className="absolute inset-0 grid grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[1.08fr_1fr] lg:overflow-hidden">
      <Confetti fire={confetti} />
      {/* ── Stage ── */}
      <div ref={stageRef} className="relative min-h-[22rem] overflow-hidden rounded-2xl border-[3px] border-ink bg-[#FBF9FE] shadow-[8px_8px_0_#9369D0]">
        <Stage items={stageItems} lotLabel={lotLabel} />
        <Curtains open={phase !== 'curtain'} lotKey={lotIndex} />
        <div className="pointer-events-none absolute bottom-4 left-1/2 w-[86%] -translate-x-1/2 rounded-xl border-[3px] border-ink bg-paper px-4 py-2 text-center">
          {lot.kind === 'auth' && <div className="font-pixel text-[0.62rem] text-collect">AUTHENTICITY ROUND</div>}
          <div className="truncate text-[1.3rem] font-bold leading-tight">{lot.item.name}</div>
        </div>
      </div>

      {/* ── Panel ── */}
      <div className="flex min-h-0 flex-col overflow-y-auto pr-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${lotIndex}-${phase === 'reveal' ? 'r' : phase === 'choose' || phase === 'chosen' ? 'c' : 'g'}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-md border-2 border-ink px-2 py-1 font-pixel text-[0.68rem]" style={{ background: ACCENT, color: '#fff' }}>
                LOT {String(lotIndex + 1).padStart(2, '0')} / 05
              </span>
              <span className="chip" style={{ borderColor: ACCENT, background: '#F1EBFA' }}>
                {CATEGORY_LABEL[lot.item.category]}
              </span>
            </div>

            {(phase === 'curtain' || phase === 'guess') && (
              <GuessPanel
                item={lot.item}
                max={lot.max}
                range={range}
                guess={guess}
                text={text}
                error={error}
                ready={phase === 'guess'}
                onSlider={(v) => {
                  setGuess(v);
                  setText(null);
                  setError('');
                }}
                onText={(t) => {
                  setText(t);
                  setError('');
                }}
                onCommit={() => {
                  if (text !== null) commitText(text);
                }}
                onLock={lock}
                proof={lot.kind === 'auth' ? proof : null}
              />
            )}

            {(phase === 'choose' || phase === 'chosen') && lot.kind === 'auth' && (
              <AuthPanel lot={lot} proof={proof} onChoose={choose} onContinue={toGuess} />
            )}

            {phase === 'reveal' && last && (
              <RevealPanel
                result={last}
                item={lot.item}
                max={lot.max}
                range={range}
                step={revealStep}
                isLast={lotIndex === lots.length - 1}
                onNext={next}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ───────────────────────── stage canvas ───────────────────────── */
function Stage({ items, lotLabel }: { items: { id: Collectible['id']; tag?: string; dim?: boolean }[]; lotLabel: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const data = useRef({ items, lotLabel });
  data.current = { items, lotLabel };
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = ctx2d(c);
    let raf = 0;
    const loop = (now: number) => {
      drawStage(ctx, now / 1000, data.current.items, data.current.lotLabel);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="absolute inset-0 pb-[5.2rem]">
      <PixelCanvas width={STAGE_W} height={STAGE_H} canvasRef={ref} />
    </div>
  );
}

function Curtains({ open, lotKey }: { open: boolean; lotKey: number }) {
  const pleat = 'repeating-linear-gradient(90deg, #6440A3 0 14px, #7B55BF 14px 24px, #57368F 24px 30px)';
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" key={lotKey}>
      <motion.div
        className="absolute inset-y-0 left-0 w-1/2 border-r-[3px] border-ink"
        style={{ background: pleat }}
        initial={{ x: 0 }}
        animate={{ x: open ? '-102%' : 0 }}
        transition={{ duration: 0.9, ease: [0.7, 0, 0.3, 1] }}
      />
      <motion.div
        className="absolute inset-y-0 right-0 w-1/2 border-l-[3px] border-ink"
        style={{ background: pleat }}
        initial={{ x: 0 }}
        animate={{ x: open ? '102%' : 0 }}
        transition={{ duration: 0.9, ease: [0.7, 0, 0.3, 1] }}
      />
      {!open && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-lg border-[3px] border-ink bg-paper px-5 py-3 font-pixel text-[1rem]">NEXT LOT…</span>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── guess panel ───────────────────────── */
interface GuessProps {
  item: Collectible;
  max: number;
  range: [number, number];
  guess: number;
  text: string | null;
  error: string;
  ready: boolean;
  proof: { right: boolean; pts: number } | null;
  onSlider: (v: number) => void;
  onText: (t: string) => void;
  onCommit: () => void;
  onLock: () => void;
}

function GuessPanel({ item, max, range, guess, text, error, ready, proof, onSlider, onText, onCommit, onLock }: GuessProps) {
  const facts: [string, string, string?][] = [
    ['Condition', item.condition],
    ['Age', item.age],
    ['Rarity', item.rarity, item.production],
  ];
  const typed = text !== null ? parseRupees(text) : null;
  const display = typed && typed.ok ? typed.value : guess;
  return (
    <>
      <dl className="grid grid-cols-3 gap-2.5">
        {facts.map(([k, v, sub]) => (
          <div key={k} className="rounded-xl border-2 border-line bg-paper px-3.5 py-2.5">
            <dt className="text-[0.75rem] font-bold uppercase tracking-wider text-ink-2">{k}</dt>
            <dd className="text-[1.1rem] font-bold leading-snug">{v}</dd>
            {sub && <dd className="mt-0.5 text-[0.85rem] leading-snug text-ink-2">{sub}</dd>}
          </div>
        ))}
      </dl>
      <p className="rounded-lg px-3 py-2 text-[1rem] font-semibold" style={{ background: '#F1EBFA', color: '#4E2F86' }}>
        {FACTOR_CLUE[item.factor]}
      </p>
      {proof && (
        <p className="text-[0.98rem] font-semibold text-ink-2">
          Proof check: {proof.right ? `✓ correct (+${proof.pts})` : '✗ missed'} — now value the verified lot (up to {max} points).
        </p>
      )}

      <div className="rounded-2xl border-[3px] border-ink bg-paper p-4">
        <label htmlFor="guess" className="font-pixel text-[0.78rem] leading-relaxed">
          WHAT DO YOU THINK IT IS WORTH?
        </label>
        <div className="mt-3 flex items-stretch">
          <div className="flex flex-1 items-center rounded-xl border-[3px] border-ink bg-paper-2 px-3 focus-within:shadow-[0_0_0_4px_#9369D055]">
            <span className="text-[1.9rem] font-bold text-ink-2">₹</span>
            <input
              id="guess"
              inputMode="numeric"
              autoComplete="off"
              disabled={!ready}
              value={text ?? formatINR(display).replace('₹', '')}
              onFocus={(e) => {
                if (text === null) onText(formatINR(display).replace('₹', ''));
                const el = e.currentTarget;
                window.setTimeout(() => el.select(), 0);
              }}
              onChange={(e) => onText(e.target.value)}
              onBlur={onCommit}
              aria-invalid={!!error}
              aria-describedby="guess-error"
              className="tabular w-full bg-transparent px-2 py-2 text-[2rem] font-bold outline-none"
            />
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={SLIDER_STEPS}
          step={1}
          disabled={!ready}
          value={valueToSlider(display, range)}
          onChange={(e) => onSlider(sliderToValue(Number(e.target.value), range))}
          className="arcade-range mt-3"
          aria-label="Price slider (logarithmic)"
        />
        <div className="relative mt-1 h-5 text-[0.8rem] font-semibold text-ink-2">
          {ticksFor(range).map((v) => (
            <span key={v} className="absolute -translate-x-1/2" style={{ left: `${logFraction(v, range) * 100}%` }}>
              {v >= 1e7 ? `₹${v / 1e7}Cr` : v >= 1e5 ? `₹${v / 1e5}L` : `₹${v / 1e3}K`}
            </span>
          ))}
        </div>
        <div id="guess-error" role="alert" className="mt-1 min-h-[1.4em] text-[0.95rem] font-semibold text-bad">
          {error && (
            <span className="flex items-center gap-1.5">
              <CircleAlert size={16} /> {error}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onLock}
          disabled={!ready}
          className="btn-arcade mt-1 w-full py-3.5 font-pixel text-[0.85rem]"
          style={{ ['--btn-bg' as string]: ACCENT, ['--btn-fg' as string]: '#FFFFFF' }}
        >
          <Lock size={18} /> LOCK IN MY GUESS <span className="key-cap">ENTER</span>
        </button>
        <p className="mt-2 text-center text-[0.82rem] font-semibold text-ink-3">All values are simulated for the game.</p>
      </div>
    </>
  );
}

/* ───────────────────────── authenticity round ───────────────────────── */
function AuthPanel({
  lot,
  proof,
  onChoose,
  onContinue,
}: {
  lot: Extract<Lot, { kind: 'auth' }>;
  proof: { choice: number | null; right: boolean; pts: number } | null;
  onChoose: (side: number) => void;
  onContinue: () => void;
}) {
  const sides = lot.strongSide === 0 ? [lot.pair.strong, lot.pair.weak] : [lot.pair.weak, lot.pair.strong];
  const chosen = proof !== null;
  return (
    <>
      <div>
        <div className="text-[1.05rem] font-semibold text-ink-2">{lot.pair.title}</div>
        <h2 className="mt-2 font-pixel text-[0.95rem] leading-relaxed">WHICH ONE HAS MORE RELIABLE PROOF OF AUTHENTICITY?</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {sides.map((docs, i) => {
          const isStrong = i === lot.strongSide;
          const picked = proof?.choice === i;
          return (
            <button
              key={i}
              type="button"
              disabled={chosen}
              onClick={() => onChoose(i)}
              onMouseEnter={() => !chosen && sfx.play('hover')}
              className="rounded-xl border-[3px] bg-paper p-4 text-left transition-transform enabled:hover:-translate-y-1"
              style={{
                borderColor: chosen ? (isStrong ? '#3F9D5A' : picked ? '#E0524A' : '#DDDDD7') : '#171717',
                boxShadow: picked ? `6px 6px 0 ${ACCENT}` : 'none',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[0.85rem]">LOT {'AB'[i]}</span>
                <span className="key-cap">{i + 1}</span>
              </div>
              <ul className="mt-3 space-y-2">
                {docs.map((d) => (
                  <li key={d} className="flex gap-2 text-[1rem] leading-snug">
                    <span aria-hidden className="mt-[0.45em] h-2 w-2 shrink-0 bg-ink" />
                    {d}
                  </li>
                ))}
              </ul>
              {chosen && (
                <div className="mt-3 font-pixel text-[0.62rem]" style={{ color: isStrong ? '#2E7A45' : '#B23A33' }}>
                  {isStrong ? 'VERIFIED ✓' : 'UNVERIFIED ?'}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {chosen && proof && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-[3px] p-4"
          style={{ background: proof.right ? '#E7F5EA' : '#FCEBE9', borderColor: proof.right ? '#3F9D5A' : '#E0524A' }}
        >
          <div className="flex items-center gap-3">
            <BadgeCheck size={22} />
            <span className="font-pixel text-[0.8rem]">{proof.right ? 'GOOD EYE!' : proof.choice === null ? "TIME'S UP" : 'NOT QUITE'}</span>
            <span className="rounded-md bg-ink px-2 py-1 font-pixel text-[0.65rem] text-paper">+{proof.pts}</span>
          </div>
          <p className="mt-2 text-[1.02rem] leading-snug">{lot.pair.why}</p>
          <button
            type="button"
            autoFocus
            onClick={onContinue}
            className="btn-arcade mt-3 w-full py-3 font-pixel text-[0.75rem]"
            style={{ ['--btn-bg' as string]: ACCENT, ['--btn-fg' as string]: '#FFFFFF' }}
          >
            NOW VALUE THE VERIFIED LOT <ArrowRight size={18} />
          </button>
        </motion.div>
      )}
    </>
  );
}

/* ───────────────────────── reveal ───────────────────────── */
function RevealPanel({
  result,
  item,
  max,
  range,
  step,
  isLast,
  onNext,
}: {
  result: LotResult;
  item: Collectible;
  max: number;
  range: [number, number];
  step: number;
  isLast: boolean;
  onNext: () => void;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (step < 1) return;
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const t = Math.min(1, (now - t0) / 1200);
      const e = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(result.value * e));
      if (Math.floor(t * 12) !== Math.floor(((now - 16 - t0) / 1200) * 12)) sfx.play('tick');
      if (t < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step, result.value]);

  const diff = result.guess - result.value;
  const diffPct = Math.round((diff / result.value) * 100);
  const gx = logFraction(result.guess, range);
  const vx = logFraction(result.value, range);
  const great = result.accuracy >= 90;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border-2 border-line bg-paper px-4 py-3">
          <div className="font-pixel text-[0.6rem] text-ink-2">YOUR GUESS</div>
          <div className="tabular mt-1 text-[1.75rem] font-bold">{formatINR(result.guess)}</div>
        </div>
        <div className="rounded-xl border-[3px] border-ink px-4 py-3" style={{ background: '#F1EBFA' }}>
          <div className="font-pixel text-[0.6rem] text-collect">SIMULATED VALUE</div>
          <div className="tabular mt-1 text-[1.75rem] font-bold">
            {step === 0 ? <span className="animate-pulse">₹ ? ? ?</span> : formatINR(step >= 2 ? result.value : shown)}
          </div>
        </div>
      </div>

      <div className="rounded-xl border-2 border-line bg-paper px-4 pb-2 pt-7">
        <div className="relative h-4 rounded-full border-2 border-ink bg-paper-2">
          {step >= 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-y-0 rounded-full"
              style={{
                left: `${Math.min(gx, vx) * 100}%`,
                width: `${Math.abs(gx - vx) * 100}%`,
                background: great ? '#6DBD81' : '#F4C542',
              }}
            />
          )}
          <Marker x={gx} label="YOU" color="#171717" below />
          {step >= 1 && <Marker x={vx} label="VALUE" color={ACCENT} />}
        </div>
        <div className="mt-6 flex justify-between text-[0.8rem] font-semibold text-ink-2">
          <span>{formatINR(range[0])}</span>
          <span>{formatINR(range[1])}</span>
        </div>
      </div>

      {step >= 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border-2 border-line bg-paper px-3 py-2.5">
            <div className="text-[0.75rem] font-bold uppercase tracking-wider text-ink-2">Accuracy</div>
            <div className="tabular text-[1.4rem] font-bold">
              {result.accuracy}%
              <span className="ml-2 text-[0.9rem] font-semibold text-ink-2">
                off by {formatINR(Math.abs(diff))} ({diffPct > 0 ? '+' : ''}
                {diffPct}%)
              </span>
            </div>
          </div>
          <div className="rounded-xl border-[3px] border-ink px-3 py-2.5" style={{ background: great ? '#E7F5EA' : '#FDF6DC' }}>
            <div className="text-[0.75rem] font-bold uppercase tracking-wider text-ink-2">Points earned</div>
            <div className="tabular text-[1.4rem] font-bold">
              +{result.points}
              <span className="text-[0.9rem] text-ink-2"> / {max}</span>
            </div>
          </div>
        </motion.div>
      )}

      {step >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border-[3px] border-ink bg-paper p-4"
          style={{ boxShadow: `6px 6px 0 ${ACCENT}` }}
        >
          <div className="font-pixel text-[0.72rem] text-collect">WHAT AFFECTS PRICE? {item.factor}</div>
          <p className="mt-2 text-[1.05rem] font-medium leading-snug">{FACTOR_TEXT[item.factor]}</p>
        </motion.div>
      )}

      {step >= 2 && (
        <button
          type="button"
          autoFocus
          onClick={onNext}
          className="btn-arcade w-full py-3.5 font-pixel text-[0.85rem]"
          style={{ ['--btn-bg' as string]: ACCENT, ['--btn-fg' as string]: '#FFFFFF' }}
        >
          {isLast ? 'SEE RESULTS' : 'NEXT LOT'} <ArrowRight size={18} />
        </button>
      )}
    </>
  );
}

function Marker({ x, label, color, below }: { x: number; label: string; color: string; below?: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x * 100}%` }}
    >
      <div className="h-6 w-3 rounded-sm border-2 border-ink" style={{ background: color }} />
      <div
        className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-pixel text-[0.55rem] ${below ? 'top-7' : '-top-6'}`}
        style={{ color }}
      >
        {label}
      </div>
    </motion.div>
  );
}
