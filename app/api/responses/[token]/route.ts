import { NextRequest, NextResponse } from 'next/server';
import { getResponse, updateResponse } from '@/lib/db';
import { clientIp, rateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ANSWERS_BYTES = 128 * 1024; // 128 KB cap on stored answers

// GET /api/responses/[token] — load an in-progress response (for resume).
// Public but unguessable: the 48-char token acts as the capability.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const response = await getResponse(params.token);
  if (!response) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ response });
}

// PATCH /api/responses/[token] — autosave partial answers, or submit.
// Body: { answers?, respondent_name?, respondent_email?, role?, status? }
export async function PATCH(req: NextRequest, { params }: { params: { token: string } }) {
  const limited = rateLimit(`responses:patch:${clientIp(req)}`, 120, 60_000);
  if (limited) return limited;

  const existing = await getResponse(params.token);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.status === 'submitted') {
    return NextResponse.json({ error: 'This response was already submitted' }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

  if (body.answers && JSON.stringify(body.answers).length > MAX_ANSWERS_BYTES) {
    return NextResponse.json({ error: 'Answer payload too large' }, { status: 413 });
  }

  const status = body.status === 'submitted' ? 'submitted' : undefined;

  const response = await updateResponse(params.token, {
    answers: body.answers && typeof body.answers === 'object' ? body.answers : undefined,
    respondent_name: typeof body.respondent_name === 'string' ? body.respondent_name : undefined,
    respondent_email: typeof body.respondent_email === 'string' ? body.respondent_email : undefined,
    role: typeof body.role === 'string' ? body.role : undefined,
    status,
  });

  return NextResponse.json({ response });
}
