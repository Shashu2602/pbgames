import type { ReactNode } from 'react';
import type { EduId } from '../data/education';
import type { PauseController } from '../engine/pause';

export interface BreakdownItem {
  label: string;
  value: number;
  max?: number;
  note?: string;
}

export interface GameResult {
  /** Integer 0–500. The shell clamps again before recording. */
  score: number;
  outcome: 'complete' | 'over';
  /** Optional game-specific headline, e.g. "PORTFOLIO SURVIVED!" */
  headline?: string;
  subline?: string;
  breakdown: BreakdownItem[];
  stat: { label: string; value: string };
  extraStats?: { label: string; value: string }[];
}

/** Spotlight position in viewport CSS pixels. */
export interface Highlight {
  x: number;
  y: number;
  r: number;
}

export interface ChoiceOption {
  title: string;
  subtitle?: string;
  lines: string[];
  tag?: string;
  art?: ReactNode;
  tone?: string;
}

export interface ChoiceFeedback {
  tone: 'good' | 'bad' | 'neutral';
  title: string;
  body: string;
  points?: string;
}

export interface ChoiceConfig {
  kicker?: string;
  title: string;
  prompt?: string;
  options: ChoiceOption[];
  /** Shown after the pick, before continuing. */
  feedback?: (index: number) => ChoiceFeedback;
}

export interface ProgressState {
  label: string;
  /** 0..1 */
  value: number;
  steps?: string[];
  step?: number;
}

export type CalloutTone = 'info' | 'good' | 'bad';

export interface GameController {
  pause: PauseController;
  seed: number;
  accent: string;
  setScore(score: number): void;
  setScoreLabel(label: string): void;
  setProgress(p: ProgressState): void;
  setTimer(seconds: number | null, mode?: 'down' | 'up'): void;
  /** Freezes the game, shows a learning moment, resolves on CONTINUE. */
  educate(id: EduId, highlight?: Highlight | null): Promise<void>;
  /** Freezes the game and asks the player to pick one option. */
  choose(cfg: ChoiceConfig): Promise<number>;
  banner(text: string, sub?: string): void;
  callout(text: string, tone?: CalloutTone): void;
  finish(result: GameResult): void;
}

export interface GameProps {
  controller: GameController;
}
