// Lazy load logger to avoid Node.js dependencies in browser bundles
type Logger = {
  info: (message: string, data?: object) => void;
  error: (message: string, error?: Error | object) => void;
  warn: (message: string, data?: object) => void;
  debug: (message: string, data?: object) => void;
};

let logger: Logger | undefined;
const getLogger = async (): Promise<Logger> => {
  if (!logger) {
    const { logger: pinoLogger } = await import('./logger');
    logger = pinoLogger as Logger;
  }
  return logger;
};

type WithRetryOptions<T> = {
  operation: () => Promise<T>;
  context: Record<string, unknown>;
  maxRetries: number;
  retryDelay: number;
  errorType?: typeof Error;
  enableLogging?: boolean;
};
export async function withRetry<T>({
  operation,
  context,
  maxRetries,
  retryDelay,
  errorType = Error,
  enableLogging = false,
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
        if (enableLogging) {
          const log = await getLogger();
          log.warn(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`, {
            ...context,
            error: lastError.message,
          });
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new errorType(`Failed after ${maxRetries} attempts: ${lastError?.message}`, context);
}

export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  options: { retries: number; delay: number; enableLogging?: boolean },
): Promise<T> => {
  const { retries, enableLogging = false } = options;

  try {
    return await operation();
  } catch (error) {
    if (retries > 0) {
      const delay = options.delay * (retries - retries + 1);
      if (enableLogging) {
        const log = await getLogger();
        log.warn(`Retrying operation, attempts remaining: ${retries}, delay: ${delay}ms`);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryWithBackoff(operation, {
        retries: retries - 1,
        delay: options.delay,
        enableLogging,
      });
    }
    throw error;
  }
};
