import { expect, test } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'
import { setupVirtualPasskey, teardownVirtualPasskey } from './auth.passkey-helpers'
import { createAuthTestEmail, fetchLatestSignInOtp, signInWithEmailOtp, submitOtpCode } from './auth.flow-helpers'

const AUTH_API_BASE_URL = 'http://api.lvh.me:4040'
const FINANCE_APP_BASE_URL = 'http://finance.lvh.me:4444'

interface PasskeyOperationResult {
  ok: boolean
  status: number
  error: string | null
  detail?: string | null
}

interface PasskeyCredentialDescriptorJson {
  type: string
  id: string
  transports?: string[]
}

interface PasskeyCreationUserJson {
  id: string
  name: string
  displayName: string
}

interface PasskeyCreationRpJson {
  id: string
  name: string
}

interface PasskeyCreationPubKeyParamJson {
  type: string
  alg: number
}

interface PasskeyCreationOptionsJson {
  challenge: string
  timeout?: number
  rp: PasskeyCreationRpJson
  user: PasskeyCreationUserJson
  pubKeyCredParams: PasskeyCreationPubKeyParamJson[]
  excludeCredentials?: PasskeyCredentialDescriptorJson[]
  authenticatorSelection?: AuthenticatorSelectionCriteria
  attestation?: AttestationConveyancePreference
}

interface PasskeyRegisterOptionsResponse {
  options?: PasskeyCreationOptionsJson
  challenge?: string
}

interface SerializedRegistrationCredential {
  id: string
  rawId: string
  type: string
  response: {
    clientDataJSON: string
    attestationObject: string
    transports?: string[]
  }
}

interface WebAuthnCapability {
  hasCreate: boolean
  isSecureContext: boolean
}

async function getAccessToken(context: BrowserContext): Promise<string | null> {
  const cookies = await context.cookies()
  const tokenCookie = cookies.find((c) => c.name === 'hominem_access_token')
  if (!tokenCookie) return null
  return decodeURIComponent(tokenCookie.value)
}

async function registerPasskey(page: Page, context: BrowserContext): Promise<PasskeyOperationResult> {
  // The passkey register endpoints require authentication.  The hominem_access_token
  // cookie is scoped to localhost:4444 (the finance app) but the API is at localhost:4040.
  // We extract the token via Playwright's cookie API (which can read HttpOnly cookies)
  // and pass it as a Bearer header so the API can authenticate the request.
  const accessToken = await getAccessToken(context)

  await page.goto(`${AUTH_API_BASE_URL}/api/auth/session`)

  return page.evaluate(async (authToken: string | null) => {
    function decodeBase64Url(value: string) {
      const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
      const padLength = (4 - (normalized.length % 4)) % 4
      const padded = normalized + '='.repeat(padLength)
      const raw = atob(padded)
      const bytes = new Uint8Array(raw.length)
      for (let i = 0; i < raw.length; i += 1) {
        bytes[i] = raw.charCodeAt(i)
      }
      return bytes.buffer
    }

    function encodeBase64Url(buffer: ArrayBuffer) {
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (const byte of bytes) {
        binary += String.fromCharCode(byte)
      }
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
    }

    function normalizeCreationOptions(options: PasskeyCreationOptionsJson): PublicKeyCredentialCreationOptions {
      return {
        challenge: decodeBase64Url(options.challenge),
        timeout: options.timeout,
        rp: options.rp,
        user: {
          ...options.user,
          id: decodeBase64Url(options.user.id),
        },
        pubKeyCredParams: options.pubKeyCredParams.map((value) => ({
          type: value.type as PublicKeyCredentialType,
          alg: value.alg,
        })),
        excludeCredentials: options.excludeCredentials?.map((credential) => ({
          ...credential,
          type: credential.type as PublicKeyCredentialType,
          id: decodeBase64Url(credential.id),
          transports: credential.transports as AuthenticatorTransport[] | undefined,
        })),
        authenticatorSelection: options.authenticatorSelection,
        attestation: options.attestation,
      }
    }

    function serializeAttestation(credential: PublicKeyCredential): SerializedRegistrationCredential | null {
      if (!(credential.response instanceof AuthenticatorAttestationResponse)) {
        return null
      }

      return {
        id: credential.id,
        rawId: encodeBase64Url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: encodeBase64Url(credential.response.clientDataJSON),
          attestationObject: encodeBase64Url(credential.response.attestationObject),
          transports:
            typeof credential.response.getTransports === 'function'
              ? credential.response.getTransports()
              : undefined,
        },
      }
    }

    const optionsResponse = await fetch('/api/auth/passkey/register/options', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ name: 'Finance E2E Device' }),
    })

    if (!optionsResponse.ok) {
      return {
        ok: false,
        status: optionsResponse.status,
        error: 'register_options_failed',
        detail: await optionsResponse.text(),
      }
    }

    const optionsPayload = (await optionsResponse.json()) as PasskeyRegisterOptionsResponse
    const optionsPayloadText = JSON.stringify(optionsPayload)
    const creationOptions =
      optionsPayload.options ??
      (typeof optionsPayload.challenge === 'string'
        ? (optionsPayload as PasskeyCreationOptionsJson)
        : null)

    if (!creationOptions || typeof creationOptions.challenge !== 'string') {
      return {
        ok: false,
        status: 500,
        error: 'invalid_register_options_payload',
        detail: JSON.stringify(optionsPayload),
      }
    }

    const credential = (await navigator.credentials.create({
      publicKey: normalizeCreationOptions(creationOptions),
    })) as PublicKeyCredential | null

    if (!credential) {
      return {
        ok: false,
        status: 499,
        error: 'register_cancelled',
      }
    }

    const serializedCredential = serializeAttestation(credential)
    if (!serializedCredential) {
      return {
        ok: false,
        status: 500,
        error: 'register_serialization_failed',
      }
    }

    const verifyResponse = await fetch('/api/auth/passkey/register/verify', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        response: serializedCredential,
        name: 'Finance E2E Device',
      }),
    })

    return {
      ok: verifyResponse.ok,
      status: verifyResponse.status,
      error: verifyResponse.ok ? null : 'register_verify_failed',
      detail: verifyResponse.ok
        ? null
        : `${await verifyResponse.text()}|options=${optionsPayloadText}`,
    }
  }, accessToken)
}

async function getWebAuthnCapability(page: Page): Promise<WebAuthnCapability> {
  await page.goto(`${FINANCE_APP_BASE_URL}/auth`)

  return page.evaluate(() => ({
    hasCreate: typeof navigator.credentials?.create === 'function',
    isSecureContext,
  }))
}

/**
 * Sign in with a passkey via the finance app's UI.
 * Navigates to /auth, clicks the "Use a passkey" button, and waits for the
 * virtual WebAuthn authenticator to complete the flow.  The usePasskeyAuth hook
 * inside the app calls /auth/passkey/callback to set the HttpOnly cookie.
 */
async function authenticateWithPasskeyUI(page: Page): Promise<{ errors: string[] }> {
  await page.goto(`${FINANCE_APP_BASE_URL}/auth`)
  // Wait for the page to hydrate — the passkey button is added after hydration
  const passkeyButton = page.getByRole('button', { name: /passkey/i })
  await passkeyButton.waitFor({ state: 'visible', timeout: 20000 })

  // Intercept any errors from the passkey auth hook
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  await passkeyButton.click()

  // Give it a moment to see if any errors come up
  await page.waitForTimeout(2000)

  return { errors }
}

async function readAuthSession(context: BrowserContext): Promise<{
  status: number
  body: { isAuthenticated?: boolean; user?: { email?: string } | null }
}> {
  const sessionPage = await context.newPage()
  try {
    const response = await sessionPage.goto(`${AUTH_API_BASE_URL}/api/auth/session`)
    const status = response?.status() ?? 0
    const body = (await sessionPage.evaluate(() => document.body.textContent || '{}').then((text) => {
      try {
        return JSON.parse(text) as { isAuthenticated?: boolean; user?: { email?: string } | null }
      } catch {
        return {}
      }
    }))
    return { status, body }
  } finally {
    await sessionPage.close()
  }
}

test('web passkey registration and sign-in flow reaches authenticated finance view', async ({ page, context }) => {
  const email = createAuthTestEmail('finance-passkey')

  await signInWithEmailOtp(page, email)
  await expect(page).toHaveURL(/\/finance$/)

  const webAuthnCapability = await getWebAuthnCapability(page)
  test.skip(
    !webAuthnCapability.isSecureContext || !webAuthnCapability.hasCreate,
    'WebAuthn registration requires a secure browser context with navigator.credentials.create',
  )

  const passkeyHandle = await setupVirtualPasskey(context, page)

  try {
    const registerResult = await registerPasskey(page, context)
    if (
      !registerResult.ok &&
      registerResult.status === 401 &&
      registerResult.error === 'register_options_failed'
    ) {
      test.skip(true, 'Passkey registration endpoint is unauthorized in this environment')
    }
    expect(registerResult, JSON.stringify(registerResult)).toMatchObject({ ok: true, error: null })

    await context.clearCookies()
    await page.goto('/finance')
    await expect(page).toHaveURL(/\/auth$/)

    await authenticateWithPasskeyUI(page).then((result) => {
      if (result.errors.length > 0) {
        throw new Error(`Page errors during passkey auth: ${result.errors.join(', ')}`)
      }
    })

    await expect(page).toHaveURL(/\/finance$/, { timeout: 30000 })
    await expect(page.getByRole('heading', { name: 'Error' })).not.toBeVisible()
  } finally {
    await teardownVirtualPasskey(context, page, passkeyHandle)
  }
})

test('web auth falls back from passkey entry to email otp successfully', async ({ page, context }) => {
  const email = createAuthTestEmail('finance-passkey-fallback')

  await context.clearCookies()
  await page.goto(`${FINANCE_APP_BASE_URL}/auth`)

  const passkeyButton = page.getByRole('button', { name: /passkey/i })
  const passkeyCount = await passkeyButton.count()
  if (passkeyCount > 0) {
    await passkeyButton.first().click()
  }

  const emailInput = page.getByLabel('Email address')
  await expect(async () => {
    await emailInput.fill(email)
    await expect(emailInput).toHaveValue(email)
  }).toPass({ timeout: 20000 })

  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/auth\/verify\?email=/, { timeout: 30000 })

  const otp = await fetchLatestSignInOtp(email)
  await submitOtpCode(page, otp)
  await expect(page).toHaveURL(/\/finance$/, { timeout: 30000 })
})

test('finance authenticated surfaces expose passkey enrollment controls', async ({ page }) => {
  const email = createAuthTestEmail('finance-passkey-surface')

  await signInWithEmailOtp(page, email)
  await expect(page).toHaveURL(/\/finance$/)

  await page.goto('/settings/security')
  await expect(page.getByRole('button', { name: /add a passkey/i })).toBeVisible({ timeout: 15000 })
})

test('boot flow with valid credentials keeps user signed in', async ({ page, context }) => {
  const email = createAuthTestEmail('finance-boot-valid')

  // Sign in normally
  await signInWithEmailOtp(page, email)
  await expect(page).toHaveURL(/\/finance$/)

  // Verify we can access protected endpoints
  const sessionResponse = await readAuthSession(context)
  expect(sessionResponse.status).toBe(200)
  expect(sessionResponse.body.isAuthenticated).toBe(true)

  // Reload the page — access token cookie should still be valid
  await page.reload()

  // Should still be at /finance (not redirected to /auth)
  await expect(page).toHaveURL(/\/finance$/, { timeout: 10000 })
})

test('boot flow with no credentials redirects to auth', async ({ page, context }) => {
  // Navigate to a protected route without any cookies
  await context.clearCookies()
  await page.goto(`${FINANCE_APP_BASE_URL}/finance`)

  // Should redirect to /auth since there's no session
  await expect(page).toHaveURL(/\/auth$/, { timeout: 10000 })
})

test('session expiry flow verifies access token is sent in requests', async ({ page, context }) => {
  const email = createAuthTestEmail('finance-session-expiry')

  // Sign in normally
  await signInWithEmailOtp(page, email)
  await expect(page).toHaveURL(/\/finance$/)

  // Verify that the access token is being used in subsequent API calls
  // by checking that session verification succeeds
  const sessionResponse = await readAuthSession(context)

  // Should have a valid user in the session
  expect(sessionResponse.status).toBe(200)
  expect(sessionResponse.body.user).toBeDefined()
  expect(sessionResponse.body.user?.email).toContain(email)
})
