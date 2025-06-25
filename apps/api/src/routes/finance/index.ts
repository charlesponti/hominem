import { Hono } from 'hono'
import { financeImportRoutes } from './finance.import.js'
import { financePersonalRoutes } from './personal/index.js'

export const financeRoutes = new Hono()

// Routes that still use Hono (complex file uploads, WebSocket integration, etc.)
financeRoutes.route('/import', financeImportRoutes)
financeRoutes.route('/personal', financePersonalRoutes)
