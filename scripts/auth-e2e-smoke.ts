interface JsonRecord {
  [key: string]: unknown
}

interface JsonResponse {
  response: Response
  payload: JsonRecord
}

function getBaseUrl() {
  const baseUrl = process.env.AUTH_E2E_BASE_URL ?? 'https://auth.ponti.io'
  return baseUrl.replace(/\/+$/, '')
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

async function requestJson(path: string, init?: RequestInit) {
  const url = `${getBaseUrl()}${path}`
  const response = await fetch(url, init)
  const text = await response.text()
  let payload: JsonRecord = {}
  if (text.length > 0) {
    try {
      payload = JSON.parse(text) as JsonRecord
    } catch {
      payload = { _raw: text }
    }
  }
  return { response, payload }
}

function summarizeResponse(input: JsonResponse) {
  const cfRay = input.response.headers.get('cf-ray')
  const server = input.response.headers.get('server')
  const payloadPreview = JSON.stringify(input.payload).slice(0, 240)
  return `status=${input.response.status}, server=${server ?? 'n/a'}, cf-ray=${cfRay ?? 'n/a'}, payload=${payloadPreview}`
}

async function requireOk(path: string, init?: RequestInit) {
  const result = await requestJson(path, init)
  assert(result.response.ok, `Expected ${path} to return 2xx, got ${summarizeResponse(result)}`)
  return result
}

async function probeEdgeAndAuthSurface() {
  const root = await requestJson('/')
  assert(
    root.response.status < 500,
    `Root probe failed with upstream/edge error: ${summarizeResponse(root)}`,
  )
  console.log('[auth-e2e] edge root probe ok')

  const jwks = await requireOk('/.well-known/jwks.json')
  assert(Array.isArray(jwks.payload.keys), 'Expected jwks payload.keys to be an array')
  console.log('[auth-e2e] jwks endpoint ok')

  const authSession = await requestJson('/api/auth/session')
  assert(
    authSession.response.status !== 404,
    `Expected /api/auth/session route to be mounted, got ${summarizeResponse(authSession)}`,
  )
  console.log('[auth-e2e] auth session route probe ok')
}

async function run() {
  const baseUrl = getBaseUrl()
  console.log(`[auth-e2e] base URL: ${baseUrl}`)

  await probeEdgeAndAuthSurface()

  {
    const { payload } = await requireOk('/api/status')
    assert(payload.status === 'ok', 'Expected /api/status payload.status to equal "ok"')
    console.log('[auth-e2e] /api/status ok')
  }

  {
    const authorizeUrl =
      `${baseUrl}/api/auth/authorize` +
      `?redirect_uri=${encodeURIComponent(`${baseUrl}/`)}` +
      '&provider=apple'

    const response = await fetch(authorizeUrl, {
      method: 'GET',
      redirect: 'manual',
    })
    const location = response.headers.get('location') ?? ''

    assert(response.status === 302, `Expected /api/auth/authorize to return 302, received ${response.status}`)
    assert(location, 'Expected Location header to be present for Apple authorization redirect')

    let appleUrl: URL
    try {
      appleUrl = new URL(location)
    } catch {
      assert(false, `Expected valid URL in Location header for Apple redirect, received: ${location}`)
    }

    assert(
      appleUrl.protocol === 'https:' && appleUrl.hostname === 'appleid.apple.com',
      `Expected Apple authorization redirect host to be https://appleid.apple.com, received: ${appleUrl.protocol}//${appleUrl.hostname}`
    )
    assert(
      appleUrl.pathname === '/auth/authorize',
      `Expected Apple authorization redirect path to be /auth/authorize, received: ${appleUrl.pathname}`
    )
    assert(
      appleUrl.search.includes('response_mode=form_post'),
      'Expected response_mode=form_post in Apple redirect'
    )
    console.log('[auth-e2e] /api/auth/authorize apple redirect ok')
  }

  {
    const response = await fetch(
      `${baseUrl}/api/auth/authorize?provider=google&redirect_uri=${encodeURIComponent(`${baseUrl}/`)}`,
      {
        method: 'GET',
        redirect: 'manual',
      }
    )
    const payload = (await response.json()) as JsonRecord
    assert(response.status === 400, `Expected google provider block to return 400, received ${response.status}`)
    assert(payload.error === 'provider_not_allowed', 'Expected provider_not_allowed error for google authorize')
    console.log('[auth-e2e] google provider block ok')
  }

  {
    const response = await fetch(`${baseUrl}/api/auth/callback/apple`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: 'state=auth-e2e-callback-probe',
    })

    assert(response.status !== 404, 'Expected /api/auth/callback/apple to be routable (status must not be 404)')
    console.log('[auth-e2e] /api/auth/callback/apple route probe ok')
  }

  {
    const { response, payload } = await requestJson('/api/auth/cli/authorize', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        redirect_uri: 'http://127.0.0.1:53123/callback',
        code_challenge: '7yl2Ra2fULrFBPFBqXBT4xDoq5f2k5hQk6M6xq8W0tQ',
        code_challenge_method: 'S256',
        state: 'auth-e2e-state',
      }),
    })

    assert(response.status === 200, `Expected /api/auth/cli/authorize to return 200, received ${response.status}`)
    assert(typeof payload.flow_id === 'string' && payload.flow_id.length > 0, 'Expected flow_id in CLI authorize response')
    assert(typeof payload.authorization_url === 'string', 'Expected authorization_url to be a string in CLI authorize response')
    const authorizationUrl = new URL(payload.authorization_url as string)
    assert(
      authorizationUrl.protocol === 'https:' &&
        authorizationUrl.hostname === 'appleid.apple.com' &&
        authorizationUrl.pathname === '/auth/authorize',
      'Expected Apple authorization URL in CLI authorize response'
    )
    console.log('[auth-e2e] /api/auth/cli/authorize ok')
  }

  {
    const response = await fetch(`${baseUrl}/api/auth/callback/apple`, {
      method: 'GET',
      redirect: 'manual',
    })
    assert(response.status !== 404, `Expected callback GET route to be mounted, received ${response.status}`)
    console.log('[auth-e2e] /api/auth/callback/apple GET route probe ok')
  }

  console.log('[auth-e2e] all checks passed')
}

run().catch((error: Error) => {
  console.error(`[auth-e2e] failed: ${error.message}`)
  process.exit(1)
})
