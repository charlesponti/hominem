import type { AuthStatusCompat } from '~/utils/auth/provider-utils'

interface ResolveAuthRedirectInput {
  authStatus: AuthStatusCompat
  isSignedIn: boolean
  segments: string[]
}

export type AuthRedirectTarget = '/(auth)' | '/(drawer)/(tabs)/start'

export function resolveAuthRedirect(input: ResolveAuthRedirectInput): AuthRedirectTarget | null {
  if (input.authStatus === 'booting') {
    return null
  }

  const inProtectedGroup = input.segments[0] === '(drawer)'
  const inAuthGroup = input.segments[0] === '(auth)'

  if (!input.isSignedIn && inProtectedGroup) {
    return '/(auth)'
  }

  if (input.isSignedIn && inAuthGroup) {
    return '/(drawer)/(tabs)/start'
  }

  return null
}
