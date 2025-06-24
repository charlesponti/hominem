import { Hono } from 'hono'
import { userDeleteRoutes } from '../user.delete.js'
import { userRoutes } from '../user.me.js'

export const userRoutes = new Hono()

// Register all user sub-routes
userRoutes.route('/me', userRoutes)
userRoutes.route('/me', userDeleteRoutes)
