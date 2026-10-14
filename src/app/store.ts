import { useSyncExternalStore } from 'react';
import { GAME_ORDER, MAX_PER_GAME, type GameId } from '../data/games';

/* ───────────── tiny external store ───────────── */
export interface Store<T> {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (fn: () => void) => () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (next) => {
      const value = typeof next === 'function' ? (next as (p: T) => T)(state) : next;
      if (Object.is(value, state)) return;
      state = value;
      listeners.forEach((l) => l());
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/* ───────────── persistence (this browser only) ───────────── */
const KEYS = {
  session: 'pratibimb.session.v1',
  hall: 'pratibimb.hall.v1',
  settings: 'pratibimb.settings.v1',
};

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — scores still work for this visit */
  }
}

const cleanScore = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : Number.NaN;
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(MAX_PER_GAME, Math.round(n)));
};

function cleanScores(raw: unknown): Partial<Record<GameId, number>> {
  const out: Partial<Record<GameId, number>> = {};
  if (raw && typeof raw === 'object') {
    for (const id of GAME_ORDER) {
      const s = cleanScore((raw as Record<string, unknown>)[id]);
      if (s !== undefined) out[id] = s;
    }
  }
  return out;
}

/* ───────────── settings ───────────── */
export interface Settings {
  sound: boolean;
}
const storedSettings = readJSON<Partial<Settings>>(KEYS.settings);
export const settingsStore = createStore<Settings>({ sound: storedSettings?.sound === true });
settingsStore.subscribe(() => writeJSON(KEYS.settings, settingsStore.get()));

/* ───────────── session (one visitor) ───────────── */
export interface Session {
  id: string;
  nickname: string;
  startedAt: number;
  best: Partial<Record<GameId, number>>;
  plays: Partial<Record<GameId, number>>;
}

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function freshSession(nickname = ''): Session {
  return { id: makeId(), nickname, startedAt: Date.now(), best: {}, plays: {} };
}

function loadSession(): Session {
  const raw = readJSON<Partial<Session>>(KEYS.session);
  if (!raw || typeof raw.id !== 'string') return freshSession();
  return {
    id: raw.id,
    nickname: typeof raw.nickname === 'string' ? sanitizeNickname(raw.nickname) : '',
    startedAt: typeof raw.startedAt === 'number' ? raw.startedAt : Date.now(),
    best: cleanScores(raw.best),
    plays: cleanScores(raw.plays),
  };
}

export const sessionStore = createStore<Session>(loadSession());
sessionStore.subscribe(() => writeJSON(KEYS.session, sessionStore.get()));

export function sanitizeNickname(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9 .\-_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12);
}

export function randomNickname(): string {
  return `PLAYER ${Math.floor(100 + Math.random() * 900)}`;
}

export function setNickname(name: string) {
  const nickname = sanitizeNickname(name) || randomNickname();
  sessionStore.set((s) => ({ ...s, nickname }));
  syncHall();
}

/** Switch player: the old session stays in the Hall of Fame; scores start from zero. */
export function startNewPlayer(nickname = '') {
  sessionStore.set(freshSession(sanitizeNickname(nickname)));
}

export const totalOf = (best: Partial<Record<GameId, number>>) =>
  GAME_ORDER.reduce((sum, id) => sum + (best[id] ?? 0), 0);

export const completedOf = (best: Partial<Record<GameId, number>>) =>
  GAME_ORDER.filter((id) => best[id] !== undefined).length;

export interface RecordOutcome {
  score: number;
  best: number;
  previous: number | undefined;
  improved: boolean;
}

/** Records a finished game. Only the best score per game counts toward the total. */
export function recordScore(game: GameId, rawScore: number): RecordOutcome {
  const score = cleanScore(rawScore) ?? 0;
  const s = sessionStore.get();
  const previous = s.best[game];
  const best = previous === undefined ? score : Math.max(previous, score);
  sessionStore.set({
    ...s,
    nickname: s.nickname || randomNickname(),
    best: { ...s.best, [game]: best },
    plays: { ...s.plays, [game]: (s.plays[game] ?? 0) + 1 },
  });
  syncHall();
  return { score, best, previous, improved: previous === undefined || score > previous };
}

/* ───────────── hall of fame (this device only) ───────────── */
export interface HallEntry {
  id: string;
  nickname: string;
  scores: Partial<Record<GameId, number>>;
  total: number;
  completed: number;
  updatedAt: number;
}

function loadHall(): HallEntry[] {
  const raw = readJSON<unknown[]>(KEYS.hall);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object' && typeof (e as HallEntry).id === 'string')
    .map((e) => {
      const scores = cleanScores(e.scores);
      return {
        id: e.id as string,
        nickname: sanitizeNickname(String(e.nickname ?? '')) || 'PLAYER',
        scores,
        total: totalOf(scores),
        completed: completedOf(scores),
        updatedAt: typeof e.updatedAt === 'number' ? e.updatedAt : 0,
      };
    });
}

export const hallStore = createStore<HallEntry[]>(loadHall());
hallStore.subscribe(() => writeJSON(KEYS.hall, hallStore.get()));

function syncHall() {
  const s = sessionStore.get();
  if (completedOf(s.best) === 0) return;
  const entry: HallEntry = {
    id: s.id,
    nickname: s.nickname || 'PLAYER',
    scores: { ...s.best },
    total: totalOf(s.best),
    completed: completedOf(s.best),
    updatedAt: Date.now(),
  };
  hallStore.set((list) => {
    const others = list.filter((e) => e.id !== s.id);
    return [...others, entry].slice(-500);
  });
}

export function clearHall() {
  hallStore.set([]);
}

export function rankedHall(list: HallEntry[], fullOnly: boolean): HallEntry[] {
  return list
    .filter((e) => (fullOnly ? e.completed === GAME_ORDER.length : true))
    .slice()
    .sort((a, b) => b.total - a.total || b.completed - a.completed || a.updatedAt - b.updatedAt);
}

export function shortCode(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
}
