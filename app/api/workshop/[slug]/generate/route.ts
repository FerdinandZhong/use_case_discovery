import { NextRequest, NextResponse } from 'next/server';
import { getSurvey, getWorkshop, listResponses, saveWorkshop } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { extractCandidates, signalsToText, strategyToText } from '@/lib/aggregate';
import { llmConfigured } from '@/lib/llm';
import { prioritize } from '@/lib/agents/prioritize';
import { draftCanvas } from '@/lib/agents/canvas';
import { draftArchitecture } from '@/lib/agents/architecture';
import { killIdea } from '@/lib/agents/killIdea';
import { synthesize } from '@/lib/agents/synthesize';
import { scoresToMatrix, UseCaseScores, WorkshopPack, WorkshopUseCase } from '@/lib/workshop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // generous — this is a pre-session batch pass

const NEUTRAL: UseCaseScores = {
  strategicAlignment: 3, frequencyVolume: 3, potentialRoi: 3, userExperience: 3,
  dataAvailability: 3, toleranceForError: 3, complexityOfLogic: 3, integrationEase: 3,
};

// POST /api/workshop/[slug]/generate — run the multi-agent pre-bake pass over the
// submitted survey responses and store the resulting workshop pack. Admin only.
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await llmConfigured())) {
    return NextResponse.json(
      { error: 'LLM not configured. Set it on the admin Settings page (or via LLM_* env vars).' },
      { status: 400 },
    );
  }

  const survey = await getSurvey(params.slug);
  if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 });

  const submitted = (await listResponses(params.slug)).filter((r) => r.status === 'submitted');
  const candidates = extractCandidates(submitted);
  if (candidates.length === 0) {
    return NextResponse.json({ error: 'No submitted responses with use cases to analyze yet.' }, { status: 422 });
  }

  // Fold facilitator-entered strategy (North Star) + session signals into every
  // candidate's context so scoring/canvas/kill are anchored to the room's goal.
  const existing = await getWorkshop(params.slug);
  const strat = strategyToText((existing?.data as any)?.strategy);
  const sig = signalsToText((existing?.data as any)?.signals);
  candidates.forEach((c) => {
    if (strat) c.context += `\n${strat}`;
    if (sig) c.context += `\n${sig}`;
  });

  try {
    // 1) Score all candidates in one call (fatal errors fall back to neutral scores).
    let scored: Awaited<ReturnType<typeof prioritize>> = [];
    try {
      scored = await prioritize(candidates);
    } catch (e) {
      console.error('prioritize failed, using neutral scores:', e);
    }
    const scoreById = new Map(scored.map((s) => [s.id, s]));

    // 2) Draft canvas + kill-idea for each candidate, in parallel, resilient per item.
    const useCases: WorkshopUseCase[] = await Promise.all(
      candidates.map(async (c): Promise<WorkshopUseCase> => {
        const scores = scoreById.get(c.id)?.scores ?? NEUTRAL;
        const [canvas, kill] = await Promise.all([
          draftCanvas(c.name, c.context).catch(() => undefined),
          killIdea(c.name, c.context).catch(() => undefined),
        ]);
        return {
          id: c.id,
          name: c.name,
          summary: scoreById.get(c.id)?.rationale ?? c.context.slice(0, 140),
          source: 'survey',
          context: c.context,
          scores,
          rationale: scoreById.get(c.id)?.rationale,
          matrix: scoresToMatrix(scores),
          canvas,
          killIdea: kill,
          pattern: c.pattern,
          systems: c.systems,
          hitl: c.hitl,
        };
      }),
    );

    // 3) Architecture for the top-ranked use case.
    const top = [...useCases].sort(
      (a, b) => b.matrix.value + b.matrix.feasibility - (a.matrix.value + a.matrix.feasibility),
    )[0];
    const arch = top
      ? await draftArchitecture(top.name, top.context ?? top.summary).catch(() => null)
      : null;

    // 4) Synthesize the leave-behind.
    const roadmap = await synthesize(
      useCases.map((u) => ({ id: u.id, name: u.name, value: u.matrix.value, feasibility: u.matrix.feasibility })),
    ).catch(() => null);

    // Carry the facilitator's data ask forward onto the freshly-synthesized roadmap.
    const priorDataAsk = (existing?.data as any)?.roadmap?.dataAsk;

    const pack: WorkshopPack = {
      useCases,
      architecture: arch ? { forUseCaseId: top?.id, components: arch.components, notes: arch.notes } : null,
      roadmap: roadmap ? { ...roadmap, dataAsk: priorDataAsk } : null,
      strategy: (existing?.data as any)?.strategy, // preserve Phase-01 North Star across regenerate
      signals: (existing?.data as any)?.signals, // preserve facilitator session signals across regenerate
      generatedAt: new Date().toISOString(),
    };

    const row = await saveWorkshop(params.slug, pack, 'generated');
    return NextResponse.json({ status: row.status, pack: row.data });
  } catch (e: any) {
    console.error('workshop generate failed:', e);
    return NextResponse.json({ error: `Generation failed: ${e.message ?? e}` }, { status: 502 });
  }
}
