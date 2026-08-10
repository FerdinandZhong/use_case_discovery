'use client';

// Sales-driven "deck" — a full-screen, click-to-answer presentation of the
// deck-flagged questions (see lib/questionnaire deckSections). Same response
// store as the full survey, so answers land in the workshop cockpit unchanged.
// One slide per section; big option cards the sales rep taps while talking.

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { deckSections, type Question } from '@/lib/questionnaire';
import { useResponseDraft } from '@/lib/useResponseDraft';

interface Props {
  slug: string;
  displayName: string;
}

export default function DeckForm({ slug, displayName }: Props) {
  const { answers, setAnswers, save, submit, saveState, submitted, loading, error } =
    useResponseDraft(slug);
  const sections = deckSections();
  // slide 0 = intro, 1..N = sections, N+1 = review/submit
  const total = sections.length + 2;
  const [slide, setSlide] = useState(0);

  const go = useCallback(
    (dir: 1 | -1) => {
      setSlide((s) => Math.min(Math.max(s + dir, 0), total - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      void save(answers);
    },
    [answers, save, total],
  );

  // Arrow-key navigation — but never while the rep is typing in a field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  function setValue(sectionId: string, questionId: string, value: unknown) {
    setAnswers((prev) => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] ?? {}), [questionId]: value },
    }));
  }

  if (loading) {
    return (
      <Shell displayName={displayName}>
        <div className="grid flex-1 place-items-center text-white/70">
          <Loader2 className="animate-spin" />
        </div>
      </Shell>
    );
  }

  if (submitted) {
    return (
      <Shell displayName={displayName}>
        <div className="grid flex-1 place-items-center text-center">
          <div>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-cloudera-orange text-white">
              <Check size={32} />
            </div>
            <h2 className="mt-6 text-3xl font-semibold text-white">Captured — thank you!</h2>
            <p className="mt-3 text-white/70">
              These notes flow straight into the Cloudera discovery workshop.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  // ---- intro slide ----
  if (slide === 0) {
    return (
      <Shell displayName={displayName}>
        <div className="flex flex-1 flex-col justify-center">
          <p className="text-cloudera-orange font-semibold tracking-widest text-sm">AI USE CASE DISCOVERY</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight text-white">
            Let’s map where AI can help {displayName}.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/70">
            A few quick topics — your challenges, your platform and tools, and how ready your data
            is. No forms; we’ll capture it together as we talk.
          </p>
          <button
            onClick={() => go(1)}
            className="mt-10 inline-flex w-fit items-center gap-2 rounded-standard bg-cloudera-orange px-6 py-3 text-lg font-medium text-white hover:opacity-90"
          >
            Start <ArrowRight size={20} />
          </button>
        </div>
        <Footer slide={slide} total={total} onBack={() => go(-1)} onNext={() => go(1)} saveState={saveState} />
      </Shell>
    );
  }

  // ---- review / submit slide ----
  if (slide === sections.length + 1) {
    return (
      <Shell displayName={displayName}>
        <div className="flex-1">
          <h2 className="text-3xl font-semibold text-white">Quick recap</h2>
          <p className="mt-2 text-white/70">Confirm with the customer, then submit.</p>
          <div className="mt-8 space-y-6">
            {sections.map((s) => (
              <div key={s.id} className="rounded-large border border-white/15 bg-white/5 p-5">
                <h3 className="font-semibold text-white">{s.title}</h3>
                <div className="mt-3 space-y-2">
                  {s.questions.map((q) => (
                    <div key={q.id} className="text-sm">
                      <span className="text-white/50">{q.deckLabel ?? q.label}: </span>
                      <span className="text-white">{summarize(q, (answers[s.id] ?? {})[q.id])}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {error && <p className="mt-4 text-cloudera-orange">{error}</p>}
        </div>
        <div className="mt-8 flex items-center justify-between border-t border-white/15 pt-6">
          <button onClick={() => go(-1)} className="inline-flex items-center gap-1 rounded-standard px-4 py-2 text-white/80 hover:text-white">
            <ChevronLeft size={18} /> Back
          </button>
          <button
            onClick={() => void submit()}
            className="inline-flex items-center gap-2 rounded-standard bg-cloudera-orange px-6 py-3 text-lg font-medium text-white hover:opacity-90"
          >
            Submit <Check size={20} />
          </button>
        </div>
      </Shell>
    );
  }

  // ---- a section slide ----
  const section = sections[slide - 1];
  const sa = answers[section.id] ?? {};
  return (
    <Shell displayName={displayName}>
      <div className="flex-1">
        <p className="text-cloudera-orange font-semibold tracking-widest text-xs">
          {section.title.toUpperCase()}
        </p>
        {section.questions.map((q, qi) => (
          <div key={q.id} className={qi === 0 ? 'mt-3' : 'mt-10'}>
            <h2 className="text-3xl font-semibold text-white">{q.deckLabel ?? q.label}</h2>
            {q.help && <p className="mt-2 text-white/60">{q.help}</p>}
            <div className="mt-6">
              <DeckControl question={q} value={sa[q.id]} onChange={(v) => setValue(section.id, q.id, v)} />
            </div>
          </div>
        ))}
        {/* one short optional notes box per slide */}
        <div className="mt-10">
          <label className="text-sm text-white/50">Notes (optional)</label>
          <input
            value={(sa.deck_note as string) ?? ''}
            onChange={(e) => setValue(section.id, 'deck_note', e.target.value)}
            placeholder="Anything the customer said worth keeping…"
            className="mt-2 w-full rounded-standard border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-cloudera-orange"
          />
        </div>
      </div>
      <Footer slide={slide} total={total} onBack={() => go(-1)} onNext={() => go(1)} saveState={saveState} />
    </Shell>
  );
}

// ---------- controls (deck-scale, big tap targets) ----------

function DeckControl({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (question.type === 'text') {
    return (
      <input
        value={(value as string) ?? ''}
        placeholder={question.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-xl rounded-standard border border-white/15 bg-white/5 px-4 py-3 text-lg text-white placeholder:text-white/30 outline-none focus:border-cloudera-orange"
      />
    );
  }

  if (question.type === 'scale') {
    const num = typeof value === 'number' ? value : 0;
    return (
      <div>
        <div className="flex gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={`h-16 w-16 rounded-large text-2xl font-semibold transition ${
                num === n
                  ? 'bg-cloudera-orange text-white'
                  : 'border border-white/20 text-white/80 hover:border-cloudera-orange'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-2 flex max-w-sm justify-between text-xs text-white/50">
          <span>{question.scaleLabels?.min ?? '1'}</span>
          <span>{question.scaleLabels?.max ?? '5'}</span>
        </div>
      </div>
    );
  }

  // single / multi → option cards
  const arr = Array.isArray(value) ? (value as string[]) : [];
  const multi = question.type === 'multi';
  function toggle(v: string) {
    if (multi) onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    else onChange(v);
  }
  const isOn = (v: string) => (multi ? arr.includes(v) : value === v);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {question.options?.map((opt) => (
        <button
          key={opt.value}
          onClick={() => toggle(opt.value)}
          className={`flex items-center gap-3 rounded-large border px-4 py-4 text-left text-lg transition ${
            isOn(opt.value)
              ? 'border-cloudera-orange bg-cloudera-orange/15 text-white'
              : 'border-white/15 bg-white/5 text-white/80 hover:border-white/40'
          }`}
        >
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
              isOn(opt.value) ? 'border-cloudera-orange bg-cloudera-orange text-white' : 'border-white/30'
            }`}
          >
            {isOn(opt.value) && <Check size={15} />}
          </span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------- chrome ----------

function Shell({ displayName, children }: { displayName: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-cloudera-navy">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-8 py-5">
          <div className="text-cloudera-orange font-bold tracking-widest text-xs">CLOUDERA</div>
          <div className="text-sm text-white/60">Discovery · {displayName}</div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-8 py-10">{children}</div>
    </main>
  );
}

function Footer({
  slide,
  total,
  onBack,
  onNext,
  saveState,
}: {
  slide: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  saveState: string;
}) {
  return (
    <div className="mt-10 flex items-center justify-between border-t border-white/15 pt-6">
      <button
        onClick={onBack}
        disabled={slide === 0}
        className="inline-flex items-center gap-1 rounded-standard px-4 py-2 text-white/80 hover:text-white disabled:opacity-30"
      >
        <ChevronLeft size={18} /> Back
      </button>
      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full ${i === slide ? 'bg-cloudera-orange' : 'bg-white/25'}`}
          />
        ))}
      </div>
      <button
        onClick={onNext}
        className="inline-flex items-center gap-1 rounded-standard bg-white/10 px-5 py-2.5 font-medium text-white hover:bg-white/20"
      >
        Next <ChevronRight size={18} />
      </button>
    </div>
  );
}

function summarize(q: Question, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value.map((v) => q.options?.find((o) => o.value === v)?.label ?? String(v)).join(', ');
  }
  if (q.type === 'single') return q.options?.find((o) => o.value === value)?.label ?? String(value);
  if (q.type === 'scale') return `${value} / 5`;
  return String(value);
}
