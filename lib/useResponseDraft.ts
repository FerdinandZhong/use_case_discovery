'use client';

// Shared response lifecycle for both the full survey (/s) and the deck (/d):
// create-or-resume a response token, debounced autosave, and submit.
// Answers are the schemaless `answers[sectionId][questionId]` map; respondent
// name/email/role are lifted from the `profile` section on every save.

import { useCallback, useEffect, useRef, useState } from 'react';

type Answers = Record<string, any>;
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const SAVE_DEBOUNCE_MS = 800;

export function useResponseDraft(slug: string) {
  const [token, setToken] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storageKey = `ucd_token_${slug}`;
  const loadedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- init: resume from localStorage or create a fresh response ----
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const existing = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
        if (existing) {
          const res = await fetch(`/api/responses/${existing}`);
          if (res.ok) {
            const { response } = await res.json();
            if (!cancelled) {
              setToken(existing);
              setAnswers(response.answers ?? {});
              if (response.status === 'submitted') setSubmitted(true);
              setLoading(false);
              loadedRef.current = true;
              return;
            }
          }
          // stale token → fall through to create a fresh one
        }
        const res = await fetch('/api/responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Could not start survey');
        const { token: newTok } = await res.json();
        if (!cancelled) {
          window.localStorage.setItem(storageKey, newTok);
          setToken(newTok);
          setLoading(false);
          loadedRef.current = true;
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message ?? 'Something went wrong');
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // ---- save (used for autosave and submit) ----
  const save = useCallback(
    async (payloadAnswers: Answers, status?: 'submitted') => {
      if (!token) return false;
      setSaveState('saving');
      const profile = payloadAnswers.profile ?? {};
      try {
        const res = await fetch(`/api/responses/${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers: payloadAnswers,
            respondent_name: profile.name ?? '',
            respondent_email: profile.email ?? '',
            role: profile.role ?? '',
            ...(status ? { status } : {}),
          }),
        });
        if (!res.ok) throw new Error('save failed');
        setSaveState('saved');
        return true;
      } catch {
        setSaveState('error');
        return false;
      }
    },
    [token],
  );

  // ---- debounced autosave whenever answers change after initial load ----
  useEffect(() => {
    if (!loadedRef.current || submitted) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(answers), SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [answers, save, submitted]);

  const submit = useCallback(async () => {
    const ok = await save(answers, 'submitted');
    if (ok) setSubmitted(true);
    else setError('We couldn’t submit your response. Please try again.');
    return ok;
  }, [answers, save]);

  return { token, answers, setAnswers, save, submit, saveState, submitted, loading, error };
}
