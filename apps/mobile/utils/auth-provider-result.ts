export interface BrowserAuthResult {
  type: string
  url?: string
}

export function extractSuccessfulAuthCallbackUrl(result: BrowserAuthResult) {
  if (result.type === 'success' && result.url) {
    return result.url
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    const canceled = new Error('OAuth sign-in cancelled')
    canceled.name = 'ERR_REQUEST_CANCELED'
    throw canceled
  }

  throw new Error('OAuth sign-in failed')
}
