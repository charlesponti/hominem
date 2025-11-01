import { initTRPC, TRPCError } from '@trpc/server'
import { logger } from '../logger'
import type { Context } from './context'

const t = initTRPC.context<Context>().create()
const { middleware } = t

// Middleware for logging and error handling
export const loggingMiddleware = middleware(async ({ path, type, next, ctx }) => {
  const startTime = Date.now()

  try {
    // Log the incoming request
    logger.info(`tRPC ${type} request`, {
      path,
      type,
      userId: ctx.user?.id,
      method: type,
    })

    // Execute the procedure
    const result = await next()

    // Log successful response
    const duration = Date.now() - startTime
    logger.info(`tRPC ${type} completed`, {
      path,
      type,
      duration,
      userId: ctx.user?.id,
    })

    return result
  } catch (error) {
    // Log error with context
    const duration = Date.now() - startTime
    const context = {
      path,
      type,
      duration,
      userId: ctx.user?.id,
    }

    if (error instanceof TRPCError) {
      logger.logTRPCError(error, context)
    } else {
      logger.error(`Unexpected error in tRPC ${type}`, context, error as Error)
    }

    // Re-throw the error
    throw error
  }
})

// Middleware for input validation logging
export const inputValidationMiddleware = middleware(async ({ path, type, next, input, ctx }) => {
  // Log input for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`tRPC ${type} input`, {
      path,
      type,
      input: JSON.stringify(input),
      userId: ctx.user?.id,
    })
  }

  return next()
})

// Middleware for performance monitoring
export const performanceMiddleware = middleware(async ({ path, type, next, ctx }) => {
  const startTime = Date.now()

  const result = await next()

  const duration = Date.now() - startTime

  // Log slow queries (over 1 second)
  if (duration > 1000) {
    logger.warn(`Slow tRPC ${type} query`, {
      path,
      type,
      duration,
      userId: ctx.user?.id,
    })
  }

  return result
})

// Combined middleware for common functionality
export const commonMiddleware = loggingMiddleware
