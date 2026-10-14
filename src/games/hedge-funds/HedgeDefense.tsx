import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, Coins } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { sfx } from '../../engine/audio';
import { PixelCanvas } from '../../engine/canvas';
import type { GameProps } from '../types';
import { HedgeEngine, STRATEGIES, TILE_ORDER, VH, VW, type HedgeUi } from './engine';
import { tileURL, TILE_COLORS, type TileKind } from './sprites';

export function HedgeDefense({ controller }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<HedgeEngine | null>(null);
  const [ui, setUi] = useState<HedgeUi | null>(null);
  const [tool, setTool] = useState<TileKind | null>(null);
  const [drag, setDrag] = useState<{ kind: TileKind; x: number; y: number } | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const toolRef = useRef<TileKind | null>(null);
  toolRef.current = tool;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new HedgeEngine(canvas, controller);
    engineRef.current = engine;
    setUi(engine.ui.get());
    const unsub = engine.ui.subscribe(() => setUi(engine.ui.get()));
    engine.start();
    if (import.meta.env.DEV) (window as unknown as { __game?: unknown }).__game = engine;
    return () => {
      unsub();
      engine.destroy();
      engineRef.current = null;
    };
  }, [controller]);

  useEffect(() => {
    engineRef.current?.setThinking(tool !== null);
  }, [tool]);

  const say = useCallback((text: string) => setToast({ id: Date.now(), text }), []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const tryPlace = useCallback(
    (kind: TileKind, cell: { col: number; lane: number }) => {
      const e = engineRef.current;
      if (!e) return false;
      const err = e.place(kind, cell.col, cell.lane);
      if (err) {
        say(err);
        return false;
      }
      return true;
    },
    [say],
  );

  /* keys 1–4 pick a strategy */
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (controller.pause.paused) return;
      const i = ['1', '2', '3', '4'].indexOf(ev.key);
      if (i < 0) return;
      const k = TILE_ORDER[i];
      setTool((t) => (t === k ? null : k));
      sfx.play('select');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controller]);

  /* drag a card onto the grid (document listeners survive re-renders) — or click it to select */
  const onCardDown = (kind: TileKind, ev: RPointerEvent<HTMLButtonElement>) => {
    if (ev.button !== 0 || controller.pause.paused) return;
    const sx = ev.clientX;
    const sy = ev.clientY;
    let dragging = false;
    const move = (e: PointerEvent) => {
      if (!dragging && Math.hypot(e.clientX - sx, e.clientY - sy) > 6) {
        dragging = true;
        setTool(kind);
      }
      if (dragging) {
        setDrag({ kind, x: e.clientX, y: e.clientY });
        engineRef.current?.setHover(engineRef.current.cellFromClient(e.clientX, e.clientY), kind);
      }
    };
    const up = (e: PointerEvent) => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      if (dragging) {
        const cell = engineRef.current?.cellFromClient(e.clientX, e.clientY);
        if (cell && !controller.pause.paused) tryPlace(kind, cell);
        setDrag(null);
        setTool(null);
        engineRef.current?.setHover(null, null);
      } else {
        setTool((t) => (t === kind ? null : kind));
        sfx.play('select');
      }
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  };

  const onCanvasMove = (e: RPointerEvent<HTMLDivElement>) => {
    const eng = engineRef.current;
    if (!eng || drag) return;
    eng.setHover(toolRef.current ? eng.cellFromClient(e.clientX, e.clientY) : null, toolRef.current);
  };
  const onCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const eng = engineRef.current;
    const t = toolRef.current;
    if (!eng || !t || controller.pause.paused) return;
    const cell = eng.cellFromClient(e.clientX, e.clientY);
    if (!cell) return;
    if (tryPlace(t, cell)) setTool(null);
    eng.setHover(null, null);
  };

  const sp = ui?.sp ?? 200;
  const value = ui?.value ?? 100;
  const tutorial = ui?.phase === 'tutorial';

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* ── toolbar: points · four strategy cards (each shows its trade-off) · portfolio value ── */}
      <div className="relative z-10 flex shrink-0 flex-wrap items-stretch gap-3 px-6 pt-4">
        <div className="flex min-w-[8.5rem] flex-col justify-center rounded-xl border-[3px] border-ink bg-paper px-4 py-2">
          <div className="font-pixel text-[0.55rem] text-ink-2">STRATEGY POINTS</div>
          <div className="flex items-center gap-2">
            <Coins size={22} strokeWidth={2.5} className="text-[#C9A24A]" />
            <span className="tabular text-[1.9rem] font-bold leading-none">{sp}</span>
          </div>
        </div>

        {TILE_ORDER.map((k) => {
          const st = STRATEGIES[k];
          const cd = ui?.cooldown[k] ?? 0;
          const afford = sp >= st.cost;
          const active = tool === k;
          return (
            <div key={k} className="relative">
              <button
                type="button"
                onPointerDown={(e) => onCardDown(k, e)}
                onMouseEnter={() => sfx.play('hover')}
                className="no-select relative flex h-full w-[13.2rem] touch-none items-center gap-2.5 overflow-hidden rounded-xl border-[3px] bg-paper px-2.5 py-2 text-left transition-transform hover:-translate-y-0.5"
                style={{
                  borderColor: active ? '#171717' : TILE_COLORS[k].body,
                  boxShadow: active ? '0 5px 0 #171717' : 'none',
                  opacity: afford ? 1 : 0.5,
                  cursor: 'grab',
                }}
                aria-pressed={active}
                aria-label={`${st.full}, costs ${st.cost} points. Good: ${st.good}. Bad: ${st.bad}.`}
              >
                <img src={tileURL(k)} alt="" draggable={false} className="pixelated h-12 w-12 shrink-0" />
                <span className="min-w-0">
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-[0.98rem] font-bold leading-tight">{st.name}</span>
                    <span className="whitespace-nowrap text-[0.78rem] font-bold text-ink-2">{st.cost} pts</span>
                  </span>
                  <span className="block whitespace-nowrap text-[0.8rem] font-semibold leading-snug text-good">✓ {st.good}</span>
                  <span className="block whitespace-nowrap text-[0.8rem] font-semibold leading-snug text-bad">✗ {st.bad}</span>
                </span>
                {cd > 0 && (
                  <span
                    className="pointer-events-none absolute inset-x-0 bottom-0 bg-[rgba(23,23,23,0.4)]"
                    style={{ height: `${cd * 100}%` }}
                  />
                )}
              </button>
              {tutorial && k === 'long' && (
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 0.9 }}
                  className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 flex -translate-x-1/2 flex-col items-center"
                >
                  <ArrowDown size={30} strokeWidth={3.5} className="text-good" />
                  <span className="whitespace-nowrap rounded-lg border-[3px] border-ink bg-hedge px-2 py-1 font-pixel text-[0.6rem]">
                    DRAG ME ONTO THE GRID
                  </span>
                </motion.div>
              )}
            </div>
          );
        })}

        <div className="ml-auto flex min-w-[13rem] flex-col justify-center rounded-xl border-[3px] border-ink bg-paper px-4 py-2">
          <div className="flex items-baseline justify-between">
            <span className="font-pixel text-[0.55rem] text-ink-2">PORTFOLIO VALUE</span>
            <span className={`tabular text-[1.9rem] font-bold leading-none ${value <= 45 ? 'text-bad' : ''}`}>{value}</span>
          </div>
          <div className="relative mt-1.5 h-4 overflow-hidden rounded-full border-2 border-ink bg-paper-2">
            <div className="absolute inset-y-0 left-0 bg-[#FCEBE9]" style={{ width: `${(30 / 180) * 100}%` }} />
            <div
              className="absolute inset-y-0 left-0 transition-[width] duration-300"
              style={{ width: `${(value / 180) * 100}%`, background: value <= 45 ? '#E0524A' : '#6DBD81' }}
            />
          </div>
          <div className="mt-0.5 text-[0.75rem] font-semibold text-ink-2">Keep it above 30</div>
        </div>
      </div>

      {/* ── field ── */}
      <div
        className="relative min-h-0 flex-1 px-6 pb-2 pt-4"
        onPointerMove={onCanvasMove}
        onPointerLeave={() => engineRef.current?.setHover(null, null)}
        onClick={onCanvasClick}
        onContextMenu={(e) => {
          e.preventDefault();
          setTool(null);
        }}
        style={{ cursor: tool ? 'copy' : 'default' }}
      >
        <PixelCanvas
          width={VW}
          height={VH}
          canvasRef={canvasRef}
          canvasClassName="touch-none rounded-xl shadow-[0_0_0_3px_#171717,8px_8px_0_3px_#6DBD81]"
        />
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-lg border-[3px] border-ink bg-[#FCEBE9] px-4 py-2 text-[1rem] font-semibold"
            >
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="shrink-0 pb-3 text-center text-[0.95rem] font-semibold text-ink-2">
        Market events move right → left. Drop the matching tile in their lane — a blinking ghost tile shows a good choice.
      </p>

      {drag && (
        <img
          src={tileURL(drag.kind)}
          alt=""
          className="pixelated pointer-events-none fixed z-50 h-16 w-16 -translate-x-1/2 -translate-y-1/2 opacity-80"
          style={{ left: drag.x, top: drag.y }}
        />
      )}
    </div>
  );
}
