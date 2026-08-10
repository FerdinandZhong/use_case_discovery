import { NextRequest, NextResponse } from 'next/server';
import { deleteSurvey, getSurvey } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DELETE /api/surveys/[slug] — remove a customer survey AND all its responses
// (cascade). Admin only. Supports GDPR-style "right to erasure" / data cleanup.
export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const survey = await getSurvey(params.slug);
  if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 });

  await deleteSurvey(params.slug);
  return NextResponse.json({ ok: true });
}
