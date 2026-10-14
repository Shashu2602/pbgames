import { ArrowLeft, Pause, Timer } from 'lucide-react';
import { useStore, type Store } from '../app/store';
import { MAX_PER_GAME, type GameMeta } from '../data/games';
import { sfx } from '../engine/audio';
import { formatTime } from '../engine/format';
import type { ProgressState } from '../games/types';
import { useAnimatedNumber } from './anim';

export interface HudState {
  score: number;
  scoreLabel: string;
  progress: ProgressState | null;
  timer: number | null;
  timerMode: 'down' | 'up';
}

export const initialHud = (): HudState => ({
  score: 0,
  scoreLabel: 'SCORE',
  progress: null,
  timer: null,
  timerMode: 'down',
});

interface Props {
  meta: GameMeta;
  hud: Store<HudState>;
  playing: boolean;
  onBack: () => void;
  onPause: () => void;
}

/** Persistent top bar: back + title (left), score + progress (centre), timer + pause (right). */
export function ScoreHUD({ meta, hud, playing, onBack, onPause }: Props) {
  const state = useStore(hud);
  const shown = useAnimatedNumber(state.score, 500);
  const low = state.timerMode === 'down' && state.timer !== null && state.timer <= 15;

  return (
    <header className="relative z-20 grid h-[4.6rem] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b-2 border-line bg-paper px-5">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => {
            sfx.play('click');
            onBack();
          }}
          onMouseDown={(e) => e.preventDefault()}
          className="btn-ghost shrink-0 text-[0.95rem]"
          aria-label="Back to arcade"
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
          <span className="hidden lg:inline">ARCADE</span>
        </button>
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 border-ink font-pixel text-[0.65rem] sm:flex"
            style={{ background: meta.accent }}
          >
            {meta.number}
          </span>
          <div className="min-w-0">
            <div className="truncate font-pixel text-[0.85rem] leading-tight">{meta.title}</div>
            <div className="truncate text-[0.8rem] font-semibold uppercase tracking-wider text-ink-2">{meta.investment}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-baseline gap-2">
          <span className="font-pixel text-[0.6rem] text-ink-2">{state.scoreLabel}</span>
          <span className="tabular min-w-[3.2ch] text-right text-[2rem] font-bold leading-none">{Math.round(shown)}</span>
          <span className="text-[0.95rem] font-semibold text-ink-3">/ {MAX_PER_GAME}</span>
        </div>
        {state.progress && <ProgressView p={state.progress} accent={meta.accent} soft={meta.accentSoft} />}
      </div>

      <div className="flex items-center justify-end gap-3">
        {state.timer !== null && (
          <div
            className={`flex items-center gap-2 rounded-lg border-2 px-3 py-1.5 ${low ? 'border-bad text-bad' : 'border-line'}`}
            aria-label={state.timerMode === 'down' ? 'Time left' : 'Time elapsed'}
          >
            <Timer size={22} strokeWidth={2.5} />
            <span className={`tabular text-[1.65rem] font-bold leading-none ${low ? 'animate-pulse' : ''}`}>
              {formatTime(state.timer)}
            </span>
          </div>
        )}
        <button
          type="button"
          disabled={!playing}
          onClick={() => {
            sfx.play('click');
            onPause();
          }}
          onMouseDown={(e) => e.preventDefault()}
          className="btn-ghost h-[3rem] px-3 disabled:opacity-40"
          aria-label="Pause game"
        >
          <Pause size={20} strokeWidth={2.75} />
          <span className="hidden text-[0.95rem] xl:inline">PAUSE</span>
        </button>
      </div>
    </header>
  );
}

function ProgressView({ p, accent, soft }: { p: ProgressState; accent: string; soft: string }) {
  if (p.steps && p.steps.length) {
    const cur = p.step ?? 0;
    return (
      <div className="hidden items-center gap-1.5 md:flex" aria-label={`Progress: ${p.label}`}>
        {p.steps.map((s, i) => {
          const done = i < cur;
          const active = i === cur;
          return (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className="rounded-md border-2 px-2 py-1 text-[0.72rem] font-bold tracking-wider"
                style={{
                  borderColor: active ? '#171717' : done ? accent : '#DDDDD7',
                  background: active ? accent : done ? soft : '#FFFFFF',
                  color: done || active ? '#171717' : '#9A9A94',
                }}
              >
                {done ? '✓ ' : ''}
                {s}
              </span>
              {i < p.steps!.length - 1 && <span className="h-[2px] w-2.5 bg-line" />}
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="hidden min-w-[12rem] md:block" aria-label={`Progress: ${p.label}`}>
      <div className="mb-1 flex justify-between text-[0.72rem] font-bold tracking-wider text-ink-2">
        <span>{p.label}</span>
        <span>{Math.round(p.value * 100)}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-paper-2">
        <div
          className="stripes-progress h-full transition-[width] duration-300"
          style={{ width: `${Math.max(0, Math.min(1, p.value)) * 100}%`, backgroundColor: accent }}
        />
      </div>
    </div>
  );
}
