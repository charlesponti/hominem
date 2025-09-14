import { Hono } from 'hono'
import { aiTourRoutes } from './ai.tour.js'

export const aiRoutes = new Hono()

aiRoutes.route('/tour', aiTourRoutes)
