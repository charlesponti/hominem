import { Hono } from 'hono'
import { invitesIncomingRoutes } from '../invites.incoming.js'
import { invitesOutgoingRoutes } from '../invites.outgoing.js'

export const invitesRoutes = new Hono()

// Register all invites sub-routes
invitesRoutes.route('/incoming', invitesIncomingRoutes)
invitesRoutes.route('/outgoing', invitesOutgoingRoutes)
