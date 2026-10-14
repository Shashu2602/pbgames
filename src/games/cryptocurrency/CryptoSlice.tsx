import { useEffect, useMemo, useRef } from 'react';
import { PixelCanvas } from '../../engine/canvas';
import type { GameProps } from '../types';
import { CryptoSliceEngine, VH, VW } from './engine';
import { coinSprite, TOKENS } from './tokens';

export function CryptoSlice({ controller }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new CryptoSliceEngine(canvas, controller);
    engine.start();
    if (import.meta.env.DEV) (window as unknown as { __game?: unknown }).__game = engine;
    return () => engine.destroy();
  }, [controller]);

  const icons = useMemo(
    () => ({
      btc: coinSprite(TOKENS.btc, 30).toDataURL(),
      eth: coinSprite(TOKENS.eth, 30).toDataURL(),
      scam: coinSprite(TOKENS.g1000x, 30).toDataURL(),
      myst: coinSprite(TOKENS.mystery1, 30).toDataURL(),
    }),
    [],
  );

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="relative min-h-0 flex-1 px-6 pb-3 pt-5">
        <PixelCanvas
          width={VW}
          height={VH}
          canvasRef={canvasRef}
          canvasClassName="cursor-crosshair touch-none rounded-xl shadow-[0_0_0_3px_#171717,8px_8px_0_3px_#F4C542]"
        />
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 pb-4 text-[0.98rem] font-semibold">
        <span className="flex items-center gap-2 rounded-xl border-2 border-line bg-paper px-3 py-1.5">
          <img src={icons.btc} alt="" className="pixelated h-8 w-8" />
          <img src={icons.eth} alt="" className="pixelated h-8 w-8" />
          <span>
            <b className="text-good">SLICE</b> established networks
          </span>
        </span>
        <span className="flex items-center gap-2 rounded-xl border-2 border-line bg-paper px-3 py-1.5">
          <img src={icons.scam} alt="" className="pixelated h-8 w-8" />
          <span>
            <b className="text-bad">AVOID</b> promises of guaranteed profit
          </span>
        </span>
        <span className="flex items-center gap-2 rounded-xl border-2 border-line bg-paper px-3 py-1.5">
          <img src={icons.myst} alt="" className="pixelated h-8 w-8" />
          <span>
            <b className="text-ink-2">LET PASS</b> unknown “?” tokens
          </span>
        </span>
        <span className="flex items-center gap-2 text-ink-2">
          <span className="key-cap">HOLD + SWIPE</span> to slice
        </span>
      </div>
    </div>
  );
}
