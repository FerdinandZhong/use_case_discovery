// Shared row types + repository interface implemented by both backends.

export interface SurveyRow {
  slug: string;
  display_name: string;
  status: string; // 'open' | 'closed'
  created_at: string;
}

export interface SurveySummary extends SurveyRow {
  response_count: number;
  submitted_count: number;
}

export interface ResponseRow {
  token: string;
  survey_slug: string;
  respondent_name: string | null;
  respondent_email: string | null;
  role: string | null;
  answers: Record<string, unknown>;
  status: 'in_progress' | 'submitted';
  created_at: string;
  updated_at: string;
}

export interface ResponsePatch {
  answers?: Record<string, unknown>;
  respondent_name?: string | null;
  respondent_email?: string | null;
  role?: string | null;
  status?: 'in_progress' | 'submitted';
}

export interface DbBackend {
  getSurvey(slug: string): Promise<SurveyRow | null>;
  listSurveys(): Promise<SurveySummary[]>;
  createSurvey(slug: string, displayName: string): Promise<SurveyRow>;
  deleteSurvey(slug: string): Promise<boolean>;
  getResponse(token: string): Promise<ResponseRow | null>;
  createResponse(token: string, surveySlug: string): Promise<ResponseRow>;
  listResponses(surveySlug: string): Promise<ResponseRow[]>;
  updateResponse(token: string, patch: ResponsePatch): Promise<ResponseRow | null>;
  getWorkshop(surveySlug: string): Promise<WorkshopRow | null>;
  saveWorkshop(surveySlug: string, data: unknown, status?: string): Promise<WorkshopRow>;
  getSetting(key: string): Promise<Record<string, unknown> | null>;
  setSetting(key: string, value: unknown): Promise<void>;
  init(): Promise<void>; // create tables if absent
}

// Stage-2 on-site workshop state (1:1 with a survey slug). `data` holds the
// WorkshopPack (see lib/workshop.ts) as a parsed object.
export interface WorkshopRow {
  survey_slug: string;
  data: Record<string, unknown>;
  status: string; // 'draft' | 'generated'
  created_at: string;
  updated_at: string;
}
