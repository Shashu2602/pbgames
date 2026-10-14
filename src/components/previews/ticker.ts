/**
 * One shared requestAnimationFrame loop for every animated card preview.
 * Idle previews redraw at ~15 fps; the hovered one at full rate.
 */
type Sub = { draw: (t: number) => void; active: () => boolean; last: number };

const subs = new Set<Sub>();
let raf = 0;

function frame(now: number) {
  const t = now / 1000;
  for (const s of subs) {
    const minGap = s.active() ? 0 : 1 / 15;
    if (t - s.last >= minGap) {
      s.last = t;
      s.draw(t);
    }
  }
  raf = subs.size ? requestAnimationFrame(frame) : 0;
}

export function subscribeTicker(draw: (t: number) => void, active: () => boolean): () => void {
  const sub: Sub = { draw, active, last: -1 };
  subs.add(sub);
  if (!raf) raf = requestAnimationFrame(frame);
  return () => {
    subs.delete(sub);
    if (!subs.size && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}
