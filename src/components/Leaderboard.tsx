import { Crown, Info, Trash } from 'lucide-react';
import { useState } from 'react';
import { clearHall, hallStore, rankedHall, sessionStore, useStore, type HallEntry } from '../app/store';
import { GAME_ORDER, GAMES, MAX_TOTAL, type GameId } from '../data/games';
import { sfx } from '../engine/audio';
import { Modal } from './Modal';
import { TopBar } from './TopBar';

type Tab = 'full' | 'all' | GameId;

interface Props {
  onBack: () => void;
  onHowTo: () => void;
  onLeaderboard: () => void;
}

export function Leaderboard({ onBack, onHowTo, onLeaderboard }: Props) {
  const hall = useStore(hallStore);
  const session = useStore(sessionStore);
  const [tab, setTab] = useState<Tab>('full');
  const [staff, setStaff] = useState(false);

  const perGame = tab !== 'full' && tab !== 'all';
  const rows: HallEntry[] = perGame
    ? hall
        .filter((e) => e.scores[tab as GameId] !== undefined)
        .slice()
        .sort((a, b) => (b.scores[tab as GameId] ?? 0) - (a.scores[tab as GameId] ?? 0) || a.updatedAt - b.updatedAt)
    : rankedHall(hall, tab === 'full');

  const tabs: { id: Tab; label: string; color?: string }[] = [
    { id: 'full', label: 'FULL CHALLENGE (5/5)' },
    { id: 'all', label: 'ALL PLAYERS' },
    ...GAME_ORDER.map((id) => ({ id, label: GAMES[id].title, color: GAMES[id].accent })),
  ];

  return (
    <div className="min-h-dvh">
      <TopBar onHowTo={onHowTo} onLeaderboard={onLeaderboard} onBack={onBack} />
      <main className="mx-auto max-w-[110rem] px-[clamp(1rem,3vw,4rem)] py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-pixel text-[1.7rem] leading-snug">HALL OF FAME</h1>
            <p className="mt-3 flex items-center gap-2 text-[1rem] font-semibold text-ink-2">
              <Info size={18} /> Saved only in this browser on this device — not synced with other computers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStaff(true)}
            className="btn-ghost text-[0.88rem] text-ink-2"
          >
            <Trash size={17} /> Staff: clear board
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Leaderboard views">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-pressed={tab === t.id}
              onClick={() => {
                sfx.play('click');
                setTab(t.id);
              }}
              className="btn-ghost text-[0.85rem]"
            >
              {t.color && <span className="h-3 w-3 rounded-sm border-2 border-ink" style={{ background: t.color }} />}
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'full' && (
          <p className="mt-4 text-[0.98rem] text-ink-2">
            Ranked by total score. Only players who completed all five games appear here — see <b>ALL PLAYERS</b> for incomplete runs.
          </p>
        )}

        <div className="mt-5 overflow-x-auto rounded-2xl border-[3px] border-ink bg-paper">
          <table className="w-full min-w-[56rem] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-line bg-paper-2 text-[0.8rem] uppercase tracking-wider text-ink-2">
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Player</th>
                {perGame ? (
                  <th className="px-4 py-3 text-right">{GAMES[tab as GameId].title}</th>
                ) : (
                  GAME_ORDER.map((id) => (
                    <th key={id} className="px-3 py-3 text-right">
                      <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: GAMES[id].accent }} />
                      {GAMES[id].number}
                    </th>
                  ))
                )}
                {!perGame && <th className="px-4 py-3 text-right">Total</th>}
                {!perGame && <th className="px-4 py-3">Status</th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-[1.1rem] text-ink-2">
                    {tab === 'full' ? 'No complete five-game runs yet. Be the first!' : 'No scores yet.'}
                  </td>
                </tr>
              )}
              {rows.slice(0, 100).map((e, i) => {
                const mine = e.id === session.id;
                return (
                  <tr key={e.id} className={`border-b border-line text-[1.05rem] ${mine ? 'bg-[#FDF6DC]' : ''}`}>
                    <td className="px-4 py-3 font-pixel text-[0.8rem]">
                      {i === 0 ? <Crown size={20} className="inline text-ink" /> : `#${i + 1}`}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {e.nickname}
                      {mine && <span className="ml-2 rounded bg-ink px-1.5 py-0.5 text-[0.7rem] text-paper">YOU</span>}
                    </td>
                    {perGame ? (
                      <td className="tabular px-4 py-3 text-right text-[1.2rem] font-bold">{e.scores[tab as GameId]}</td>
                    ) : (
                      GAME_ORDER.map((id) => (
                        <td key={id} className="tabular px-3 py-3 text-right text-ink-2">
                          {e.scores[id] ?? '—'}
                        </td>
                      ))
                    )}
                    {!perGame && (
                      <td className="tabular px-4 py-3 text-right text-[1.2rem] font-bold">
                        {e.total.toLocaleString('en-IN')}
                        <span className="text-[0.85rem] font-semibold text-ink-3"> / {MAX_TOTAL.toLocaleString('en-IN')}</span>
                      </td>
                    )}
                    {!perGame && (
                      <td className="px-4 py-3">
                        {e.completed === 5 ? (
                          <span className="chip" style={{ background: '#E7F5EA', borderColor: '#6DBD81' }}>
                            COMPLETE
                          </span>
                        ) : (
                          <span className="chip" style={{ background: '#FDF6DC', borderColor: '#F4C542' }}>
                            INCOMPLETE {e.completed}/5
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
      <StaffReset open={staff} onClose={() => setStaff(false)} />
    </div>
  );
}

function StaffReset({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState('');
  const ok = text.trim().toUpperCase() === 'CLEAR';
  return (
    <Modal open={open} onClose={onClose} labelledBy="staff-title">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!ok) return;
          clearHall();
          sfx.play('whoosh');
          setText('');
          onClose();
        }}
        className="panel-ink w-[min(32rem,92vw)] p-7"
        style={{ ['--shadow' as string]: '#E0524A' }}
      >
        <h2 id="staff-title" className="font-pixel text-[1rem]">
          STAFF: CLEAR LEADERBOARD
        </h2>
        <p className="mt-3 text-[1.02rem] text-ink-2">
          This deletes every Hall of Fame entry stored in this browser. It is a convenience control for stall organisers — not a
          security feature. The current player’s session scores are not affected.
        </p>
        <label htmlFor="staff-confirm" className="mt-5 block text-[0.95rem] font-bold">
          Type <span className="font-pixel text-[0.75rem]">CLEAR</span> to confirm
        </label>
        <input
          id="staff-confirm"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mt-2 w-full rounded-xl border-[3px] border-ink px-4 py-3 font-pixel text-[0.9rem] uppercase outline-none"
        />
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setText('');
              onClose();
            }}
            className="btn-arcade px-5 py-3 font-pixel text-[0.65rem]"
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={!ok}
            className="btn-arcade px-5 py-3 font-pixel text-[0.65rem]"
            style={{ ['--btn-bg' as string]: '#E0524A', ['--btn-fg' as string]: '#FFFFFF' }}
          >
            CLEAR BOARD
          </button>
        </div>
      </form>
    </Modal>
  );
}
