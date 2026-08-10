// Embedded SQLite backend (default). Data stays inside the container / Workbench
// project — no external data processor. Selected when DATABASE_URL is unset.
//
// The DB file path comes from SQLITE_PATH (default ./data/survey.db). Mount that
// directory as a volume (Docker) or point it at project storage (CML) to persist.

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { DbBackend, ResponsePatch, ResponseRow, SurveyRow, SurveySummary, WorkshopRow } from './types';

let db: Database.Database | null = null;

function conn(): Database.Database {
  if (db) return db;
  const file = resolve(process.env.SQLITE_PATH || './data/survey.db');
  mkdirSync(dirname(file), { recursive: true });
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  return db;
}

function parse(row: any): ResponseRow {
  return { ...row, answers: JSON.parse(row.answers ?? '{}') };
}

export async function init(): Promise<void> {
  const c = conn();
  c.exec(`
    CREATE TABLE IF NOT EXISTS surveys (
      slug         TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'open',
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS responses (
      token            TEXT PRIMARY KEY,
      survey_slug      TEXT NOT NULL REFERENCES surveys(slug) ON DELETE CASCADE,
      respondent_name  TEXT,
      respondent_email TEXT,
      role             TEXT,
      answers          TEXT NOT NULL DEFAULT '{}',
      status           TEXT NOT NULL DEFAULT 'in_progress',
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS responses_survey_idx ON responses (survey_slug);
    CREATE TABLE IF NOT EXISTS workshops (
      survey_slug TEXT PRIMARY KEY REFERENCES surveys(slug) ON DELETE CASCADE,
      data        TEXT NOT NULL DEFAULT '{}',
      status      TEXT NOT NULL DEFAULT 'draft',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export async function getSurvey(slug: string): Promise<SurveyRow | null> {
  return (conn().prepare('SELECT * FROM surveys WHERE slug = ?').get(slug) as SurveyRow) ?? null;
}

export async function listSurveys(): Promise<SurveySummary[]> {
  return conn()
    .prepare(
      `SELECT s.*,
              COUNT(r.token) AS response_count,
              COUNT(CASE WHEN r.status = 'submitted' THEN 1 END) AS submitted_count
       FROM surveys s LEFT JOIN responses r ON r.survey_slug = s.slug
       GROUP BY s.slug ORDER BY s.created_at DESC`,
    )
    .all() as SurveySummary[];
}

export async function createSurvey(slug: string, displayName: string): Promise<SurveyRow> {
  conn()
    .prepare(
      `INSERT INTO surveys (slug, display_name) VALUES (?, ?)
       ON CONFLICT(slug) DO UPDATE SET display_name = excluded.display_name`,
    )
    .run(slug, displayName);
  return (await getSurvey(slug))!;
}

export async function deleteSurvey(slug: string): Promise<boolean> {
  const info = conn().prepare('DELETE FROM surveys WHERE slug = ?').run(slug);
  return info.changes > 0;
}

export async function getResponse(token: string): Promise<ResponseRow | null> {
  const row = conn().prepare('SELECT * FROM responses WHERE token = ?').get(token);
  return row ? parse(row) : null;
}

export async function createResponse(token: string, surveySlug: string): Promise<ResponseRow> {
  conn()
    .prepare('INSERT INTO responses (token, survey_slug) VALUES (?, ?)')
    .run(token, surveySlug);
  return (await getResponse(token))!;
}

export async function listResponses(surveySlug: string): Promise<ResponseRow[]> {
  const rows = conn()
    .prepare('SELECT * FROM responses WHERE survey_slug = ? ORDER BY created_at ASC')
    .all(surveySlug) as any[];
  return rows.map(parse);
}

export async function updateResponse(token: string, patch: ResponsePatch): Promise<ResponseRow | null> {
  conn()
    .prepare(
      `UPDATE responses SET
         answers          = COALESCE(?, answers),
         respondent_name  = COALESCE(?, respondent_name),
         respondent_email = COALESCE(?, respondent_email),
         role             = COALESCE(?, role),
         status           = COALESCE(?, status),
         updated_at       = datetime('now')
       WHERE token = ?`,
    )
    .run(
      patch.answers ? JSON.stringify(patch.answers) : null,
      patch.respondent_name ?? null,
      patch.respondent_email ?? null,
      patch.role ?? null,
      patch.status ?? null,
      token,
    );
  return getResponse(token);
}

export async function getWorkshop(surveySlug: string): Promise<WorkshopRow | null> {
  const row = conn().prepare('SELECT * FROM workshops WHERE survey_slug = ?').get(surveySlug) as any;
  return row ? { ...row, data: JSON.parse(row.data ?? '{}') } : null;
}

export async function saveWorkshop(surveySlug: string, data: unknown, status = 'generated'): Promise<WorkshopRow> {
  conn()
    .prepare(
      `INSERT INTO workshops (survey_slug, data, status) VALUES (?, ?, ?)
       ON CONFLICT(survey_slug) DO UPDATE SET data = excluded.data, status = excluded.status, updated_at = datetime('now')`,
    )
    .run(surveySlug, JSON.stringify(data ?? {}), status);
  return (await getWorkshop(surveySlug))!;
}

export async function getSetting(key: string): Promise<Record<string, unknown> | null> {
  const row = conn().prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
  return row ? JSON.parse(row.value ?? '{}') : null;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  conn()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    )
    .run(key, JSON.stringify(value ?? {}));
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
