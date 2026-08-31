import type { Kysely, Transaction } from 'kysely';

import { db } from './db';
import type { Database } from './db';

// A transaction-scoped handle. Repositories take this so callers can compose writes atomically.
export type TransactionHandle = Transaction<Database>;

// Works with or without a transaction — repositories use this as their `db`
// param so the same code runs either way.
export type DbHandle = Kysely<Database> | TransactionHandle;

// Runs a callback inside a transaction. The callback gets a TransactionHandle
// to pass to repositories. Throws roll back, returns commit.
//
// const note = await runInTransaction(async (trx) => {
//   const created = await noteRepo.create(trx, { ... });
//   await noteFileRepo.sync(trx, created.id, userId, fileIds);
//   return created;
// });
export async function runInTransaction<T>(fn: (trx: TransactionHandle) => Promise<T>): Promise<T> {
  return db.transaction().execute(fn);
}
