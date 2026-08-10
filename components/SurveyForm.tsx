'use client';

import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react';
import type { Questionnaire, Question, Section } from '@/lib/questionnaire';
import { useResponseDraft } from '@/lib/useResponseDraft';

interface Props {
  slug: string;
  displayName: string;
  questionnaire: Questionnaire;
}

export default function SurveyForm({ slug, displayName, questionnaire }: Props) {
  const { token, answers, setAnswers, save, submit, saveState, submitted, loading, error } =
    useResponseDraft(slug);
  const [step, setStep] = useState(0);

  const sections = questionnaire.sections;

  // ---- value setters ----
  function setValue(sectionId: string, questionId: string, value: unknown) {
    setAnswers((prev) => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] ?? {}), [questionId]: value },
    }));
  }

  function getEntries(sectionId: string): Array<Record<string, unknown>> {
    const v = answers[sectionId];
    return Array.isArray(v) ? v : [];
  }

  function setRepeatValue(sectionId: string, index: number, questionId: string, value: unknown) {
    setAnswers((prev) => {
      const list = Array.isArray(prev[sectionId]) ? [...prev[sectionId]] : [];
      list[index] = { ...(list[index] ?? {}), [questionId]: value };
      return { ...prev, [sectionId]: list };
    });
  }

  function addEntry(sectionId: string) {
    setAnswers((prev) => {
      const list = Array.isArray(prev[sectionId]) ? [...prev[sectionId]] : [];
      list.push({});
      return { ...prev, [sectionId]: list };
    });
  }

  function removeEntry(sectionId: string, index: number) {
    setAnswers((prev) => {
      const list = Array.isArray(prev[sectionId]) ? [...prev[sectionId]] : [];
      list.splice(index, 1);
      return { ...prev, [sectionId]: list };
    });
  }

  // ---- navigation / submit ----
  function requiredMissing(section: Section): boolean {
    if (section.repeatable) return false;
    const sa = answers[section.id] ?? {};
    return section.questions.some((q) => {
      if (!q.required) return false;
      const v = sa[q.id];
      return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    });
  }

  async function next() {
    await save(answers);
    setStep((s) => Math.min(s + 1, sections.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---- render states ----
  if (loading) {
    return (
      <Shell displayName={displayName}>
        <div className="grid place-items-center py-24 text-cloudera-slate">
          <Loader2 className="animate-spin" />
          <p className="mt-3">Loading your survey…</p>
        </div>
      </Shell>
    );
  }

  if (error && !token) {
    return (
      <Shell displayName={displayName}>
        <p className="py-16 text-center text-cloudera-orange">{error}</p>
      </Shell>
    );
  }

  if (submitted) {
    return (
      <Shell displayName={displayName}>
        <div className="grid place-items-center py-24 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-cloudera-orange text-white">
            <Check size={28} />
          </div>
          <h2 className="mt-5 text-2xl font-semibold">Thank you!</h2>
          <p className="mt-2 max-w-md text-cloudera-slate">
            Your responses have been recorded. Your Cloudera team will use them to shape the
            discovery workshop. You can close this tab.
          </p>
        </div>
      </Shell>
    );
  }

  const section = sections[step];
  const progress = Math.round(((step + 1) / sections.length) * 100);

  return (
    <Shell displayName={displayName}>
      {/* progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-cloudera-slate">
          <span>
            Step {step + 1} of {sections.length}
          </span>
          <SaveBadge state={saveState} />
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-pill bg-surface-border">
          <div
            className="h-full rounded-pill bg-cloudera-orange transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <h2 className="text-2xl font-semibold">{section.title}</h2>
      {section.subtitle && <p className="mt-1 text-cloudera-slate">{section.subtitle}</p>}

      <div className="mt-8 space-y-8">
        {section.repeatable ? (
          <RepeatableSection
            section={section}
            entries={getEntries(section.id)}
            onChange={(i, qid, v) => setRepeatValue(section.id, i, qid, v)}
            onAdd={() => addEntry(section.id)}
            onRemove={(i) => removeEntry(section.id, i)}
          />
        ) : (
          section.questions.map((q) => (
            <Field
              key={q.id}
              question={q}
              value={(answers[section.id] ?? {})[q.id]}
              onChange={(v) => setValue(section.id, q.id, v)}
            />
          ))
        )}
      </div>

      {/* nav */}
      <div className="mt-10 flex items-center justify-between border-t border-surface-border pt-6">
        <button
          onClick={back}
          disabled={step === 0}
          className="inline-flex items-center gap-1 rounded-standard px-4 py-2 text-cloudera-navy disabled:opacity-30"
        >
          <ChevronLeft size={18} /> Back
        </button>

        {step < sections.length - 1 ? (
          <button
            onClick={next}
            disabled={requiredMissing(section)}
            className="inline-flex items-center gap-1 rounded-standard bg-cloudera-navy px-5 py-2.5 font-medium text-white disabled:opacity-40"
          >
            Next <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={requiredMissing(section)}
            className="inline-flex items-center gap-2 rounded-standard bg-cloudera-orange px-5 py-2.5 font-medium text-white disabled:opacity-40"
          >
            Submit <Check size={18} />
          </button>
        )}
      </div>
      {error && <p className="mt-4 text-sm text-cloudera-orange">{error}</p>}
    </Shell>
  );
}

// ---------- sub-components ----------

function Shell({ displayName, children }: { displayName: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen">
      <header className="bg-cloudera-navy text-white">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <div className="text-cloudera-orange font-bold tracking-widest text-xs">CLOUDERA</div>
          <h1 className="mt-1 text-xl font-semibold">AI Use Case Discovery · {displayName}</h1>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-6 py-10">{children}</div>
    </main>
  );
}

function SaveBadge({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (state === 'saving')
    return (
      <span className="inline-flex items-center gap-1 text-cloudera-slate">
        <Loader2 size={14} className="animate-spin" /> Saving…
      </span>
    );
  if (state === 'saved')
    return (
      <span className="inline-flex items-center gap-1 text-green-600">
        <Check size={14} /> Saved
      </span>
    );
  if (state === 'error') return <span className="text-cloudera-orange">Save failed — retrying</span>;
  return <span />;
}

function Field({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const labelEl = (
    <label className="block font-medium">
      {question.label}
      {question.required && <span className="text-cloudera-orange"> *</span>}
    </label>
  );

  return (
    <div>
      {labelEl}
      {question.help && <p className="mt-1 text-sm text-cloudera-slate">{question.help}</p>}
      <div className="mt-3">
        <Control question={question} value={value} onChange={onChange} />
      </div>
    </div>
  );
}

function Control({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const inputCls =
    'w-full rounded-standard border border-surface-border bg-white px-3 py-2 outline-none focus:border-cloudera-orange';

  switch (question.type) {
    case 'text':
      return (
        <input
          className={inputCls}
          value={(value as string) ?? ''}
          placeholder={question.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'textarea':
      return (
        <textarea
          className={`${inputCls} min-h-[96px]`}
          value={(value as string) ?? ''}
          placeholder={question.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'single':
      return (
        <div className="space-y-2">
          {question.options?.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-3 rounded-standard border border-surface-border bg-white px-3 py-2 hover:border-cloudera-orange"
            >
              <input
                type="radio"
                name={question.id}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                className="accent-cloudera-orange"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      );
    case 'multi': {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-2">
          {question.options?.map((opt) => {
            const checked = arr.includes(opt.value);
            return (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-3 rounded-standard border border-surface-border bg-white px-3 py-2 hover:border-cloudera-orange"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onChange(checked ? arr.filter((v) => v !== opt.value) : [...arr, opt.value])
                  }
                  className="accent-cloudera-orange"
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      );
    }
    case 'scale': {
      const num = typeof value === 'number' ? value : 3;
      return (
        <div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={num}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full"
          />
          <div className="mt-1 flex justify-between text-xs text-cloudera-slate">
            <span>{question.scaleLabels?.min ?? '1'}</span>
            <span className="font-semibold text-cloudera-navy">{num}</span>
            <span>{question.scaleLabels?.max ?? '5'}</span>
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

function RepeatableSection({
  section,
  entries,
  onChange,
  onAdd,
  onRemove,
}: {
  section: Section;
  entries: Array<Record<string, unknown>>;
  onChange: (index: number, questionId: string, value: unknown) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-6">
      {entries.length === 0 && (
        <p className="text-sm text-cloudera-slate">
          No {section.repeatLabel?.toLowerCase() ?? 'items'} added yet. This section is optional —
          add one if you already have a use case in mind.
        </p>
      )}
      {entries.map((entry, i) => (
        <div key={i} className="rounded-large border border-surface-border bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">
              {section.repeatLabel ?? 'Item'} {i + 1}
            </h3>
            <button
              onClick={() => onRemove(i)}
              className="inline-flex items-center gap-1 text-sm text-cloudera-slate hover:text-cloudera-orange"
            >
              <Trash2 size={15} /> Remove
            </button>
          </div>
          <div className="space-y-6">
            {section.questions.map((q) => (
              <Field
                key={q.id}
                question={q}
                value={entry[q.id]}
                onChange={(v) => onChange(i, q.id, v)}
              />
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-1 rounded-standard border border-dashed border-cloudera-slate px-4 py-2 text-cloudera-navy hover:border-cloudera-orange hover:text-cloudera-orange"
      >
        <Plus size={18} /> Add {section.repeatLabel?.toLowerCase() ?? 'item'}
      </button>
    </div>
  );
}
