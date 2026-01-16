import { Hono } from 'hono'
import { financeImportRoutes } from './finance.import'

export const financeRoutes = new Hono()

financeRoutes.route('/import', financeImportRoutes)
