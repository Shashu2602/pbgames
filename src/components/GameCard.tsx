import { motion } from 'motion/react';
import { Check, Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { GAMES, type GameId } from '../data/games';
import { sfx } from '../engine/audio';
import { GamePreview } from './previews/GamePreview';

interface Props {
  id: GameId;
  best?: number;
  index: number;
  onPlay: (id: GameId) => void;
}

export function GameCard({ id, best, index, onPlay }: Props) {
  const g = GAMES[id];
  const [hover, setHover] = useState(false);
  const played = best !== undefined;

  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index, type: 'spring', stiffness: 220, damping: 22 }}
      onMouseEnter={() => {
        setHover(true);
        sfx.play('hover');
      }}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="group relative flex min-w-0 flex-col rounded-2xl bg-paper transition-[transform,box-shadow,border-color] duration-200"
      style={{
        border: `${hover ? 3 : 2}px solid ${hover ? '#171717' : '#DDDDD7'}`,
        margin: hover ? 0 : 1,
        transform: hover ? 'translateY(-8px)' : 'translateY(0)',
        boxShadow: hover ? `8px 10px 0 ${g.accent}` : '0 0 0 transparent',
      }}
    >
      <button
        type="button"
        onClick={() => onPlay(id)}
        aria-label={`Play ${g.title} — ${g.investment}`}
        className="relative block overflow-hidden rounded-t-[0.85rem] border-b-2 border-line text-left"
        style={{ background: g.accentSoft }}
        tabIndex={-1}
      >
        <GamePreview id={id} active={hover} className="aspect-[16/10] max-h-[24vh] w-full object-cover" />
        <span
          className="absolute left-3 top-3 rounded-md border-2 border-ink px-2 py-1 font-pixel text-[0.7rem]"
          style={{ background: g.accent }}
        >
          {g.number}
        </span>
        {played && (
          <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-md border-2 border-ink bg-ink px-2 py-1 font-pixel text-[0.55rem] text-paper">
            <Check size={12} strokeWidth={4} /> BEST {best}
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col px-[clamp(0.8rem,1.1vw,1.25rem)] py-[clamp(0.6rem,1.4vh,1.1rem)]">
        <div className="text-[0.78rem] font-bold uppercase tracking-[0.16em]" style={{ color: g.accentDeep }}>
          {g.investment}
        </div>
        <h2 className="mt-1.5 font-pixel text-[clamp(0.8rem,0.95vw,1.05rem)] leading-snug">{g.title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="chip" style={{ borderColor: g.accent, background: g.accentSoft }}>
            {g.category}
          </span>
          <span className="text-[0.75rem] font-bold tracking-wider text-ink-3">MAX 500 PT</span>
        </div>
        <p className="mt-2.5 flex-1 text-[1rem] font-medium leading-snug text-ink-2">{g.objective}</p>
        <button
          type="button"
          onClick={() => onPlay(id)}
          className="btn-arcade mt-3 w-full py-[clamp(0.55rem,1.3vh,0.8rem)] font-pixel text-[0.78rem]"
          style={{ ['--btn-bg' as string]: hover ? g.accent : '#FFFFFF' }}
        >
          {played ? <RotateCcw size={16} strokeWidth={3} /> : <Play size={16} fill="currentColor" />}
          {played ? 'PLAY AGAIN' : 'PLAY'}
        </button>
      </div>
    </motion.article>
  );
}
