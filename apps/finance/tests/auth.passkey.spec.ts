import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { setupVirtualPasskey, teardownVirtualPasskey } from './auth.passkey-helpers'
import { createAuthTestEmail, signInWithEmailOtp } from './auth.flow-helpers'

const AUTH_API_BASE_URL = 'http://localhost:4040'

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

interface PasskeyRequestOptionsJson {
  challenge: string
  timeout?: number
  rpId?: string
  allowCredentials?: PasskeyCredentialDescriptorJson[]
  userVerification?: UserVerificationRequirement
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

interface PasskeyAuthOptionsResponse {
  options?: PasskeyRequestOptionsJson
  challenge?: PasskeyRequestOptionsJson | string
  rpId?: string
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

interface SerializedAuthenticationCredential {
  id: string
  rawId: string
  type: string
  response: {
    clientDataJSON: string
    authenticatorData: string
    signature: string
    userHandle: string | null
  }
}

async function registerPasskey(page: Page): Promise<PasskeyOperationResult> {
  await page.goto(`${AUTH_API_BASE_URL}/api/auth/session`)

  return page.evaluate(async () => {
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
  })
}

async function authenticateWithPasskey(page: Page): Promise<PasskeyOperationResult> {
  await page.goto(`${AUTH_API_BASE_URL}/api/auth/session`)

  return page.evaluate(async () => {
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

    function normalizeRequestOptions(options: PasskeyRequestOptionsJson): PublicKeyCredentialRequestOptions {
      return {
        challenge: decodeBase64Url(options.challenge),
        timeout: options.timeout,
        rpId: options.rpId,
        allowCredentials: options.allowCredentials?.map((credential) => ({
          ...credential,
          type: credential.type as PublicKeyCredentialType,
          id: decodeBase64Url(credential.id),
        })),
        userVerification: options.userVerification,
      }
    }

    function serializeAssertion(
      credential: PublicKeyCredential,
    ): SerializedAuthenticationCredential | null {
      if (!(credential.response instanceof AuthenticatorAssertionResponse)) {
        return null
      }

      return {
        id: credential.id,
        rawId: encodeBase64Url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: encodeBase64Url(credential.response.clientDataJSON),
          authenticatorData: encodeBase64Url(credential.response.authenticatorData),
          signature: encodeBase64Url(credential.response.signature),
          userHandle: credential.response.userHandle
            ? encodeBase64Url(credential.response.userHandle)
            : null,
        },
      }
    }

    const optionsResponse = await fetch('/api/auth/passkey/auth/options', {
      method: 'POST',
      credentials: 'include',
    })

    if (!optionsResponse.ok) {
      return {
        ok: false,
        status: optionsResponse.status,
        error: 'auth_options_failed',
        detail: await optionsResponse.text(),
      }
    }

    const optionsPayload = (await optionsResponse.json()) as PasskeyAuthOptionsResponse
    const payloadAsRequestOptions = optionsPayload as PasskeyRequestOptionsJson
    const requestOptions =
      optionsPayload.options ??
      (typeof optionsPayload.challenge === 'object' ? optionsPayload.challenge : null) ??
      (typeof payloadAsRequestOptions.challenge === 'string'
        ? payloadAsRequestOptions
        : null)

    if (!requestOptions || typeof requestOptions.challenge !== 'string') {
      return {
        ok: false,
        status: 500,
        error: 'invalid_auth_options_payload',
        detail: JSON.stringify(optionsPayload),
      }
    }

    const credential = (await navigator.credentials.get({
      publicKey: normalizeRequestOptions(requestOptions),
    })) as PublicKeyCredential | null

    if (!credential) {
      return {
        ok: false,
        status: 499,
        error: 'auth_cancelled',
      }
    }

    const serializedCredential = serializeAssertion(credential)
    if (!serializedCredential) {
      return {
        ok: false,
        status: 500,
        error: 'auth_serialization_failed',
      }
    }

    const verifyResponse = await fetch('/api/auth/passkey/auth/verify', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        response: serializedCredential,
      }),
    })

    return {
      ok: verifyResponse.ok,
      status: verifyResponse.status,
      error: verifyResponse.ok ? null : 'auth_verify_failed',
      detail: verifyResponse.ok ? null : await verifyResponse.text(),
    }
  })
}

test('web passkey registration and sign-in flow reaches authenticated finance view', async ({ page, context }) => {
  const email = createAuthTestEmail('finance-passkey')

  await signInWithEmailOtp(page, email)
  await expect(page).toHaveURL(/\/finance$/)

  const passkeyHandle = await setupVirtualPasskey(context, page)

  try {
    const registerResult = await registerPasskey(page)
    expect(registerResult, JSON.stringify(registerResult)).toMatchObject({ ok: true, error: null })

    await context.clearCookies()
    await page.goto('/finance')
    await expect(page).toHaveURL(/\/auth\/signin$/)

    const authResult = await authenticateWithPasskey(page)
    expect(authResult, JSON.stringify(authResult)).toMatchObject({ ok: true, error: null })

    await page.goto('/finance')
    await expect(page).toHaveURL(/\/finance$/)
    await expect(page.getByRole('heading', { name: 'Error' })).not.toBeVisible()
  } finally {
    await teardownVirtualPasskey(context, page, passkeyHandle)
  }
})
