import { Hono } from 'hono'
import { financeAccountsRoutes } from './finance.accounts.js'
import { financeAnalyzeRoutes } from './finance.analyze.js'
import { financeBudgetRoutes } from './finance.budget.js'
import { financeCategoriesRoutes } from './finance.categories.js'
import { financeDataRoutes } from './finance.data.js'
import { financeExportRoutes } from './finance.export.js'
import { financeImportsRoutes } from './finance.imports.js'
import { financeInstitutionsRoutes } from './finance.institutions.js'
import { financeTransactionsRoutes } from './finance.transactions.js'
import { financePersonalRoutes } from './personal/index.js'

export const financeRoutes = new Hono()

// Register all finance sub-routes
financeRoutes.route('/institutions', financeInstitutionsRoutes)
financeRoutes.route('/imports', financeImportsRoutes)
financeRoutes.route('/import', financeImportsRoutes) // Alias for singular form
financeRoutes.route('/transactions', financeTransactionsRoutes)
financeRoutes.route('/categories', financeCategoriesRoutes)
financeRoutes.route('/data', financeDataRoutes)
financeRoutes.route('/accounts', financeAccountsRoutes)
financeRoutes.route('/budget', financeBudgetRoutes)
financeRoutes.route('/analyze', financeAnalyzeRoutes)
financeRoutes.route('/export', financeExportRoutes)
financeRoutes.route('/personal', financePersonalRoutes)
