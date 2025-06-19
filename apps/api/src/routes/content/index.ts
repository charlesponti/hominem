import { Hono } from 'hono'
import { contentRoutes } from './content.js'
import { contentStrategiesRoutes } from './strategies.js'
import { contentTweetRoutes } from './tweet.js'
import { contentTwitterRoutes } from './twitter.js'

const content = new Hono()

// Main content CRUD operations
content.route('/', contentRoutes)

// Content strategies (nested under content)
content.route('/strategies', contentStrategiesRoutes)

// Tweet-specific operations (nested under content)
content.route('/tweet', contentTweetRoutes)

// Twitter integration (nested under content)
content.route('/twitter', contentTwitterRoutes)

export { content }
