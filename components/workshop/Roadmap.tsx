'use client';

import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { DataAsk, WorkshopPack, WorkshopUseCase } from '@/lib/workshop';

interface Props {
  pack: WorkshopPack;
  focusId?: string | null;
  onEdit: (pack: WorkshopPack) => void; // caller persists
  onRebuild: () => Promise<void>; // re-run synthesize over the current use cases
}

function nameOf(useCases: WorkshopUseCase[], id: string): string {
  return useCases.find((u) => u.id === id)?.name ?? id;
}

export default function Roadmap({ pack, focusId, onEdit, onRebuild }: Props) {
  const roadmap = pack.roadmap;
  const raci = roadmap?.raci ?? [];
  const [rebuilding, setRebuilding] = useState(false);
  // Use cases that never made it into the backlog (e.g. added live after generate).
  const missing = pack.useCases.filter((u) => !roadmap?.backlog?.some((b) => b.useCaseId === u.id));

  function setRaci(i: number, key: 'task' | 'responsible' | 'accountable' | 'consulted' | 'informed', v: string) {
    const next = structuredClone(pack);
    if (!next.roadmap) return;
    (next.roadmap.raci[i] as any)[key] = v;
    onEdit(next);
  }

  const dataAsk = roadmap?.dataAsk;
  function setDataAsk(key: keyof DataAsk, v: string) {
    const next = structuredClone(pack);
    if (!next.roadmap) return;
    next.roadmap.dataAsk = { ask: '', owner: '', due: '', ...next.roadmap.dataAsk, [key]: v };
    onEdit(next);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Backlog */}
      <div className="rounded-large border border-surface-border bg-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Prioritized backlog (MVP)</h3>
          <button
            onClick={async () => {
              setRebuilding(true);
              try {
                await onRebuild();
              } finally {
                setRebuilding(false);
              }
            }}
            disabled={rebuilding}
            title="Re-run the synthesis over the current use cases"
            className="inline-flex items-center gap-1.5 rounded-standard border border-surface-border px-2.5 py-1 text-xs font-medium text-cloudera-navy hover:border-cloudera-orange disabled:opacity-40"
          >
            {rebuilding ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Rebuild backlog
          </button>
        </div>
        {missing.length > 0 && (
          <p className="mt-2 rounded-standard bg-orange-50 px-3 py-2 text-xs text-cloudera-orange">
            {missing.length} use case{missing.length === 1 ? '' : 's'} not in the backlog yet
            ({missing.map((u) => u.name).join(', ')}) — click <b>Rebuild backlog</b>.
          </p>
        )}
        {roadmap?.backlog?.length ? (
          <ol className="mt-3 space-y-3">
            {roadmap.backlog.map((b, i) => (
              <li
                key={i}
                className={`rounded-standard border p-3 ${
                  b.useCaseId === focusId ? 'border-cloudera-orange bg-orange-50' : 'border-surface-border'
                }`}
              >
                <div className="font-medium text-cloudera-navy">
                  {i + 1}. {nameOf(pack.useCases, b.useCaseId)}
                  {b.useCaseId === focusId && (
                    <span className="ml-2 rounded-pill bg-cloudera-orange px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      Lead
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm"><span className="text-cloudera-slate">MVP:</span> {b.mvp}</div>
                <div className="mt-1 text-sm"><span className="text-cloudera-slate">Next:</span> {b.nextSteps}</div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-cloudera-slate">Not generated yet.</p>
        )}

        {/* Reference architecture */}
        {pack.architecture && (
          <div className="mt-6">
            <h3 className="font-semibold">Draft reference architecture</h3>
            <p className="mt-1 text-sm text-cloudera-slate">{pack.architecture.notes}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pack.architecture.components.map((c) => (
                <span
                  key={c.id}
                  title={c.role}
                  className="rounded-standard border border-surface-border bg-surface-light px-2.5 py-1 text-xs font-medium text-cloudera-navy"
                >
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RACI */}
      <div className="rounded-large border border-surface-border bg-white p-5 shadow-card">
        <h3 className="font-semibold">RACI — who owns what next</h3>
        {raci.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-cloudera-slate">
                  <th className="py-1 pr-2 font-medium">Task</th>
                  <th className="py-1 px-1 font-medium">R</th>
                  <th className="py-1 px-1 font-medium">A</th>
                  <th className="py-1 px-1 font-medium">C</th>
                  <th className="py-1 px-1 font-medium">I</th>
                </tr>
              </thead>
              <tbody>
                {raci.map((r, i) => (
                  <tr key={i} className="border-t border-surface-border">
                    <Cell v={r.task} onChange={(v) => setRaci(i, 'task', v)} wide />
                    <Cell v={r.responsible} onChange={(v) => setRaci(i, 'responsible', v)} />
                    <Cell v={r.accountable} onChange={(v) => setRaci(i, 'accountable', v)} />
                    <Cell v={r.consulted} onChange={(v) => setRaci(i, 'consulted', v)} />
                    <Cell v={r.informed} onChange={(v) => setRaci(i, 'informed', v)} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-cloudera-slate">Not generated yet.</p>
        )}
        <p className="mt-3 text-xs text-cloudera-slate">Edit any cell — changes autosave.</p>
      </div>

      {/* Phase 05 · the data ask — the follow-up obligation. The #1 miss in no-survey sessions. */}
      <div className="rounded-large border border-cloudera-orange bg-orange-50 p-5 shadow-card lg:col-span-2">
        <h3 className="font-semibold text-cloudera-navy">Data ask — the follow-up obligation</h3>
        <p className="mt-1 text-xs text-cloudera-slate">
          Close with a concrete request: <i>“to build this, send us X — owner Y — by Z.”</i> This is what converts the room’s energy into a commitment.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <label className="block">
            <span className="text-xs font-medium text-cloudera-slate">What to send</span>
            <input
              value={dataAsk?.ask ?? ''}
              onChange={(e) => setDataAsk('ask', e.target.value)}
              placeholder="e.g. 6 months of Jira tickets with resolution notes; SOPs from Confluence"
              className="mt-1 w-full rounded-standard border border-surface-border bg-white px-3 py-2 text-sm outline-none focus:border-cloudera-orange"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-cloudera-slate">Owner</span>
            <input
              value={dataAsk?.owner ?? ''}
              onChange={(e) => setDataAsk('owner', e.target.value)}
              placeholder="Name / role"
              className="mt-1 w-full rounded-standard border border-surface-border bg-white px-3 py-2 text-sm outline-none focus:border-cloudera-orange sm:w-40"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-cloudera-slate">By when</span>
            <input
              value={dataAsk?.due ?? ''}
              onChange={(e) => setDataAsk('due', e.target.value)}
              placeholder="2 weeks"
              className="mt-1 w-full rounded-standard border border-surface-border bg-white px-3 py-2 text-sm outline-none focus:border-cloudera-orange sm:w-36"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function Cell({ v, onChange, wide }: { v: string; onChange: (v: string) => void; wide?: boolean }) {
  return (
    <td className={`py-1 ${wide ? 'pr-2' : 'px-1'}`}>
      <input
        value={v}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-standard border border-transparent px-1.5 py-1 outline-none hover:border-surface-border focus:border-cloudera-orange ${
          wide ? '' : 'text-center'
        }`}
      />
    </td>
  );
}
