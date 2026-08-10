import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { chat } from '@/lib/llm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/settings/llm/test — verify the configured endpoint with a tiny call.
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const reply = await chat(
      [{ role: 'user', content: 'Reply with the single word: OK' }],
      { maxTokens: 5, temperature: 0 },
    );
    return NextResponse.json({ ok: true, sample: reply.slice(0, 80) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 200 });
  }
}
