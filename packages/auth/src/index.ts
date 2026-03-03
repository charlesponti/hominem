export * from './client'
export * from './types'
export * from './user'

// Mock auth exports
export * from './auth.types'
export * from './mock-users'
export * from './config'
export { MockAuthProvider, createMockAuthProvider, getAvailableMockUsers } from './providers/mock'
export { AuthProvider, useAuth, useProtectedRoute } from './AuthContext'
export type { AuthContextState, AuthProviderProps } from './AuthContext'
