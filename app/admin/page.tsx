'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, Download, Loader2, Plus, Presentation, RefreshCw, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface SurveySummary {
  slug: string;
  display_name: string;
  status: string;
  created_at: string;
  response_count: number;
  submitted_count: number;
}

const TOKEN_KEY = 'ucd_admin_token';

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [surveys, setSurveys] = useState<SurveySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
    const saved = window.localStorage.getItem(TOKEN_KEY);
    if (saved) {
      setToken(saved);
      setAuthed(true);
    }
  }, []);

  const load = useCallback(
    async (tok: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/surveys', { headers: { Authorization: `Bearer ${tok}` } });
        if (res.status === 401) throw new Error('Invalid admin token');
        if (!res.ok) throw new Error('Failed to load surveys');
        const { surveys } = await res.json();
        setSurveys(surveys);
        setAuthed(true);
        window.localStorage.setItem(TOKEN_KEY, tok);
        document.cookie = `admin_token=${tok}; path=/; max-age=86400; samesite=lax`;
      } catch (e: any) {
        setError(e.message);
        setAuthed(false);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (authed && token) void load(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function createSurvey() {
    setError(null);
    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slug: newSlug || newName, displayName: newName }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to create');
      setNewName('');
      setNewSlug('');
      await load(token);
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!authed) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-cloudera-orange font-bold tracking-widest text-sm">CLOUDERA</div>
          <h1 className="mt-3 text-2xl font-semibold">Admin sign-in</h1>
          <p className="mt-2 text-sm text-cloudera-slate">Enter the shared admin token.</p>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(token)}
            placeholder="ADMIN_TOKEN"
            className="mt-4 w-full rounded-standard border border-surface-border px-3 py-2 outline-none focus:border-cloudera-orange"
          />
          <button
            onClick={() => load(token)}
            className="mt-3 w-full rounded-standard bg-cloudera-navy px-4 py-2.5 font-medium text-white"
          >
            {loading ? 'Checking…' : 'Sign in'}
          </button>
          {error && <p className="mt-3 text-sm text-cloudera-orange">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="bg-cloudera-navy text-white">
        <div className="mx-auto max-w-4xl px-6 py-8 flex items-center justify-between">
          <div>
            <div className="text-cloudera-orange font-bold tracking-widest text-xs">CLOUDERA</div>
            <h1 className="mt-1 text-xl font-semibold">Discovery Survey — Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-2 rounded-standard bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
            >
              <Settings size={15} /> LLM settings
            </Link>
            <button
              onClick={() => load(token)}
              className="inline-flex items-center gap-2 rounded-standard bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
            >
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* create */}
        <section className="rounded-large border border-surface-border bg-white p-6 shadow-card">
          <h2 className="font-semibold">Create a customer survey</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Customer name (e.g. Marigold)"
              className="rounded-standard border border-surface-border px-3 py-2 outline-none focus:border-cloudera-orange"
            />
            <input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="slug (optional, e.g. marigold)"
              className="rounded-standard border border-surface-border px-3 py-2 outline-none focus:border-cloudera-orange"
            />
            <button
              onClick={createSurvey}
              disabled={!newName.trim()}
              className="inline-flex items-center justify-center gap-1 rounded-standard bg-cloudera-orange px-4 py-2 font-medium text-white disabled:opacity-40"
            >
              <Plus size={18} /> Create
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-cloudera-orange">{error}</p>}
        </section>

        {/* list */}
        <section className="mt-8">
          <h2 className="font-semibold">Customers</h2>
          {loading && (
            <div className="mt-4 flex items-center gap-2 text-cloudera-slate">
              <Loader2 className="animate-spin" size={18} /> Loading…
            </div>
          )}
          {!loading && surveys.length === 0 && (
            <p className="mt-4 text-cloudera-slate">No surveys yet. Create one above.</p>
          )}
          <div className="mt-4 space-y-4">
            {surveys.map((s) => (
              <SurveyCard key={s.slug} survey={s} origin={origin} token={token} onDeleted={() => load(token)} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function SurveyCard({
  survey,
  origin,
  token,
  onDeleted,
}: {
  survey: SurveySummary;
  origin: string;
  token: string;
  onDeleted: () => void;
}) {
  const [copied, setCopied] = useState<'survey' | 'deck' | null>(null);
  const [busy, setBusy] = useState(false);
  const link = `${origin}/s/${survey.slug}`;
  const deckLink = `${origin}/d/${survey.slug}`;

  function copy(which: 'survey' | 'deck') {
    navigator.clipboard.writeText(which === 'deck' ? deckLink : link);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  // Download via authenticated fetch → blob, so the admin token never appears in a URL.
  async function download(format: 'md' | 'json' | 'csv') {
    setBusy(true);
    try {
      const res = await fetch(`/api/catalog/${survey.slug}?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${survey.slug}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete "${survey.display_name}" and ALL its responses? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/surveys/${survey.slug}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) onDeleted();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-large border border-surface-border bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">{survey.display_name}</h3>
          <p className="text-sm text-cloudera-slate">
            {survey.submitted_count} submitted · {survey.response_count} total
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/workshop/${survey.slug}`}
            className="inline-flex items-center gap-1 rounded-standard bg-cloudera-navy px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            <Presentation size={14} /> Workshop
          </Link>
          <button
            onClick={() => copy('survey')}
            className="inline-flex items-center gap-1 rounded-standard border border-surface-border px-3 py-1.5 text-sm hover:border-cloudera-orange"
          >
            <Copy size={14} /> {copied === 'survey' ? 'Copied!' : 'Survey link'}
          </button>
          <button
            onClick={() => copy('deck')}
            className="inline-flex items-center gap-1 rounded-standard border border-surface-border px-3 py-1.5 text-sm hover:border-cloudera-orange"
          >
            <Copy size={14} /> {copied === 'deck' ? 'Copied!' : 'Deck link'}
          </button>
          {(['md', 'json', 'csv'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => download(fmt)}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-standard border border-surface-border px-3 py-1.5 text-sm hover:border-cloudera-orange disabled:opacity-40"
            >
              <Download size={14} /> {fmt.toUpperCase()}
            </button>
          ))}
          <button
            onClick={remove}
            disabled={busy}
            title="Delete customer and all responses"
            className="inline-flex items-center gap-1 rounded-standard border border-surface-border px-3 py-1.5 text-sm text-cloudera-orange hover:border-cloudera-orange disabled:opacity-40"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
      <div className="mt-3 space-y-1 rounded-standard bg-surface-light px-3 py-2 text-sm text-cloudera-slate">
        <div><span className="text-cloudera-slate/70">Survey:</span> <code>{link}</code></div>
        <div><span className="text-cloudera-slate/70">Deck:</span> <code>{deckLink}</code></div>
      </div>
    </div>
  );
}
