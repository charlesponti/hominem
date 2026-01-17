/* eslint-disable @typescript-eslint/no-explicit-any */

import { QUEUE_NAMES } from '@hominem/utils/consts'
import type { ConnectionOptions } from 'bullmq'
import { Queue } from 'bullmq'
import { env } from './env'
import type { Queues } from './types'

let singleton: Queues | null = null

/**
 * Create or return singleton queues connected to Redis.
 * Avoids creating multiple Queue instances across a process.
 */
export function getOrCreateQueues(): Queues {
  if (singleton) {
    return singleton
  }

  // Construct connection options from REDIS_URL to avoid ioredis type mismatch
  const redisUrl = env.REDIS_URL
  const url = new URL(redisUrl)
  const connectionOptions: ConnectionOptions = {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
  }
  if (url.password) {
    ;(connectionOptions as ConnectionOptions & { password?: string }).password = url.password
  }
  if (url.username) {
    ;(connectionOptions as ConnectionOptions & { username?: string }).username = url.username
  }
  if (url.protocol === 'rediss:') {
    ;(connectionOptions as ConnectionOptions & { tls?: unknown }).tls = {}
  }

  const plaidSync = new Queue(QUEUE_NAMES.PLAID_SYNC, { connection: connectionOptions })
  const importTransactions = new Queue(QUEUE_NAMES.IMPORT_TRANSACTIONS, {
    connection: connectionOptions,
  })
  const placePhotoEnrich = new Queue(QUEUE_NAMES.PLACE_PHOTO_ENRICH, {
    connection: connectionOptions,
  })

  singleton = {
    plaidSync,
    importTransactions,
    placePhotoEnrich,
  }

  return singleton
}
