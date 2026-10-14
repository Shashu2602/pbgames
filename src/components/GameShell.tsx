import { AnimatePresence, motion } from 'motion/react';
import { House, Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { createStore, recordScore, sessionStore, type RecordOutcome } from '../app/store';
import { EDU, type EduContent } from '../data/education';
import { GAMES, type GameId } from '../data/games';
import { sfx } from '../engine/audio';
import { PauseController } from '../engine/pause';
import { newSeed } from '../engine/random';
import { BuyBuildExit } from '../games/private-equity/BuyBuildExit';
import { CryptoSlice } from '../games/cryptocurrency/CryptoSlice';
import { HedgeDefense } from '../games/hedge-funds/HedgeDefense';
import { PriceHunter } from '../games/collectibles/PriceHunter';
import { StartupRun } from '../games/venture-capital/StartupRun';
import type { CalloutTone, ChoiceConfig, GameController, GameProps, GameResult, Highlight } from '../games/types';
import { ChoiceOverlay } from './ChoiceOverlay';
import { ConfirmDialog } from './ConfirmDialog';
import { EducationOverlay } from './EducationOverlay';
import { Modal } from './Modal';
import { GamePreview } from './previews/GamePreview';
import { ResultsScreen } from './ResultsScreen';
import { initialHud, ScoreHUD, type HudState } from './ScoreHUD';

const COMPONENTS: Record<GameId, ComponentType<GameProps>> = {
  vc: StartupRun,
  crypto: CryptoSlice,
  collect: PriceHunter,
  hedge: HedgeDefense,
  pe: BuyBuildExit,
};

type Phase = 'intro' | 'playing' | 'results';

/** Where learning callouts appear, so they never cover each game's key controls. */
const CALLOUT_AT: Record<GameId, 'top' | 'bottom'> = {
  vc: 'top',
  crypto: 'top',
  collect: 'bottom',
  hedge: 'bottom',
  pe: 'bottom',
};

interface Props {
  gameId: GameId;
  onExit: () => void;
  onPlayGame: (id: GameId) => void;
  onSlip: () => void;
}

interface Run {
  id: number;
  pause: PauseController;
  hud: ReturnType<typeof createStore<HudState>>;
  seed: number;
  finished: boolean;
}

let calloutSeq = 0;

export function GameShell({ gameId, onExit, onPlayGame, onSlip }: Props) {
  const meta = GAMES[gameId];
  const Game = COMPONENTS[gameId];
  const [phase, setPhase] = useState<Phase>('intro');
  const [runId, setRunId] = useState(0);
  const run = useMemo<Run>(
    () => ({ id: runId, pause: new PauseController(), hud: createStore(initialHud()), seed: newSeed(), finished: false }),
    [runId],
  );

  const [edu, setEdu] = useState<{ content: EduContent; highlight: Highlight | null; resolve: () => void } | null>(null);
  const [choice, setChoice] = useState<{ cfg: ChoiceConfig; resolve: (i: number) => void } | null>(null);
  const [banner, setBanner] = useState<{ text: string; sub?: string; id: number } | null>(null);
  const [callouts, setCallouts] = useState<{ id: number; text: string; tone: CalloutTone }[]>([]);
  const [menu, setMenu] = useState<null | 'pause' | 'quit'>(null);
  const [result, setResult] = useState<(GameResult & RecordOutcome) | null>(null);

  const controller = useMemo<GameController>(
    () => ({
      pause: run.pause,
      seed: run.seed,
      accent: meta.accent,
      setScore: (score) => run.hud.set((h) => (h.score === score ? h : { ...h, score: Math.max(0, Math.round(score)) })),
      setScoreLabel: (label) => run.hud.set((h) => (h.scoreLabel === label ? h : { ...h, scoreLabel: label })),
      setProgress: (p) =>
        run.hud.set((h) =>
          h.progress &&
          h.progress.label === p.label &&
          Math.abs(h.progress.value - p.value) < 0.005 &&
          h.progress.step === p.step &&
          h.progress.steps === p.steps
            ? h
            : { ...h, progress: p },
        ),
      setTimer: (s, mode = 'down') => {
        const v = s === null ? null : Math.max(0, Math.ceil(s - 1e-6));
        run.hud.set((h) => (h.timer === v && h.timerMode === mode ? h : { ...h, timer: v, timerMode: mode }));
      },
      educate: (id, highlight) =>
        new Promise<void>((resolve) => {
          if (run.finished) return resolve();
          run.pause.add('edu');
          setBanner(null);
          setEdu({ content: EDU[id], highlight: highlight ?? null, resolve });
        }),
      choose: (cfg) =>
        new Promise<number>((resolve) => {
          if (run.finished) return resolve(0);
          run.pause.add('choice');
          setBanner(null);
          setChoice({ cfg, resolve });
        }),
      banner: (text, sub) => setBanner({ text, sub, id: ++calloutSeq }),
      callout: (text, tone = 'info') => {
        const id = ++calloutSeq;
        setCallouts((c) => [...c.slice(-1), { id, text, tone }]);
        window.setTimeout(() => setCallouts((c) => c.filter((x) => x.id !== id)), 3800);
      },
      finish: (r) => {
        if (run.finished) return;
        run.finished = true;
        const score = Math.max(0, Math.min(500, Math.round(Number.isFinite(r.score) ? r.score : 0)));
        const rec = recordScore(gameId, score);
        run.pause.clear();
        setEdu(null);
        setChoice(null);
        setMenu(null);
        setResult({ ...r, ...rec, score });
        setPhase('results');
        sfx.play(r.outcome === 'complete' ? 'finish' : 'gameover');
      },
    }),
    [run, meta.accent, gameId],
  );

  // Banner auto-hide.
  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner((b) => (b?.id === banner.id ? null : b)), 2200);
    return () => window.clearTimeout(t);
  }, [banner]);

  const startRun = useCallback(
    (fresh: boolean) => {
      sfx.play('start');
      if (fresh) setRunId((n) => n + 1);
      setResult(null);
      setEdu(null);
      setChoice(null);
      setMenu(null);
      setCallouts([]);
      setPhase('playing');
      setBanner({ text: 'GAME START', sub: meta.title, id: ++calloutSeq });
    },
    [meta.title],
  );

  // Hold the freshly mounted game for a beat while "GAME START" shows.
  useEffect(() => {
    if (phase !== 'playing') return;
    run.pause.add('countdown');
    const t = window.setTimeout(() => run.pause.remove('countdown'), 1150);
    return () => window.clearTimeout(t);
  }, [phase, run]);

  const openPause = useCallback(() => {
    if (phase !== 'playing' || run.finished) return;
    if (edu || choice || menu) return;
    run.pause.add('user');
    setMenu('pause');
  }, [phase, run, edu, choice, menu]);

  const resume = useCallback(() => {
    setMenu(null);
    run.pause.remove('user');
    run.pause.remove('confirm');
  }, [run]);

  // Auto-pause when the page/tab loses focus.
  useEffect(() => {
    if (phase !== 'playing') return;
    const onVis = () => {
      if (document.hidden) openPause();
    };
    const onBlur = () => openPause();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
    };
  }, [phase, openPause]);

  // Esc / P opens the pause menu; Enter starts from the intro.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (phase === 'intro' && e.key === 'Enter' && !(t instanceof HTMLButtonElement)) {
        e.preventDefault();
        startRun(false);
        return;
      }
      if (phase === 'playing' && (e.key === 'Escape' || e.code === 'KeyP') && !menu && !edu && !choice) {
        e.preventDefault();
        openPause();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, menu, edu, choice, openPause, startRun]);

  const requestBack = () => {
    if (phase === 'playing' && !run.finished) {
      run.pause.add('confirm');
      setMenu('quit');
    } else {
      onExit();
    }
  };

  const closeEdu = () => {
    const e = edu;
    setEdu(null);
    run.pause.remove('edu');
    e?.resolve();
  };

  const closeChoice = (i: number) => {
    const c = choice;
    setChoice(null);
    run.pause.remove('choice');
    c?.resolve(i);
  };

  const session = sessionStore.get();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper-2">
      <ScoreHUD
        meta={meta}
        hud={run.hud}
        playing={phase === 'playing'}
        onBack={requestBack}
        onPause={openPause}
      />

      <main className="no-select relative min-h-0 flex-1 overflow-hidden">
        {phase === 'intro' && <IntroScreen gameId={gameId} onStart={() => startRun(false)} onBack={onExit} />}

        {phase === 'playing' && <Game key={run.id} controller={controller} />}

        {phase === 'results' && result && (
          <ResultsScreen
            gameId={gameId}
            result={result}
            onReplay={() => startRun(true)}
            onExit={onExit}
            onPlayGame={onPlayGame}
            onSlip={onSlip}
            best={session.best}
          />
        )}

        {/* Milestone banner ("GAME START", "ROUND 02", "STAGE 3 · BUILD") */}
        <AnimatePresence>
          {banner && phase === 'playing' && (
            <motion.div
              key={banner.id}
              initial={{ y: -80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              className="pointer-events-none absolute left-1/2 top-5 z-30 -translate-x-1/2"
            >
              <div
                className="rounded-xl border-[3px] border-ink px-7 py-3 text-center"
                style={{ background: meta.accent, boxShadow: '0 6px 0 #171717' }}
              >
                <div className="whitespace-nowrap font-pixel text-[1.15rem] leading-tight">{banner.text}</div>
                {banner.sub && (
                  <div className="mt-1.5 whitespace-nowrap text-[0.95rem] font-bold uppercase tracking-wider">{banner.sub}</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layer-2 learning callouts */}
        <div
          className={`pointer-events-none absolute left-1/2 z-30 flex w-[min(46rem,92%)] -translate-x-1/2 flex-col items-center gap-2 ${
            CALLOUT_AT[gameId] === 'top' ? 'top-[6.2rem]' : 'bottom-5'
          }`}
        >
          <AnimatePresence>
            {phase === 'playing' &&
              callouts.map((c) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ y: 30, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 10, opacity: 0 }}
                  className="flex items-center gap-3 rounded-xl border-[3px] border-ink bg-paper px-4 py-2.5 text-[1.05rem] font-semibold shadow-[0_5px_0_#171717]"
                >
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-sm border-2 border-ink"
                    style={{ background: c.tone === 'good' ? '#6DBD81' : c.tone === 'bad' ? '#E0524A' : meta.accent }}
                  />
                  {c.text}
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </main>

      {edu && <EducationOverlay content={edu.content} highlight={edu.highlight} meta={meta} onContinue={closeEdu} />}
      {choice && <ChoiceOverlay cfg={choice.cfg} meta={meta} onDone={closeChoice} />}

      <Modal open={menu === 'pause'} onClose={resume} labelledBy="pause-title">
        <div className="panel-ink w-[min(26rem,90vw)] p-7 text-center" style={{ ['--shadow' as string]: meta.accent }}>
          <h2 id="pause-title" className="font-pixel text-[1.4rem]">
            PAUSED
          </h2>
          <p className="mt-3 text-[1.02rem] text-ink-2">The game is frozen — nothing moves until you resume.</p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              autoFocus
              onClick={() => {
                sfx.play('click');
                resume();
              }}
              className="btn-arcade py-3 font-pixel text-[0.8rem]"
              style={{ ['--btn-bg' as string]: meta.accent }}
            >
              <Play size={18} /> RESUME
            </button>
            <button
              type="button"
              onClick={() => {
                sfx.play('click');
                setMenu(null);
                startRun(true);
              }}
              className="btn-arcade py-3 font-pixel text-[0.7rem]"
            >
              <RotateCcw size={18} /> RESTART
            </button>
            <button
              type="button"
              onClick={() => {
                sfx.play('click');
                setMenu('quit');
                run.pause.add('confirm');
              }}
              className="btn-arcade py-3 font-pixel text-[0.7rem]"
            >
              <House size={18} /> BACK TO ARCADE
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={menu === 'quit'}
        title="LEAVE THIS GAME?"
        message="Your current run will end and its score won't be saved. Your best scores from finished games are kept."
        confirmLabel="LEAVE GAME"
        cancelLabel="KEEP PLAYING"
        accent={meta.accent}
        onConfirm={() => {
          run.finished = true;
          setMenu(null);
          onExit();
        }}
        onCancel={resume}
      />
    </div>
  );
}

/* ───────────────────────── Intro ───────────────────────── */
function IntroScreen({ gameId, onStart, onBack }: { gameId: GameId; onStart: () => void; onBack: () => void }) {
  const meta = GAMES[gameId];
  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="mx-auto grid min-h-full max-w-[96rem] grid-cols-1 items-center gap-10 px-8 py-[clamp(1rem,3vh,2rem)] lg:grid-cols-[1.15fr_1fr] xl:px-14">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
          className="relative"
        >
          <div
            className="overflow-hidden rounded-2xl border-[3px] border-ink"
            style={{ boxShadow: `10px 10px 0 ${meta.accent}`, background: meta.accentSoft }}
          >
            <GamePreview id={gameId} active big className="aspect-[16/10] max-h-[58vh] w-full object-cover" />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-[0.95rem] font-semibold text-ink-2">
            <span className="chip" style={{ background: meta.accentSoft, borderColor: meta.accent }}>
              {meta.category}
            </span>
            <span>{meta.inspiration}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24, delay: 0.05 }}
        >
          <div className="text-[0.95rem] font-bold uppercase tracking-[0.2em]" style={{ color: meta.accentDeep }}>
            Game {meta.number} · {meta.investment}
          </div>
          <h1 className="mt-2 font-pixel text-[clamp(1.45rem,4.2vh,2.1rem)] leading-[1.35]">{meta.title}</h1>

          <section className="mt-[clamp(0.6rem,2.4vh,1.5rem)]">
            <h2 className="font-pixel text-[0.72rem] text-ink-2">WHAT IS {meta.investment.toUpperCase()}?</h2>
            <p className="mt-2 text-[clamp(1.02rem,2.4vh,1.3rem)] font-medium leading-snug">{meta.intro}</p>
          </section>

          <section className="mt-[clamp(0.75rem,2.6vh,1.75rem)] rounded-xl border-2 border-line bg-paper px-5 py-[clamp(0.7rem,2vh,1.25rem)]">
            <h2 className="font-pixel text-[0.72rem] text-ink-2">HOW TO PLAY</h2>
            <ul className="mt-2.5 space-y-[clamp(0.35rem,1.2vh,0.75rem)]">
              {meta.howTo.map((h, i) => (
                <li key={i} className="flex items-start gap-3 text-[clamp(0.95rem,2vh,1.08rem)] leading-snug">
                  <span className="flex shrink-0 gap-1.5 pt-[0.1em]">
                    {h.keys?.length ? (
                      h.keys.map((k) => (
                        <span key={k} className="key-cap text-[clamp(0.95rem,2.2vh,1.15rem)]">
                          {k}
                        </span>
                      ))
                    ) : (
                      <span className="mt-[0.45em] h-2.5 w-2.5 bg-ink" />
                    )}
                  </span>
                  <span>{h.text}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t-2 border-dashed border-line pt-2.5 text-[clamp(0.95rem,2vh,1.02rem)] font-semibold">
              <span style={{ color: meta.accentDeep }}>GOAL · </span>
              {meta.goal}
            </p>
          </section>

          <div className="mt-[clamp(0.75rem,2.6vh,1.75rem)] flex flex-wrap items-center gap-4">
            <button
              type="button"
              autoFocus
              onClick={onStart}
              onMouseEnter={() => sfx.play('hover')}
              className="btn-arcade px-10 py-[clamp(0.7rem,2vh,1rem)] font-pixel text-[1rem]"
              style={{ ['--btn-bg' as string]: meta.accent }}
            >
              <Play size={22} fill="currentColor" /> START GAME
            </button>
            <button type="button" onClick={onBack} className="btn-ghost py-3 text-[1rem]">
              <House size={18} /> Back to arcade
            </button>
          </div>
          <p className="mt-3 text-[0.95rem] font-semibold text-ink-2">
            Up to <b className="text-ink">500 PT</b> · about 3 minutes · press <span className="key-cap">ENTER</span> to start
          </p>
        </motion.div>
      </div>
    </div>
  );
}
