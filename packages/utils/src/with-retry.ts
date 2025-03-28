import logger from './logger'

type WithRetryOptions<T> = {
  operation: () => Promise<T>
  context: Record<string, unknown>
  maxRetries: number
  retryDelay: number
  errorType?: typeof Error
}
export async function withRetry<T>({
  operation,
  context,
  maxRetries,
  retryDelay,
  errorType = Error,
}: WithRetryOptions<T>): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries) {
        // Use exponential backoff
        const delay = retryDelay * 2 ** (attempt - 1)
        logger.warn(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`, {
          ...context,
          error: lastError.message,
        })
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw new errorType(`Failed after ${maxRetries} attempts: ${lastError?.message}`, context)
}
