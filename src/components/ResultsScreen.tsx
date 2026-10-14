import { motion } from 'motion/react';
import { ArrowRight, House, Printer, RotateCcw, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { completedOf, totalOf, type RecordOutcome } from '../app/store';
import { GAMES, MAX_TOTAL, nextUnplayed, type GameId } from '../data/games';
import { sfx } from '../engine/audio';
import type { GameResult } from '../games/types';
import { Confetti, CountUp } from './anim';

interface Props {
  gameId: GameId;
  result: GameResult & RecordOutcome;
  best: Partial<Record<GameId, number>>;
  onReplay: () => void;
  onExit: () => void;
  onPlayGame: (id: GameId) => void;
  onSlip: () => void;
}

function tierOf(score: number) {
  if (score >= 350) return { stars: 3, line: 'OUTSTANDING!' };
  if (score >= 200) return { stars: 2, line: 'GREAT RUN!' };
  return { stars: 1, line: 'GOOD START — KEEP EXPLORING!' };
}

export function ResultsScreen({ gameId, result, best, onReplay, onExit, onPlayGame, onSlip }: Props) {
  const meta = GAMES[gameId];
  const [counted, setCounted] = useState(false);
  const tier = tierOf(result.score);
  const next = useMemo(() => nextUnplayed(best, gameId), [best, gameId]);
  const total = totalOf(best);
  const done = completedOf(best);
  const headline = result.outcome === 'complete' ? 'LEVEL COMPLETE' : 'GAME OVER';

  return (
    <div className="absolute inset-0 overflow-y-auto bg-paper-2">
      <Confetti fire={counted && result.score >= 300 ? 1 : 0} />
      <div className="mx-auto grid min-h-full max-w-[100rem] grid-cols-1 gap-8 px-8 py-6 lg:grid-cols-[1fr_1.15fr] xl:px-14">
        {/* Left: score + actions */}
        <div className="flex flex-col justify-center">
          <motion.h1
            initial={{ scale: 2.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            className="font-pixel text-[2.1rem] leading-[1.3]"
            style={{ color: result.outcome === 'complete' ? '#171717' : '#B23A33' }}
          >
            {headline}
          </motion.h1>
          {result.headline && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-3 inline-flex w-fit rounded-lg border-[3px] border-ink px-4 py-2 font-pixel text-[0.85rem]"
              style={{ background: meta.accent }}
            >
              {result.headline}
            </motion.div>
          )}
          {result.subline && <p className="mt-3 text-[1.1rem] text-ink-2">{result.subline}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-7">
            <Badge accent={meta.accent} deep={meta.accentDeep} stars={tier.stars} />
            <div>
              <div className="font-pixel text-[0.7rem] text-ink-2">FINAL SCORE</div>
              <div className="mt-1 flex items-baseline gap-2">
                <CountUp
                  to={result.score}
                  duration={1500}
                  delay={350}
                  tick
                  onDone={() => {
                    setCounted(true);
                    sfx.play('reveal');
                  }}
                  className="tabular text-[4.4rem] font-bold leading-none"
                />
                <span className="text-[1.5rem] font-bold text-ink-3">/ 500</span>
              </div>
              <div className="mt-2 font-pixel text-[0.78rem]" style={{ color: meta.accentDeep }}>
                {meta.award}
              </div>
              <div className="mt-1 text-[1rem] font-semibold text-ink-2">{tier.line}</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-xl border-2 border-line bg-paper px-4 py-3">
              <div className="text-[0.8rem] font-bold uppercase tracking-wider text-ink-2">{result.stat.label}</div>
              <div className="text-[1.5rem] font-bold">{result.stat.value}</div>
            </div>
            {result.extraStats?.map((s) => (
              <div key={s.label} className="rounded-xl border-2 border-line bg-paper px-4 py-3">
                <div className="text-[0.8rem] font-bold uppercase tracking-wider text-ink-2">{s.label}</div>
                <div className="text-[1.5rem] font-bold">{s.value}</div>
              </div>
            ))}
            <div className="rounded-xl border-2 px-4 py-3" style={{ borderColor: meta.accent, background: meta.accentSoft }}>
              <div className="text-[0.8rem] font-bold uppercase tracking-wider text-ink-2">Session best</div>
              <div className="text-[1.5rem] font-bold">
                {result.best}
                {result.improved && result.previous !== undefined && (
                  <span className="ml-2 align-middle font-pixel text-[0.6rem] text-good">NEW BEST!</span>
                )}
                {!result.improved && <span className="ml-2 align-middle text-[0.85rem] font-semibold text-ink-2">(best kept)</span>}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onReplay}
              className="btn-arcade px-6 py-3.5 font-pixel text-[0.78rem]"
              style={{ ['--btn-bg' as string]: meta.accent }}
            >
              <RotateCcw size={18} /> PLAY AGAIN
            </button>
            {next && (
              <button
                type="button"
                autoFocus
                onClick={() => onPlayGame(next)}
                className="btn-arcade px-6 py-3.5 font-pixel text-[0.78rem]"
                style={{ ['--btn-bg' as string]: GAMES[next].accent }}
              >
                NEXT: {GAMES[next].title} <ArrowRight size={18} />
              </button>
            )}
            <button type="button" onClick={onExit} className="btn-arcade px-6 py-3.5 font-pixel text-[0.78rem]">
              <House size={18} /> BACK TO ARCADE
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border-2 border-dashed border-line bg-paper px-4 py-3">
            <div className="text-[1.02rem] font-semibold">
              Session total{' '}
              <b className="tabular text-[1.25rem]">
                {total.toLocaleString('en-IN')} / {MAX_TOTAL.toLocaleString('en-IN')}
              </b>{' '}
              · {done}/5 games played
            </div>
            <button type="button" onClick={onSlip} className="btn-ghost ml-auto text-[0.95rem]">
              <Printer size={18} /> Score slip
            </button>
          </div>
        </div>

        {/* Right: breakdown + learning */}
        <div className="flex flex-col justify-center gap-4">
          <section className="rounded-2xl border-2 border-line bg-paper px-6 py-5">
            <h2 className="font-pixel text-[0.75rem]">SCORE BREAKDOWN</h2>
            <ul className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2.5 xl:grid-cols-2">
              {result.breakdown.map((b, i) => {
                const pct = b.max ? Math.max(0, Math.min(1, b.value / b.max)) : null;
                return (
                  <motion.li
                    key={b.label}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                  >
                    <div className="flex items-baseline justify-between gap-3 text-[1rem]">
                      <span className="font-semibold">
                        {b.label}
                        {b.note && <span className="ml-2 text-[0.9rem] font-medium text-ink-2">{b.note}</span>}
                      </span>
                      <span className="tabular font-bold">
                        {b.value > 0 ? '+' : ''}
                        {Math.round(b.value)}
                        {b.max ? <span className="font-semibold text-ink-3"> / {b.max}</span> : null}
                      </span>
                    </div>
                    {pct !== null && (
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct * 100}%` }}
                          transition={{ delay: 0.5 + i * 0.08, duration: 0.6 }}
                          className="h-full rounded-full"
                          style={{ background: meta.accent }}
                        />
                      </div>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-2xl border-[3px] border-ink bg-paper px-6 py-5" style={{ boxShadow: `8px 8px 0 ${meta.accent}` }}>
            <h2 className="font-pixel text-[0.75rem]">WHAT YOU JUST LEARNED</h2>
            <ol className="mt-3 space-y-2.5">
              {meta.learned.map((l, i) => (
                <li key={i} className="flex gap-3 text-[1.05rem] leading-snug">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-ink font-pixel text-[0.6rem]"
                    style={{ background: meta.accentSoft }}
                  >
                    {i + 1}
                  </span>
                  <span>
                    <b className="mr-1.5 text-[0.82rem] uppercase tracking-wider" style={{ color: meta.accentDeep }}>
                      {['What it is', 'How investors hope to earn', 'What can go wrong'][i]}
                    </b>
                    <br />
                    {l}
                  </span>
                </li>
              ))}
            </ol>
            <blockquote className="mt-4 rounded-xl px-4 py-3 text-[1rem] font-semibold leading-snug" style={{ background: meta.accentSoft }}>
              “{meta.takeaway}”
            </blockquote>
          </section>
          <p className="text-[0.9rem] text-ink-2">
            Educational simulation. Points and figures are fictional — not investment advice or a prediction of real returns.
          </p>
        </div>
      </div>
    </div>
  );
}

function Badge({ accent, deep, stars }: { accent: string; deep: string; stars: number }) {
  return (
    <motion.div
      initial={{ rotate: -200, scale: 0 }}
      animate={{ rotate: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 160, damping: 13, delay: 0.15 }}
      className="relative"
      aria-label={`${stars} star badge`}
    >
      <svg width="132" height="150" viewBox="0 0 22 25" shapeRendering="crispEdges" aria-hidden>
        {/* ribbons */}
        <rect x="5" y="15" width="4" height="9" fill={deep} />
        <rect x="13" y="15" width="4" height="9" fill={deep} />
        <rect x="5" y="23" width="1" height="1" fill="#F6F6F2" />
        <rect x="8" y="23" width="1" height="1" fill="#F6F6F2" />
        <rect x="13" y="23" width="1" height="1" fill="#F6F6F2" />
        <rect x="16" y="23" width="1" height="1" fill="#F6F6F2" />
        {/* medal: pixel circle */}
        <rect x="7" y="1" width="8" height="1" fill="#171717" />
        <rect x="5" y="2" width="12" height="1" fill="#171717" />
        <rect x="4" y="3" width="14" height="1" fill="#171717" />
        <rect x="3" y="4" width="16" height="10" fill="#171717" />
        <rect x="4" y="14" width="14" height="1" fill="#171717" />
        <rect x="5" y="15" width="12" height="1" fill="#171717" />
        <rect x="7" y="16" width="8" height="1" fill="#171717" />
        <rect x="7" y="2" width="8" height="1" fill={accent} />
        <rect x="5" y="3" width="12" height="1" fill={accent} />
        <rect x="4" y="4" width="14" height="10" fill={accent} />
        <rect x="5" y="14" width="12" height="1" fill={accent} />
        <rect x="7" y="15" width="8" height="1" fill={accent} />
        <rect x="6" y="5" width="10" height="8" fill="#FFFFFF" opacity="0.35" />
        <rect x="5" y="4" width="3" height="1" fill="#FFFFFF" opacity="0.8" />
        <rect x="4" y="5" width="1" height="3" fill="#FFFFFF" opacity="0.8" />
      </svg>
      <div className="absolute left-0 right-0 top-[2.1rem] flex justify-center gap-0.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6 + i * 0.18, type: 'spring', stiffness: 500, damping: 12 }}
          >
            <Star
              size={26}
              strokeWidth={2.5}
              className={i < stars ? 'text-ink' : 'text-ink/25'}
              fill={i < stars ? '#171717' : 'transparent'}
            />
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}
