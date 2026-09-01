import { randomUUID } from 'node:crypto';

export const isIntegrationDatabaseAvailable = async (): Promise<boolean> => {
  try {
    const { pool } = await import('../db');
    const result = await pool.query('SELECT 1');
    return result.rowCount === 1;
  } catch {
    return false;
  }
};

export const createDeterministicIdFactory = (prefix: string) => {
  void prefix;
  let counter = 0;
  return () => {
    counter += 1;
    return randomUUID();
  };
};

// Works with bare table names or schema-qualified ones ('tags' or 'app.tags')
export const tableExists = async (tableName: string): Promise<boolean> => {
  try {
    const { pool } = await import('../db');
    let schema = 'public';
    let table = tableName;
    if (tableName.includes('.')) {
      const parts = tableName.split('.');
      schema = parts[0];
      table = parts[1];
    }
    const result = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)`,
      [schema, table],
    );
    return result.rows[0]?.exists ?? false;
  } catch {
    return false;
  }
};

// Create users with specific IDs (for tests that need deterministic IDs)
export const ensureIntegrationUsers = async (
  users: Array<{ id: string; name: string; email?: string }>,
): Promise<{ ownerId: string; otherUserId: string }> => {
  const { authDb } = await import('../db');

  for (const user of users) {
    await authDb
      .insertInto('user')
      .values({
        id: user.id,
        email: user.email ?? `${user.id}@test.com`,
        name: user.name,
      })
      .execute();
  }

  return { ownerId: users[0]?.id || '', otherUserId: users[1]?.id || '' };
};
