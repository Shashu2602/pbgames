/**
 * Keyboard state for real-time games.
 * - prevents browser scrolling for game keys (arrows / space)
 * - ignores keys while the game is paused (overlays own the keyboard then)
 * - never steals keys from text inputs
 */
function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
}

export class Keyboard {
  private down = new Set<string>();
  private pressed = new Set<string>();
  private released = new Set<string>();
  private attached = false;

  constructor(
    private gameKeys: string[],
    private isPaused: () => boolean,
  ) {}

  attach() {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', this.onDown);
    window.addEventListener('keyup', this.onUp);
    window.addEventListener('blur', this.clear);
  }

  detach() {
    this.attached = false;
    window.removeEventListener('keydown', this.onDown);
    window.removeEventListener('keyup', this.onUp);
    window.removeEventListener('blur', this.clear);
    this.clear();
  }

  isDown(...codes: string[]): boolean {
    return codes.some((c) => this.down.has(c));
  }

  /** True once per physical key press (edge-triggered). */
  consume(...codes: string[]): boolean {
    let hit = false;
    for (const c of codes) {
      if (this.pressed.delete(c)) hit = true;
    }
    return hit;
  }

  wasReleased(...codes: string[]): boolean {
    return codes.some((c) => this.released.has(c));
  }

  /** Call at the end of each fixed update. */
  endFrame() {
    this.pressed.clear();
    this.released.clear();
  }

  clear = () => {
    this.down.clear();
    this.pressed.clear();
    this.released.clear();
  };

  private onDown = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target)) return;
    if (this.isPaused()) return;
    if (this.gameKeys.includes(e.code)) {
      e.preventDefault();
      // Make sure a previously clicked HUD button can't be re-triggered by Space/Enter.
      const active = document.activeElement;
      if (active instanceof HTMLButtonElement) active.blur();
    }
    if (!e.repeat) this.pressed.add(e.code);
    this.down.add(e.code);
  };

  private onUp = (e: KeyboardEvent) => {
    if (this.down.delete(e.code)) this.released.add(e.code);
  };
}

export const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
