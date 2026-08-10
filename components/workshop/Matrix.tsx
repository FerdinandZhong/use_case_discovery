'use client';

import { useRef, useState } from 'react';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import type { WorkshopUseCase } from '@/lib/workshop';

interface Coords {
  value: number;
  feasibility: number;
}
interface Props {
  useCases: WorkshopUseCase[];
  focusId: string | null;
  onFocus: (id: string) => void;
  onCommitMatrix: (id: string, coords: Coords) => void;
  onAssist: (id: string, note: string) => Promise<void>;
  onAddUseCase: (name: string, context: string) => void;
}

// Value × Feasibility 2×2. x = feasibility (0 difficult → 1 easy), y = value (0 low → 1 high).
export default function Matrix({ useCases, focusId, onFocus, onCommitMatrix, onAssist, onAddUseCase }: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drag, setDrag] = useState<Coords | null>(null); // live position of the chip being dragged
  const selected = focusId; // the shared focus use case (threaded across tabs)
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCtx, setNewCtx] = useState('');

  function coordsFromEvent(e: React.PointerEvent): Coords | null {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      feasibility: clamp((e.clientX - rect.left) / rect.width),
      value: clamp(1 - (e.clientY - rect.top) / rect.height), // top = high value
    };
  }

  function posOf(uc: WorkshopUseCase): Coords {
    return dragId === uc.id && drag ? drag : uc.matrix;
  }

  const sel = useCases.find((u) => u.id === selected) || null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        {/* live-capture: add a use case in the room */}
        <div className="mb-3">
          {adding ? (
            <div className="rounded-large border border-surface-border bg-white p-3 shadow-card">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Use case name (e.g. Model-pull automation)"
                className="w-full rounded-standard border border-surface-border px-3 py-2 text-sm outline-none focus:border-cloudera-orange"
              />
              <textarea
                value={newCtx}
                onChange={(e) => setNewCtx(e.target.value)}
                placeholder="Notes / context from the room: the problem, current steps, data, who's involved…"
                className="mt-2 min-h-[64px] w-full rounded-standard border border-surface-border px-3 py-2 text-sm outline-none focus:border-cloudera-orange"
              />
              <div className="mt-2 flex gap-2">
                <button
                  disabled={!newName.trim()}
                  onClick={() => {
                    onAddUseCase(newName, newCtx);
                    setNewName('');
                    setNewCtx('');
                    setAdding(false);
                  }}
                  className="rounded-standard bg-cloudera-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  Add
                </button>
                <button onClick={() => setAdding(false)} className="rounded-standard px-3 py-2 text-sm text-cloudera-slate">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 rounded-standard border border-dashed border-cloudera-slate px-3 py-1.5 text-sm text-cloudera-navy hover:border-cloudera-orange hover:text-cloudera-orange"
            >
              <Plus size={15} /> Add use case (live)
            </button>
          )}
        </div>
        <div className="mb-1 text-center text-sm font-semibold text-cloudera-slate">VALUE ↑</div>
        <div
          ref={boardRef}
          onPointerMove={(e) => dragId && setDrag(coordsFromEvent(e))}
          onPointerUp={() => {
            if (dragId && drag) onCommitMatrix(dragId, drag);
            setDragId(null);
            setDrag(null);
          }}
          className="relative aspect-square w-full select-none rounded-large border border-surface-border bg-white shadow-card"
        >
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            <Quadrant className="border-b border-r" title="High value, challenging" tint="bg-amber-50" />
            <Quadrant className="border-b" title="Quick wins" tint="bg-emerald-50" />
            <Quadrant className="border-r" title="Low value & difficult" tint="bg-rose-50" />
            <Quadrant title="Low value, easy" tint="bg-sky-50" />
          </div>

          {useCases.map((uc) => {
            const p = posOf(uc);
            return (
              <button
                key={uc.id}
                onPointerDown={(e) => {
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  setDragId(uc.id);
                  setDrag(uc.matrix);
                  onFocus(uc.id);
                }}
                style={{ left: `${p.feasibility * 100}%`, top: `${(1 - p.value) * 100}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-pill px-3 py-1 text-xs font-medium shadow-card active:cursor-grabbing ${
                  selected === uc.id ? 'bg-cloudera-orange text-white ring-2 ring-cloudera-navy' : 'bg-cloudera-navy text-white'
                }`}
                title={uc.name}
              >
                {uc.name.length > 22 ? uc.name.slice(0, 20) + '…' : uc.name}
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-sm font-semibold text-cloudera-slate">
          <span>← DIFFICULT</span>
          <span>FEASIBILITY</span>
          <span>EASY →</span>
        </div>
      </div>

      <div className="rounded-large border border-surface-border bg-white p-5 shadow-card">
        {sel ? (
          <>
            <h3 className="font-semibold">{sel.name}</h3>
            {sel.rationale && <p className="mt-1 text-sm text-cloudera-slate">{sel.rationale}</p>}
            <dl className="mt-3 space-y-1 text-sm">
              <Row k="Value" v={`${Math.round(sel.matrix.value * 100)}%`} />
              <Row k="Feasibility" v={`${Math.round(sel.matrix.feasibility * 100)}%`} />
            </dl>
            <label className="mt-4 block text-sm font-medium">Re-score with a new input from the room</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. IT confirmed the data is not actually available yet"
              className="mt-2 min-h-[72px] w-full rounded-standard border border-surface-border px-3 py-2 text-sm outline-none focus:border-cloudera-orange"
            />
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onAssist(sel.id, note);
                  setNote('');
                } finally {
                  setBusy(false);
                }
              }}
              className="mt-2 inline-flex items-center gap-2 rounded-standard bg-cloudera-orange px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Re-score
            </button>
          </>
        ) : (
          <p className="text-sm text-cloudera-slate">Select a chip to see its scores and re-score it with live input.</p>
        )}
      </div>
    </div>
  );
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));

function Quadrant({ title, tint, className = '' }: { title: string; tint: string; className?: string }) {
  return (
    <div className={`relative border-surface-border ${tint} ${className}`}>
      <span className="absolute left-2 top-2 text-[11px] font-semibold uppercase tracking-wide text-cloudera-slate">
        {title}
      </span>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-cloudera-slate">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
