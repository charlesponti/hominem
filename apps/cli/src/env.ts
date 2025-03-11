import dotenv from 'dotenv'
import os from 'node:os'
import path from 'node:path'

dotenv.config({ path: path.resolve(os.homedir(), '.hominem/.env') })

export const env = {
  DB_PATH: path.resolve(`${os.homedir()}/.hominem/db.sqlite`),
}
