import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number(),
  HOST: z.string().default('localhost'),
  DATABASE_URL: z.string().url(),
})

const env = envSchema.parse(process.env)

export default env
