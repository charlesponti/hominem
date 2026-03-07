import { redirect, useActionData, useLoaderData, useLocation } from 'react-router'

import { AuthScaffold, OtpVerificationForm } from '@hominem/ui'
import { getSetCookieHeaders } from '@hominem/utils/headers'
import { getServerAuth } from '~/lib/auth.server'
import { serverEnv } from '~/lib/env'

interface VerifySuccessPayload {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
  user: { id: string; email: string; name?: string | null }
}

export async function loader({ request }: { request: Request }) {
  const { user, headers } = await getServerAuth(request)
  if (user) {
    return redirect('/notes', { headers })
  }

  const url = new URL(request.url)
  const email = url.searchParams.get('email')

  if (!email) {
    return redirect('/auth')
  }

  return { email }
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData()
  const email = String(formData.get('email') ?? '')
  const otp = String(formData.get('otp') ?? '')
  const next = String(formData.get('next') ?? '/notes')

  if (!email || !otp) {
    return { error: 'Email and verification code are required.' }
  }

  const response = await fetch(`${serverEnv.VITE_PUBLIC_API_URL}/api/auth/email-otp/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  })

  if (!response.ok) {
    return { error: 'Verification failed. Please check your code and try again.' }
  }

  const result = (await response.json()) as VerifySuccessPayload
  if (!result.accessToken) {
    return { error: 'Verification failed. Missing auth token from server.' }
  }

  const headers = new Headers()

  const setCookieValues = getSetCookieHeaders(response.headers)
  if (setCookieValues.length > 0) {
    for (const value of setCookieValues) {
      headers.append('set-cookie', value)
    }
  } else {
    const setCookie = response.headers.get('set-cookie')
    if (setCookie) headers.append('set-cookie', setCookie)
  }

  headers.append(
    'set-cookie',
    `hominem_access_token=${encodeURIComponent(result.accessToken)}; Path=/; HttpOnly; SameSite=Lax`,
  )

  return redirect(next, { headers })
}

export default function AuthVerifyPage() {
  const { email } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const location = useLocation()

  return (
    <AuthScaffold
      title="Enter code"
      description="We sent a code to your email"
    >
      <OtpVerificationForm
        action={`/auth/verify${location.search}`}
        email={email}
        defaultNext="/notes"
        error={actionData?.error ?? undefined}
        onChangeEmail={() => {
          window.location.href = '/auth'
        }}
      />
    </AuthScaffold>
  )
}
