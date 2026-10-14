import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { GameMeta } from '../data/games';
import { sfx } from '../engine/audio';
import type { ChoiceConfig } from '../games/types';
import { Modal } from './Modal';

interface Props {
  cfg: ChoiceConfig;
  meta: GameMeta;
  onDone: (index: number) => void;
}

const TONE = {
  good: { bg: '#E7F5EA', border: '#3F9D5A', label: '#2E7A45' },
  bad: { bg: '#FCEBE9', border: '#E0524A', label: '#B23A33' },
  neutral: { bg: '#F6F6F2', border: '#171717', label: '#171717' },
};

/** Freeze-frame decision cards (startup picks, company purchase, financing). */
export function ChoiceOverlay({ cfg, meta, onDone }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const [armed, setArmed] = useState(false);
  const continueRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    sfx.play('freeze');
    const t = window.setTimeout(() => setArmed(true), 650);
    return () => window.clearTimeout(t);
  }, []);

  const feedback = picked !== null && cfg.feedback ? cfg.feedback(picked) : null;

  const done = (i: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone(i);
  };

  const pick = (i: number) => {
    if (!armed || picked !== null) return;
    setPicked(i);
    const fb = cfg.feedback?.(i);
    sfx.play(fb?.tone === 'bad' ? 'wrong' : fb?.tone === 'good' ? 'correct' : 'select');
    if (!cfg.feedback) done(i);
  };

  useEffect(() => {
    if (feedback) {
      const t = window.setTimeout(() => continueRef.current?.focus(), 450);
      return () => window.clearTimeout(t);
    }
  }, [feedback]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (picked !== null) return;
      const n = Number.parseInt(e.key, 10);
      if (n >= 1 && n <= cfg.options.length) {
        e.preventDefault();
        pick(n - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const cols = cfg.options.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2';

  return (
    <Modal open fullscreen dismissible={false} labelledBy="choice-title">
      <div className="absolute inset-0 bg-[rgba(23,23,23,0.62)]" />
      <div className="halftone absolute inset-0 opacity-40" />
      <div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          className="w-[min(66rem,96vw)] rounded-2xl border-[3px] border-ink bg-paper p-7"
          style={{ boxShadow: `10px 10px 0 ${meta.accent}` }}
        >
          {cfg.kicker && (
            <div className="mb-2 font-pixel text-[0.7rem]" style={{ color: meta.accentDeep }}>
              {cfg.kicker}
            </div>
          )}
          <h2 id="choice-title" className="font-pixel text-[1.15rem] leading-[1.6]">
            {cfg.title}
          </h2>
          {cfg.prompt && <p className="mt-2 text-[1.15rem] text-ink-2">{cfg.prompt}</p>}

          <div className={`mt-5 grid grid-cols-1 gap-5 ${cols}`}>
            {cfg.options.map((o, i) => {
              const isPicked = picked === i;
              const dim = picked !== null && !isPicked;
              return (
                <motion.button
                  key={i}
                  type="button"
                  onClick={() => pick(i)}
                  disabled={picked !== null}
                  onMouseEnter={() => sfx.play('hover')}
                  whileHover={picked === null ? { y: -4 } : undefined}
                  className="group relative flex flex-col items-stretch rounded-xl border-[3px] bg-paper p-5 text-left transition-[opacity,box-shadow] disabled:cursor-default"
                  style={{
                    borderColor: isPicked ? '#171717' : '#DDDDD7',
                    opacity: dim ? 0.45 : 1,
                    boxShadow: isPicked ? `6px 6px 0 ${meta.accent}` : 'none',
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="key-cap">{i + 1}</span>
                    {o.tag && (
                      <span className="chip" style={{ background: o.tone ?? meta.accentSoft, borderColor: 'transparent' }}>
                        {o.tag}
                      </span>
                    )}
                  </div>
                  {o.art && <div className="mt-4 flex justify-center">{o.art}</div>}
                  <div className="mt-4 text-[1.35rem] font-bold leading-tight">{o.title}</div>
                  {o.subtitle && <div className="mt-1 text-[0.98rem] font-medium text-ink-2">{o.subtitle}</div>}
                  <ul className="mt-3 space-y-1.5">
                    {o.lines.map((l, j) => (
                      <li key={j} className="flex gap-2 text-[1.05rem] leading-snug">
                        <span aria-hidden className="mt-[0.55em] h-2 w-2 shrink-0 bg-ink" />
                        <span>{l}</span>
                      </li>
                    ))}
                  </ul>
                </motion.button>
              );
            })}
          </div>

          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex flex-col gap-4 rounded-xl border-[3px] p-5 md:flex-row md:items-center"
              style={{ background: TONE[feedback.tone].bg, borderColor: TONE[feedback.tone].border }}
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-pixel text-[0.85rem]" style={{ color: TONE[feedback.tone].label }}>
                    {feedback.title}
                  </span>
                  {feedback.points && (
                    <span className="rounded-md bg-ink px-2 py-1 font-pixel text-[0.7rem] text-paper">{feedback.points}</span>
                  )}
                </div>
                <p className="mt-2 text-[1.08rem] leading-snug">{feedback.body}</p>
              </div>
              <button
                ref={continueRef}
                type="button"
                onClick={() => done(picked as number)}
                className="btn-arcade shrink-0 px-6 py-3 font-pixel text-[0.8rem]"
                style={{ ['--btn-bg' as string]: meta.accent }}
              >
                CONTINUE
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </Modal>
  );
}
