// Thin server-side LLM client over an OpenAI-compatible /v1/chat/completions
// endpoint. Works with Cloudera AI Inference (CAII), ray-serve-cai vLLM, OpenAI,
// or any compatible gateway — all use the same request shape + Bearer auth.
//
// Config is resolved by lib/settings.ts: the admin Settings page (DB) overrides
// the LLM_BASE_URL / LLM_API_KEY / LLM_MODEL env vars. Server-side only.

import { getLlmConfig, isLlmConfigured } from './settings';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LlmNotConfiguredError extends Error {
  constructor() {
    super('LLM is not configured. Set it on the admin Settings page (or via LLM_* env vars).');
    this.name = 'LlmNotConfiguredError';
  }
}

/** Async: true when a base URL, key, and model are all resolvable (DB or env). */
export function llmConfigured(): Promise<boolean> {
  return isLlmConfigured();
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

/** One chat completion. Returns the assistant message text. */
export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  const cfg = await getLlmConfig();
  if (!cfg.baseUrl || !cfg.apiKey || !cfg.model) throw new LlmNotConfiguredError();

  const base = cfg.baseUrl.replace(/\/$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 1200,
      stream: false,
    }),
    signal: opts.signal ?? AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LLM request failed (${res.status}): ${body.slice(0, 500)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

/**
 * Chat that must return JSON. We instruct JSON in the prompt and parse
 * defensively — CAII/vLLM don't reliably support response_format, so we extract
 * the first balanced JSON object/array from the text rather than trusting it.
 */
export async function chatJSON<T>(messages: ChatMessage[], opts: ChatOptions = {}): Promise<T> {
  const text = await chat(messages, opts);
  return extractJSON<T>(text);
}

export function extractJSON<T>(text: string): T {
  // Strip markdown fences if present.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();

  // Try a direct parse first.
  try {
    return JSON.parse(candidate) as T;
  } catch {
    /* fall through to substring extraction */
  }

  // Find the first balanced { … } or [ … ].
  const start = candidate.search(/[{[]/);
  if (start === -1) throw new Error(`No JSON found in LLM output: ${text.slice(0, 200)}`);
  const open = candidate[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        return JSON.parse(candidate.slice(start, i + 1)) as T;
      }
    }
  }
  throw new Error(`Unbalanced JSON in LLM output: ${text.slice(0, 200)}`);
}
