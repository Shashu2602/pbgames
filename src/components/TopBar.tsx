import { ArrowLeft, CircleQuestionMark, Maximize2, Minimize2, Trophy, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { settingsStore, useStore } from '../app/store';
import { sfx } from '../engine/audio';

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
      <rect width="16" height="16" rx="3" fill="#171717" />
      <rect x="4" y="3" width="2" height="9" fill="#fff" />
      <rect x="6" y="3" width="4" height="2" fill="#fff" />
      <rect x="10" y="5" width="2" height="3" fill="#fff" />
      <rect x="6" y="8" width="4" height="2" fill="#fff" />
      <rect x="3" y="13" width="2" height="1" fill="#F29A38" />
      <rect x="5" y="13" width="2" height="1" fill="#F4C542" />
      <rect x="7" y="13" width="2" height="1" fill="#9369D0" />
      <rect x="9" y="13" width="2" height="1" fill="#6DBD81" />
      <rect x="11" y="13" width="2" height="1" fill="#5D91E5" />
    </svg>
  );
}

function useFullscreen() {
  const [fs, setFs] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
  useEffect(() => {
    const on = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggle = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* fullscreen not allowed here — ignore */
    }
  };
  return { fs, toggle, supported: typeof document !== 'undefined' && !!document.documentElement.requestFullscreen };
}

interface Props {
  onHowTo: () => void;
  onLeaderboard: () => void;
  onBack?: () => void;
  backLabel?: string;
}

export function TopBar({ onHowTo, onLeaderboard, onBack, backLabel = 'Back to arcade' }: Props) {
  const settings = useStore(settingsStore);
  const { fs, toggle, supported } = useFullscreen();

  return (
    <header className="no-print sticky top-0 z-30 border-b-2 border-line bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[120rem] items-center justify-between gap-4 px-[clamp(1rem,3vw,4rem)] py-3">
        <div className="flex items-center gap-4">
          {onBack && (
            <button type="button" onClick={onBack} className="btn-ghost text-[0.95rem]" aria-label={backLabel}>
              <ArrowLeft size={20} strokeWidth={2.5} />
              <span className="hidden sm:inline">{backLabel}</span>
            </button>
          )}
          <div className="flex items-center gap-3">
            <Logo />
            <div className="leading-tight">
              <div className="text-[1.4rem] font-bold tracking-tight">
                PRATIBIMB <span className="text-ink-3">/</span> 2026
              </div>
              <div className="text-[0.72rem] font-bold tracking-[0.22em] text-ink-2">THE ALTERNATIVE INVESTMENT ARCADE</div>
            </div>
          </div>
        </div>
        <nav className="flex items-center gap-2" aria-label="Arcade controls">
          <button
            type="button"
            onClick={() => {
              sfx.play('click');
              onHowTo();
            }}
            className="btn-ghost text-[0.92rem]"
          >
            <CircleQuestionMark size={19} strokeWidth={2.5} />
            <span className="hidden md:inline">HOW TO PLAY</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sfx.play('click');
              onLeaderboard();
            }}
            className="btn-ghost text-[0.92rem]"
          >
            <Trophy size={19} strokeWidth={2.5} />
            <span className="hidden md:inline">LEADERBOARD</span>
          </button>
          <button
            type="button"
            aria-pressed={settings.sound}
            onClick={() => {
              settingsStore.set((s) => ({ ...s, sound: !s.sound }));
              if (!settings.sound) window.setTimeout(() => sfx.play('select'), 30);
            }}
            className="btn-ghost text-[0.92rem]"
            aria-label={settings.sound ? 'Turn sound off' : 'Turn sound on'}
          >
            {settings.sound ? <Volume2 size={19} strokeWidth={2.5} /> : <VolumeX size={19} strokeWidth={2.5} />}
            <span className="hidden lg:inline">SOUND {settings.sound ? 'ON' : 'OFF'}</span>
          </button>
          {supported && (
            <button
              type="button"
              aria-pressed={fs}
              onClick={toggle}
              className="btn-ghost text-[0.92rem]"
              aria-label={fs ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {fs ? <Minimize2 size={19} strokeWidth={2.5} /> : <Maximize2 size={19} strokeWidth={2.5} />}
              <span className="hidden lg:inline">FULLSCREEN</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
