'use client';

import { useState } from 'react';
import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import type { WorkshopUseCase } from '@/lib/workshop';
import { QUESTIONNAIRE, optionLabel, Question } from '@/lib/questionnaire';

interface Props {
  useCases: WorkshopUseCase[];
  focusId: string | null;
  onFocus: (id: string) => void;
  onEditUseCase: (id: string, patch: Partial<WorkshopUseCase>) => void;
  onDeleteUseCase: (id: string) => void;
  onAddUseCase: (name: string, context: string) => void;
  onScore: (id: string) => Promise<void>;
}

const UC_SECTION = QUESTIONNAIRE.sections.find((s) => s.id === 'use_cases');
const ucQ = (id: string): Question | undefined => UC_SECTION?.questions.find((q) => q.id === id);

/** Multi-select chip row. */
function MultiChips({ qid, values, onChange }: { qid: string; values: string[]; onChange: (v: string[]) => void }) {
  const q = ucQ(qid);
  const on = (v: string) => values.includes(v);
  return (
    <div className="flex flex-wrap gap-1.5">
      {(q?.options ?? []).map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(on(o.value) ? values.filter((x) => x !== o.value) : [...values, o.value])}
          className={`rounded-pill border px-2.5 py-0.5 text-xs ${
            on(o.value)
              ? 'border-cloudera-orange bg-cloudera-orange text-white'
              : 'border-surface-border bg-white text-cloudera-navy hover:border-cloudera-orange'
          }`}
        >
          {optionLabel(q as Question, o.value)}
        </button>
      ))}
    </div>
  );
}

/** Single-select chip row (click again to clear). */
function SingleChips({ qid, value, onChange }: { qid: string; value?: string; onChange: (v: string | undefined) => void }) {
  const q = ucQ(qid);
  return (
    <div className="flex flex-wrap gap-1.5">
      {(q?.options ?? []).map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(value === o.value ? undefined : o.value)}
          className={`rounded-pill border px-2.5 py-0.5 text-xs ${
            value === o.value
              ? 'border-cloudera-orange bg-cloudera-orange text-white'
              : 'border-surface-border bg-white text-cloudera-navy hover:border-cloudera-orange'
          }`}
        >
          {optionLabel(q as Question, o.value)}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-cloudera-slate">{label}</div>
      {children}
    </div>
  );
}

function AddForm({ onAdd }: { onAdd: (name: string, ctx: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [ctx, setCtx] = useState('');
  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-standard border border-dashed border-cloudera-slate px-3 py-1.5 text-sm text-cloudera-navy hover:border-cloudera-orange hover:text-cloudera-orange"
      >
        <Plus size={15} /> Add use case (live)
      </button>
    );
  return (
    <div className="rounded-large border border-surface-border bg-white p-3 shadow-card">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Use case name (e.g. Agentic AI-guided auto-retraining)"
        className="w-full rounded-standard border border-surface-border px-3 py-2 text-sm outline-none focus:border-cloudera-orange"
      />
      <textarea
        value={ctx}
        onChange={(e) => setCtx(e.target.value)}
        placeholder="Current process end-to-end: the steps, handoffs, data, and who does each step."
        className="mt-2 min-h-[64px] w-full rounded-standard border border-surface-border px-3 py-2 text-sm outline-none focus:border-cloudera-orange"
      />
      <div className="mt-2 flex gap-2">
        <button
          disabled={!name.trim()}
          onClick={() => {
            onAdd(name, ctx);
            setName('');
            setCtx('');
            setOpen(false);
          }}
          className="rounded-standard bg-cloudera-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Add
        </button>
        <button onClick={() => setOpen(false)} className="rounded-standard px-3 py-2 text-sm text-cloudera-slate">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function UseCases({
  useCases,
  focusId,
  onFocus,
  onEditUseCase,
  onDeleteUseCase,
  onAddUseCase,
  onScore,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  async function score(id: string) {
    setBusy(id);
    try {
      await onScore(id);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-cloudera-slate">
        One card per use case — refine the process and tag the solution pattern, systems, and human-in-the-loop.
        These details ground the AI when you score value &amp; feasibility and draft the canvas.
      </p>

      {useCases.length === 0 && (
        <div className="rounded-large border border-dashed border-cloudera-slate bg-white p-6 text-center text-sm text-cloudera-slate">
          No use cases yet — add one live, or <b>Generate pack</b> from survey data.
        </div>
      )}

      {useCases.map((uc) => {
        const isFocus = uc.id === focusId;
        return (
          <div
            key={uc.id}
            onClick={() => onFocus(uc.id)}
            className={`rounded-large border bg-white p-5 shadow-card ${
              isFocus ? 'border-cloudera-orange ring-1 ring-cloudera-orange' : 'border-surface-border'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                value={uc.name}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onEditUseCase(uc.id, { name: e.target.value })}
                className="flex-1 rounded-standard border border-transparent px-2 py-1 text-lg font-semibold text-cloudera-navy outline-none hover:border-surface-border focus:border-cloudera-orange"
              />
              <span className="mt-1.5 rounded-pill bg-surface-light px-2 py-0.5 text-[10px] font-bold uppercase text-cloudera-slate">
                {uc.source === 'survey' ? 'survey' : 'live'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteUseCase(uc.id);
                }}
                title="Delete use case"
                className="mt-1 rounded-standard p-1.5 text-cloudera-slate hover:bg-rose-50 hover:text-cloudera-orange"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="mt-3 grid gap-4 lg:grid-cols-2" onClick={(e) => e.stopPropagation()}>
              <Field label="Current process / details">
                <textarea
                  value={uc.context ?? ''}
                  onChange={(e) => onEditUseCase(uc.id, { context: e.target.value })}
                  placeholder="Steps end-to-end, handoffs, approvals, data, who does what."
                  className="min-h-[120px] w-full rounded-standard border border-surface-border px-3 py-2 text-sm outline-none focus:border-cloudera-orange"
                />
              </Field>

              <div className="space-y-3">
                <Field label="Solution pattern">
                  <MultiChips qid="uc_pattern" values={uc.pattern ?? []} onChange={(v) => onEditUseCase(uc.id, { pattern: v })} />
                </Field>
                <Field label="Systems to touch">
                  <MultiChips qid="uc_systems" values={uc.systems ?? []} onChange={(v) => onEditUseCase(uc.id, { systems: v })} />
                </Field>
                <Field label="Human-in-the-loop">
                  <SingleChips qid="uc_hitl" value={uc.hitl} onChange={(v) => onEditUseCase(uc.id, { hitl: v })} />
                </Field>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-surface-border pt-3" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => score(uc.id)}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-standard bg-cloudera-orange px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {busy === uc.id ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Score value &amp; feasibility
              </button>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-cloudera-slate">
                  Value <b className="text-cloudera-navy">{Math.round(uc.matrix.value * 100)}%</b>
                </span>
                <span className="text-cloudera-slate">
                  Feasibility <b className="text-cloudera-navy">{Math.round(uc.matrix.feasibility * 100)}%</b>
                </span>
              </div>
              {uc.rationale && <p className="text-sm italic text-cloudera-slate">“{uc.rationale}”</p>}
            </div>
          </div>
        );
      })}

      <AddForm onAdd={onAddUseCase} />
    </div>
  );
}
