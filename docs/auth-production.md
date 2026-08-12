# Production Web Authentication

Better Auth on `api.ponti.io` is the sole authority for web sessions. Career and
Finance use the same browser session cookie; neither application creates,
translates, or stores its own end-user credential.

## Network boundary

Use two API URLs with distinct owners, and keep the API's hosted login as the only first-party web OTP surface:

| Caller | URL | Purpose |
| --- | --- | --- |
| Browser | `VITE_PUBLIC_API_URL` (`https://api.ponti.io`) | Hosted login redirects, public API, and Better Auth browser client requests |
| Career or Finance server | `HOMINEM_INTERNAL_API_URL` | Session resolution and server-side Hono/RPC data calls |

`HOMINEM_INTERNAL_API_URL` is server-only. In Railway production it resolves
to the API service's private address and port, currently
`http://hominem-api-production.railway.internal:8080`. Do not expose it as a
`VITE_*` variable or use it in a browser redirect, client request, or auth
client configuration.

The public API is protected by Cloudflare. A browser can complete its
challenge, but a Railway server-to-server request cannot. Sending an SSR
session check to `api.ponti.io` can therefore return an edge response instead
of Better Auth's session payload. `getServerAuth` fails closed to no user, so
the visible symptom is a successful OTP sign-in followed by a redirect back to
the app's sign-in page.

## Cookie contract

Production browser cookies must be emitted by Better Auth with:

- `Domain=.ponti.io`
- `Secure`
- `HttpOnly`
- `SameSite=Lax`

The browser sends that cookie to `career.ponti.io` or `finance.ponti.io`.
Their server reads the inbound `Cookie` header and forwards it unchanged to
the private API session endpoint. Forward every returned `Set-Cookie` header
back to the browser; do not read, log, combine, or persist cookie values.

## App configuration

Each deployed web app needs both values:

```dotenv
VITE_PUBLIC_API_URL=https://api.ponti.io
HOMINEM_INTERNAL_API_URL=http://hominem-api-production.railway.internal:8080
```

`HOMINEM_INTERNAL_API_URL` is required. Local development sets it to the
local API URL; production sets it to the Railway-private API URL. Never fall
back to `VITE_PUBLIC_API_URL`: a missing production value must stop the app
instead of silently routing SSR session checks through Cloudflare.

## Production verification

The app entry points `/auth` and `/login` are compatibility shims. They build a trusted absolute return URL and redirect to `https://api.ponti.io/login?next=...`. The API validates the return origin against its trusted app origins before redirecting after OTP verification. Apps must not add custom tokens, localStorage auth, or duplicate OTP state.

After changing auth configuration or deployment topology:

1. Visit a protected Career or Finance route and confirm it redirects to the
   API hosted `/login` page.
2. Submit the OTP there and confirm the API response sets Better Auth session
   cookies accepted by the browser.
3. Navigate to the protected route and confirm it loads rather
   than redirecting to sign-in.
4. Confirm the app server's session/data requests reach the API service on
   the API service without Cloudflare interception.

Use HTTP status patterns and aggregate session data only. Never log, copy, or
inspect OTPs, session tokens, or cookie values during production diagnosis.
