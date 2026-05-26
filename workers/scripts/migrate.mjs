// D1 migration runner
// Usage: node scripts/migrate.mjs [database_name]
// Requires wrangler to be installed

import { execSync } from 'child_process';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'src', 'db', 'migrations');
const dbName = process.argv[2] || '2edge-db';

const files = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`Running ${files.length} migrations on ${dbName}...\n`);

for (const file of files) {
  const filePath = join(migrationsDir, file);
  const sql = readFileSync(filePath, 'utf-8');

  console.log(`[${file}]`);

  try {
    execSync(
      `npx wrangler d1 execute ${dbName} --file="${filePath}" --local`,
      { stdio: 'inherit', cwd: join(__dirname, '..') }
    );
    console.log(`  ✓ OK\n`);
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}`);
  }
}

console.log('Migrations complete.');
