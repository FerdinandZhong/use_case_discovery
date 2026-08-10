// Pure aggregation over submitted survey responses:
//  - distributions for the workshop Dashboard (labeled via the questionnaire)
//  - candidate use cases + a context string for the pre-bake agent pass
//
// Reads the same answers[sectionId][questionId] path used by lib/catalog.ts and
// resolves option values to labels via the questionnaire. No server-only deps.

import { QUESTIONNAIRE, questionByPath, optionLabel, Question } from './questionnaire';
import type { ResponseRow } from './db';

export interface Bucket {
  key: string;
  label: string;
  count: number;
}

export interface Aggregate {
  respondentCount: number;
  valueDrivers: Bucket[]; // strategic_impact.value_driver
  bottlenecks: Bucket[]; // friction.bottleneck
  platforms: Bucket[]; // platform.current_platform
  tools: Bucket[]; // platform.tools_stack
  dataFormats: Bucket[]; // data_readiness.data_format
  riskTolerance: Bucket[]; // strategic_impact.risk_tolerance
  dataQuality: Bucket[]; // data_readiness.data_quality (1..5)
  ucPatterns: Bucket[]; // use_cases[].uc_pattern
  ucSystems: Bucket[]; // use_cases[].uc_systems
  ucHitl: Bucket[]; // use_cases[].uc_hitl
  useCaseCount: number;
}

function section(answers: any, sectionId: string): any {
  return (answers?.[sectionId] as Record<string, unknown>) ?? {};
}

function findQuestion(path: string): Question | undefined {
  return questionByPath()[path]?.question;
}

/** Count occurrences of a top-level single/multi field across responses. */
function countField(responses: ResponseRow[], path: string): Bucket[] {
  const [sectionId, questionId] = path.split('.');
  const q = findQuestion(path);
  const counts = new Map<string, number>();
  for (const r of responses) {
    const v = section(r.answers, sectionId)[questionId];
    const values = Array.isArray(v) ? v : v === undefined || v === null || v === '' ? [] : [v];
    for (const val of values) counts.set(String(val), (counts.get(String(val)) ?? 0) + 1);
  }
  return toBuckets(counts, q);
}

/** Count occurrences of a per-use-case field across all use_cases entries. */
function countUseCaseField(responses: ResponseRow[], fieldId: string): Bucket[] {
  const ucSection = QUESTIONNAIRE.sections.find((s) => s.id === 'use_cases');
  const q = ucSection?.questions.find((x) => x.id === fieldId);
  const counts = new Map<string, number>();
  for (const r of responses) {
    // use_cases is a repeatable section → an array; anything else (missing/object) yields no entries.
    const list = Array.isArray((r.answers as any)?.use_cases) ? ((r.answers as any).use_cases as any[]) : [];
    for (const entry of list) {
      const v = entry?.[fieldId];
      const values = Array.isArray(v) ? v : v === undefined || v === null || v === '' ? [] : [v];
      for (const val of values) counts.set(String(val), (counts.get(String(val)) ?? 0) + 1);
    }
  }
  return toBuckets(counts, q);
}

function toBuckets(counts: Map<string, number>, q?: Question): Bucket[] {
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: q ? optionLabel(q, key) : key, count }))
    .sort((a, b) => b.count - a.count);
}

function dataQualityHistogram(responses: ResponseRow[]): Bucket[] {
  const counts = new Map<string, number>();
  for (let i = 1; i <= 5; i++) counts.set(String(i), 0);
  for (const r of responses) {
    const v = section(r.answers, 'data_readiness')['data_quality'];
    if (typeof v === 'number') counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
  }
  return [...counts.entries()].map(([key, count]) => ({ key, label: `${key} / 5`, count }));
}

export function aggregate(responses: ResponseRow[]): Aggregate {
  const useCaseCount = responses.reduce(
    (n, r) => n + (Array.isArray(r.answers?.['use_cases']) ? (r.answers['use_cases'] as any[]).length : 0),
    0,
  );
  return {
    respondentCount: responses.length,
    valueDrivers: countField(responses, 'strategic_impact.value_driver'),
    bottlenecks: countField(responses, 'friction.bottleneck'),
    platforms: countField(responses, 'platform.current_platform'),
    tools: countField(responses, 'platform.tools_stack'),
    dataFormats: countField(responses, 'data_readiness.data_format'),
    riskTolerance: countField(responses, 'strategic_impact.risk_tolerance'),
    dataQuality: dataQualityHistogram(responses),
    ucPatterns: countUseCaseField(responses, 'uc_pattern'),
    ucSystems: countUseCaseField(responses, 'uc_systems'),
    ucHitl: countUseCaseField(responses, 'uc_hitl'),
    useCaseCount,
  };
}

// ---------- candidate use cases for the agent pass ----------

export interface CandidateUseCase {
  id: string;
  name: string;
  context: string;
  pattern?: string[];
  systems?: string[];
  hitl?: string;
}

/** Format facilitator session signals into a context line for the agents. */
export function signalsToText(signals?: {
  patterns?: string[];
  systems?: string[];
  hitl?: string[];
}): string {
  if (!signals) return '';
  const ucSection = QUESTIONNAIRE.sections.find((s) => s.id === 'use_cases');
  const q = (id: string) => ucSection?.questions.find((x) => x.id === id);
  const fmt = (id: string, vals?: string[]) => {
    const qq = q(id);
    return (vals ?? []).map((v) => (qq ? optionLabel(qq, v) : v)).join(', ');
  };
  const parts: string[] = [];
  if (signals.patterns?.length) parts.push(`desired solution pattern(s): ${fmt('uc_pattern', signals.patterns)}`);
  if (signals.systems?.length) parts.push(`systems to integrate: ${fmt('uc_systems', signals.systems)}`);
  if (signals.hitl?.length) parts.push(`human-in-the-loop: ${fmt('uc_hitl', signals.hitl)}`);
  return parts.length ? `Facilitator session signals — ${parts.join('; ')}.` : '';
}

function labelList(path: string, values: unknown): string {
  const q = findQuestion(path);
  const arr = Array.isArray(values) ? values : values ? [values] : [];
  return arr.map((v) => (q ? optionLabel(q, String(v)) : String(v))).join(', ');
}

/**
 * Extract candidate use cases from submitted responses: every `use_cases` entry
 * becomes a candidate; if a respondent listed none, their core friction process
 * becomes one. `id` is deterministic so re-generation is stable.
 */
export function extractCandidates(responses: ResponseRow[]): CandidateUseCase[] {
  const out: CandidateUseCase[] = [];
  responses.forEach((r, ri) => {
    const fr = section(r.answers, 'friction');
    const dr = section(r.answers, 'data_readiness');
    const si = section(r.answers, 'strategic_impact');
    const pl = section(r.answers, 'platform');
    const surveyCtx =
      `Reported friction: ${fr.core_process ?? '—'}. ` +
      `Blockers: ${labelList('friction.bottleneck', fr.bottleneck) || '—'}. ` +
      `Current platform: ${labelList('platform.current_platform', pl.current_platform) || '—'}. ` +
      `Tools in use: ${labelList('platform.tools_stack', pl.tools_stack) || '—'}. ` +
      `Data lives in: ${labelList('data_readiness.data_format', dr.data_format) || '—'} ` +
      `(trust ${dr.data_quality ?? '?'} /5). ` +
      `Desired win: ${labelList('strategic_impact.value_driver', si.value_driver) || '—'}. ` +
      `Risk tolerance: ${labelList('strategic_impact.risk_tolerance', si.risk_tolerance) || '—'}.`;

    const list = Array.isArray(r.answers?.['use_cases']) ? (r.answers['use_cases'] as any[]) : [];
    if (list.length === 0) {
      if (fr.core_process) {
        out.push({
          id: `r${ri}-friction`,
          name: String(fr.core_process).slice(0, 60),
          context: surveyCtx,
        });
      }
      return;
    }
    list.forEach((uc, ui) => {
      const pattern = Array.isArray(uc.uc_pattern) ? uc.uc_pattern : [];
      const systems = Array.isArray(uc.uc_systems) ? uc.uc_systems : [];
      const ctx =
        `${surveyCtx}\n  Solution pattern: ${labelList('use_cases.uc_pattern', pattern) || '—'}. ` +
        `Current steps: ${uc.uc_process_steps ?? '—'}. ` +
        `Systems to touch: ${labelList('use_cases.uc_systems', systems) || '—'}. ` +
        `Human-in-the-loop: ${labelList('use_cases.uc_hitl', uc.uc_hitl) || '—'}. ` +
        `Cost of inaction: ${uc.uc_cost_of_inaction ?? '—'}. ` +
        `Data history: ${uc.uc_history ?? '—'}. ` +
        `Compliance: ${uc.uc_compliance ?? '—'}.`;
      out.push({
        id: `r${ri}-uc${ui}`,
        name: String(uc.uc_name || fr.core_process || 'Untitled use case').slice(0, 80),
        context: ctx,
        pattern,
        systems,
        hitl: typeof uc.uc_hitl === 'string' ? uc.uc_hitl : undefined,
      });
    });
  });
  return out;
}
