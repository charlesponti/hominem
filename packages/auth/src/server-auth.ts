/**
 * Server-side authentication exports (non-React)
 * These exports are safe to use from server packages like @hominem/hono-rpc
 * They do NOT include React components to avoid JSX dependency
 */

export * from './auth.types'
export * from './mock-users'
export * from './config'
export { MockAuthProvider, createMockAuthProvider, getAvailableMockUsers } from './providers/mock'
