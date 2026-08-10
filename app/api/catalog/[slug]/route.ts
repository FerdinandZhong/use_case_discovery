import { NextRequest, NextResponse } from 'next/server';
import { getSurvey, listResponses } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { renderCatalog, CatalogFormat } from '@/lib/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/catalog/[slug]?format=md|json|csv&include=submitted|all  (admin only)
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const survey = await getSurvey(params.slug);
  if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 });

  const formatParam = (req.nextUrl.searchParams.get('format') ?? 'md').toLowerCase();
  const format: CatalogFormat = ['md', 'json', 'csv'].includes(formatParam)
    ? (formatParam as CatalogFormat)
    : 'md';

  const includeAll = req.nextUrl.searchParams.get('include') === 'all';
  const all = await listResponses(params.slug);
  const responses = includeAll ? all : all.filter((r) => r.status === 'submitted');

  const { body, contentType } = renderCatalog(format, { survey, responses });
  const download = req.nextUrl.searchParams.get('download') === '1';
  const headers: Record<string, string> = { 'Content-Type': `${contentType}; charset=utf-8` };
  if (download) {
    headers['Content-Disposition'] = `attachment; filename="${params.slug}.${format}"`;
  }
  return new NextResponse(body, { headers });
}
