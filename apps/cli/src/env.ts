import dotenv from 'dotenv'
import os from 'node:os'
import path from 'node:path'
import { z } from 'zod'

const CONFIG_PATH = path.resolve(os.homedir(), '.hominem')
dotenv.config({ path: path.resolve(CONFIG_PATH, '.env') })

const envSchema = z.object({
  CONFIG_PATH: z.string().default(CONFIG_PATH),
  DB_PATH: z.string().default(path.resolve(CONFIG_PATH, 'db.sqlite')),
})

export const env = envSchema.parse(process.env)
