import { serve } from '@hono/node-server'
import { env } from './env'
import { createServer } from './server'

const app = createServer()
const port = Number.parseInt(env.PORT, 10)

console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
  maxRequestBodySize: 200 * 1024 * 1024, // 200MB to allow for large file uploads
  overrideGlobalObjects: false,
})
