import 'dotenv/config'
import os from 'node:os'
import path from 'node:path'

export const env = {
  DB_PATH: path.resolve(`${os.homedir()}/.hominem/db.sqlite`),
}
