import { useMemo } from 'react'

import { useAuth } from './auth-provider'
import type { AppAuthState, AppAuthStatus } from '@hominem/auth'

export function useAuthState(): AppAuthState {
  const { authStatus, isLoadingAuth, currentUser } = useAuth()

  const state = useMemo<AppAuthState>(() => {
    const status = mapToCanonicalStatus(authStatus)
    return {
      status,
      user: currentUser
        ? {
            id: currentUser.id,
            email: currentUser.email ?? '',
            name: currentUser.name ?? undefined,
            isAdmin: false,
            createdAt: currentUser.createdAt,
            updatedAt: currentUser.updatedAt,
          }
        : null,
      error: null,
      isLoading: isLoadingAuth,
    }
  }, [authStatus, currentUser, isLoadingAuth])

  return state
}

function mapToCanonicalStatus(status: string): AppAuthStatus {
  const statusMap: Record<string, AppAuthStatus> = {
    booting: 'booting',
    signed_out: 'signed_out',
    requesting_otp: 'requesting_otp',
    otp_requested: 'otp_requested',
    verifying_otp: 'verifying_otp',
    authenticating_passkey: 'authenticating_passkey',
    refreshing_session: 'refreshing_session',
    signed_in: 'signed_in',
    signing_out: 'signing_out',
    degraded: 'degraded',
  }
  return statusMap[status] ?? 'signed_out'
}
