// Prioritization agent — applies the deck's scoring rubric to each candidate use
// case (Business Value + Technical Feasibility, each criterion 1/3/5).

import { chatJSON } from '../llm';
import type { UseCaseScores } from '../workshop';

export interface Candidate {
  id: string;
  name: string;
  context: string; // free-text summary of the use case + survey signals
}

export interface PrioritizeResult {
  id: string;
  scores: UseCaseScores;
  rationale: string;
}

const RUBRIC = `Score EACH criterion as exactly 1 (Low), 3 (Medium), or 5 (High).

Business Value:
- strategicAlignment: 1="nice to have", 3=aligned with departmental goals, 5=directly impacts North-Star/CEO KPIs
- frequencyVolume: 1=happens ~monthly, 3=daily for a small team, 5=high-volume enterprise-wide
- potentialRoi: 1=marginal time savings, 3=measurable cost reduction or 20%+ time back, 5=revenue generation or major risk mitigation
- userExperience: 1=internal-only/invisible, 3=improves internal morale/speed, 5=directly improves customer satisfaction

Technical Feasibility:
- dataAvailability: 1=data is tribal/paper, 3=in PDFs/digital docs (RAG-ready), 5=structured in a clean API/database
- toleranceForError: 1=needs ~100% accuracy (legal), 3=human-in-the-loop acceptable, 5=low risk if it "hallucinates" (creative)
- complexityOfLogic: 1=requires deep intuition, 3=follows clear business rules, 5=pattern recognition/summarization
- integrationEase: 1=requires total system overhaul, 3=standalone side-car app, 5=plugs into existing tools (Slack/ERP)`;

export async function prioritize(candidates: Candidate[]): Promise<PrioritizeResult[]> {
  if (candidates.length === 0) return [];
  const system =
    'You are an AI solutions architect scoring candidate use cases for a Cloudera AI discovery workshop. ' +
    'You are pragmatic and calibrated — do not inflate scores.';
  const user = `${RUBRIC}

Score these use cases. Return ONLY a JSON array, one object per use case:
[{"id": "<id>", "scores": {"strategicAlignment":n,"frequencyVolume":n,"potentialRoi":n,"userExperience":n,"dataAvailability":n,"toleranceForError":n,"complexityOfLogic":n,"integrationEase":n}, "rationale": "<one sentence>"}]

Use cases:
${candidates.map((c) => `- id="${c.id}" name="${c.name}"\n  ${c.context}`).join('\n')}`;

  const out = await chatJSON<PrioritizeResult[]>([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
  return out;
}
