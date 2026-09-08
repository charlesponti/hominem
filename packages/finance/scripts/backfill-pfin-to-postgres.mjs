#!/usr/bin/env node
/**
 * W-005 (throwaway): verify the hominem Postgres finance data for one user
 * against the `personal finance` SQLite product, and remediate the one known
 * gap — the 731 `recurring` flags the September load never copied.
 *
 * The dev database already contains the full 20,560-row load (sources,
 * per-account sums, dup groups, and gates all match), so this script does
 * NOT insert transactions. It only ever UPDATEs `recurring` flags, and only
 * with --commit (default is verify + dry-run).
 *
 * Not exported, not typechecked, not linted. Delete after W-005.
 *
 *   node backfill-pfin-to-postgres.mjs --user charles.ponti@icloud.com [--commit]
 *   Options: --db-url (default $DATABASE_URL, required), --sqlite (default the
 *   personal_finance.db path), --allow-remote (refuse non-local hosts otherwise)
 */

import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const requireFromDb = createRequire(path.join(here, '..', '..', 'db', 'package.json'));
const { Pool } = requireFromDb('pg');

const DEFAULT_SQLITE = '/Users/charlesponti/Developer/personal finance/personal_finance.db';

function parseArgs(argv) {
  const out = {
    commit: false,
    allowRemote: false,
    dbUrl: null,
    user: null,
    sqlite: DEFAULT_SQLITE,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--commit') out.commit = true;
    else if (arg === '--allow-remote') out.allowRemote = true;
    else if (arg === '--db-url') out.dbUrl = argv[++i];
    else if (arg === '--user') out.user = argv[++i];
    else if (arg === '--sqlite') out.sqlite = argv[++i];
    else if (arg.startsWith('--db-url=')) out.dbUrl = arg.slice('--db-url='.length);
    else if (arg.startsWith('--user=')) out.user = arg.slice('--user='.length);
    else if (arg.startsWith('--sqlite=')) out.sqlite = arg.slice('--sqlite='.length);
    else throw new Error(`unknown arg: ${arg}`);
  }
  return out;
}

const money2 = (value) => (Math.round(Number(value) * 100) / 100).toFixed(2);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dbUrl = args.dbUrl ?? process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('missing --db-url and $DATABASE_URL');
  if (!args.user) throw new Error('missing --user <email|uuid>');
  const host = new URL(dbUrl).hostname;
  if (!['localhost', '127.0.0.1', '::1'].includes(host) && !args.allowRemote) {
    throw new Error(`refusing non-local host ${host} without --allow-remote`);
  }

  const lite = new DatabaseSync(args.sqlite, { readOnly: true });
  const pool = new Pool({ connectionString: dbUrl });
  let failures = 0;
  const check = (label, ok, detail = '') => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
    if (!ok) failures++;
  };

  try {
    // ---- resolve user ----
    const isUuid = /^[0-9a-f-]{36}$/i.test(args.user);
    const userRow = isUuid
      ? (await pool.query('SELECT id, email FROM "user" WHERE id = $1', [args.user])).rows[0]
      : (
          await pool.query('SELECT id, email FROM "user" WHERE lower(email) = lower($1)', [
            args.user,
          ])
        ).rows[0];
    if (!userRow) throw new Error(`no such user: ${args.user}`);
    const userId = userRow.id;
    console.log(`user: ${userRow.email} (${userId})`);

    // ---- read SQLite product ----
    const pfAccounts = lite.prepare('SELECT id, name FROM accounts WHERE is_placeholder = 0').all();
    const pfTxns = lite
      .prepare(
        `SELECT rowid AS rowid, account_id AS accountId, posted_on AS postedOn,
                amount, transaction_type AS type, description, source,
                external_id AS externalId, excluded, recurring
         FROM transactions ORDER BY rowid`,
      )
      .all();
    const pfByAccount = new Map();
    for (const t of pfTxns) {
      const entry = pfByAccount.get(t.accountId) ?? { count: 0, sum: 0 };
      entry.count++;
      if (!t.excluded) entry.sum = Math.round((entry.sum + t.amount) * 100) / 100;
      pfByAccount.set(t.accountId, entry);
    }
    const pfNameById = new Map(pfAccounts.map((a) => [a.id, a.name]));

    // ---- read Postgres ----
    const pgAccounts = (
      await pool.query('SELECT id, name FROM app.finance_accounts WHERE user_id = $1', [userId])
    ).rows;
    const pgNameById = new Map();
    const dupNames = [];
    for (const a of pgAccounts) {
      if (pgNameById.has(a.name)) dupNames.push(a.name);
      pgNameById.set(a.name, a.id);
    }
    const pgTxns = (
      await pool.query(
        `SELECT id, account_id AS "accountId", posted_on::text AS "postedOn", amount,
                transaction_type AS type, description, source, external_id AS "externalId",
                excluded, recurring
         FROM app.finance_transactions WHERE user_id = $1`,
        [userId],
      )
    ).rows;

    // ---- 1. account sets ----
    const pfNames = new Set(pfAccounts.map((a) => a.name));
    const pgNames = new Set(pgAccounts.map((a) => a.name));
    const missing = [...pfNames].filter((n) => !pgNames.has(n));
    const extra = [...pgNames].filter((n) => !pfNames.has(n));
    check(
      'account sets equal',
      missing.length === 0 && extra.length === 0 && dupNames.length === 0,
      `missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)} dupes=${JSON.stringify(dupNames)}`,
    );

    // ---- 2. per-account counts + sums ----
    const pgByAccount = new Map();
    for (const t of pgTxns) {
      const entry = pgByAccount.get(t.accountId) ?? { count: 0, sum: 0 };
      entry.count++;
      if (!t.excluded) entry.sum = Math.round((entry.sum + Number(t.amount)) * 100) / 100;
      pgByAccount.set(t.accountId, entry);
    }
    let acctMismatch = 0;
    for (const a of pfAccounts) {
      const expected = pfByAccount.get(a.id) ?? { count: 0, sum: 0 };
      const pgId = pgNameById.get(a.name);
      const actual = (pgId && pgByAccount.get(pgId)) || { count: 0, sum: 0 };
      if (expected.count !== actual.count || Math.abs(expected.sum - actual.sum) > 0.01) {
        acctMismatch++;
        console.log(
          `  MISMATCH ${a.name}: pf=${expected.count}/${expected.sum} pg=${actual.count}/${actual.sum}`,
        );
      }
    }
    check(
      'per-account counts+sums (1c)',
      acctMismatch === 0,
      `${pfAccounts.length} accounts compared`,
    );

    // ---- 3. external-id identity (exact 1:1 proof) ----
    // The September load normalized PF's 'hominem-prod' provenance label to
    // 'hominem' (19,166 rows); values are otherwise byte-identical. Accept
    // the live label — rewriting 19k rows buys nothing — but compare the raw
    // distributions for the record.
    const normSource = (s) => (s === 'hominem-prod' ? 'hominem' : s);
    const key = (source, ext) => `${normSource(source)}||${ext}`;
    const pfSources = {};
    for (const t of pfTxns) pfSources[t.source] = (pfSources[t.source] ?? 0) + 1;
    console.log(`  sources pf=${JSON.stringify(pfSources)}`);
    const pfExt = new Map();
    let pfNullExt = 0;
    for (const t of pfTxns) {
      const ext = (t.externalId ?? '').trim();
      if (!ext) {
        pfNullExt++;
        continue;
      }
      pfExt.set(key(t.source, ext), (pfExt.get(key(t.source, ext)) ?? 0) + 1);
    }
    const pgExt = new Map();
    let pgNullExt = 0;
    for (const t of pgTxns) {
      const ext = (t.externalId ?? '').trim();
      if (!ext) {
        pgNullExt++;
        continue;
      }
      pgExt.set(key(t.source, ext), (pgExt.get(key(t.source, ext)) ?? 0) + 1);
    }
    const missingExt = [...pfExt.keys()].filter((k) => !pgExt.has(k));
    const extraExt = [...pgExt.keys()].filter((k) => !pfExt.has(k));
    const dupExt = [...pgExt.entries()].filter(([, n]) => n > 1);
    check(
      'external-id identity',
      missingExt.length === 0 && extraExt.length === 0 && dupExt.length === 0,
      `pf=${pfExt.size} pg=${pgExt.size} null(pf/pg)=${pfNullExt}/${pgNullExt}`,
    );
    if (missingExt.length > 0) console.log('  missing sample:', missingExt.slice(0, 5));

    // ---- 4. gates parity ----
    const dupCount = Number(
      (
        await pool.query(
          `SELECT COUNT(*) AS c FROM (SELECT 1 FROM app.finance_transactions WHERE user_id = $1 GROUP BY account_id, posted_on, abs(amount), lower(description) HAVING COUNT(*) > 1) d`,
          [userId],
        )
      ).rows[0].c,
    );
    const signCount = Number(
      (
        await pool.query(
          `SELECT COUNT(*) AS c FROM app.finance_transactions WHERE user_id = $1 AND ((transaction_type = 'debit' AND amount > 0) OR (transaction_type = 'credit' AND amount < 0))`,
          [userId],
        )
      ).rows[0].c,
    );
    const orphanCount = Number(
      (
        await pool.query(
          `SELECT COUNT(*) AS c FROM app.finance_transactions t LEFT JOIN app.finance_accounts a ON a.id = t.account_id AND a.user_id = t.user_id WHERE t.user_id = $1 AND a.id IS NULL`,
          [userId],
        )
      ).rows[0].c,
    );
    const uncat = Number(
      (
        await pool.query(
          `SELECT COUNT(*) AS c FROM app.finance_transactions WHERE user_id = $1 AND category_id IS NULL`,
          [userId],
        )
      ).rows[0].c,
    );
    check(
      'gates parity',
      dupCount === 61 && signCount === 0 && orphanCount === 0 && uncat === 581,
      `dups=${dupCount}/61 sign=${signCount}/0 orphans=${orphanCount}/0 uncat=${uncat}/581`,
    );

    // ---- 5. recurring gap + remediation plan ----
    const pfRecurring = pfTxns.filter((t) => t.recurring === 1);
    const pgRecurringCount = pgTxns.filter((t) => t.recurring).length;
    console.log(`recurring: pf=${pfRecurring.length} pg=${pgRecurringCount}`);

    // index PG rows for matching
    const pgByExt = new Map();
    for (const t of pgTxns) {
      const ext = (t.externalId ?? '').trim();
      if (ext) pgByExt.set(key(t.source, ext), t);
    }
    const groupKey = (accountName, postedOn, amount, description) =>
      `${accountName}||${postedOn}||${money2(amount)}||${(description ?? '').toLowerCase()}`;
    const pgGroups = new Map();
    for (const t of pgTxns) {
      const name = [...pgNameById.entries()].find(([, id]) => id === t.accountId)?.[0] ?? '?';
      const k = groupKey(name, t.postedOn, t.amount, t.description);
      if (!pgGroups.has(k)) pgGroups.set(k, []);
      pgGroups.get(k).push(t);
    }
    for (const list of pgGroups.values()) list.sort((a, b) => (a.id < b.id ? -1 : 1));

    const planned = [];
    const anomalies = [];
    const extOccurrence = new Map();
    for (const t of pfRecurring) {
      const ext = (t.externalId ?? '').trim();
      const name = pfNameById.get(t.accountId) ?? '?';
      if (ext) {
        const match = pgByExt.get(key(t.source, ext));
        if (!match) {
          anomalies.push(`no-pg-match ext=${t.source}:${ext.slice(0, 24)}`);
          continue;
        }
        if (match.recurring) continue; // already applied (idempotent re-run)
        planned.push(match.id);
      } else {
        const k = groupKey(name, t.postedOn, t.amount, t.description);
        const n = extOccurrence.get(k) ?? 0;
        extOccurrence.set(k, n + 1);
        const group = pgGroups.get(k) ?? [];
        if (group.length === 0) {
          anomalies.push(`no-pg-group ${k}`);
          continue;
        }
        const unset = group.filter((c) => !c.recurring);
        if (unset.length === 0) continue; // idempotent re-run: already applied
        if (n >= unset.length) {
          anomalies.push(`group-underflow ${k} (pf#${n + 1}, ${unset.length} unset)`);
          continue;
        }
        planned.push(unset[n].id);
      }
    }
    // verify occurrence-matched ids are still unset (guard double-plan within run)
    const uniquePlanned = [...new Set(planned)];
    check(
      'recurring plan consistent',
      uniquePlanned.length === planned.length,
      `${planned.length} planned, ${uniquePlanned.length} unique`,
    );
    if (anomalies.length > 0) {
      console.log('  anomalies:');
      for (const a of anomalies.slice(0, 10)) console.log(`   - ${a}`);
    }

    if (!args.commit) {
      console.log(
        `\nDRY RUN: would set recurring=true on ${uniquePlanned.length} rows (pf recurring=${pfRecurring.length}, pg already=${pgRecurringCount}). Re-run with --commit to apply.`,
      );
    } else {
      if (anomalies.length > 0)
        throw new Error(`aborting commit with ${anomalies.length} match anomalies`);
      if (uniquePlanned.length === 0) {
        console.log('\nNothing to do — all recurring flags already set.');
      } else {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const res = await client.query(
            'UPDATE app.finance_transactions SET recurring = true WHERE user_id = $2 AND id = ANY($1)',
            [uniquePlanned, userId],
          );
          const after = Number(
            (
              await client.query(
                'SELECT COUNT(*) AS c FROM app.finance_transactions WHERE user_id = $1 AND recurring = true',
                [userId],
              )
            ).rows[0].c,
          );
          const sumAfter = Number(
            (
              await client.query(
                `SELECT SUM(CASE WHEN excluded THEN 0 ELSE amount END) AS s FROM app.finance_transactions WHERE user_id = $1`,
                [userId],
              )
            ).rows[0].s,
          );
          if (res.rowCount !== uniquePlanned.length)
            throw new Error(`updated ${res.rowCount}, planned ${uniquePlanned.length}`);
          if (after !== pfRecurring.length)
            throw new Error(`recurring count ${after}, expected ${pfRecurring.length}`);
          if (Math.abs(sumAfter - 113002.32) > 0.01)
            throw new Error(`ledger sum moved: ${sumAfter}`);
          await client.query('COMMIT');
          console.log(
            `\nCOMMITTED: ${res.rowCount} flags set; recurring=${after}; ledger sum unchanged.`,
          );
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }
    }

    console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
    process.exitCode = failures === 0 ? 0 : 1;
  } finally {
    lite.close();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
