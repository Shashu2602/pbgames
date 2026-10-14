import { useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react';

/**
 * Fits a low-resolution canvas into its container with nearest-neighbour
 * upscaling. When the available scale is close to a whole number of *device*
 * pixels it snaps to it, so pixel art stays perfectly even.
 */
export function fitScale(cw: number, ch: number, vw: number, vh: number): number {
  const dpr = window.devicePixelRatio || 1;
  let s = Math.min(cw / vw, ch / vh);
  const ds = s * dpr;
  const fds = Math.floor(ds);
  if (fds >= 2 && fds / ds >= 0.9) s = fds / dpr;
  return Math.max(0.1, s);
}

interface PixelCanvasProps {
  width: number;
  height: number;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  className?: string;
  canvasClassName?: string;
  style?: CSSProperties;
  /** Called with the CSS scale whenever the canvas is re-fitted. */
  onScale?: (scale: number) => void;
}

export function PixelCanvas({ width, height, canvasRef, className, canvasClassName, style, onScale }: PixelCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const onScaleRef = useRef(onScale);
  onScaleRef.current = onScale;

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const r = wrap.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const s = fitScale(r.width, r.height, width, height);
      canvas.style.width = `${width * s}px`;
      canvas.style.height = `${height * s}px`;
      onScaleRef.current?.(s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [width, height, canvasRef]);

  return (
    <div ref={wrapRef} className={`flex h-full w-full items-center justify-center ${className ?? ''}`} style={style}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`pixelated block ${canvasClassName ?? ''}`}
      />
    </div>
  );
}

/** Client → virtual canvas coordinates. */
export function toVirtual(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * canvas.width,
    y: ((clientY - r.top) / r.height) * canvas.height,
  };
}

/** Virtual canvas coordinates → fraction of the canvas' client box (for overlays). */
export function virtualToFraction(canvas: HTMLCanvasElement, x: number, y: number) {
  return { fx: x / canvas.width, fy: y / canvas.height };
}
