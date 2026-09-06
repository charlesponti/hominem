import { db } from '@hominem/db/core';
import { sql } from 'kysely';

export function toCents(amount: number | string | null | undefined): number {
  return Math.round(Number(amount ?? 0) * 100);
}

export function toNumber(value: string | number | null): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function toIsoStringOrNull(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Date(0).toISOString();
}

export function getAffectedRows(result: unknown): number {
  if (!result || typeof result !== 'object') {
    return 0;
  }
  if ('numDeletedRows' in result) {
    const value = (result as { numDeletedRows: bigint | number }).numDeletedRows;
    return Number(value);
  }
  if ('numUpdatedRows' in result) {
    const value = (result as { numUpdatedRows: bigint | number }).numUpdatedRows;
    return Number(value);
  }
  return 0;
}

export async function tableExists(tableName: string): Promise<boolean> {
  let schema = 'public';
  let table = tableName;
  if (tableName.includes('.')) {
    const parts = tableName.split('.');
    schema = parts[0];
    table = parts.slice(1).join('.');
  }
  const q = db
    .selectFrom(sql`information_schema.tables`.as('t'))
    .selectAll()
    .where(sql<boolean>`t.table_schema = ${schema} and t.table_name = ${table}`);
  const result = await q.executeTakeFirst();
  return Boolean(result);
}

export function sqlValueList(values: string[]) {
  return sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );
}
