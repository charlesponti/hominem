import type { ErrorInfo } from 'react';

import { posthog } from '~/lib/posthog';

interface ErrorLogEntry {
  error: Error;
  errorInfo?: ErrorInfo;
  timestamp: string;
  feature?: string;
  route?: string;
  userId?: string;
}

const errorLog: ErrorLogEntry[] = [];
const MAX_LOG_SIZE = 50;

export function logError(
  error: Error,
  errorInfo?: ErrorInfo,
  context?: {
    feature?: string;
    route?: string;
    userId?: string;
  },
) {
  const entry: ErrorLogEntry = {
    error,
    errorInfo,
    timestamp: new Date().toISOString(),
    feature: context?.feature,
    route: context?.route,
    userId: context?.userId,
  };

  // Keep log size manageable
  errorLog.unshift(entry);
  if (errorLog.length > MAX_LOG_SIZE) {
    errorLog.pop();
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.error('[ErrorBoundary]', error, errorInfo);
    return;
  }

  posthog.captureException(error, {
    feature: context?.feature,
    route: context?.route,
    userId: context?.userId,
  });
}

export function getErrorLog(): ErrorLogEntry[] {
  return [...errorLog];
}

export function clearErrorLog() {
  errorLog.length = 0;
}
