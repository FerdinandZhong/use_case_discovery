import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getLlmConfig, llmConfigSource, setLlmConfig } from '@/lib/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/settings/llm — current LLM config (key masked). Admin only.
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const cfg = await getLlmConfig();
  return NextResponse.json({
    baseUrl: cfg.baseUrl,
    model: cfg.model,
    hasKey: Boolean(cfg.apiKey),
    keyLast4: cfg.apiKey ? cfg.apiKey.slice(-4) : '',
    source: await llmConfigSource(),
  });
}

// PUT /api/settings/llm — save config. Admin only.
// An empty apiKey means "leave the stored key unchanged".
export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  await setLlmConfig({
    baseUrl: typeof body.baseUrl === 'string' ? body.baseUrl.trim() : undefined,
    apiKey: typeof body.apiKey === 'string' ? body.apiKey.trim() : undefined,
    model: typeof body.model === 'string' ? body.model.trim() : undefined,
  });
  return NextResponse.json({ ok: true });
}
