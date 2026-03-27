import { db } from '@hominem/db';
import { sql } from 'kysely';

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

export function toIsoString(value: string | Date | null | undefined): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Date(0).toISOString();
}

export function toIsoStringOrNull(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return toIsoString(value);
}

export function toDateOnlyString(value: string | Date | null | undefined): string {
  return toIsoString(value).slice(0, 10);
}

export async function tableExists(tableName: string): Promise<boolean> {
  const result = await db
    .selectFrom(sql`information_schema.tables`.as('t'))
    .selectAll()
    .where(sql<boolean>`t.table_schema = 'public' and t.table_name = ${tableName}`)
    .executeTakeFirst();
  return Boolean(result);
}

export function sqlValueList(values: string[]) {
  return sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );
}
