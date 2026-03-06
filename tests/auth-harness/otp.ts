export interface OtpFetchResult {
  email: string
  otp: string
  type: string
  createdAt: number
  expiresAt: number
}

interface FetchLatestOtpInput {
  apiBaseUrl: string
  secret: string
  email: string
  type?: string | undefined
}

export async function fetchLatestOtp(input: FetchLatestOtpInput): Promise<OtpFetchResult> {
  const url = new URL('/api/auth/test/otp/latest', input.apiBaseUrl)
  url.searchParams.set('email', input.email)
  if (input.type) {
    url.searchParams.set('type', input.type)
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-e2e-auth-secret': input.secret,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`failed_to_fetch_otp:${response.status}:${text}`)
  }

  return (await response.json()) as OtpFetchResult
}
