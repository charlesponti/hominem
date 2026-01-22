import { Hono } from 'hono'
import { financeCategoriesRoutes } from './finance.categories'
import { financeImportRoutes } from './finance.import'

export const financeRoutes = new Hono()

financeRoutes.route('/import', financeImportRoutes)
financeRoutes.route('/categories', financeCategoriesRoutes)
