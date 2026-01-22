import { Hono } from 'hono'
import { aiTourRoutes } from './ai.tour'

export const aiRoutes = new Hono()

aiRoutes.route('/tour', aiTourRoutes)
