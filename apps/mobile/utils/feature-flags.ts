// Feature flags for gradual rollout of mobile architecture improvements
export const FEATURE_FLAGS = {
  // Auth state machine - replaces useEffect-based auth with proper state machine
  NEW_AUTH_STATE: process.env.FF_NEW_AUTH === 'true' || __DEV__,

  // Chat state consolidation - single source of truth with React Query
  NEW_CHAT_STATE: process.env.FF_NEW_CHAT === 'true' || __DEV__,

  // Runtime validation - Zod validation for all API responses
  RUNTIME_VALIDATION: process.env.FF_VALIDATION === 'true' || __DEV__,

  // Error boundaries - graceful error handling
  ERROR_BOUNDARIES: process.env.FF_ERROR_BOUNDARIES === 'true' || __DEV__,

  // SQLite-only storage - removes MSCCloudStore dependency
  SQLITE_ONLY_STORAGE: process.env.FF_SQLITE_ONLY === 'true' || __DEV__,
} as const;
