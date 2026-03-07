interface JsonRecord {
  [key: string]: unknown;
}

interface JsonResponse {
  response: Response;
  payload: JsonRecord;
}

function getBaseUrl() {
  const baseUrl = process.env.AUTH_E2E_BASE_URL ?? 'https://api.ponti.io';
  return baseUrl.replace(/\/+$/, '');
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function requestJson(path: string, init?: RequestInit) {
  const url = `${getBaseUrl()}${path}`;
  const response = await fetch(url, init);
  const text = await response.text();
  let payload: JsonRecord = {};
  if (text.length > 0) {
    try {
      payload = JSON.parse(text) as JsonRecord;
    } catch {
      payload = { _raw: text };
    }
  }
  return { response, payload };
}

function summarizeResponse(input: JsonResponse) {
  const cfRay = input.response.headers.get('cf-ray');
  const server = input.response.headers.get('server');
  const payloadPreview = JSON.stringify(input.payload).slice(0, 240);
  return `status=${input.response.status}, server=${server ?? 'n/a'}, cf-ray=${cfRay ?? 'n/a'}, payload=${payloadPreview}`;
}

async function requireOk(path: string, init?: RequestInit) {
  const result = await requestJson(path, init);
  assert(result.response.ok, `Expected ${path} to return 2xx, got ${summarizeResponse(result)}`);
  return result;
}

async function probeEdgeAndAuthSurface() {
  const root = await requestJson('/');
  assert(
    root.response.status < 500,
    `Root probe failed with upstream/edge error: ${summarizeResponse(root)}`,
  );
  console.log('[auth-e2e] edge root probe ok');

  const jwks = await requireOk('/.well-known/jwks.json');
  assert(Array.isArray(jwks.payload.keys), 'Expected jwks payload.keys to be an array');
  console.log('[auth-e2e] jwks endpoint ok');

  const authSession = await requestJson('/api/auth/session');
  assert(
    authSession.response.status !== 404,
    `Expected /api/auth/session route to be mounted, got ${summarizeResponse(authSession)}`,
  );
  console.log('[auth-e2e] auth session route probe ok');
}

async function run() {
  const baseUrl = getBaseUrl();
  console.log(`[auth-e2e] base URL: ${baseUrl}`);

  await probeEdgeAndAuthSurface();

  {
    const { payload } = await requireOk('/api/status');
    assert(payload.status === 'ok', 'Expected /api/status payload.status to equal "ok"');
    console.log('[auth-e2e] /api/status ok');
  }

  {
    const response = await fetch(`${baseUrl}/api/auth/email-otp/send`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: `auth-e2e-smoke-${Date.now()}@hominem.test`,
        type: 'sign-in',
      }),
    });

    assert(
      response.status !== 404,
      `Expected /api/auth/email-otp/send to be routable (status must not be 404), received ${response.status}`,
    );
    console.log('[auth-e2e] /api/auth/email-otp/send route probe ok');
  }

  console.log('[auth-e2e] all checks passed');
}

run().catch((error: Error) => {
  console.error(`[auth-e2e] failed: ${error.message}`);
  process.exit(1);
});
