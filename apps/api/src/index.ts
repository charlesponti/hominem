import '@total-typescript/ts-reset'
import 'dotenv/config'

import { startServer } from './server'

startServer().catch((error) => {
  console.error(error)
  process.exit(1)
})
