import { NextRequest, NextResponse } from 'next/server';
import { createResponse, getSurvey } from '@/lib/db';
import { newToken } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/responses — start a new (in-progress) response for a survey.
// Public: this is the customer-facing entry point. Body: { slug: string }
// Returns { token } which the browser stores in localStorage to enable resume.
export async function POST(req: NextRequest) {
  const limited = rateLimit(`responses:create:${clientIp(req)}`, 20, 60_000);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const slug = String(body?.slug ?? '').trim().toLowerCase();
  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });

  const survey = await getSurvey(slug);
  if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
  if (survey.status === 'closed') {
    return NextResponse.json({ error: 'This survey is closed' }, { status: 403 });
  }

  const token = newToken();
  const response = await createResponse(token, slug);
  return NextResponse.json({ token, response }, { status: 201 });
}
