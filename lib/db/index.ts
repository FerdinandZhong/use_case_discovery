// Backend selector. DATABASE_URL set → Postgres; otherwise → embedded SQLite.
// Uses dynamic import so the unused native driver is never loaded/required.

import type { DbBackend, ResponsePatch, ResponseRow, SurveyRow, SurveySummary, WorkshopRow } from './types';

export type { ResponsePatch, ResponseRow, SurveyRow, SurveySummary, WorkshopRow } from './types';

let backendPromise: Promise<DbBackend> | null = null;

async function backend(): Promise<DbBackend> {
  if (backendPromise) return backendPromise;
  backendPromise = (async () => {
    const impl = process.env.DATABASE_URL
      ? await import('./postgres')
      : await import('./sqlite');
    const b = impl.default;
    await b.init(); // idempotent — creates tables if absent
    return b;
  })();
  return backendPromise;
}

export const dbKind = (): 'postgres' | 'sqlite' => (process.env.DATABASE_URL ? 'postgres' : 'sqlite');

export async function getSurvey(slug: string): Promise<SurveyRow | null> {
  return (await backend()).getSurvey(slug);
}
export async function listSurveys(): Promise<SurveySummary[]> {
  return (await backend()).listSurveys();
}
export async function createSurvey(slug: string, displayName: string): Promise<SurveyRow> {
  return (await backend()).createSurvey(slug, displayName);
}
export async function deleteSurvey(slug: string): Promise<boolean> {
  return (await backend()).deleteSurvey(slug);
}
export async function getResponse(token: string): Promise<ResponseRow | null> {
  return (await backend()).getResponse(token);
}
export async function createResponse(token: string, surveySlug: string): Promise<ResponseRow> {
  return (await backend()).createResponse(token, surveySlug);
}
export async function listResponses(surveySlug: string): Promise<ResponseRow[]> {
  return (await backend()).listResponses(surveySlug);
}
export async function updateResponse(token: string, patch: ResponsePatch): Promise<ResponseRow | null> {
  return (await backend()).updateResponse(token, patch);
}
export async function getWorkshop(surveySlug: string): Promise<WorkshopRow | null> {
  return (await backend()).getWorkshop(surveySlug);
}
export async function saveWorkshop(surveySlug: string, data: unknown, status?: string): Promise<WorkshopRow> {
  return (await backend()).saveWorkshop(surveySlug, data, status);
}
export async function getSetting(key: string): Promise<Record<string, unknown> | null> {
  return (await backend()).getSetting(key);
}
export async function setSetting(key: string, value: unknown): Promise<void> {
  return (await backend()).setSetting(key, value);
}
export async function initDb(): Promise<void> {
  await backend();
}
