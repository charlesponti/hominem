import { resolveAuthRedirect } from './redirect-policy'

export const AUTH_CALLBACK_ERROR = 'auth_callback_failed' as const

interface SearchParamReader {
  get(name: string): string | null
}

interface BuildAuthCallbackErrorRedirectInput {
  authPath?: string
  next: string | null | undefined
  fallback: string
  allowedPrefixes: string[]
  description: string
}

export function buildAuthCallbackErrorRedirect(input: BuildAuthCallbackErrorRedirectInput) {
  const params = new URLSearchParams()
  params.set('error', AUTH_CALLBACK_ERROR)
  params.set('error_description', input.description)
  params.set(
    'next',
    resolveAuthRedirect(input.next, input.fallback, input.allowedPrefixes).safeRedirect,
  )

  const authPath = input.authPath ?? '/auth'
  return `${authPath}?${params.toString()}`
}

export function readAuthErrorMessage(searchParams: SearchParamReader) {
  const description = searchParams.get('error_description') ?? searchParams.get('description')
  if (description) {
    return description
  }

  const error = searchParams.get('error')
  if (error === AUTH_CALLBACK_ERROR) {
    return 'Authentication failed. Please try again.'
  }

  return null
}
