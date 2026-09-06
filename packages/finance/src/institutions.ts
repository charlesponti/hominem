import crypto from 'node:crypto';

import { db } from '@hominem/db/core';
import type { Selectable } from '@hominem/db/core';
import type { AppFinanceInstitutions } from '@hominem/db/types';

type InstitutionRow = Selectable<AppFinanceInstitutions>;

export async function getAllInstitutions(): Promise<InstitutionRow[]> {
  return db
    .selectFrom('app.financeInstitutions')
    .selectAll()
    .orderBy('name', 'asc')
    .orderBy('id', 'asc')
    .execute();
}

export async function createInstitution(name: string): Promise<InstitutionRow> {
  const result = await db
    .insertInto('app.financeInstitutions')
    .values({
      id: crypto.randomUUID(),
      name,
    })
    .returningAll()
    .executeTakeFirst();
  if (!result) {
    throw new Error('Failed to create institution');
  }
  return result;
}

export async function ensureInstitutionExists(name: string): Promise<InstitutionRow> {
  const existing = await db
    .selectFrom('app.financeInstitutions')
    .selectAll()
    .where('name', '=', name)
    .limit(1)
    .executeTakeFirst();
  if (existing) {
    return existing;
  }
  return createInstitution(name);
}
