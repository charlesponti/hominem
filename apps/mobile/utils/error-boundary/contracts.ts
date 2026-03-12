export interface BoundaryState {
  hasError: boolean;
  error: Error | null;
}

export interface BoundaryLogContext {
  feature?: string;
  route?: string;
  userId?: string;
}

export function createBoundaryStateFromError(error: Error): BoundaryState {
  return {
    hasError: true,
    error,
  };
}

export function resetBoundaryState(): BoundaryState {
  return {
    hasError: false,
    error: null,
  };
}

export function createFeatureFallbackLabel(featureName?: string): string {
  return `${featureName || 'Feature'} is unavailable`;
}

export function createRootFallbackMessage(error: Error | null): string {
  return error?.message || 'An unexpected error occurred';
}

export function createBoundaryLogContext(context: BoundaryLogContext): BoundaryLogContext {
  return {
    feature: context.feature,
    route: context.route,
    userId: context.userId,
  };
}
