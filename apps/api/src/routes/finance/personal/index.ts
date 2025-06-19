import { Hono } from 'hono'
import { financeLocationComparisonRoutes } from './location-comparison.js'
import { financeMusicStreamingRoutes } from './music-streaming.js'
import { financeRunwayRoutes } from './runway.js'
import { financeSalesTaxRoutes } from './sales-tax.js'
import { financeTravelCostRoutes } from './travel-cost.js'

export const financePersonalRoutes = new Hono()

// Register all personal finance sub-routes
financePersonalRoutes.route('/runway', financeRunwayRoutes)
financePersonalRoutes.route('/music-streaming', financeMusicStreamingRoutes)
financePersonalRoutes.route('/sales-tax', financeSalesTaxRoutes)
financePersonalRoutes.route('/location-comparison', financeLocationComparisonRoutes)
financePersonalRoutes.route('/travel-cost', financeTravelCostRoutes)
