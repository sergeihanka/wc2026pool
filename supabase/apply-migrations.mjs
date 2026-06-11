/**
 * apply-migrations.mjs
 * Applies all SQL migration files in supabase/migrations/ to the Supabase project.
 *
 * Usage (two options):
 *
 * Option A — via Supabase Management API (requires personal access token):
 *   SUPABASE_ACCESS_TOKEN=<pat> node supabase/apply-migrations.mjs
 *
 * Option B — via direct Postgres connection (requires DB password):
 *   SUPABASE_DB_PASSWORD=<password> node supabase/apply-migrations.mjs
 *
 * The script reads SUPABASE_URL and project ref from environment or defaults.
 * Never run with secrets in process arguments — use env vars.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');
const PROJECT_REF = 'xkvubppozyaxlvjylgjx';
const MANAGEMENT_API = 'https://api.supabase.com';

// ─── Read credentials from env (never hardcoded) ─────────────────────────────
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!ACCESS_TOKEN && !DB_PASSWORD) {
  console.error(
    'Error: Provide either SUPABASE_ACCESS_TOKEN (for Management API) ' +
    'or SUPABASE_DB_PASSWORD (for direct psql connection).'
  );
  process.exit(1);
}

// ─── Load migration files in order ───────────────────────────────────────────
const migrationFiles = readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

if (migrationFiles.length === 0) {
  console.error('No migration files found in', MIGRATIONS_DIR);
  process.exit(1);
}

console.log(`Found ${migrationFiles.length} migration(s):`, migrationFiles.join(', '));

// ─── Apply via Management API ─────────────────────────────────────────────────
if (ACCESS_TOKEN) {
  console.log('\nApplying via Supabase Management API...');

  for (const file of migrationFiles) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`  Applying ${file}...`);

    const response = await fetch(
      `${MANAGEMENT_API}/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      }
    );

    const body = await response.text();
    if (!response.ok) {
      console.error(`  FAILED (${response.status}): ${body}`);
      process.exit(1);
    }

    console.log(`  OK: ${file}`);
  }

  console.log('\nAll migrations applied successfully via Management API.');
  process.exit(0);
}

// ─── Apply via direct Postgres connection (requires pg package) ───────────────
if (DB_PASSWORD) {
  let pg;
  try {
    // Try global pg install first, then project local
    const paths = [
      '/Users/sergeihanka/.nvm/versions/node/v24.14.0/lib/node_modules/pg/lib/index.js',
    ];
    for (const p of paths) {
      try {
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        pg = require(p.replace(/\/lib\/index\.js$/, ''));
        break;
      } catch { continue; }
    }
    if (!pg) throw new Error('pg not found');
  } catch {
    console.error('pg package not available. Install globally: npm install -g pg');
    process.exit(1);
  }

  const { Client } = pg;
  const client = new Client({
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Postgres.');

  for (const file of migrationFiles) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`  Applying ${file}...`);
    try {
      await client.query(sql);
      console.log(`  OK: ${file}`);
    } catch (err) {
      console.error(`  FAILED: ${file}`, err.message);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log('\nAll migrations applied successfully via direct connection.');
}
