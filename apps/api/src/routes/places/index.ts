import { Hono } from 'hono'
import { placesAddToListsRoutes } from '../places.add-to-lists.js'
import { placesDetailsRoutes } from '../places.details.js'
import { placesRemoveFromListRoutes } from '../places.remove-from-list.js'
import { placesSearchRoutes } from '../places.search.js'

export const placesRoutes = new Hono()

// Register all places sub-routes
placesRoutes.route('/search', placesSearchRoutes)
placesRoutes.route('/', placesDetailsRoutes) // This handles /:id
placesRoutes.route('/lists/place', placesAddToListsRoutes)
placesRoutes.route('/lists', placesRemoveFromListRoutes) // This handles /:listId/:placeId
