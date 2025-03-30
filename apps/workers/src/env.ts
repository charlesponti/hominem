import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number(),
  HOST: z.coerce.string().default('localhost'),
})

const env = envSchema.parse(process.env)

export default env
