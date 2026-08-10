import { NextRequest, NextResponse } from 'next/server';
import { createSurvey, listSurveys } from '@/lib/db';
import { isAdmin, slugSuffix } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/surveys — list customer survey instances (admin only).
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const surveys = await listSurveys();
  return NextResponse.json({ surveys });
}

// POST /api/surveys — create a customer survey instance (admin only).
// Body: { slug: string, displayName: string }
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const rawSlug = String(body?.slug ?? '').trim().toLowerCase();
  const displayName = String(body?.displayName ?? '').trim();

  const base = rawSlug.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!base) return NextResponse.json({ error: 'A valid slug is required' }, { status: 400 });
  if (!displayName) return NextResponse.json({ error: 'displayName is required' }, { status: 400 });

  // Append an unguessable suffix so survey links can't be enumerated from the name.
  const slug = `${base}-${slugSuffix()}`;
  const survey = await createSurvey(slug, displayName);
  return NextResponse.json({ survey }, { status: 201 });
}
