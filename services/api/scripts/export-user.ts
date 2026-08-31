/**
 * Exports every row belonging to a user across all `app.*` tables (plus their
 * `user` row) to `.exports/<userId>/<table>.csv`.
 *
 * Usage: pnpm export-user --userId <id> [--env development|production] [--yes]
 *
 * Table discovery is generic - it just looks through information_schema for
 * any `app.*` table with a user/owner column. `user_id`, `userid`,
 * `owner_userid`, `owner_userId`, whatever casing, they all normalize to the
 * same match, so new tables work automatically as long as they follow one of
 * those naming conventions.
 *
 * `--env production` needs PRODUCTION_DATABASE_URL set (never hardcode it)
 * plus `--yes`, since this pulls real user data onto your local disk.
 */
import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const LOCAL_DEV_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5434/hominem';

function die(message: string): never {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function resolveDatabaseUrl(env: 'development' | 'production'): string {
  if (env === 'production') {
    const url = process.env.PRODUCTION_DATABASE_URL;
    if (!url) {
      die(
        'PRODUCTION_DATABASE_URL must be set to export from production (never hardcoded in this script).',
      );
    }
    return url;
  }
  return process.env.DATABASE_URL ?? LOCAL_DEV_DATABASE_URL;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text =
    typeof value === 'string'
      ? value
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const columns = Object.keys(rows[0]);
  const lines = [columns.map(csvCell).join(',')];
  for (const row of rows) {
    lines.push(columns.map((col) => csvCell(row[col])).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

async function main() {
  const { values } = parseArgs({
    options: {
      userId: { type: 'string' },
      env: { type: 'string', default: 'development' },
      yes: { type: 'boolean', default: false },
      out: { type: 'string', default: '.exports' },
    },
  });

  const userId = values.userId;
  if (!userId) die('--userId is required.');

  const env = values.env;
  if (env !== 'development' && env !== 'production') {
    die(`--env must be "development" or "production", got "${env}".`);
  }

  if (env === 'production' && !values.yes) {
    die('Exporting from production requires --yes to confirm.');
  }

  const databaseUrl = resolveDatabaseUrl(env);
  // @hominem/db reads DATABASE_URL at import time (opens a connection pool as
  // a side effect), so it has to be set before the dynamic import below - a
  // static import wouldn't work since those get hoisted and run first.
  process.env.DATABASE_URL = databaseUrl;

  const { pool } = await import('@hominem/db');

  console.log(
    `→ exporting user ${userId} from ${env} (${databaseUrl.replace(/:[^:@]*@/, ':***@')})`,
  );

  const userRow = await pool.query('SELECT * FROM "user" WHERE id = $1', [userId]);
  if (userRow.rowCount === 0) {
    die(`No user found with id ${userId} in ${env}.`);
  }

  const outDir = join(values.out, userId);
  await mkdir(outDir, { recursive: true });

  await writeFile(join(outDir, 'user.csv'), toCsv(userRow.rows));
  console.log(`  ✓ user (1 row)`);

  const ownerColumns = await pool.query<{ table_name: string; column_name: string }>(
    `
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'app'
      AND replace(lower(column_name), '_', '') IN ('userid', 'owneruserid')
    ORDER BY table_name, column_name
    `,
  );

  // A table could have both a userid and an owner_userid column - just keep
  // whichever comes first alphabetically (owner_userid), since that's also
  // the more intentional of the two conventions here.
  const tableColumn = new Map<string, string>();
  for (const row of ownerColumns.rows) {
    if (!tableColumn.has(row.table_name)) {
      tableColumn.set(row.table_name, row.column_name);
    }
  }

  const tables = [...tableColumn.keys()].sort();
  let exportedTables = 0;
  let totalRows = 0;

  for (const table of tables) {
    const column = tableColumn.get(table);
    if (!column) continue;

    const result = await pool.query(`SELECT * FROM "app"."${table}" WHERE "${column}" = $1`, [
      userId,
    ]);

    if (result.rowCount === 0) {
      console.log(`  · app.${table} (0 rows, skipped)`);
      continue;
    }

    await writeFile(join(outDir, `${table}.csv`), toCsv(result.rows));
    console.log(`  ✓ app.${table} (${result.rowCount} rows)`);
    exportedTables += 1;
    totalRows += result.rowCount ?? 0;
  }

  console.log(
    `\n✓ exported user ${userId}: ${exportedTables} table(s), ${totalRows + 1} row(s) total, to ${outDir}/`,
  );
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
