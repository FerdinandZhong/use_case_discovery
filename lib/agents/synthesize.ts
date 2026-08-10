// Synthesis agent — produces the leave-behind: a 3-5 item MVP backlog + a RACI
// matrix, from the prioritized use cases.

import { chatJSON } from '../llm';
import type { BacklogItem, RaciEntry } from '../workshop';

export interface SynthesisResult {
  backlog: BacklogItem[];
  raci: RaciEntry[];
}

export interface SynthInput {
  id: string;
  name: string;
  value: number; // 0..1
  feasibility: number; // 0..1
}

// The model keys backlog items by list index (i) — far more reliable than echoing
// opaque ids. We map i → the real use case id after the call.
interface RawSynthesis {
  backlog: { i: number; mvp: string; nextSteps: string }[];
  raci: RaciEntry[];
}

export async function synthesize(useCases: SynthInput[]): Promise<SynthesisResult> {
  if (useCases.length === 0) return { backlog: [], raci: [] };
  const system =
    'You are facilitating the closing of a Cloudera AI discovery workshop. Produce a pragmatic leave-behind: ' +
    'a prioritized MVP backlog (favor high-value, high-feasibility "quick wins") and a RACI matrix. ' +
    'Roles are generic (e.g. "Exec Sponsor", "Product Owner", "Data/ML Engineer", "IT/Data Architect").';
  // Rank, but remember each item's original index so we can map back to real ids.
  const ranked = useCases
    .map((u, idx) => ({ ...u, idx }))
    .sort((a, b) => b.value + b.feasibility - (a.value + a.feasibility));
  const user = `Prioritized use cases (value & feasibility are 0..1):
${ranked.map((u) => `- i=${u.idx} "${u.name}" value=${u.value.toFixed(2)} feasibility=${u.feasibility.toFixed(2)}`).join('\n')}

Return ONLY JSON. "i" MUST be the exact integer index shown above (do not invent ids):
{
  "backlog": [{"i":<index>,"mvp":"<the smallest valuable first version>","nextSteps":"<immediate next steps>"}],
  "raci": [{"task":"<workshop follow-up task>","responsible":"<role>","accountable":"<role>","consulted":"<role>","informed":"<role>"}]
}
Include ONE backlog item for EVERY use case above (ordered best-first) and 3-5 RACI rows.`;

  const raw = await chatJSON<RawSynthesis>([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);

  // Map indices back to real ids; drop unusable rows. Fall back to ranked order
  // if the model returned no valid backlog at all.
  const backlog: BacklogItem[] = (raw.backlog ?? [])
    .filter((b) => Number.isInteger(b.i) && b.i >= 0 && b.i < useCases.length)
    .map((b) => ({ useCaseId: useCases[b.i].id, mvp: b.mvp, nextSteps: b.nextSteps }));
  if (backlog.length === 0) {
    ranked.forEach((u) => backlog.push({ useCaseId: u.id, mvp: '', nextSteps: '' }));
  }
  return { backlog, raci: raw.raci ?? [] };
}
