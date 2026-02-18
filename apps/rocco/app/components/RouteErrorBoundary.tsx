import type { ReactNode } from 'react';

import { Alert } from '@hominem/ui';
import { AlertCircle } from 'lucide-react';

interface RouteErrorBoundaryProps {
  error?: Error | null;
  message?: string;
  title?: string;
  onDismiss?: () => void;
  children?: ReactNode;
}

/**
 * Reusable error boundary component for route-level error handling
 * Provides consistent styling and error display across all routes
 */
export function RouteErrorBoundary({
  error,
  message,
  title = 'Error',
  onDismiss,
  children,
}: RouteErrorBoundaryProps) {
  if (!error && !message) {
    return children ?? null;
  }

  const errorMessage = message || error?.message || 'An unexpected error occurred';

  return (
    <div className="space-y-4">
      <Alert type="error" dismissible={!!onDismiss} onDismiss={onDismiss}>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive mb-1">{title}</h3>
            <p className="text-sm text-destructive/90">{errorMessage}</p>
          </div>
        </div>
      </Alert>
      {children}
    </div>
  );
}

/**
 * Hook for handling errors in routes with API data
 */
export function useRouteError(error?: Error | null, apiError?: unknown) {
  return error || apiError;
}
