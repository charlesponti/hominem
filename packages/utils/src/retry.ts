import { logger } from './logger';

type WithRetryOptions<T> = {
  operation: () => Promise<T>;
  context: Record<string, unknown>;
  maxRetries: number;
  retryDelay: number;
  errorType?: typeof Error;
};
export async function withRetry<T>({
  operation,
  context,
  maxRetries,
  retryDelay,
  errorType = Error,
}: WithRetryOptions<T>): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        // Use exponential backoff
        const delay = retryDelay * 2 ** (attempt - 1);
        logger.warn(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`, {
          ...context,
          error: lastError.message,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new errorType(`Failed after ${maxRetries} attempts: ${lastError?.message}`, context);
}

export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  options: { retries: number; delay: number },
): Promise<T> => {
  const { retries } = options;

  try {
    return await operation();
  } catch (error) {
    if (retries > 0) {
      const delay = options.delay * (retries - retries + 1);
      logger.warn(`Retrying operation, attempts remaining: ${retries}, delay: ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryWithBackoff(operation, { retries: retries - 1, delay: options.delay });
    }
    throw error;
  }
};
