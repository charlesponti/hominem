import { getDatabaseUrl, setTestDb } from '@hominem/db';
import * as schema from '@hominem/db/schema';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export interface TestTransaction {
  db: PostgresJsDatabase<typeof schema>;
  rollback: () => Promise<void>;
  commit: () => Promise<void>;
}

export async function startTestTransaction(): Promise<TestTransaction> {
  const txClient = postgres(getDatabaseUrl(), { max: 1 });
  await txClient`begin`;
  const txDb = drizzle(txClient, { schema });

  setTestDb(txDb);

  const clearOverride = (): void => {
    setTestDb(null);
  };

  const rollback = async (): Promise<void> => {
    try {
      await txClient`rollback`;
    } finally {
      clearOverride();
      await txClient.end({ timeout: 0 }).catch(() => {});
    }
  };

  const commit = async (): Promise<void> => {
    try {
      await txClient`commit`;
    } finally {
      clearOverride();
      await txClient.end({ timeout: 0 }).catch(() => {});
    }
  };

  return { db: txDb, rollback, commit };
}
