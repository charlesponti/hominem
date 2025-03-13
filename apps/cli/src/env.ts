import dotenv from 'dotenv'
import os from 'node:os'
import path from 'node:path'

const CONFIG_PATH = path.resolve(os.homedir(), '.hominem')
dotenv.config({ path: path.resolve(CONFIG_PATH, '.env') })

export const env = {
  CONFIG_PATH,
  DB_PATH: path.resolve(CONFIG_PATH, 'db.sqlite'),
}
