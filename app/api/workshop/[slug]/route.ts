import { NextRequest, NextResponse } from 'next/server';
import { getSurvey, getWorkshop, saveWorkshop } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { emptyPack } from '@/lib/workshop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/workshop/[slug] — return the workshop pack (empty if not generated yet).
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const survey = await getSurvey(params.slug);
  if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 });

  const row = await getWorkshop(params.slug);
  return NextResponse.json({
    survey,
    status: row?.status ?? 'draft',
    pack: row?.data ?? emptyPack(),
  });
}

// PATCH /api/workshop/[slug] — save facilitator edits (the whole pack). Admin only.
export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const survey = await getSurvey(params.slug);
  if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body?.pack || typeof body.pack !== 'object') {
    return NextResponse.json({ error: 'Missing pack' }, { status: 400 });
  }
  const row = await saveWorkshop(params.slug, body.pack, body.status ?? 'generated');
  return NextResponse.json({ status: row.status, pack: row.data });
}
