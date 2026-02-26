import os from 'node:os'
import path from 'node:path'

export function getHominemHomeDir(): string {
  const overridden = process.env.HOMINEM_HOME?.trim()
  if (overridden) {
    return path.resolve(overridden)
  }

  const userHome = process.env.HOME ?? process.env.USERPROFILE ?? os.homedir()
  return path.join(userHome, '.hominem')
}
