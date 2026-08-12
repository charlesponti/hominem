import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { promisify } from 'node:util';

import { Pool } from 'pg';

type Row = Record<string, unknown>;
type SelectionReason = 'support' | 'transfer';
type TableMeta = {
  columns: string[];
  name: string;
  ownerColumns: string[];
  primaryKey: string[];
  uniqueKeys: string[][];
};
type ForeignKey = {
  childColumns: string[];
  childTable: string;
  name: string;
  parentColumns: string[];
  parentSchema: string;
  parentTable: string;
};
type SelectedRow = { reason: SelectionReason; row: Row };
type Metadata = { foreignKeys: ForeignKey[]; tables: Map<string, TableMeta> };

const execFileAsync = promisify(execFile);
const BATCH_SIZE = 250;
const USER_TABLE = 'user';
const isIgnoredTable = (table: string) =>
  table === 'ai_usage_events' || table.startsWith('purchase_');
const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;
const keyOf = (row: Row, columns: string[]) => JSON.stringify(columns.map((column) => row[column]));
const checksum = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const stringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map(String)
    : String(value)
        .replace(/^\{|\}$/g, '')
        .split(',');

function die(message: string): never {
  throw new Error(message);
}

function comparable(row: Row, columns: string[]) {
  return Object.fromEntries(columns.map((column) => [column, row[column]]));
}

function transformedRow(
  row: Row,
  ownerColumns: string[],
  userForeignKeys: ForeignKey[],
  sourceUserId: string,
  targetUserId: string,
): Row {
  const result = { ...row };
  for (const column of ownerColumns)
    if (result[column] === sourceUserId) result[column] = targetUserId;
  for (const foreignKey of userForeignKeys) {
    for (const column of foreignKey.childColumns) {
      if (result[column] === sourceUserId) result[column] = targetUserId;
    }
  }
  return result;
}

async function readMetadata(pool: Pool): Promise<Metadata> {
  const tablesResult = await pool.query<{ table_name: string }>(
    `select table_name from information_schema.tables where table_schema = 'app' and table_type = 'BASE TABLE' order by table_name`,
  );
  const tables = new Map<string, TableMeta>();
  for (const { table_name: name } of tablesResult.rows) {
    const columnsResult = await pool.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_schema = 'app' and table_name = $1 order by ordinal_position`,
      [name],
    );
    const primaryKeyResult = await pool.query<{ column_name: string }>(
      `select attribute.attname as column_name
       from pg_constraint c
       join pg_class table_class on table_class.oid = c.conrelid
       join pg_namespace table_schema on table_schema.oid = table_class.relnamespace
       cross join lateral unnest(c.conkey) with ordinality as key_column(attnum, position)
       join pg_attribute attribute on attribute.attrelid = table_class.oid and attribute.attnum = key_column.attnum
       where c.contype = 'p' and table_schema.nspname = 'app' and table_class.relname = $1
       order by key_column.position`,
      [name],
    );
    const uniqueKeyResult = await pool.query<{ columns: string[] }>(
      `select array_agg(attribute.attname order by key_column.position) as columns
       from pg_constraint c
       join pg_class table_class on table_class.oid = c.conrelid
       join pg_namespace table_schema on table_schema.oid = table_class.relnamespace
       cross join lateral unnest(c.conkey) with ordinality as key_column(attnum, position)
       join pg_attribute attribute on attribute.attrelid = table_class.oid and attribute.attnum = key_column.attnum
       where c.contype = 'u' and table_schema.nspname = 'app' and table_class.relname = $1
       group by c.oid`,
      [name],
    );
    const columns = columnsResult.rows.map(({ column_name }) => column_name);
    const primaryKey = primaryKeyResult.rows.map(({ column_name }) => column_name);
    if (primaryKey.length === 0)
      die(`app.${name} has no primary key; refusing to plan an unsafe merge.`);
    tables.set(name, {
      columns,
      name,
      ownerColumns: columns.filter((column) =>
        ['owneruserid', 'userid'].includes(column.toLowerCase().replaceAll('_', '')),
      ),
      primaryKey,
      uniqueKeys: uniqueKeyResult.rows.map(({ columns: uniqueColumns }) =>
        stringArray(uniqueColumns),
      ),
    });
  }
  const foreignKeysResult = await pool.query<ForeignKey>(
    `select child.relname as "childTable", parent_schema.nspname as "parentSchema", parent.relname as "parentTable", c.conname as name,
            array_agg(child_column.attname order by child_key.position) as "childColumns",
            array_agg(parent_column.attname order by child_key.position) as "parentColumns"
     from pg_constraint c
     join pg_class child on child.oid = c.conrelid
     join pg_namespace child_schema on child_schema.oid = child.relnamespace
     join pg_class parent on parent.oid = c.confrelid
     join pg_namespace parent_schema on parent_schema.oid = parent.relnamespace
     cross join lateral unnest(c.conkey) with ordinality as child_key(attnum, position)
     cross join lateral unnest(c.confkey) with ordinality as parent_key(attnum, position)
     join pg_attribute child_column on child_column.attrelid = child.oid and child_column.attnum = child_key.attnum
     join pg_attribute parent_column on parent_column.attrelid = parent.oid and parent_column.attnum = parent_key.attnum and parent_key.position = child_key.position
     where c.contype = 'f' and child_schema.nspname = 'app'
     group by child.relname, parent_schema.nspname, parent.relname, c.conname`,
  );
  return {
    foreignKeys: foreignKeysResult.rows.map((foreignKey) => ({
      ...foreignKey,
      childColumns: stringArray(foreignKey.childColumns),
      parentColumns: stringArray(foreignKey.parentColumns),
    })),
    tables,
  };
}

function fingerprint(metadata: Metadata) {
  return checksum({
    foreignKeys: metadata.foreignKeys.sort((left, right) => left.name.localeCompare(right.name)),
    tables: [...metadata.tables.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
  });
}

async function migrationHistory(pool: Pool) {
  const result = await pool.query<{ is_applied: boolean; version_id: string }>(
    'select version_id::text, is_applied from goose_db_version order by id',
  );
  return result.rows;
}

async function findUserId(pool: Pool, email: string, label: string) {
  const result = await pool.query<{ id: string }>('select id from "user" where email = $1', [
    email,
  ]);
  if (result.rowCount !== 1)
    die(`Expected exactly one ${label} user for ${email}; found ${result.rowCount}.`);
  return result.rows[0]!.id;
}

function add(
  selected: Map<string, Map<string, SelectedRow>>,
  table: TableMeta,
  row: Row,
  reason: SelectionReason,
) {
  if (isIgnoredTable(table.name)) return false;
  const rows = selected.get(table.name) ?? new Map<string, SelectedRow>();
  const key = keyOf(row, table.primaryKey);
  const current = rows.get(key);
  if (current?.reason === 'transfer' || (current && reason === 'support')) return false;
  rows.set(key, { reason, row });
  selected.set(table.name, rows);
  return true;
}

async function planRows(source: Pool, metadata: Metadata, sourceUserId: string) {
  const selected = new Map<string, Map<string, SelectedRow>>();
  const rowsByTable = new Map<string, Row[]>();
  const appForeignKeys = metadata.foreignKeys.filter(
    (foreignKey) =>
      !isIgnoredTable(foreignKey.childTable) &&
      !isIgnoredTable(foreignKey.parentTable) &&
      metadata.tables.has(foreignKey.childTable) &&
      metadata.tables.has(foreignKey.parentTable),
  );
  const allRows = async (table: string) => {
    const cached = rowsByTable.get(table);
    if (cached) return cached;
    const rows = (await source.query<Row>(`select * from app.${quote(table)}`)).rows;
    rowsByTable.set(table, rows);
    return rows;
  };

  for (const table of metadata.tables.values()) {
    if (isIgnoredTable(table.name) || table.ownerColumns.length === 0) continue;
    const where = table.ownerColumns.map((column) => `${quote(column)} = $1`).join(' or ');
    const rows = await source.query<Row>(`select * from app.${quote(table.name)} where ${where}`, [
      sourceUserId,
    ]);
    for (const row of rows.rows) add(selected, table, row, 'transfer');
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const foreignKey of appForeignKeys) {
      const parentRows = selected.get(foreignKey.parentTable);
      if (parentRows) {
        const keys = new Set(
          [...parentRows.values()]
            .filter((entry) => entry.reason === 'transfer')
            .map((entry) => keyOf(entry.row, foreignKey.parentColumns)),
        );
        if (keys.size > 0) {
          const table = metadata.tables.get(foreignKey.childTable)!;
          for (const row of await allRows(foreignKey.childTable)) {
            if (keys.has(keyOf(row, foreignKey.childColumns)))
              changed = add(selected, table, row, 'transfer') || changed;
          }
        }
      }
      const childRows = selected.get(foreignKey.childTable);
      if (childRows) {
        const keys = new Set(
          [...childRows.values()].map((entry) => keyOf(entry.row, foreignKey.childColumns)),
        );
        if (keys.size > 0) {
          const table = metadata.tables.get(foreignKey.parentTable)!;
          for (const row of await allRows(foreignKey.parentTable)) {
            if (keys.has(keyOf(row, foreignKey.parentColumns)))
              changed = add(selected, table, row, 'support') || changed;
          }
        }
      }
    }
  }
  return { appForeignKeys, selected };
}

function insertionOrder(
  selected: Map<string, Map<string, SelectedRow>>,
  foreignKeys: ForeignKey[],
) {
  const degree = new Map([...selected.keys()].map((table) => [table, 0]));
  const children = new Map<string, Set<string>>();
  for (const foreignKey of foreignKeys) {
    if (!selected.has(foreignKey.parentTable) || !selected.has(foreignKey.childTable)) continue;
    const tableChildren = children.get(foreignKey.parentTable) ?? new Set<string>();
    if (!tableChildren.has(foreignKey.childTable)) {
      tableChildren.add(foreignKey.childTable);
      degree.set(foreignKey.childTable, degree.get(foreignKey.childTable)! + 1);
    }
    children.set(foreignKey.parentTable, tableChildren);
  }
  const ready = [...degree.entries()]
    .filter(([, count]) => count === 0)
    .map(([table]) => table)
    .sort();
  const order: string[] = [];
  while (ready.length > 0) {
    const table = ready.shift()!;
    order.push(table);
    for (const child of children.get(table) ?? []) {
      const next = degree.get(child)! - 1;
      degree.set(child, next);
      if (next === 0) ready.push(child);
    }
    ready.sort();
  }
  if (order.length !== selected.size)
    die('Selected rows contain a foreign-key cycle; refusing an unsafe merge.');
  return order;
}

async function preflightConflicts(
  target: Pool,
  metadata: Metadata,
  selected: Map<string, Map<string, SelectedRow>>,
  sourceUserId: string,
  targetUserId: string,
) {
  const userForeignKeys = metadata.foreignKeys.filter(
    (foreignKey) => foreignKey.parentSchema === 'public' && foreignKey.parentTable === USER_TABLE,
  );
  const duplicates = new Map<string, Set<string>>();
  for (const [tableName, selectedRows] of selected) {
    const table = metadata.tables.get(tableName)!;
    const existingRows = (await target.query<Row>(`select * from app.${quote(tableName)}`)).rows;
    const byPrimaryKey = new Map(existingRows.map((row) => [keyOf(row, table.primaryKey), row]));
    const byUniqueKey = table.uniqueKeys.map(
      (columns) => new Map(existingRows.map((row) => [keyOf(row, columns), row])),
    );
    for (const entry of selectedRows.values()) {
      const row = transformedRow(
        entry.row,
        table.ownerColumns,
        userForeignKeys.filter((foreignKey) => foreignKey.childTable === tableName),
        sourceUserId,
        targetUserId,
      );
      const primaryKey = keyOf(row, table.primaryKey);
      const existing = byPrimaryKey.get(primaryKey);
      if (existing) {
        if (!same(comparable(existing, table.columns), comparable(row, table.columns))) {
          die(`Conflicting primary key in app.${tableName}: ${primaryKey}.`);
        }
        const tableDuplicates = duplicates.get(tableName) ?? new Set<string>();
        tableDuplicates.add(primaryKey);
        duplicates.set(tableName, tableDuplicates);
        continue;
      }
      for (const [index, columns] of table.uniqueKeys.entries()) {
        const conflict = byUniqueKey[index]!.get(keyOf(row, columns));
        if (conflict) die(`Conflicting unique key (${columns.join(', ')}) in app.${tableName}.`);
      }
    }
  }
  return { duplicates, userForeignKeys };
}

async function ignoredCounts(pool: Pool, metadata: Metadata) {
  const counts: Record<string, number> = {};
  for (const table of metadata.tables.values()) {
    if (isIgnoredTable(table.name))
      counts[table.name] = Number(
        (await pool.query<{ count: string }>(`select count(*) from app.${quote(table.name)}`))
          .rows[0]!.count,
      );
  }
  return counts;
}

async function backupTarget(targetUrl: string, destination: string) {
  const url = new URL(targetUrl);
  await execFileAsync(
    'pg_dump',
    ['--format=custom', '--no-acl', '--no-owner', '--file', destination],
    {
      env: {
        ...process.env,
        PGDATABASE: url.pathname.slice(1),
        PGHOST: url.hostname,
        PGPASSWORD: decodeURIComponent(url.password),
        PGPORT: url.port || '5432',
        PGUSER: decodeURIComponent(url.username),
      },
    },
  );
  await chmod(destination, 0o600);
}

async function main() {
  const { values } = parseArgs({
    options: {
      apply: { type: 'boolean', default: false },
      sourceEmail: { type: 'string' },
      targetEmail: { type: 'string' },
      yes: { type: 'boolean', default: false },
    },
  });
  if (!values.sourceEmail || !values.targetEmail)
    die('--sourceEmail and --targetEmail are required.');
  if (values.apply && !values.yes) die('--apply requires --yes.');
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.TARGET_DATABASE_URL;
  if (!sourceUrl || !targetUrl) die('SOURCE_DATABASE_URL and TARGET_DATABASE_URL are required.');
  const source = new Pool({ connectionString: sourceUrl, max: 4 });
  const target = new Pool({ connectionString: targetUrl, max: 4 });
  try {
    const [sourceMetadata, targetMetadata, sourceMigrations, targetMigrations] = await Promise.all([
      readMetadata(source),
      readMetadata(target),
      migrationHistory(source),
      migrationHistory(target),
    ]);
    if (
      fingerprint(sourceMetadata) !== fingerprint(targetMetadata) ||
      !same(sourceMigrations, targetMigrations)
    )
      die('Source and target schema metadata or Goose migration history differ.');
    const [sourceUserId, targetUserId] = await Promise.all([
      findUserId(source, values.sourceEmail, 'source'),
      findUserId(target, values.targetEmail, 'target'),
    ]);
    const { appForeignKeys, selected } = await planRows(source, sourceMetadata, sourceUserId);
    const order = insertionOrder(selected, appForeignKeys);
    const { duplicates, userForeignKeys } = await preflightConflicts(
      target,
      targetMetadata,
      selected,
      sourceUserId,
      targetUserId,
    );
    const ignoredBefore = await ignoredCounts(target, targetMetadata);
    const timestamp = new Date().toISOString().replaceAll(':', '-');
    const artifactDirectory = join(homedir(), '.hominem', 'user-data-merges', timestamp);
    await mkdir(artifactDirectory, { recursive: true, mode: 0o700 });
    const manifest = {
      destination: values.targetEmail,
      dryRun: !values.apply,
      excludedTables: [...sourceMetadata.tables.keys()].filter(isIgnoredTable).sort(),
      ignoredBefore,
      inserted: order.map((tableName) => ({
        keys: [...selected.get(tableName)!.values()]
          .map((entry) =>
            transformedRow(
              entry.row,
              sourceMetadata.tables.get(tableName)!.ownerColumns,
              userForeignKeys.filter((foreignKey) => foreignKey.childTable === tableName),
              sourceUserId,
              targetUserId,
            ),
          )
          .filter(
            (row) =>
              !duplicates
                .get(tableName)
                ?.has(keyOf(row, sourceMetadata.tables.get(tableName)!.primaryKey)),
          )
          .map((row) => comparable(row, sourceMetadata.tables.get(tableName)!.primaryKey)),
        table: tableName,
      })),
      order,
      schemaFingerprint: fingerprint(sourceMetadata),
      source: values.sourceEmail,
      summary: order.map((tableName) => ({
        duplicates: duplicates.get(tableName)?.size ?? 0,
        support: [...selected.get(tableName)!.values()].filter(
          (entry) => entry.reason === 'support',
        ).length,
        table: tableName,
        transfer: [...selected.get(tableName)!.values()].filter(
          (entry) => entry.reason === 'transfer',
        ).length,
      })),
    };
    await writeFile(
      join(artifactDirectory, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { mode: 0o600 },
    );
    console.log(
      `${values.apply ? 'APPLYING' : 'DRY RUN'} ${values.sourceEmail} -> ${values.targetEmail}`,
    );
    console.log(`Manifest: ${join(artifactDirectory, 'manifest.json')}`);
    for (const item of manifest.summary)
      console.log(
        `  app.${item.table}: ${item.transfer} transfer, ${item.support} support, ${item.duplicates} exact duplicate`,
      );
    if (!values.apply) return;

    const backupPath = join(artifactDirectory, 'production-before-merge.dump');
    await backupTarget(targetUrl, backupPath);
    await target.query('begin');
    try {
      for (const tableName of order) {
        const table = sourceMetadata.tables.get(tableName)!;
        const rows = [...selected.get(tableName)!.values()]
          .map((entry) =>
            transformedRow(
              entry.row,
              table.ownerColumns,
              userForeignKeys.filter((foreignKey) => foreignKey.childTable === tableName),
              sourceUserId,
              targetUserId,
            ),
          )
          .filter((row) => !duplicates.get(tableName)?.has(keyOf(row, table.primaryKey)));
        for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
          const batch = rows.slice(offset, offset + BATCH_SIZE);
          if (batch.length === 0) continue;
          const parameters = batch.flatMap((row) => table.columns.map((column) => row[column]));
          const tuples = batch.map(
            (_, rowIndex) =>
              `(${table.columns.map((_, columnIndex) => `$${rowIndex * table.columns.length + columnIndex + 1}`).join(', ')})`,
          );
          await target.query(
            `insert into app.${quote(tableName)} (${table.columns.map(quote).join(', ')}) values ${tuples.join(', ')}`,
            parameters,
          );
        }
      }
      for (const tableName of order) {
        const table = sourceMetadata.tables.get(tableName)!;
        const keys = [...selected.get(tableName)!.values()].map((entry) =>
          keyOf(
            transformedRow(
              entry.row,
              table.ownerColumns,
              userForeignKeys.filter((foreignKey) => foreignKey.childTable === tableName),
              sourceUserId,
              targetUserId,
            ),
            table.primaryKey,
          ),
        );
        const rows = (
          await target.query<Row>(
            `select ${table.primaryKey.map(quote).join(', ')} from app.${quote(tableName)}`,
          )
        ).rows;
        const existing = new Set(rows.map((row) => keyOf(row, table.primaryKey)));
        if (keys.some((key) => !existing.has(key)))
          die(`Verification failed: missing row in app.${tableName}.`);
      }
      const ignoredAfter = await ignoredCounts(target, targetMetadata);
      if (!same(ignoredBefore, ignoredAfter))
        die('Verification failed: an excluded table changed.');
      await target.query('commit');
      await writeFile(
        join(artifactDirectory, 'result.json'),
        `${JSON.stringify({ backupPath, committedAt: new Date().toISOString(), ignoredAfter }, null, 2)}\n`,
        { mode: 0o600 },
      );
      console.log(`Committed successfully. Backup: ${backupPath}`);
    } catch (error) {
      await target.query('rollback');
      throw error;
    }
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
