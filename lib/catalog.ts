// Maps submitted survey responses into catalog views: Markdown, JSON, CSV.
//
// - Markdown: human-readable per-customer catalog matching the workshop's
//   use-case framing (feeds directly into the AI Canvas / Value-vs-Feasibility).
// - JSON: raw structured data.
// - CSV: one row per response for cross-customer scoring in a spreadsheet.

import type { ResponseRow, SurveyRow } from './db';
import { QUESTIONNAIRE, Question, optionLabel } from './questionnaire';

export type CatalogFormat = 'md' | 'json' | 'csv';

export interface CatalogInput {
  survey: SurveyRow;
  responses: ResponseRow[]; // typically submitted only
}

// ---------- helpers ----------

function answerToText(question: Question, raw: unknown): string {
  if (raw === undefined || raw === null || raw === '') return '—';
  if (Array.isArray(raw)) {
    return raw.map((v) => optionLabel(question, String(v))).join(', ') || '—';
  }
  if (question.type === 'single') return optionLabel(question, String(raw));
  if (question.type === 'scale') return `${raw} / 5`;
  return String(raw);
}

function csvCell(value: string): string {
  // CSV-injection guard: neutralize cells a spreadsheet would treat as a formula.
  let v = value;
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  const needsQuote = /[",\n]/.test(v);
  const escaped = v.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

// ---------- JSON ----------

export function toJSON({ survey, responses }: CatalogInput): unknown {
  return {
    customer: survey.display_name,
    slug: survey.slug,
    generated_at: new Date().toISOString(),
    questionnaire_version: QUESTIONNAIRE.version,
    respondent_count: responses.length,
    responses: responses.map((r) => ({
      token: r.token,
      name: r.respondent_name,
      email: r.respondent_email,
      role: r.role,
      status: r.status,
      submitted_at: r.updated_at,
      answers: r.answers,
    })),
  };
}

// ---------- CSV (cross-customer scoring) ----------

// Flat columns pulled from the questionnaire for spreadsheet analysis.
const CSV_FIELDS: Array<{ header: string; path: string }> = [
  { header: 'core_process', path: 'friction.core_process' },
  { header: 'bottleneck', path: 'friction.bottleneck' },
  { header: 'predict_variable', path: 'friction.if_only_knew' },
  { header: 'current_platform', path: 'platform.current_platform' },
  { header: 'tools_stack', path: 'platform.tools_stack' },
  { header: 'data_format', path: 'data_readiness.data_format' },
  { header: 'data_trust_1to5', path: 'data_readiness.data_quality' },
  { header: 'value_driver', path: 'strategic_impact.value_driver' },
  { header: 'risk_tolerance', path: 'strategic_impact.risk_tolerance' },
];

function lookup(answers: Record<string, unknown>, path: string): { question: Question | null; raw: unknown } {
  const [sectionId, questionId] = path.split('.');
  const section = QUESTIONNAIRE.sections.find((s) => s.id === sectionId);
  const question = section?.questions.find((q) => q.id === questionId) ?? null;
  const sectionAnswers = (answers?.[sectionId] as Record<string, unknown>) ?? {};
  return { question, raw: sectionAnswers?.[questionId] };
}

export function toCSV({ survey, responses }: CatalogInput): string {
  const headers = ['customer', 'respondent', 'role', ...CSV_FIELDS.map((f) => f.header)];
  const lines = [headers.map(csvCell).join(',')];

  for (const r of responses) {
    const answers = (r.answers as Record<string, unknown>) ?? {};
    const cells = [
      survey.display_name,
      r.respondent_name ?? '',
      r.role ?? '',
      ...CSV_FIELDS.map((f) => {
        const { question, raw } = lookup(answers, f.path);
        return question ? answerToText(question, raw).replace(/\s*\n\s*/g, ' ') : '';
      }),
    ];
    lines.push(cells.map(csvCell).join(','));
  }
  return lines.join('\n');
}

// ---------- Markdown (per-customer catalog) ----------

export function toMarkdown({ survey, responses }: CatalogInput): string {
  const out: string[] = [];
  out.push(`# AI Use Case Discovery — ${survey.display_name}`);
  out.push('');
  out.push(`_Generated ${new Date().toISOString()} · ${responses.length} respondent(s) · questionnaire v${QUESTIONNAIRE.version}_`);
  out.push('');

  responses.forEach((r, idx) => {
    const answers = (r.answers as Record<string, unknown>) ?? {};
    out.push('---');
    out.push('');
    out.push(`## Respondent ${idx + 1}: ${r.respondent_name ?? 'Anonymous'}${r.role ? ` (${r.role})` : ''}`);
    if (r.respondent_email) out.push(`_${r.respondent_email}_`);
    out.push('');

    for (const section of QUESTIONNAIRE.sections) {
      if (section.id === 'profile') continue; // captured in the heading

      if (section.repeatable) {
        const entries = (answers[section.id] as Array<Record<string, unknown>>) ?? [];
        if (entries.length === 0) continue;
        out.push(`### ${section.title}`);
        out.push('');
        entries.forEach((entry, i) => {
          out.push(`#### ${section.repeatLabel ?? 'Item'} ${i + 1}`);
          out.push('');
          out.push('| Field | Answer |');
          out.push('| --- | --- |');
          for (const q of section.questions) {
            out.push(`| ${q.label} | ${answerToText(q, entry?.[q.id])} |`);
          }
          out.push('');
        });
        continue;
      }

      const sectionAnswers = (answers[section.id] as Record<string, unknown>) ?? {};
      const hasAny = section.questions.some((q) => {
        const v = sectionAnswers[q.id];
        return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
      });
      if (!hasAny) continue;

      out.push(`### ${section.title}`);
      out.push('');
      out.push('| Field | Answer |');
      out.push('| --- | --- |');
      for (const q of section.questions) {
        out.push(`| ${q.label} | ${answerToText(q, sectionAnswers[q.id])} |`);
      }
      out.push('');
    }
  });

  if (responses.length === 0) {
    out.push('_No submitted responses yet._');
    out.push('');
  }

  return out.join('\n');
}

export function renderCatalog(format: CatalogFormat, input: CatalogInput): { body: string; contentType: string } {
  switch (format) {
    case 'json':
      return { body: JSON.stringify(toJSON(input), null, 2), contentType: 'application/json' };
    case 'csv':
      return { body: toCSV(input), contentType: 'text/csv' };
    case 'md':
    default:
      return { body: toMarkdown(input), contentType: 'text/markdown' };
  }
}
