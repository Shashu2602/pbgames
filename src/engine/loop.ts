/**
 * Fixed-timestep game loop on requestAnimationFrame.
 * - update() runs at a fixed 60 Hz only while not paused (frozen time is not counted)
 * - render() runs every frame, even while paused, so frozen scenes stay visible
 * - large frame gaps (tab switches, breakpoints) are clamped, never "caught up"
 */
export interface LoopHooks {
  update: (dt: number) => void;
  render: (time: number) => void;
  isPaused: () => boolean;
  onResume?: () => void;
}

export class GameLoop {
  readonly step = 1 / 60;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private running = false;
  private wasPaused = false;
  /** Real time since start (for idle animations that should run even when paused). */
  time = 0;

  constructor(private hooks: LoopHooks) {}

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private frame = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.1) dt = 0.1;
    if (dt < 0) dt = 0;
    this.time += dt;

    const paused = this.hooks.isPaused();
    if (paused) {
      this.acc = 0;
      this.wasPaused = true;
    } else {
      if (this.wasPaused) {
        this.wasPaused = false;
        this.hooks.onResume?.();
      }
      this.acc += dt;
      let steps = 0;
      while (this.acc >= this.step && steps < 6) {
        this.hooks.update(this.step);
        this.acc -= this.step;
        steps++;
        // A step may pause the game (education moment): stop advancing immediately.
        if (this.hooks.isPaused()) {
          this.acc = 0;
          this.wasPaused = true;
          break;
        }
      }
      if (steps >= 6) this.acc = 0;
    }
    this.hooks.render(this.time);
  };
}
