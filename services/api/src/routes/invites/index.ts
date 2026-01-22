import { Hono } from 'hono'
import { invitesIncomingRoutes } from '../invites.incoming'
import { invitesOutgoingRoutes } from '../invites.outgoing'

export const invitesRoutes = new Hono()

// Register all invites sub-routes
invitesRoutes.route('/incoming', invitesIncomingRoutes)
invitesRoutes.route('/outgoing', invitesOutgoingRoutes)
