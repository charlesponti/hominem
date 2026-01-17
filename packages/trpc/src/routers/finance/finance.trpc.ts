import { router } from '../../procedures'
import { accountsRouter } from './finance.accounts'
import { analyzeRouter } from './finance.analyze'
import { budgetRouter } from './finance.budget'
import { categoriesRouter } from './finance.categories'
import { dataRouter } from './finance.data'
import { exportRouter } from './finance.export'
import { institutionsRouter } from './finance.institutions'
import { plaidRouter } from './finance.plaid'
import { runwayRouter } from './finance.runway'
import { transactionsRouter } from './finance.transactions'

export const financeRouter = router({
  accounts: accountsRouter,
  categories: categoriesRouter,
  institutions: institutionsRouter,
  transactions: transactionsRouter,
  budget: budgetRouter,
  analyze: analyzeRouter,
  export: exportRouter,
  data: dataRouter,
  plaid: plaidRouter,
  runway: runwayRouter,
})
