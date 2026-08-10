import { NextRequest, NextResponse } from 'next/server';
import { getSurvey, getWorkshop, saveWorkshop } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { llmConfigured } from '@/lib/llm';
import { prioritize } from '@/lib/agents/prioritize';
import { draftCanvas } from '@/lib/agents/canvas';
import { killIdea } from '@/lib/agents/killIdea';
import { synthesize } from '@/lib/agents/synthesize';
import { scoresToMatrix, WorkshopPack, WorkshopUseCase } from '@/lib/workshop';
import { signalsToText } from '@/lib/aggregate';
import { QUESTIONNAIRE, optionLabel, Question } from '@/lib/questionnaire';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UC_SECTION = QUESTIONNAIRE.sections.find((s) => s.id === 'use_cases');
const ucQ = (id: string): Question | undefined => UC_SECTION?.questions.find((q) => q.id === id);

/** A use case's OWN details (pattern/systems/hitl) as a grounding line for the agents. */
function useCaseSignals(uc: WorkshopUseCase): string {
  const fmt = (id: string, vals?: string[]) => {
    const q = ucQ(id);
    return (vals ?? []).map((v) => (q ? optionLabel(q, v) : v)).join(', ');
  };
  const parts: string[] = [];
  if (uc.pattern?.length) parts.push(`solution pattern(s): ${fmt('uc_pattern', uc.pattern)}`);
  if (uc.systems?.length) parts.push(`systems to touch: ${fmt('uc_systems', uc.systems)}`);
  if (uc.hitl) parts.push(`human-in-the-loop: ${fmt('uc_hitl', [uc.hitl])}`);
  return parts.length ? `This use case's details — ${parts.join('; ')}.` : '';
}

// POST /api/workshop/[slug]/assist
//   { type: 'rescore'|'canvas'|'kill', useCaseId, note? }  — single-item agent assist
//   { type: 'roadmap' }                                    — rebuild the MVP backlog + RACI
// On-site assist. Returns the updated use case (or full pack for roadmap) and persists.
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await llmConfigured())) return NextResponse.json({ error: 'LLM not configured.' }, { status: 400 });

  const survey = await getSurvey(params.slug);
  if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const { type, useCaseId, note } = body ?? {};
  const perItem = ['rescore', 'canvas', 'kill'].includes(type);
  if (type !== 'roadmap' && !perItem) {
    return NextResponse.json(
      { error: 'Expected { type: rescore|canvas|kill, useCaseId, note? } or { type: roadmap }' },
      { status: 400 },
    );
  }
  if (perItem && !useCaseId) {
    return NextResponse.json({ error: 'useCaseId is required for this assist' }, { status: 400 });
  }

  const row = await getWorkshop(params.slug);
  const pack = (row?.data as unknown as WorkshopPack) ?? null;
  if (!pack) return NextResponse.json({ error: 'No workshop pack yet' }, { status: 404 });

  try {
    // Rebuild the roadmap over the CURRENT use case list (picks up live-added ones).
    if (type === 'roadmap') {
      if (!pack.useCases?.length) {
        return NextResponse.json({ error: 'No use cases to build a backlog from' }, { status: 422 });
      }
      pack.roadmap = await synthesize(
        pack.useCases.map((u) => ({
          id: u.id,
          name: u.name,
          value: u.matrix.value,
          feasibility: u.matrix.feasibility,
        })),
      );
      await saveWorkshop(params.slug, pack, row?.status ?? 'generated');
      return NextResponse.json({ pack });
    }

    const uc = pack.useCases?.find((u) => u.id === useCaseId);
    if (!uc) return NextResponse.json({ error: 'Use case not found in workshop pack' }, { status: 404 });

    // Ground the assist in this use case's own details + global session signals + any live note.
    const own = useCaseSignals(uc);
    const sig = signalsToText(pack.signals);
    const ctx = [uc.context ?? uc.summary, own, sig, note ? `New input from the room: ${note}` : '']
      .filter(Boolean)
      .join('\n');

    if (type === 'rescore') {
      const [res] = await prioritize([{ id: uc.id, name: uc.name, context: ctx }]);
      if (res?.scores) {
        uc.scores = res.scores;
        uc.rationale = res.rationale;
        uc.matrix = scoresToMatrix(res.scores);
      }
    } else if (type === 'canvas') {
      uc.canvas = await draftCanvas(uc.name, ctx);
    } else if (type === 'kill') {
      uc.killIdea = await killIdea(uc.name, ctx);
    }
    await saveWorkshop(params.slug, pack, row?.status ?? 'generated');
    return NextResponse.json({ useCase: uc as WorkshopUseCase });
  } catch (e: any) {
    return NextResponse.json({ error: `Assist failed: ${e.message ?? e}` }, { status: 502 });
  }
}
