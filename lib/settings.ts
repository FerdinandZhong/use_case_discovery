// LLM configuration resolution. Precedence: DB settings['llm'] overrides env.
// This lets a facilitator configure the endpoint in-app (admin Settings page)
// without redeploying — important on-site where env edits aren't possible.

import { getSetting, setSetting } from './db';

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

const KEY = 'llm';

/** Resolved config: DB value wins over env for any field that is set. */
export async function getLlmConfig(): Promise<LlmConfig> {
  const env: LlmConfig = {
    baseUrl: process.env.LLM_BASE_URL ?? '',
    apiKey: process.env.LLM_API_KEY ?? '',
    model: process.env.LLM_MODEL ?? '',
  };
  const db = (await getSetting(KEY).catch(() => null)) as Partial<LlmConfig> | null;
  return {
    baseUrl: db?.baseUrl || env.baseUrl,
    apiKey: db?.apiKey || env.apiKey,
    model: db?.model || env.model,
  };
}

export async function setLlmConfig(cfg: Partial<LlmConfig>): Promise<void> {
  const existing = ((await getSetting(KEY).catch(() => null)) as Partial<LlmConfig>) ?? {};
  await setSetting(KEY, {
    baseUrl: cfg.baseUrl ?? existing.baseUrl ?? '',
    // keep the stored key if the caller sends an empty string (i.e. "unchanged")
    apiKey: cfg.apiKey && cfg.apiKey.length ? cfg.apiKey : existing.apiKey ?? '',
    model: cfg.model ?? existing.model ?? '',
  });
}

export async function isLlmConfigured(): Promise<boolean> {
  const c = await getLlmConfig();
  return Boolean(c.baseUrl && c.apiKey && c.model);
}

/** Where each field is currently sourced from — for the Settings UI. */
export async function llmConfigSource(): Promise<'db' | 'env' | 'none'> {
  const db = (await getSetting(KEY).catch(() => null)) as Partial<LlmConfig> | null;
  if (db && (db.baseUrl || db.apiKey || db.model)) return 'db';
  if (process.env.LLM_BASE_URL || process.env.LLM_API_KEY || process.env.LLM_MODEL) return 'env';
  return 'none';
}
