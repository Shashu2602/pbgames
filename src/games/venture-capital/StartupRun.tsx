import { useEffect, useRef } from 'react';
import { PixelCanvas } from '../../engine/canvas';
import type { GameProps } from '../types';
import { StartupRunEngine, VH, VW } from './engine';

export function StartupRun({ controller }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new StartupRunEngine(canvas, controller);
    engine.start();
    if (import.meta.env.DEV) (window as unknown as { __game?: unknown }).__game = engine;
    return () => engine.destroy();
  }, [controller]);

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="relative min-h-0 flex-1 px-6 pb-3 pt-5">
        <PixelCanvas
          width={VW}
          height={VH}
          canvasRef={canvasRef}
          canvasClassName="rounded-xl shadow-[0_0_0_3px_#171717,8px_8px_0_3px_#F29A38]"
        />
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-6 gap-y-2 pb-4 text-[0.95rem] font-semibold text-ink-2">
        <span className="flex items-center gap-2">
          <span className="key-cap">←</span>
          <span className="key-cap">→</span> move (hold to run)
        </span>
        <span className="flex items-center gap-2">
          <span className="key-cap">SPACE</span> jump — hold for higher
        </span>
        <span className="flex items-center gap-2">Stomp hazards from above · reach the EXIT tower</span>
      </div>
    </div>
  );
}
