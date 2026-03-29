import crypto from 'node:crypto';

import { db } from '@hominem/db';

import type { Institution } from '../lib/types';

export async function getAllInstitutions(): Promise<Institution[]> {
  const result = await db
    .selectFrom('app.finance_institutions')
    .selectAll()
    .orderBy('name', 'asc')
    .orderBy('id', 'asc')
    .execute();
  return result as Institution[];
}

export async function createInstitution(name: string): Promise<Institution> {
  const result = await db
    .insertInto('app.finance_institutions')
    .values({
      id: crypto.randomUUID(),
      name,
    })
    .returningAll()
    .executeTakeFirst();
  const row = result ?? null;
  if (!row) {
    throw new Error('Failed to create institution');
  }
  return row as Institution;
}

export async function ensureInstitutionExists(name: string): Promise<Institution> {
  const existing = await db
    .selectFrom('app.finance_institutions')
    .selectAll()
    .where('name', '=', name)
    .limit(1)
    .executeTakeFirst();
  const existingRow = existing ?? null;
  if (existingRow) {
    return existingRow as Institution;
  }
  return createInstitution(name);
}
