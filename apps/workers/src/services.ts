import { db } from '@hominem/utils/db'
import { logger } from '@hominem/utils/logger'
import { redis } from '@hominem/utils/redis'
import { csvStorageService } from '@hominem/utils/supabase'
import { Context, Layer } from 'effect'
import type { Redis as RedisClient } from 'ioredis'
import type { Logger as PinoLogger } from 'pino'

export class Db extends Context.Tag('Db')<Db, typeof db>() {}
export class Redis extends Context.Tag('Redis')<Redis, RedisClient>() {}
export class CsvStorage extends Context.Tag('CsvStorage')<CsvStorage, typeof csvStorageService>() {}
export class Logger extends Context.Tag('Logger')<Logger, PinoLogger>() {}

export const DbLive = Layer.succeed(Db, db)
export const RedisLive = Layer.succeed(Redis, redis)
export const CsvStorageLive = Layer.succeed(CsvStorage, csvStorageService)
export const LoggerLive = Layer.succeed(Logger, logger)

export const AppLive = DbLive.pipe(
  Layer.merge(RedisLive),
  Layer.merge(CsvStorageLive),
  Layer.merge(LoggerLive)
)
