'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Download, Loader2, Sparkles } from 'lucide-react';
import { aggregate, type Aggregate } from '@/lib/aggregate';
import type { AiCanvas, WorkshopPack } from '@/lib/workshop';
import Dashboard from '@/components/workshop/Dashboard';
import UseCases from '@/components/workshop/UseCases';
import Matrix from '@/components/workshop/Matrix';
import Canvas from '@/components/workshop/Canvas';
import Roadmap from '@/components/workshop/Roadmap';
import type { WorkshopUseCase } from '@/lib/workshop';

const TOKEN_KEY = 'ucd_admin_token';
type Tab = 'dashboard' | 'usecases' | 'matrix' | 'canvas' | 'roadmap';

const NEUTRAL = {
  strategicAlignment: 3, frequencyVolume: 3, potentialRoi: 3, userExperience: 3,
  dataAvailability: 3, toleranceForError: 3, complexityOfLogic: 3, integrationEase: 3,
};

export default function WorkshopPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(slug);
  const [pack, setPack] = useState<WorkshopPack | null>(null);
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [focusId, setFocusId] = useState<string | null>(null); // the use case in the spotlight across tabs
  const [generating, setGenerating] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const authHeader = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(
    async (tok: string) => {
      setLoading(true);
      setError(null);
      try {
        const [wRes, cRes] = await Promise.all([
          fetch(`/api/workshop/${slug}`, { headers: { Authorization: `Bearer ${tok}` } }),
          fetch(`/api/catalog/${slug}?format=json`, { headers: { Authorization: `Bearer ${tok}` } }),
        ]);
        if (wRes.status === 401) throw new Error('Invalid admin token');
        if (!wRes.ok) throw new Error('Failed to load workshop');
        const w = await wRes.json();
        setDisplayName(w.survey?.display_name ?? slug);
        setPack(w.pack as WorkshopPack);
        if (cRes.ok) {
          const c = await cRes.json();
          const responses = (c.responses ?? []).map((r: any) => ({ answers: r.answers ?? {}, status: 'submitted' }));
          setAgg(aggregate(responses as any));
        }
        setAuthed(true);
        window.localStorage.setItem(TOKEN_KEY, tok);
      } catch (e: any) {
        setError(e.message);
        setAuthed(false);
      } finally {
        setLoading(false);
      }
    },
    [slug],
  );

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (saved) {
      setToken(saved);
      void load(saved);
    }
  }, [load]);

  // persist the pack (debounced) for facilitator edits
  const persist = useCallback(
    (next: WorkshopPack, immediate = false) => {
      setPack(next);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const doSave = () =>
        fetch(`/api/workshop/${slug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({ pack: next }),
        }).catch(() => {});
      if (immediate) void doSave();
      else saveTimer.current = setTimeout(doSave, 600);
    },
    [slug, authHeader],
  );

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/workshop/${slug}/generate`, { method: 'POST', headers: authHeader() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setPack(data.pack as WorkshopPack);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function assist(id: string, type: 'rescore' | 'canvas' | 'kill', note?: string) {
    const res = await fetch(`/api/workshop/${slug}/assist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ type, useCaseId: id, note }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Assist failed');
      return;
    }
    setPack((p) =>
      p ? { ...p, useCases: p.useCases.map((u) => (u.id === id ? data.useCase : u)) } : p,
    );
  }

  // Live-capture: add a use case from the room (no survey needed).
  function addUseCase(name: string, context: string) {
    if (!pack) return;
    const uc = {
      id: `live-${Date.now()}`,
      name: name.trim() || 'New use case',
      summary: context.trim().slice(0, 140),
      source: 'workshop' as const,
      context: context.trim(),
      scores: { ...NEUTRAL },
      matrix: { value: 0.5, feasibility: 0.5 },
    };
    persist({ ...pack, useCases: [...pack.useCases, uc] }, true);
  }

  // Edit a use case's details (name/context/pattern/systems/hitl) from the Use cases tab.
  function editUseCase(id: string, patch: Partial<WorkshopUseCase>) {
    if (!pack) return;
    persist({ ...pack, useCases: pack.useCases.map((u) => (u.id === id ? { ...u, ...patch } : u)) });
  }

  function deleteUseCase(id: string) {
    if (!pack) return;
    persist({ ...pack, useCases: pack.useCases.filter((u) => u.id !== id) }, true);
    if (focusId === id) setFocusId(null);
  }

  // Rebuild the MVP backlog + RACI over the CURRENT use case list (picks up live additions).
  async function rebuildRoadmap() {
    const res = await fetch(`/api/workshop/${slug}/assist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ type: 'roadmap' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Rebuild failed');
      return;
    }
    setPack(data.pack as WorkshopPack);
  }

  // ---- auth gate ----
  if (!authed) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-cloudera-orange font-bold tracking-widest text-sm">CLOUDERA</div>
          <h1 className="mt-3 text-2xl font-semibold">Workshop cockpit</h1>
          <p className="mt-2 text-sm text-cloudera-slate">Enter the admin token to run the session for {slug}.</p>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(token)}
            placeholder="ADMIN_TOKEN"
            className="mt-4 w-full rounded-standard border border-surface-border px-3 py-2 outline-none focus:border-cloudera-orange"
          />
          <button onClick={() => load(token)} className="mt-3 w-full rounded-standard bg-cloudera-navy px-4 py-2.5 font-medium text-white">
            {loading ? 'Checking…' : 'Enter'}
          </button>
          {error && <p className="mt-3 text-sm text-cloudera-orange">{error}</p>}
        </div>
      </main>
    );
  }

  const hasPack = (pack?.useCases?.length ?? 0) > 0;
  const useCases = pack?.useCases ?? [];
  const ranked = [...useCases].sort(
    (a, b) => b.matrix.value + b.matrix.feasibility - (a.matrix.value + a.matrix.feasibility),
  );
  const focus = useCases.find((u) => u.id === focusId) ?? ranked[0] ?? null;

  // The storyline: the deck's phases, in order, with a "done" signal per phase.
  const order: Tab[] = ['dashboard', 'usecases', 'matrix', 'canvas', 'roadmap'];
  const tabs: { id: Tab; num: number; label: string; phase: string; done: boolean }[] = [
    { id: 'dashboard', num: 1, label: 'Dashboard', phase: 'Why are we here', done: (agg?.respondentCount ?? 0) > 0 },
    { id: 'usecases', num: 2, label: 'Use cases', phase: 'Mine & detail', done: useCases.length > 0 },
    { id: 'matrix', num: 3, label: 'Prioritize', phase: 'Value × feasibility', done: useCases.some((u) => u.rationale) },
    { id: 'canvas', num: 4, label: 'AI Canvas', phase: 'Solution ideation', done: useCases.some((u) => u.canvas) },
    { id: 'roadmap', num: 5, label: 'Roadmap & RACI', phase: 'Roadmap & ownership', done: !!pack?.roadmap },
  ];
  const idx = order.indexOf(tab);
  const nextTab = order[idx + 1];
  const prevTab = order[idx - 1];
  const nextLabel: Record<Tab, string> = {
    dashboard: 'Detail the use cases',
    usecases: 'Prioritize by value × feasibility',
    matrix: 'Take the top pick into the Canvas',
    canvas: 'Build the roadmap',
    roadmap: '',
  };
  function goNext() {
    // Handoff: moving from Prioritize into the Canvas puts the top-ranked use case in focus.
    if (tab === 'matrix' && ranked[0]) setFocusId(ranked[0].id);
    if (nextTab) {
      setTab(nextTab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <main className="min-h-screen">
      <header className="bg-cloudera-navy text-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-cloudera-orange font-bold tracking-widest text-xs">CLOUDERA</div>
              <h1 className="mt-1 text-2xl font-semibold">Discovery Workshop · {displayName}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={generate}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-standard bg-cloudera-orange px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {hasPack ? 'Regenerate pack' : 'Generate pack'}
              </button>
              <button
                onClick={() => downloadLeaveBehind(displayName, pack)}
                disabled={!hasPack}
                className="inline-flex items-center gap-2 rounded-standard bg-white/10 px-3 py-2 text-sm hover:bg-white/20 disabled:opacity-40"
              >
                <Download size={15} /> Export
              </button>
            </div>
          </div>
          <nav className="mt-5 flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                title={t.phase}
                className={`flex items-center gap-2 rounded-t-standard px-4 py-2 text-sm font-medium ${
                  tab === t.id ? 'bg-surface-light text-cloudera-navy' : 'text-white/80 hover:text-white'
                }`}
              >
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${
                    t.done
                      ? 'bg-cloudera-orange text-white'
                      : tab === t.id
                        ? 'bg-cloudera-navy text-white'
                        : 'bg-white/20 text-white'
                  }`}
                >
                  {t.done ? '✓' : t.num}
                </span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {error && (
          <p className="mb-4 rounded-standard bg-orange-50 px-3 py-2 text-sm text-cloudera-orange">
            {error}
            {/LLM/i.test(error) && (
              <>
                {' '}
                <Link href="/admin/settings" className="font-medium underline">
                  Configure LLM →
                </Link>
              </>
            )}
          </p>
        )}

        {generating && (
          <p className="mb-4 inline-flex items-center gap-2 text-cloudera-slate">
            <Loader2 size={16} className="animate-spin" /> Running the multi-agent pass… this can take a minute.
          </p>
        )}

        {/* story-so-far strip — carries the thread from the previous phase */}
        <p className="mb-5 text-sm text-cloudera-slate">
          {tab === 'dashboard' && 'Phase 1 · Why are we here — align on the North Star before mining problems.'}
          {tab === 'usecases' && `Phase 2 · Mine & detail — ${useCases.length} use case${useCases.length === 1 ? '' : 's'}; refine each one's process, pattern, systems, and human-in-the-loop.`}
          {tab === 'matrix' && `Phase 3 · Prioritize — position the ${useCases.length} use case${useCases.length === 1 ? '' : 's'} by value × feasibility.`}
          {tab === 'canvas' && `Phase 4 · Designing ${focus ? `“${focus.name}”` : 'the top pick'} — the use case carried over from Prioritize.`}
          {tab === 'roadmap' && `Phase 5 · ${ranked.length} prioritized${focus ? ` · leading with “${focus.name}”` : ''} — lock the MVP, owners, and the data ask.`}
        </p>

        {tab === 'dashboard' &&
          (agg ? (
            <Dashboard
              agg={agg}
              signals={pack?.signals}
              onEditSignals={(s) => persist({ ...(pack ?? { useCases: [], architecture: null, roadmap: null }), signals: s })}
            />
          ) : (
            <Empty text="No survey data yet — head to Prioritize to capture use cases live." />
          ))}

        {tab === 'usecases' && (
          <UseCases
            useCases={pack?.useCases ?? []}
            focusId={focus?.id ?? null}
            onFocus={setFocusId}
            onEditUseCase={editUseCase}
            onDeleteUseCase={deleteUseCase}
            onAddUseCase={addUseCase}
            onScore={(id) => assist(id, 'rescore')}
          />
        )}

        {tab === 'matrix' && (
          <Matrix
            useCases={pack?.useCases ?? []}
            focusId={focus?.id ?? null}
            onFocus={setFocusId}
            onAddUseCase={addUseCase}
            onCommitMatrix={(id, coords) =>
              persist(
                { ...pack!, useCases: pack!.useCases.map((u) => (u.id === id ? { ...u, matrix: coords } : u)) },
                true,
              )
            }
            onAssist={(id, note) => assist(id, 'rescore', note)}
          />
        )}

        {tab === 'canvas' && (
          <Canvas
            useCases={pack?.useCases ?? []}
            focusId={focus?.id ?? null}
            onFocus={setFocusId}
            onAddUseCase={addUseCase}
            onEditField={(id, field: keyof AiCanvas, value) =>
              persist({
                ...pack!,
                useCases: pack!.useCases.map((u) =>
                  u.id === id ? { ...u, canvas: { ...(u.canvas as AiCanvas), [field]: value } } : u,
                ),
              })
            }
            onAssist={(id, type) => assist(id, type)}
          />
        )}

        {tab === 'roadmap' &&
          (hasPack ? (
            <Roadmap pack={pack!} focusId={focus?.id ?? null} onEdit={(next) => persist(next)} onRebuild={rebuildRoadmap} />
          ) : (
            <NeedPack />
          ))}

        {/* storyline footer — Back / Next with a handoff to the next phase */}
        <div className="mt-10 flex items-center justify-between border-t border-surface-border pt-5">
          <button
            onClick={() => prevTab && (setTab(prevTab), window.scrollTo({ top: 0, behavior: 'smooth' }))}
            disabled={!prevTab}
            className="inline-flex items-center gap-1 rounded-standard px-4 py-2 text-sm text-cloudera-navy disabled:opacity-30"
          >
            <ChevronLeft size={16} /> Back
          </button>
          {nextTab ? (
            <button
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-standard bg-cloudera-navy px-5 py-2.5 text-sm font-medium text-white"
            >
              {nextLabel[tab]} <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => downloadLeaveBehind(displayName, pack)}
              disabled={!hasPack}
              className="inline-flex items-center gap-2 rounded-standard bg-cloudera-orange px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              <Download size={16} /> Export the leave-behind
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-cloudera-slate">{text}</p>;
}
function NeedPack() {
  return (
    <div className="rounded-large border border-dashed border-cloudera-slate bg-white p-8 text-center">
      <p className="text-cloudera-slate">No workshop pack yet. Click <b>Generate pack</b> to run the pre-session agent pass over the collected survey data.</p>
    </div>
  );
}

// Build a Markdown leave-behind from the pack and trigger a download.
function downloadLeaveBehind(name: string, pack: WorkshopPack | null) {
  if (!pack) return;
  const L: string[] = [`# Workshop leave-behind — ${name}`, ''];
  const ranked = [...pack.useCases].sort(
    (a, b) => b.matrix.value + b.matrix.feasibility - (a.matrix.value + a.matrix.feasibility),
  );
  L.push('## Prioritized use cases');
  ranked.forEach((u, i) => {
    L.push(`${i + 1}. **${u.name}** — value ${Math.round(u.matrix.value * 100)}%, feasibility ${Math.round(u.matrix.feasibility * 100)}%`);
    if (u.canvas) {
      L.push(`   - Prediction: ${u.canvas.prediction}`);
      L.push(`   - Action: ${u.canvas.action}`);
      L.push(`   - Outcome: ${u.canvas.outcome}`);
    }
    if (u.killIdea) L.push(`   - Risks: ${u.killIdea.replace(/\n+/g, ' ')}`);
  });
  if (pack.architecture) {
    L.push('', '## Draft architecture', pack.architecture.notes);
    pack.architecture.components.forEach((c) => L.push(`- **${c.label}** — ${c.role}`));
  }
  if (pack.roadmap) {
    L.push('', '## MVP backlog');
    pack.roadmap.backlog.forEach((b, i) => L.push(`${i + 1}. ${b.mvp} — _next:_ ${b.nextSteps}`));
    L.push('', '## RACI', '| Task | R | A | C | I |', '| --- | --- | --- | --- | --- |');
    pack.roadmap.raci.forEach((r) => L.push(`| ${r.task} | ${r.responsible} | ${r.accountable} | ${r.consulted} | ${r.informed} |`));
  }
  const blob = new Blob([L.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/\s+/g, '_')}_leave_behind.md`;
  a.click();
  URL.revokeObjectURL(url);
}
