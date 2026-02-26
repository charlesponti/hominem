const MOBILE_CALLBACK_PATH = 'auth/callback'

export interface ParsedMobileCallback {
  code: string
}

function toUrl(callbackUrl: string) {
  try {
    return new URL(callbackUrl)
  } catch {
    throw new Error('Invalid mobile callback URL')
  }
}

function getNormalizedCallbackPath(url: URL) {
  const hostPart = url.hostname ? `${url.hostname}/` : ''
  const pathPart = url.pathname.replace(/^\/+/, '')
  return `${hostPart}${pathPart}`.replace(/\/+$/, '')
}

export function parseMobileAuthCallback(input: {
  callbackUrl: string
  expectedRedirectUri: string
  expectedState: string
}): ParsedMobileCallback {
  const url = toUrl(input.callbackUrl)
  const expectedUrl = toUrl(input.expectedRedirectUri)
  if (url.protocol !== expectedUrl.protocol) {
    throw new Error('Invalid mobile callback scheme')
  }

  const normalizedPath = getNormalizedCallbackPath(url)
  const expectedPath = getNormalizedCallbackPath(expectedUrl)
  if (normalizedPath !== expectedPath || normalizedPath !== MOBILE_CALLBACK_PATH) {
    throw new Error('Invalid mobile callback path')
  }

  const returnedState = url.searchParams.get('state')
  if (!returnedState || returnedState !== input.expectedState) {
    throw new Error('OAuth state mismatch')
  }

  const code = url.searchParams.get('code')
  if (!code) {
    const errorCode = url.searchParams.get('error') ?? 'oauth_failed'
    const description = url.searchParams.get('error_description') ?? 'Unable to complete Apple sign-in.'
    throw new Error(`${errorCode}:${description}`)
  }

  return { code }
}
