/**
 * @hominem/auth - Authentication package for Hominem apps
 *
 * ## Import Patterns
 *
 * ### For Applications (production code)
 *
 * Import the AuthProvider and hooks from the package root:
 * ```typescript
 * import { AuthProvider, useSafeAuth, useAuth } from '@hominem/auth';
 * ```
 *
 * - `AuthProvider` - Wrap your app with this to provide authentication context
 * - `useSafeAuth()` - Returns `AuthContextType | null`. Safe for layout/SSR code where context may not be available
 * - `useAuth()` - Returns `AuthContextType`. Throws if used outside provider. Use for protected components
 *
 * ### For Testing (development only)
 *
 * Import mock utilities from the mock sub-path:
 * ```typescript
 * import { LocalMockAuthProvider, createMockAuthProvider } from '@hominem/auth/AuthContext';
 * ```
 *
 * Note: Mock utilities are NOT exported from the package root to prevent accidental use in production.
 *
 * ### Advanced Use Cases
 *
 * For direct context access (testing, advanced scenarios):
 * ```typescript
 * import { AuthContext, useAuth, useProtectedRoute } from '@hominem/auth';
 * ```
 */

// Public client API
export { AuthProvider, type AuthProviderProps, useAuthContext, useSafeAuth } from './client'
export * from './auth-error-contract'
export * from './auth-ux-contract'
export * from './contracts'
export * from './types'
export * from './user'

// Mock auth exports (tests and development only)
export * from './auth.types'
export * from './mock-users'
export * from './config'
// helpers such as createMockAuthProvider are intentionally **not** re-exported
// here; they live under `@hominem/auth/providers/mock` or server-auth for
// explicit imports to avoid accidental use in production code.

// Expose direct context helpers for advanced use cases (e.g. testing).
// By design, the only provider apps should import is the one above from
// './client'.  We avoid re-exporting another "AuthProvider" here to prevent
// accidental imports.
export { AuthContext, useAuth, useProtectedRoute } from './AuthContext'
export type { AuthContextState } from './AuthContext'
