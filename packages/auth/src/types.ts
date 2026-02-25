export interface HominemUser {
  id: string
  email: string
  name?: string | undefined
  image?: string | undefined
  isAdmin: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthEnvelope {
  sub: string
  sid: string
  scope: string[]
  role: 'user' | 'admin'
  amr: string[]
  authTime: number
}

export interface HominemSession {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  expires_at: string
  refresh_token?: string | undefined
}

export interface AuthClient {
  auth: {
    signInWithOAuth: (input: {
      provider: 'apple' | 'google'
      options?: { redirectTo?: string | undefined } | undefined
    }) => Promise<{ error: Error | null }>
    signOut: () => Promise<{ error: Error | null }>
    getSession: () => Promise<{
      data: {
        session: HominemSession | null
      }
      error: Error | null
    }>
  }
}

export interface AuthContextType {
  user: HominemUser | null
  session: HominemSession | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: () => Promise<void>
  signInWithApple: () => Promise<void>
  linkGoogle: () => Promise<void>
  unlinkGoogle: () => Promise<void>
  signOut: () => Promise<void>
  getSession: () => Promise<HominemSession | null>
  requireStepUp: (_action: string) => Promise<void>
  logout: () => Promise<void>
  authClient: AuthClient
  userId?: string | undefined
}

export interface AuthConfig {
  apiBaseUrl: string
  redirectTo?: string
}

export interface ServerAuthResult {
  user: HominemUser | null
  session: HominemSession | null
  auth: AuthEnvelope | null
  isAuthenticated: boolean
}
