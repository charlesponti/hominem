import { authDb, db } from '@hominem/db';
import { sql } from 'kysely';

import { FINANCE_TRANSACTION_ENTITY_TYPE } from './contracts';

export async function cleanupIntegrationFinanceUser(userId: string): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('app.tagAssignments')
      .where('entityTable', '=', sql`${FINANCE_TRANSACTION_ENTITY_TYPE}::regclass` as never)
      .where('entityId', 'in', (eb) =>
        eb.selectFrom('app.financeTransactions').select('id').where('userId', '=', userId),
      )
      .execute();
    await trx.deleteFrom('app.plaidItems').where('userId', '=', userId).execute();
    await trx.deleteFrom('app.financeTransactions').where('userId', '=', userId).execute();
    await trx.deleteFrom('app.tags').where('ownerUserid', '=', userId).execute();
    await trx.deleteFrom('app.financeAccounts').where('userId', '=', userId).execute();
  });

  await authDb.deleteFrom('user').where('id', '=', userId).execute();
}
