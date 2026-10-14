import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { EduContent } from '../data/education';
import type { GameMeta } from '../data/games';
import { sfx } from '../engine/audio';
import type { Highlight } from '../games/types';
import { EduVisualArt } from './eduVisuals';
import { Modal } from './Modal';

const BURST =
  'polygon(50% 0%, 61% 17%, 81% 7%, 79% 29%, 100% 33%, 85% 51%, 99% 69%, 77% 72%, 76% 95%, 57% 83%, 42% 100%, 34% 79%, 11% 88%, 17% 64%, 0% 52%, 17% 37%, 5% 15%, 29% 20%, 37% 1%)';

interface Props {
  content: EduContent;
  highlight: Highlight | null;
  meta: GameMeta;
  onContinue: () => void;
}

/**
 * Comic-style "freeze frame": white flash, halftone dim, spotlight on the
 * relevant object, and a short learning card. The CONTINUE button arms after a
 * moment so a held jump/swipe key can't skip it by accident.
 */
export function EducationOverlay({ content, highlight, meta, onContinue }: Props) {
  const [ready, setReady] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    sfx.play('freeze');
    const t = window.setTimeout(() => setReady(true), 800);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready) btnRef.current?.focus();
  }, [ready]);

  const finish = () => {
    if (!ready || doneRef.current) return;
    doneRef.current = true;
    sfx.play('click');
    onContinue();
  };

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const side = highlight ? (highlight.x < vw * 0.5 ? 'right' : 'left') : 'center';
  const mask = highlight
    ? `radial-gradient(circle at ${highlight.x}px ${highlight.y}px, transparent ${highlight.r}px, #000 ${highlight.r + 4}px)`
    : undefined;

  return (
    <Modal open fullscreen dismissible={false} labelledBy="edu-title">
      <div
        className="absolute inset-0 bg-[rgba(23,23,23,0.58)]"
        style={{ WebkitMaskImage: mask, maskImage: mask }}
      />
      <div className="halftone absolute inset-0 opacity-50" style={{ WebkitMaskImage: mask, maskImage: mask }} />
      <div
        className="pointer-events-none absolute inset-0 bg-white"
        style={{ animation: 'flash-out 280ms ease-out forwards' }}
      />
      {highlight && (
        <>
          <div
            className="pointer-events-none absolute rounded-full border-[5px]"
            style={{
              left: highlight.x,
              top: highlight.y,
              width: highlight.r * 2,
              height: highlight.r * 2,
              transform: 'translate(-50%, -50%)',
              borderColor: meta.accent,
              boxShadow: '0 0 0 3px #171717',
            }}
          />
          <div
            className="pointer-events-none absolute rounded-full border-4"
            style={{
              left: highlight.x,
              top: highlight.y,
              width: highlight.r * 2,
              height: highlight.r * 2,
              borderColor: meta.accent,
              animation: 'pulse-ring 1.2s ease-out infinite',
            }}
          />
        </>
      )}

      <div
        className={`absolute inset-0 flex items-center px-[5vw] py-6 ${
          side === 'right' ? 'justify-end' : side === 'left' ? 'justify-start' : 'justify-center'
        }`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.6, rotate: -7, y: 24 }}
          animate={{ opacity: 1, scale: 1, rotate: -1, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 21 }}
          className="relative max-h-full w-[min(36rem,90vw)] overflow-visible rounded-2xl border-[3px] border-ink bg-paper p-7"
          style={{ boxShadow: `10px 10px 0 ${meta.accent}` }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: -9 }}
            transition={{ delay: 0.12, type: 'spring', stiffness: 500, damping: 14 }}
            className="absolute -left-7 -top-9"
            style={{ filter: 'drop-shadow(3px 3px 0 #171717)' }}
          >
            <div
              className="flex h-[5.4rem] w-[7.4rem] items-center justify-center font-pixel text-[0.8rem] text-ink"
              style={{ clipPath: BURST, background: '#F4C542' }}
            >
              FREEZE!
            </div>
          </motion.div>

          <div className="mb-3 flex items-center justify-end">
            <span className="chip" style={{ borderColor: meta.accent }}>
              Learning moment · {meta.investment}
            </span>
          </div>

          {content.visual && (
            <div className="mb-4 flex justify-center rounded-xl border-2 border-line bg-paper-2 px-3 py-4">
              <EduVisualArt visual={content.visual} />
            </div>
          )}

          <h2 id="edu-title" className="font-pixel text-[1.1rem] leading-[1.6]" style={{ color: meta.accentDeep }}>
            {content.title}
          </h2>
          <p className="mt-3 text-[1.32rem] font-medium leading-snug text-ink">{content.body}</p>
          {content.context && (
            <p
              className="mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-[1.02rem] font-semibold leading-snug"
              style={{ background: meta.accentSoft }}
            >
              <span aria-hidden className="mt-[0.15em] font-pixel text-[0.7rem]" style={{ color: meta.accentDeep }}>
                ▶
              </span>
              {content.context}
            </p>
          )}

          <button
            ref={btnRef}
            type="button"
            disabled={!ready}
            onClick={finish}
            className="btn-arcade relative mt-6 w-full overflow-hidden py-3.5 font-pixel text-[0.85rem]"
            style={{ ['--btn-bg' as string]: meta.accent }}
          >
            {!ready && (
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-white/50"
                style={{ animation: 'grow 0.8s linear forwards', width: '0%' }}
              />
            )}
            <span className="relative">CONTINUE</span>
            <span className="key-cap relative">ENTER</span>
          </button>
        </motion.div>
      </div>
      <style>{'@keyframes grow { to { width: 100%; } }'}</style>
    </Modal>
  );
}
