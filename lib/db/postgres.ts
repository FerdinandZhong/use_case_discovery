// Postgres backend (node-postgres). Selected when DATABASE_URL is set — point it
// at a Cloudera-approved managed Postgres once the data-handling policy is confirmed.

import { Pool } from 'pg';
import type { DbBackend, ResponsePatch, ResponseRow, SurveyRow, SurveySummary, WorkshopRow } from './types';

let pool: Pool | null = null;

function db(): Pool {
  if (pool) return pool;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'disable' ? undefined : { rejectUnauthorized: false },
    max: 5,
  });
  return pool;
}

export async function init(): Promise<void> {
  await db().query(`
    CREATE TABLE IF NOT EXISTS surveys (
      slug         TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'open',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS responses (
      token            TEXT PRIMARY KEY,
      survey_slug      TEXT NOT NULL REFERENCES surveys(slug) ON DELETE CASCADE,
      respondent_name  TEXT,
      respondent_email TEXT,
      role             TEXT,
      answers          JSONB NOT NULL DEFAULT '{}'::jsonb,
      status           TEXT NOT NULL DEFAULT 'in_progress',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS responses_survey_idx ON responses (survey_slug);
    CREATE TABLE IF NOT EXISTS workshops (
      survey_slug TEXT PRIMARY KEY REFERENCES surveys(slug) ON DELETE CASCADE,
      data        JSONB NOT NULL DEFAULT '{}'::jsonb,
      status      TEXT NOT NULL DEFAULT 'draft',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT PRIMARY KEY,
      value      JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

export async function getSurvey(slug: string): Promise<SurveyRow | null> {
  const { rows } = await db().query('SELECT * FROM surveys WHERE slug = $1', [slug]);
  return rows[0] ?? null;
}

export async function listSurveys(): Promise<SurveySummary[]> {
  const { rows } = await db().query(
    `SELECT s.*,
            COUNT(r.token)::int AS response_count,
            COUNT(r.token) FILTER (WHERE r.status = 'submitted')::int AS submitted_count
     FROM surveys s LEFT JOIN responses r ON r.survey_slug = s.slug
     GROUP BY s.slug ORDER BY s.created_at DESC`,
  );
  return rows;
}

export async function createSurvey(slug: string, displayName: string): Promise<SurveyRow> {
  const { rows } = await db().query(
    `INSERT INTO surveys (slug, display_name) VALUES ($1, $2)
     ON CONFLICT (slug) DO UPDATE SET display_name = EXCLUDED.display_name RETURNING *`,
    [slug, displayName],
  );
  return rows[0];
}

export async function deleteSurvey(slug: string): Promise<boolean> {
  const res = await db().query('DELETE FROM surveys WHERE slug = $1', [slug]);
  return (res.rowCount ?? 0) > 0;
}

export async function getResponse(token: string): Promise<ResponseRow | null> {
  const { rows } = await db().query('SELECT * FROM responses WHERE token = $1', [token]);
  return rows[0] ?? null;
}

export async function createResponse(token: string, surveySlug: string): Promise<ResponseRow> {
  const { rows } = await db().query(
    'INSERT INTO responses (token, survey_slug) VALUES ($1, $2) RETURNING *',
    [token, surveySlug],
  );
  return rows[0];
}

export async function listResponses(surveySlug: string): Promise<ResponseRow[]> {
  const { rows } = await db().query(
    'SELECT * FROM responses WHERE survey_slug = $1 ORDER BY created_at ASC',
    [surveySlug],
  );
  return rows;
}

export async function updateResponse(token: string, patch: ResponsePatch): Promise<ResponseRow | null> {
  const { rows } = await db().query(
    `UPDATE responses SET
       answers          = COALESCE($2::jsonb, answers),
       respondent_name  = COALESCE($3, respondent_name),
       respondent_email = COALESCE($4, respondent_email),
       role             = COALESCE($5, role),
       status           = COALESCE($6, status),
       updated_at       = now()
     WHERE token = $1 RETURNING *`,
    [
      token,
      patch.answers ? JSON.stringify(patch.answers) : null,
      patch.respondent_name ?? null,
      patch.respondent_email ?? null,
      patch.role ?? null,
      patch.status ?? null,
    ],
  );
  return rows[0] ?? null;
}

export async function getWorkshop(surveySlug: string): Promise<WorkshopRow | null> {
  const { rows } = await db().query('SELECT * FROM workshops WHERE survey_slug = $1', [surveySlug]);
  return rows[0] ?? null; // pg parses JSONB → object automatically
}

export async function saveWorkshop(surveySlug: string, data: unknown, status = 'generated'): Promise<WorkshopRow> {
  const { rows } = await db().query(
    `INSERT INTO workshops (survey_slug, data, status) VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (survey_slug) DO UPDATE SET data = EXCLUDED.data, status = EXCLUDED.status, updated_at = now()
     RETURNING *`,
    [surveySlug, JSON.stringify(data ?? {}), status],
  );
  return rows[0];
}

export async function getSetting(key: string): Promise<Record<string, unknown> | null> {
  const { rows } = await db().query('SELECT value FROM settings WHERE key = $1', [key]);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db().query(
    `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value ?? {})],
  );
}

const backend: DbBackend = {
  init,
  getSurvey,
  listSurveys,
  createSurvey,
  deleteSurvey,
  getResponse,
  createResponse,
  listResponses,
  updateResponse,
  getWorkshop,
  saveWorkshop,
  getSetting,
  setSetting,
};
export default backend;
