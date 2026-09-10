'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useT } from '@/lib/i18n/locale';
import LanguageToggle from '@/components/LanguageToggle';

const TOKEN_KEY = 'ucd_admin_token';

export default function SettingsPage() {
  const t = useT();
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [meta, setMeta] = useState<{ hasKey: boolean; keyLast4: string; source: string }>({
    hasKey: false,
    keyLast4: '',
    source: 'none',
  });
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async (tok: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/llm', { headers: { Authorization: `Bearer ${tok}` } });
      if (res.status === 401) throw new Error('Invalid admin token');
      if (!res.ok) throw new Error('Failed to load settings');
      const d = await res.json();
      setBaseUrl(d.baseUrl ?? '');
      setModel(d.model ?? '');
      setMeta({ hasKey: d.hasKey, keyLast4: d.keyLast4, source: d.source });
      setAuthed(true);
      window.localStorage.setItem(TOKEN_KEY, tok);
    } catch (e: any) {
      setError(e.message);
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (saved) {
      setToken(saved);
      void load(saved);
    }
  }, [load]);

  async function save() {
    setSaved(false);
    setError(null);
    const res = await fetch('/api/settings/llm', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ baseUrl, model, apiKey }), // empty apiKey = keep existing
    });
    if (res.ok) {
      setSaved(true);
      setApiKey('');
      await load(token);
    } else {
      setError('Save failed');
    }
  }

  async function runTest() {
    setTesting(true);
    setTest(null);
    try {
      const res = await fetch('/api/settings/llm/test', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      setTest({ ok: !!d.ok, msg: d.ok ? `OK — "${d.sample}"` : d.error || 'Failed' });
    } catch (e: any) {
      setTest({ ok: false, msg: e.message });
    } finally {
      setTesting(false);
    }
  }

  if (!authed) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between">
            <div className="text-cloudera-orange font-bold tracking-widest text-sm">CLOUDERA</div>
            <LanguageToggle tone="light" />
          </div>
          <h1 className="mt-3 text-2xl font-semibold">{t('settings.signinTitle')}</h1>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(token)}
            placeholder="ADMIN_TOKEN"
            className="mt-4 w-full rounded-standard border border-surface-border px-3 py-2 outline-none focus:border-cloudera-orange"
          />
          <button onClick={() => load(token)} className="mt-3 w-full rounded-standard bg-cloudera-navy px-4 py-2.5 font-medium text-white">
            {loading ? t('admin.signin.checking') : t('admin.signin.button')}
          </button>
          {error && <p className="mt-3 text-sm text-cloudera-orange">{error}</p>}
        </div>
      </main>
    );
  }

  const inputCls = 'mt-1 w-full rounded-standard border border-surface-border px-3 py-2 outline-none focus:border-cloudera-orange';

  return (
    <main className="min-h-screen">
      <header className="bg-cloudera-navy text-white">
        <div className="mx-auto max-w-2xl px-6 py-6 flex items-center justify-between">
          <div>
            <div className="text-cloudera-orange font-bold tracking-widest text-xs">CLOUDERA</div>
            <h1 className="mt-1 text-xl font-semibold">{t('settings.header')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle tone="dark" />
            <Link href="/admin" className="rounded-standard bg-white/10 px-3 py-2 text-sm hover:bg-white/20">{t('settings.backToAdmin')}</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="rounded-large border border-surface-border bg-white p-6 shadow-card">
          <p className="text-sm text-cloudera-slate">
            {t('settings.intro.pre')} <code>LLM_*</code> {t('settings.intro.post')} <b>{meta.source}</b>.
          </p>

          <label className="mt-5 block text-sm font-medium">{t('settings.baseUrl')} <span className="text-cloudera-slate">{t('settings.baseUrl.hint')}</span></label>
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://<endpoint>/v1" className={inputCls} />

          <label className="mt-4 block text-sm font-medium">{t('settings.model')}</label>
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder={t('settings.model.placeholder')} className={inputCls} />

          <label className="mt-4 block text-sm font-medium">
            {t('settings.apiKey')} {meta.hasKey && <span className="text-cloudera-slate">{t('settings.apiKey.stored', { last4: meta.keyLast4 })}</span>}
          </label>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={meta.hasKey ? t('settings.apiKey.placeholderUnchanged') : 'sk-…'} className={inputCls} />

          <div className="mt-6 flex items-center gap-3">
            <button onClick={save} className="rounded-standard bg-cloudera-navy px-5 py-2.5 font-medium text-white">{t('settings.save')}</button>
            <button onClick={runTest} disabled={testing} className="inline-flex items-center gap-2 rounded-standard border border-surface-border px-4 py-2.5 font-medium hover:border-cloudera-orange disabled:opacity-40">
              {testing ? <Loader2 size={16} className="animate-spin" /> : null} {t('settings.test')}
            </button>
            {saved && <span className="text-sm text-green-600">{t('settings.saved')}</span>}
          </div>

          {test && (
            <div className={`mt-4 inline-flex items-center gap-2 rounded-standard px-3 py-2 text-sm ${test.ok ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-cloudera-orange'}`}>
              {test.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {test.msg}
            </div>
          )}
          {error && <p className="mt-4 text-sm text-cloudera-orange">{error}</p>}

          <p className="mt-6 text-xs text-cloudera-slate">{t('settings.note')}</p>
        </div>
      </div>
    </main>
  );
}
