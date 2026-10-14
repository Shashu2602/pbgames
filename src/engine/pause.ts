/**
 * Central pause state for a running game. Anything can pause the game for its
 * own reason (education overlay, decision cards, pause menu, lost focus,
 * quit-confirmation, start countdown). Gameplay only advances when no reason
 * is active, so overlays can never cause missed inputs or hidden penalties.
 */
export type PauseReason = 'user' | 'edu' | 'choice' | 'confirm' | 'countdown' | 'focus' | 'scene';

export class PauseController {
  private reasons = new Set<PauseReason>();
  private listeners = new Set<() => void>();
  private version = 0;

  get paused(): boolean {
    return this.reasons.size > 0;
  }

  has(reason: PauseReason): boolean {
    return this.reasons.has(reason);
  }

  add(reason: PauseReason): void {
    if (this.reasons.has(reason)) return;
    this.reasons.add(reason);
    this.emit();
  }

  remove(reason: PauseReason): void {
    if (!this.reasons.delete(reason)) return;
    this.emit();
  }

  clear(): void {
    if (this.reasons.size === 0) return;
    this.reasons.clear();
    this.emit();
  }

  /** Snapshot value for useSyncExternalStore. */
  getVersion = (): number => this.version;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private emit() {
    this.version++;
    this.listeners.forEach((l) => l());
  }
}
