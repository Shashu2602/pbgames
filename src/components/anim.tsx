import { useEffect, useRef, useState } from 'react';
import { sfx } from '../engine/audio';

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Smoothly tweens toward `target` whenever it changes. */
export function useAnimatedNumber(target: number, duration = 450): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const valueRef = useRef(target);
  valueRef.current = value;

  useEffect(() => {
    fromRef.current = valueRef.current;
    const from = fromRef.current;
    if (from === target) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      setValue(from + (target - from) * easeOut(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

/** Counts from 0 up to `to` once (results screens), with optional ticks. */
export function CountUp({
  to,
  duration = 1400,
  delay = 0,
  tick = false,
  className,
  onDone,
}: {
  to: number;
  duration?: number;
  delay?: number;
  tick?: boolean;
  className?: string;
  onDone?: () => void;
}) {
  const [v, setV] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    let raf = 0;
    let last = -1;
    const start = performance.now() + delay;
    const step = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      const val = Math.round(to * easeOut(t));
      setV(val);
      if (tick && val !== last && Math.floor(val / 10) !== Math.floor(last / 10)) sfx.play('tick');
      last = val;
      if (t < 1) raf = requestAnimationFrame(step);
      else doneRef.current?.();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, delay, tick]);

  return <span className={className}>{v.toLocaleString('en-IN')}</span>;
}

const CONFETTI_COLORS = ['#F29A38', '#F4C542', '#9369D0', '#6DBD81', '#5D91E5', '#171717', '#E0524A'];

/** Full-viewport pixel confetti burst. Re-fires whenever `fire` changes to a new truthy value. */
export function Confetti({ fire, count = 160 }: { fire: number | boolean; count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fire) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = (canvas.width = Math.floor(window.innerWidth / 3));
    const H = (canvas.height = Math.floor(window.innerHeight / 3));
    ctx.imageSmoothingEnabled = false;
    const parts = Array.from({ length: count }, () => ({
      x: W * (0.2 + Math.random() * 0.6),
      y: H * 0.35 + Math.random() * 20,
      vx: (Math.random() - 0.5) * 260,
      vy: -120 - Math.random() * 220,
      s: 2 + Math.floor(Math.random() * 3),
      c: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      w: Math.random() * Math.PI * 2,
      ws: 6 + Math.random() * 10,
    }));
    let raf = 0;
    let last = performance.now();
    const t0 = last;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += 260 * dt;
        p.vx *= Math.exp(-1.2 * dt);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.w += p.ws * dt;
        const fw = Math.max(1, Math.round(p.s * Math.abs(Math.cos(p.w))));
        ctx.fillStyle = p.c;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), fw, p.s);
      }
      if (now - t0 < 3600) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [fire, count]);

  return <canvas ref={ref} aria-hidden className="pixelated pointer-events-none fixed inset-0 z-50 h-full w-full" />;
}
