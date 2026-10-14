import { Check, Copy, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { completedOf, sessionStore, shortCode, totalOf, useStore, type Session } from '../app/store';
import { GAME_ORDER, GAMES, MAX_TOTAL } from '../data/games';
import { sfx } from '../engine/audio';
import { Logo, TopBar } from './TopBar';

interface Props {
  onBack: () => void;
  onHowTo: () => void;
  onLeaderboard: () => void;
}

function slipText(s: Session): string {
  const lines = [
    'PRATIBIMB 2026 — THE INVESTMENT ARCADE',
    `PLAYER: ${s.nickname || 'PLAYER'}`,
    ...GAME_ORDER.map((id) => `${GAMES[id].title}: ${s.best[id] ?? '—'} / 500`),
    `TOTAL: ${totalOf(s.best)} / ${MAX_TOTAL}`,
    `GAMES COMPLETED: ${completedOf(s.best)}/5 · CODE ${shortCode(s.id)}`,
  ];
  return lines.join('\n');
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function ScoreSlip({ onBack, onHowTo, onLeaderboard }: Props) {
  const s = useStore(sessionStore);
  const [copied, setCopied] = useState<null | boolean>(null);
  const when = useMemo(
    () => new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    [],
  );
  const total = totalOf(s.best);
  const done = completedOf(s.best);

  return (
    <div className="min-h-dvh bg-paper-2">
      <TopBar onHowTo={onHowTo} onLeaderboard={onLeaderboard} onBack={onBack} />
      <main className="mx-auto flex max-w-[90rem] flex-wrap items-start justify-center gap-10 px-6 py-8">
        <div className="print-slip w-[min(30rem,92vw)] rounded-2xl border-[3px] border-ink bg-paper p-7 shadow-[10px_10px_0_#171717]">
          <div className="flex items-center gap-3 border-b-2 border-dashed border-ink pb-4">
            <Logo size={40} />
            <div>
              <div className="text-[1.25rem] font-bold leading-tight">PRATIBIMB / 2026</div>
              <div className="text-[0.7rem] font-bold tracking-[0.2em] text-ink-2">THE INVESTMENT ARCADE · SCORE SLIP</div>
            </div>
          </div>
          <div className="mt-5 flex items-baseline justify-between gap-3">
            <span className="font-pixel text-[0.7rem]">PLAYER:</span>
            <span className="flex-1 border-b-2 border-dotted border-ink pb-1 text-right font-pixel text-[1rem]">
              {s.nickname || '__________'}
            </span>
          </div>
          <table className="mt-5 w-full text-[1.05rem]">
            <tbody>
              {GAME_ORDER.map((id) => (
                <tr key={id} className="border-b border-dashed border-line">
                  <td className="py-2.5">
                    <span className="mr-2 inline-block h-3 w-3 rounded-sm border border-ink align-middle" style={{ background: GAMES[id].accent }} />
                    <span className="font-pixel text-[0.68rem]">{GAMES[id].title}:</span>
                  </td>
                  <td className="tabular py-2.5 text-right font-bold">
                    {s.best[id] ?? '____'} <span className="font-semibold text-ink-2">/ 500</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex items-baseline justify-between rounded-xl border-[3px] border-ink px-4 py-3" style={{ background: '#FDF6DC' }}>
            <span className="font-pixel text-[0.85rem]">TOTAL:</span>
            <span className="tabular text-[1.8rem] font-bold">
              {total.toLocaleString('en-IN')} <span className="text-[1rem] text-ink-2">/ {MAX_TOTAL.toLocaleString('en-IN')}</span>
            </span>
          </div>
          <div className="mt-4 flex justify-between text-[0.85rem] font-semibold text-ink-2">
            <span>{done}/5 games completed</span>
            <span>
              CODE <b className="font-pixel text-[0.65rem] text-ink">{shortCode(s.id)}</b>
            </span>
          </div>
          <div className="mt-1 text-[0.85rem] text-ink-2">{when}</div>
          <div className="mt-6 flex items-end gap-3">
            <span className="text-[0.85rem] font-semibold">Staff initials:</span>
            <span className="flex-1 border-b-2 border-dotted border-ink" />
          </div>
          <p className="mt-5 text-[0.75rem] leading-snug text-ink-2">
            Educational simulation. Points are fictional and not investment advice.
          </p>
        </div>

        <div className="no-print flex w-[min(26rem,92vw)] flex-col gap-4">
          <h1 className="font-pixel text-[1.25rem]">SCORE SLIP</h1>
          <p className="text-[1.05rem] text-ink-2">
            Print this slip or copy the score for the stall’s paper leaderboard. Only each game’s best score counts toward the total.
          </p>
          <button
            type="button"
            onClick={() => {
              sfx.play('click');
              window.print();
            }}
            className="btn-arcade py-4 font-pixel text-[0.8rem]"
            style={{ ['--btn-bg' as string]: '#F4C542' }}
          >
            <Printer size={20} /> PRINT SCORE SLIP
          </button>
          <button
            type="button"
            onClick={async () => {
              const ok = await copyText(slipText(s));
              setCopied(ok);
              sfx.play(ok ? 'correct' : 'error');
              window.setTimeout(() => setCopied(null), 2500);
            }}
            className="btn-arcade py-4 font-pixel text-[0.8rem]"
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
            {copied === null ? 'COPY SCORE' : copied ? 'COPIED!' : 'COPY FAILED'}
          </button>
          <pre className="whitespace-pre-wrap rounded-xl border-2 border-line bg-paper p-4 text-[0.85rem] leading-relaxed text-ink-2">
            {slipText(s)}
          </pre>
        </div>
      </main>
    </div>
  );
}
