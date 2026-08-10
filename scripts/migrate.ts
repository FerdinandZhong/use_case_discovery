// Initializes the database schema (creates tables if absent).
// Run with:  npm run migrate
//
// Picks the backend from the environment: DATABASE_URL set → Postgres,
// otherwise embedded SQLite at SQLITE_PATH (default ./data/survey.db).
// Safe to run repeatedly.

import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { dbKind, initDb } from '../lib/db';

async function main() {
  console.log(`Initializing schema (backend: ${dbKind()})…`);
  await initDb();
  console.log('✓ Schema ready.');
  process.exit(0);
}

main().catch((err) => {
  console.error('✗ Migration failed:', err);
  process.exit(1);
});
