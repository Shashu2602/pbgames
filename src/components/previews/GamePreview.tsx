import { useEffect, useRef } from 'react';
import type { GameId } from '../../data/games';
import { ctx2d } from '../../engine/pixel';
import { SCENES, PREVIEW_H, PREVIEW_W } from './scenes';
import { subscribeTicker } from './ticker';

interface Props {
  id: GameId;
  active: boolean;
  big?: boolean;
  className?: string;
}

/** Animated pixel-art scene for a game card / intro screen. */
export function GamePreview({ id, active, big, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = ctx2d(canvas);
    const scene = SCENES[id];
    return subscribeTicker(
      (t) => {
        ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
        scene(ctx, t, activeRef.current || !!big);
      },
      () => activeRef.current || !!big,
    );
  }, [id, big]);

  return (
    <canvas
      ref={ref}
      width={PREVIEW_W}
      height={PREVIEW_H}
      aria-hidden
      className={`pixelated block ${className ?? ''}`}
    />
  );
}
