import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { Dashboard } from '../components/Dashboard';
import { GameShell } from '../components/GameShell';
import { HowToPlay } from '../components/HowToPlay';
import { Leaderboard } from '../components/Leaderboard';
import { NicknameDialog } from '../components/NicknameDialog';
import { ScoreSlip } from '../components/ScoreSlip';
import type { GameId } from '../data/games';
import { sfx } from '../engine/audio';
import { sessionStore, settingsStore, startNewPlayer, useStore, setNickname } from './store';

export type View =
  | { name: 'home' }
  | { name: 'game'; id: GameId; nonce: number }
  | { name: 'leaderboard' }
  | { name: 'slip' };

let nonce = 0;

export function App() {
  const [view, setView] = useState<View>({ name: 'home' });
  const [howTo, setHowTo] = useState(false);
  const [nick, setNick] = useState<null | { mode: 'first' | 'edit' | 'new'; then?: GameId }>(null);
  const settings = useStore(settingsStore);

  useEffect(() => {
    sfx.setEnabled(settings.sound);
  }, [settings.sound]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as unknown as { __arcade?: unknown }).__arcade = { sessionStore, settingsStore, setView };
    }
  }, []);

  const goHome = useCallback(() => setView({ name: 'home' }), []);
  const openGame = useCallback((id: GameId) => setView({ name: 'game', id, nonce: ++nonce }), []);

  const requestPlay = useCallback(
    (id: GameId) => {
      if (!sessionStore.get().nickname) setNick({ mode: 'first', then: id });
      else openGame(id);
    },
    [openGame],
  );

  return (
    <>
      <AnimatePresence mode="wait">
        {view.name === 'game' ? (
          <motion.div
            key={`game-${view.id}-${view.nonce}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <GameShell
              gameId={view.id}
              onExit={goHome}
              onPlayGame={openGame}
              onSlip={() => setView({ name: 'slip' })}
            />
          </motion.div>
        ) : (
          <motion.div
            key={view.name}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            {view.name === 'home' && (
              <Dashboard
                onPlay={requestPlay}
                onHowTo={() => setHowTo(true)}
                onLeaderboard={() => setView({ name: 'leaderboard' })}
                onSlip={() => setView({ name: 'slip' })}
                onEditPlayer={() => setNick({ mode: 'edit' })}
                onNewPlayer={() => setNick({ mode: 'new' })}
              />
            )}
            {view.name === 'leaderboard' && (
              <Leaderboard onBack={goHome} onHowTo={() => setHowTo(true)} onLeaderboard={() => undefined} />
            )}
            {view.name === 'slip' && (
              <ScoreSlip onBack={goHome} onHowTo={() => setHowTo(true)} onLeaderboard={() => setView({ name: 'leaderboard' })} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <HowToPlay open={howTo} onClose={() => setHowTo(false)} />
      <NicknameDialog
        open={nick !== null}
        mode={nick?.mode ?? 'first'}
        initial={nick?.mode === 'edit' ? sessionStore.get().nickname : ''}
        onCancel={() => setNick(null)}
        onSubmit={(name) => {
          const pending = nick;
          if (pending?.mode === 'new') startNewPlayer(name);
          setNickname(name);
          setNick(null);
          if (pending?.then) openGame(pending.then);
        }}
      />
    </>
  );
}
