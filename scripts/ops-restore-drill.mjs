import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Local Compose restore drill.
 * Proves pg_dump → pg_restore against a throwaway database without touching the
 * primary application database name permanently.
 *
 * Requires Docker and the local `urlytix_postgres` container from `pnpm db:up`.
 */

const container = process.env.POSTGRES_CONTAINER ?? 'urlytix_postgres';
const user = process.env.POSTGRES_USER ?? 'urlytix';
const sourceDb = process.env.POSTGRES_DB ?? 'urlytix_db';
const drillDb = `urlytix_restore_drill_${randomBytes(3).toString('hex')}`;
const dumpPath = join(tmpdir(), `urlytix-restore-drill-${Date.now()}.dump`);

function fail(message) {
  console.error(`RESTORE DRILL FAILED: ${message}`);
  process.exit(1);
}

console.log(`Restore drill starting against container ${container}`);

const inspect = spawnSync('docker', ['inspect', container], {
  encoding: 'utf8',
});
if (inspect.status !== 0) {
  fail(
    `Container ${container} is not running. Start local Postgres with: pnpm db:up`,
  );
}

const dumpBuffer = spawnSync(
  'docker',
  ['exec', '-i', container, 'pg_dump', '-U', user, '-d', sourceDb, '-Fc'],
  { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 },
);

if (dumpBuffer.status !== 0) {
  fail(`pg_dump failed: ${dumpBuffer.stderr?.toString() || 'unknown error'}`);
}

if (!dumpBuffer.stdout || dumpBuffer.stdout.length === 0) {
  fail('pg_dump produced an empty backup.');
}

writeFileSync(dumpPath, dumpBuffer.stdout);
const checksum = createHash('sha256').update(dumpBuffer.stdout).digest('hex');
console.log(`Backup written: ${dumpPath} (${dumpBuffer.stdout.length} bytes)`);
console.log(`SHA-256: ${checksum}`);

const prepare = spawnSync(
  'docker',
  [
    'exec',
    container,
    'sh',
    '-c',
    `dropdb -U ${user} --if-exists ${drillDb} && createdb -U ${user} ${drillDb}`,
  ],
  { encoding: 'utf8' },
);
if (prepare.status !== 0) {
  fail(`Failed to create drill database: ${prepare.stderr}`);
}

const restore = spawnSync(
  'docker',
  [
    'exec',
    '-i',
    container,
    'pg_restore',
    '-U',
    user,
    '-d',
    drillDb,
    '--clean',
    '--if-exists',
    '--no-owner',
  ],
  {
    input: dumpBuffer.stdout,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  },
);

const tableCheck = spawnSync(
  'docker',
  [
    'exec',
    container,
    'psql',
    '-U',
    user,
    '-d',
    drillDb,
    '-tAc',
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';",
  ],
  { encoding: 'utf8' },
);

if (tableCheck.status !== 0) {
  fail(`Restored database query failed: ${tableCheck.stderr}`);
}

const tableCount = Number((tableCheck.stdout || '').trim());
if (!Number.isFinite(tableCount) || tableCount < 1) {
  fail(
    `Restore verification failed (public tables=${tableCheck.stdout.trim()}). pg_restore stderr:\n${restore.stderr || ''}`,
  );
}

const drop = spawnSync(
  'docker',
  ['exec', container, 'dropdb', '-U', user, drillDb],
  { encoding: 'utf8' },
);
if (drop.status !== 0) {
  fail(`Failed to drop drill database: ${drop.stderr}`);
}

try {
  unlinkSync(dumpPath);
} catch {
  // Best-effort cleanup of the local dump artifact.
}

console.log(
  `RESTORE DRILL PASSED: restored ${tableCount} public tables into temporary database, then dropped it.`,
);
console.log(
  'Record this output for quarterly drill evidence. Application rollback remains image-tag based — see docs/runbook.md.',
);
