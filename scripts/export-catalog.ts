// Writes version-controlled catalog files for a customer into ./catalog/.
// Usage:  npm run export-catalog <slug> [--all]
//   <slug>   customer survey slug (e.g. marigold)
//   --all    include in-progress responses (default: submitted only)
//
// Produces catalog/<slug>.md, catalog/<slug>.json, catalog/<slug>.csv

import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getSurvey, listResponses } from '../lib/db';
import { renderCatalog } from '../lib/catalog';

async function main() {
  const slug = process.argv[2];
  const includeAll = process.argv.includes('--all');
  if (!slug) {
    console.error('Usage: npm run export-catalog <slug> [--all]');
    process.exit(1);
  }

  const survey = await getSurvey(slug);
  if (!survey) {
    console.error(`✗ No survey found for slug "${slug}".`);
    process.exit(1);
  }

  const all = await listResponses(slug);
  const responses = includeAll ? all : all.filter((r) => r.status === 'submitted');

  const dir = join(process.cwd(), 'catalog');
  mkdirSync(dir, { recursive: true });

  for (const format of ['md', 'json', 'csv'] as const) {
    const { body } = renderCatalog(format, { survey, responses });
    const file = join(dir, `${slug}.${format}`);
    writeFileSync(file, body, 'utf8');
    console.log(`  ✓ ${file}`);
  }
  console.log(`✓ Exported ${responses.length} response(s) for "${survey.display_name}".`);
}

main().catch((err) => {
  console.error('✗ Export failed:', err);
  process.exit(1);
});
