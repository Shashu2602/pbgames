import { motion } from 'motion/react';
import { Pencil, Printer, UserPlus } from 'lucide-react';
import { completedOf, sessionStore, totalOf, useStore } from '../app/store';
import { GAME_ORDER, GAMES, MAX_TOTAL, type GameId } from '../data/games';
import { GameCard } from './GameCard';
import { TopBar } from './TopBar';
import { useAnimatedNumber } from './anim';

interface Props {
  onPlay: (id: GameId) => void;
  onHowTo: () => void;
  onLeaderboard: () => void;
  onSlip: () => void;
  onEditPlayer: () => void;
  onNewPlayer: () => void;
}

export function Dashboard({ onPlay, onHowTo, onLeaderboard, onSlip, onEditPlayer, onNewPlayer }: Props) {
  const session = useStore(sessionStore);

  return (
    <div className="min-h-dvh">
      <TopBar onHowTo={onHowTo} onLeaderboard={onLeaderboard} />
      <main className="mx-auto max-w-[120rem] px-[clamp(1rem,3vw,4rem)] pb-6">
        <section className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5 pt-[clamp(1rem,3.4vh,3rem)]">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className="text-[clamp(2.3rem,min(4.4vw,6.6vh),5.6rem)] font-bold leading-[0.9] tracking-[-0.035em]">
              FIVE INVESTMENTS.
              <br />
              <span className="relative">
                FIVE GAMES.
                <span aria-hidden className="absolute -bottom-2 left-0 flex h-[0.12em] w-full">
                  {GAME_ORDER.map((id) => (
                    <span key={id} className="h-full flex-1" style={{ background: GAMES[id].accent }} />
                  ))}
                </span>
              </span>
            </h1>
            <p className="mt-5 max-w-[48rem] text-[clamp(1.05rem,1.2vw,1.3rem)] font-medium text-ink-2">
              Learn how alternative investments work. Play your way through the market.
            </p>
          </motion.div>

          <PlayerPanel onSlip={onSlip} onEdit={onEditPlayer} onNew={onNewPlayer} best={session.best} nickname={session.nickname} />
        </section>

        <section
          aria-label="Games"
          className="mt-[clamp(1.2rem,3.6vh,3rem)] grid grid-cols-1 gap-[clamp(0.9rem,1.3vw,1.6rem)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
          {GAME_ORDER.map((id, i) => (
            <GameCard key={id} id={id} index={i} best={session.best[id]} onPlay={onPlay} />
          ))}
        </section>

        <section aria-labelledby="how-it-works" className="mt-[clamp(1.2rem,3vh,2.4rem)] flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[1.02rem] font-semibold">
          <h2 id="how-it-works" className="font-pixel text-[0.65rem] text-ink-2">
            HOW IT WORKS
          </h2>
          {['Pick an investment', 'Play its mini-game', 'Earn points and climb the scoreboard'].map((step, i) => (
            <span key={step} className="flex items-center gap-2">
              {i > 0 && <span className="text-ink-3">→</span>}
              <span className="flex h-7 w-7 items-center justify-center rounded-md border-2 border-ink font-pixel text-[0.6rem]">{i + 1}</span>
              {step}
            </span>
          ))}
        </section>

        <footer className="mt-5 text-center text-[0.88rem] text-ink-2">
          An educational simulation. Points and examples are fictional and do not represent investment advice or guaranteed returns.
        </footer>
      </main>
    </div>
  );
}

function PlayerPanel({
  best,
  nickname,
  onSlip,
  onEdit,
  onNew,
}: {
  best: Partial<Record<GameId, number>>;
  nickname: string;
  onSlip: () => void;
  onEdit: () => void;
  onNew: () => void;
}) {
  const total = totalOf(best);
  const done = completedOf(best);
  const shown = useAnimatedNumber(total, 900);

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="w-full max-w-[30rem] rounded-2xl border-[3px] border-ink bg-paper px-5 py-4 shadow-[8px_8px_0_#171717]"
      aria-label="Your session"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[1.5rem] font-bold leading-tight">{nickname || 'NEW PLAYER'}</span>
          <button type="button" onClick={onEdit} className="rounded-md p-1 text-ink-2 hover:bg-paper-2 hover:text-ink" aria-label="Set or change nickname">
            <Pencil size={17} strokeWidth={2.5} />
          </button>
        </div>
        <div className="tabular shrink-0 text-[1.5rem] font-bold leading-tight" aria-label="Session score">
          {Math.round(shown).toLocaleString('en-IN')}
          <span className="text-[1rem] text-ink-3"> / {MAX_TOTAL.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="mt-2.5 flex h-3.5 overflow-hidden rounded-full border-2 border-ink bg-paper-2" aria-label={`${done} of 5 games played`}>
        {GAME_ORDER.map((id, i) => (
          <div key={id} className={`h-full flex-1 ${i > 0 ? 'border-l-2 border-ink' : ''}`} title={`${GAMES[id].title}: ${best[id] ?? '—'}`}>
            <div className="h-full transition-[width] duration-700" style={{ width: `${((best[id] ?? 0) / 500) * 100}%`, background: GAMES[id].accent }} />
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="mr-auto text-[0.95rem] font-semibold text-ink-2">{done} of 5 played</span>
        {nickname && (
          <>
            <button type="button" onClick={onSlip} className="btn-ghost text-[0.88rem]">
              <Printer size={17} /> Score slip
            </button>
            <button type="button" onClick={onNew} className="btn-ghost text-[0.88rem]">
              <UserPlus size={17} /> New player
            </button>
          </>
        )}
      </div>
    </motion.aside>
  );
}
