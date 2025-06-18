import { Hono } from 'hono'
import { aiContentStrategyRoutes } from '../ai.content-strategy.js'
import { aiTourRoutes } from '../ai.tour.js'
import { aiTweetGenerationRoutes } from '../ai.tweet-generation.js'

export const aiRoutes = new Hono()

// Register all AI sub-routes
aiRoutes.route('/tour', aiTourRoutes)
aiRoutes.route('/generate-tweet', aiTweetGenerationRoutes)
aiRoutes.route('/content-strategy', aiContentStrategyRoutes)
