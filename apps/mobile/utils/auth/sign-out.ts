export type SignOutResult =
  | { type: 'REMOTE_SIGN_OUT' }
  | { type: 'LOCAL_ONLY_SIGN_OUT'; error: Error | null }

interface SignOutDeps {
  clearLocalSession: () => Promise<void>
  getSessionCookieHeader: () => string | null
  remoteLogout: (sessionCookieHeader: string) => Promise<void>
}

export async function runSignOut(deps: SignOutDeps): Promise<SignOutResult> {
  const sessionCookieHeader = deps.getSessionCookieHeader()

  if (!sessionCookieHeader) {
    await deps.clearLocalSession()
    return { type: 'LOCAL_ONLY_SIGN_OUT', error: null }
  }

  try {
    await deps.remoteLogout(sessionCookieHeader)
    await deps.clearLocalSession()
    return { type: 'REMOTE_SIGN_OUT' }
  } catch (error) {
    const resolvedError =
      error instanceof Error ? error : new Error('Failed to sign out. Please try again.')
    await deps.clearLocalSession()
    return { type: 'LOCAL_ONLY_SIGN_OUT', error: resolvedError }
  }
}
