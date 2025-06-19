import { Hono } from 'hono'
import { bookmarksCreateRoutes } from '../bookmarks.create.js'
import { bookmarksDeleteRoutes } from '../bookmarks.delete.js'
import { bookmarksListRoutes } from '../bookmarks.list.js'
import { bookmarksUpdateRoutes } from '../bookmarks.update.js'

export const bookmarksRoutes = new Hono()

// Register all bookmarks sub-routes
bookmarksRoutes.route('/', bookmarksListRoutes) // GET /
bookmarksRoutes.route('/', bookmarksCreateRoutes) // POST /
bookmarksRoutes.route('/', bookmarksUpdateRoutes) // PUT /:id
bookmarksRoutes.route('/', bookmarksDeleteRoutes) // DELETE /:id
