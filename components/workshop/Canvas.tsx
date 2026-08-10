'use client';

import { useState } from 'react';
import { Loader2, Plus, Skull, Sparkles } from 'lucide-react';
import type { AiCanvas, WorkshopUseCase } from '@/lib/workshop';

interface Props {
  useCases: WorkshopUseCase[];
  focusId: string | null;
  onFocus: (id: string) => void;
  onEditField: (id: string, field: keyof AiCanvas, value: string) => void;
  onAssist: (id: string, type: 'canvas' | 'kill') => Promise<void>;
  onAddUseCase: (name: string, context: string) => void;
}

const FIELDS: { key: keyof AiCanvas; label: string }[] = [
  { key: 'prediction', label: 'Prediction' },
  { key: 'judgment', label: 'Judgment' },
  { key: 'action', label: 'Action' },
  { key: 'outcome', label: 'Outcome' },
  { key: 'training', label: 'Training' },
  { key: 'input', label: 'Input' },
  { key: 'feedback', label: 'Feedback' },
];

export default function Canvas({ useCases, focusId, onFocus, onEditField, onAssist, onAddUseCase }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCtx, setNewCtx] = useState('');
  const uc = useCases.find((u) => u.id === focusId) || useCases[0] || null;

  const addForm = adding ? (
    <div className="mt-3 rounded-large border border-surface-border bg-white p-3 shadow-card">
      <input
        autoFocus
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        placeholder="Use case name"
        className="w-full rounded-standard border border-surface-border px-3 py-2 text-sm outline-none focus:border-cloudera-orange"
      />
      <textarea
        value={newCtx}
        onChange={(e) => setNewCtx(e.target.value)}
        placeholder="Notes / context from the room"
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
      className="mt-2 inline-flex items-center gap-1 rounded-standard border border-dashed border-cloudera-slate px-3 py-1.5 text-sm text-cloudera-navy hover:border-cloudera-orange hover:text-cloudera-orange"
    >
      <Plus size={15} /> Add use case (live)
    </button>
  );

  if (!uc)
    return (
      <div>
        <p className="text-cloudera-slate">No use cases yet — generate the pack from survey data, or add one live.</p>
        {addForm}
      </div>
    );

  async function run(type: 'canvas' | 'kill') {
    if (!uc) return;
    setBusy(type);
    try {
      await onAssist(uc.id, type);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {/* use-case selector */}
      <div className="flex flex-wrap items-center gap-2">
        {useCases.map((u) => (
          <button
            key={u.id}
            onClick={() => onFocus(u.id)}
            className={`rounded-pill px-3 py-1 text-sm ${
              u.id === uc.id ? 'bg-cloudera-navy text-white' : 'border border-surface-border bg-white text-cloudera-navy'
            }`}
          >
            {u.name.length > 30 ? u.name.slice(0, 28) + '…' : u.name}
          </button>
        ))}
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-pill border border-dashed border-cloudera-slate px-3 py-1 text-sm text-cloudera-slate hover:border-cloudera-orange hover:text-cloudera-orange"
          >
            <Plus size={14} /> Add
          </button>
        )}
      </div>
      {adding && addForm}

      <div className="mt-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">The AI Canvas — {uc.name}</h3>
        <button
          onClick={() => run('canvas')}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-standard border border-surface-border px-3 py-1.5 text-sm hover:border-cloudera-orange disabled:opacity-40"
        >
          {busy === 'canvas' ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Re-draft canvas
        </button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="rounded-large border border-surface-border bg-white p-3 shadow-card">
            <div className="text-xs font-semibold uppercase tracking-wide text-cloudera-orange">{label}</div>
            <textarea
              value={uc.canvas?.[key] ?? ''}
              onChange={(e) => onEditField(uc.id, key, e.target.value)}
              placeholder="—"
              className="mt-1 min-h-[96px] w-full resize-y rounded-standard border-none bg-transparent text-sm outline-none"
            />
          </div>
        ))}

        {/* kill-the-idea card */}
        <div className="rounded-large border border-dashed border-cloudera-slate bg-white p-3 shadow-card">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-cloudera-slate">
              <Skull size={13} /> Kill the idea
            </div>
            <button
              onClick={() => run('kill')}
              disabled={busy !== null}
              className="text-xs text-cloudera-orange hover:underline disabled:opacity-40"
            >
              {busy === 'kill' ? 'Running…' : 'Run'}
            </button>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-cloudera-navy">{uc.killIdea ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}
