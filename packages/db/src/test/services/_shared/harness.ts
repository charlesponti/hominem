import crypto from 'node:crypto'

import { db, sql } from '../../../index'
import { createTestUser } from '../../fixtures'

export interface IntegrationUserInput {
  id: string
  name: string
  email?: string
}

export async function isIntegrationDatabaseAvailable(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`)
    return true
  } catch {
    return false
  }
}

export function createDeterministicIdFactory(seed: string): () => string {
  let counter = 0

  return () => {
    counter += 1
    const hash = crypto.createHash('sha256').update(`${seed}:${counter}`).digest('hex')
    const variantNibble = ((Number.parseInt(hash[16] ?? '0', 16) & 0x3) | 0x8).toString(16)
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-${variantNibble}${hash.slice(17, 20)}-${hash.slice(20, 32)}`
  }
}

export async function ensureIntegrationUsers(users: IntegrationUserInput[]): Promise<void> {
  for (const user of users) {
    await createTestUser({
      id: user.id,
      email: user.email ?? `${user.id}@example.com`,
      name: user.name,
    })
  }
}
