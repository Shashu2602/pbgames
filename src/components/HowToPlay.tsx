import { X } from 'lucide-react';
import { GAME_ORDER, GAMES } from '../data/games';
import { Modal } from './Modal';

export function HowToPlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="howto-title">
      <div className="panel-ink relative max-h-[90dvh] w-[min(72rem,94vw)] overflow-y-auto p-7" style={{ ['--shadow' as string]: '#5D91E5' }}>
        <button type="button" onClick={onClose} className="btn-ghost absolute right-5 top-5" aria-label="Close">
          <X size={20} strokeWidth={2.5} />
        </button>
        <h2 id="howto-title" className="font-pixel text-[1.2rem]">
          HOW TO PLAY
        </h2>
        <div className="mt-4 grid gap-4 text-[1.08rem] md:grid-cols-3">
          <p>
            <b>1. Pick any game.</b> Each one turns an alternative investment into a classic arcade mechanic. Play them in any order.
          </p>
          <p>
            <b>2. Watch for freeze-frames.</b> The game pauses for short learning moments. Nothing moves until you press CONTINUE.
          </p>
          <p>
            <b>3. Score up to 500 per game.</b> 2,500 in total. Replays can improve a game's best score — points never double up.
          </p>
        </div>
        <ul className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {GAME_ORDER.map((id) => {
            const g = GAMES[id];
            return (
              <li key={id} className="rounded-xl border-2 border-line p-4" style={{ background: g.accentSoft }}>
                <div className="text-[0.75rem] font-bold uppercase tracking-[0.14em]" style={{ color: g.accentDeep }}>
                  {g.number} · {g.investment}
                </div>
                <div className="mt-1 font-pixel text-[0.72rem] leading-snug">{g.title}</div>
                <ul className="mt-3 space-y-2 text-[0.95rem] leading-snug">
                  {g.howTo.map((h, i) => (
                    <li key={i}>
                      {h.keys?.map((k) => (
                        <span key={k} className="key-cap mr-1 text-[1rem]">
                          {k}
                        </span>
                      ))}{' '}
                      {h.text}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-[0.98rem] text-ink-2">
          Pause any game with <span className="key-cap">ESC</span> or the pause button. Everything here is an educational simulation:
          points, prices and returns are fictional and are not investment advice.
        </p>
      </div>
    </Modal>
  );
}
