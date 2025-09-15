import { router } from '../../procedures.js'
import { accountsRouter } from './finance.accounts.js'
import { analyzeRouter } from './finance.analyze.js'
import { budgetRouter } from './finance.budget.js'
import { categoriesRouter } from './finance.categories.js'
import { dataRouter } from './finance.data.js'
import { exportRouter } from './finance.export.js'
import { institutionsRouter } from './finance.institutions.js'
import { plaidRouter } from './finance.plaid.js'
import { runwayRouter } from './finance.runway.js'
import { transactionsRouter } from './finance.transactions.js'

// Main finance tRPC router that combines all finance-related routers
export const financeRouter = router({
  // Basic CRUD operations
  accounts: accountsRouter,

  // Categories
  categories: categoriesRouter,

  // Financial institutions
  institutions: institutionsRouter,

  // Transactions
  transactions: transactionsRouter,

  // Budget management
  budget: budgetRouter,

  // Analytics and analysis
  analyze: analyzeRouter,

  // Export functionality
  export: exportRouter,

  // Data management
  data: dataRouter,

  // Plaid integration
  plaid: plaidRouter,

  // Runway calculations
  runway: runwayRouter,
})
