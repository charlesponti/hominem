# Hominem Security Audit — 2026-08-11

## Executive summary

No exploitable source-code vulnerability was confirmed by the static audit pass. The authentication and MCP paths contain explicit identity checks, user ownership filters, environment guards around E2E OTP helpers, and tests covering several auth boundary cases.

The dependency audit did report 39 advisory records: 1 critical, 21 high, 16 moderate, and 1 low. The largest clusters are development and build-tool dependencies, especially `@railway/cli -> tar`, Expo/EAS tooling, `minimatch`/`brace-expansion`, and `@modelcontextprotocol/sdk` transitive networking dependencies. These should be triaged and upgraded; they are not automatically production-runtime vulnerabilities.

## Findings

### Dependency advisories — remediation required

Command: `pnpm audit --json`

- `tar@6.2.1` through `@railway/cli`: critical/high/moderate archive traversal, parser, and denial-of-service advisories.
- `minimatch@5.1.2`, `brace-expansion@2.1.2`/`5.0.7`: high-severity ReDoS or memory-exhaustion advisories through Expo/EAS and build tooling.
- `fast-uri@3.1.4` and `ip-address@10.2.0`: high/moderate host-confusion and SSRF-boundary advisories through MCP-related transitive dependencies.
- `@hono/node-server@1.19.14`: moderate Windows path traversal advisory through the MCP SDK dependency tree.
- `postcss`, `undici`, `ajv`, `yaml`, `joi`, `ts-deepmerge`, `image-size`, `nanoid`, `js-yaml`, and `diff`: additional moderate/high/low advisories.

The audit output is intentionally summarized here without copying registry advisory payloads. Re-run `pnpm audit --json` after dependency updates and confirm the lockfile changes.

### Reachability triage

- The critical `tar@6.2.1` advisories are reached through the root development-only `@railway/cli@5.25.1` chain. They affect local/CI CLI archive handling, not the API process's declared runtime dependencies.
- The Expo/EAS `minimatch`, `brace-expansion`, `ajv`, `yaml`, `joi`, `ts-deepmerge`, `undici`, `image-size`, `nanoid`, and `js-yaml` advisories are primarily mobile/build/test toolchain paths. They still matter on developer and CI machines, but are not evidence of an internet-facing API exploit by themselves.
- `fast-uri`, `ip-address`, and `@hono/node-server@1.19.14` are installed transitively through `@modelcontextprotocol/sdk@1.29.0`, which is a runtime API dependency. The API uses the SDK's WebStandard transport and the direct Hono adapter is `@hono/node-server@2.0.11`; reachability of the vulnerable transitive code paths remains unproven.
- Non-mutating version inspection found available upgrades including `@railway/cli` 5.35.1, `eas-cli` 21.7.1, `@modelcontextprotocol/sdk` 1.30.0, and `@hono/node-server` 2.1.0. Applying them requires normal dependency-update review and regression validation.

## Positive security controls observed

- Global API auth middleware resolves sessions once and distinguishes ordinary sessions from MCP OAuth credentials.
- MCP routes require an MCP OAuth credential and a configured scope before dispatching tools.
- User-owned route and repository queries consistently carry the resolved `userId`.
- E2E auth is disabled in production by both `AUTH_E2E_ENABLED` and `NODE_ENV` checks.
- Test OTP retrieval is guarded by non-production test-store state and `AUTH_E2E_SECRET`.
- Auth cookies use `HttpOnly`, `SameSite=Lax`, and secure cookies in production/HTTPS configurations.
- Tracked-file secret pattern scan found no high-confidence key, token, or private-key matches.
- CodeQL already runs on JavaScript/TypeScript with `security-extended` and `security-and-quality` queries.

## Hardening notes requiring deployment verification

- `getClientIp()` trusts `x-forwarded-for`; a small production probe using two distinct client-supplied values produced one shared rate-limit counter, which is consistent with the edge overwriting or normalizing the header. Keep this under regression monitoring because the application still does not enforce a trusted-proxy boundary itself.
- Auth rate limiting fails open when Redis is unavailable; confirm Better Auth has an independent abuse-control layer and decide whether the availability trade-off is acceptable.
- The AI adapter accepts remote image/video URLs and model output; review downstream tool and prompt callers for SSRF, prompt-injection, and output-trust boundaries.
- Dependency audit reachability is not established for every advisory. Separate production runtime dependencies from CLI/build/test-only paths before prioritizing fixes.
- The production API responses also did not include HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, or `Permissions-Policy`. This remains deployment hardening work, not a confirmed exploit.

## Additional live candidate checks

- The public image proxy rejected non-Google URLs, loopback URLs, malformed URLs, and a suffix-confusion host (`googleapis.com.evil.example`). No SSRF bypass was reproduced.
- The image proxy currently returns a generic `500` plus the detail `Domain not allowed` for rejected URLs. This is an error-contract issue, not a confirmed security vulnerability.
- AI structured-output paths parse provider JSON and validate it with Zod schemas before returning typed results. No provider output was trusted as executable code during the source review.

## Recommended next actions

1. Upgrade or remove the vulnerable direct tooling roots, starting with `@railway/cli`, Expo/EAS tooling, and MCP SDK transitive dependencies.
2. Add a CI secret scanner and an OSV-compatible lockfile scan.
3. Run dynamic API tests against a user-authenticated test environment, including cross-user object IDs, MCP scope changes, proxy headers, and Redis failure behavior.
4. Repeat the Cloudflare audit on a second run after dependency remediation; its methodology notes that multiple runs improve coverage.

## Unverified

- Live API behavior, deployed proxy header handling, production cookies, Redis outage behavior, cloud storage permissions, and iOS runtime storage/network controls.

## Validation evidence

- Cloudflare findings schema: `node .agents/skills/cloudflare-security-audit/validate-findings.cjs security-audits/2026-08-11/findings.json` — passed with zero confirmed findings.
- Auth boundary tests: `pnpm --filter @hominem/api test -- src/middleware/auth.test.ts src/routes/auth.e2e-login.test.ts src/routes/auth.test-otp-route.test.ts` — 23 files and 107 tests passed.
- Workspace formatting: `pnpm format:check` — 15 tasks passed.
- Patch whitespace: `git diff --check` — passed.
- MCP authorization tests: `pnpm --filter @hominem/api test -- src/mcp/server.test.ts src/mcp/tools.test.ts` — 23 files and 107 tests passed.
- AI package tests: `pnpm --filter @hominem/ai test` — passed.
- Repeatable harness: `pnpm security:audit` — passed static checks, 23 API test files / 107 tests, and live unauthenticated probes.
- Repeatable authenticated harness: `pnpm security:audit -- --live-only --authenticated` — passed ownership checks and cleaned up two temporary E2E users.
- Complete repeatable harness: `pnpm security:audit -- --authenticated` — passed all static, test, unauthenticated, and authenticated checks; dependency advisory counts remain unchanged.

## Live validation evidence

Target: `http://127.0.0.1:4040` with the locally running API, database, and Redis.

- `/api/status` returned `200`, reported `database: connected`, and did not expose a CORS allow-origin header.
- Unauthenticated `/api/auth/session` returned `401` with no user.
- Unauthenticated `/api/career/profile`, `/api/personal/finance/monthly-summary`, and `/api/finance/transactions/list` each returned `401`.
- Unauthenticated `/api/mcp` and `/api/mcp` with a bogus bearer token each returned `401`.
- E2E login without the secret returned `403`; test OTP retrieval without the secret returned `403`.
- MCP protected-resource discovery returned `200` and advertised the configured scopes; this is expected public OAuth discovery metadata.
- `/openapi.json` and `/docs` were reachable. The generated OpenAPI document currently contained no paths; the docs page loaded the Scalar CDN script.

No live exploit was reproduced in the tested unauthenticated paths.

## Authenticated live validation

Using two isolated local E2E users and a temporary wishlist record:

- Both E2E logins returned `200` with Better Auth session cookies; no custom access token was returned.
- Both authenticated users could read their own career profile (`200`).
- User B attempting to delete User A's wishlist record received `404`.
- User A deleting its own temporary wishlist record received `200`; the test record was removed.
- An empty wishlist company was rejected with `400` by Zod validation.
- The two temporary E2E user rows were deleted from the local database after testing.

This provided live evidence against the tested BOLA/IDOR and input-validation paths. It did not cover every resource type or every authenticated route.

## Deployment verification

Target: Railway production project `hominem`, service `api`, resolved public URL `https://api.ponti.io`.

- Railway resolved the service to deployment `4dfdc858-1ec6-4092-98ac-2f994fe6f700`, state `SUCCESS`, in `us-west2`.
- `GET https://api.ponti.io/api/status` returned `200` with `database: connected`.
- `GET https://api.ponti.io/api/auth/session` returned `401` and `{"isAuthenticated":false,"user":null}` without credentials.
- `GET https://api.ponti.io/openapi.json` returned `200` and identified `https://api.ponti.io` as its production server.
- An `Origin: https://evil.example` request received no `Access-Control-Allow-Origin` response header.
- Two distinct client-supplied `X-Forwarded-For` values against the disabled E2E endpoint produced a shared `X-RateLimit-Remaining` sequence rather than separate fresh buckets, consistent with the production edge normalizing the client IP before the API sees it. The short-lived test counters expire automatically.
- The production response did not include HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, or `Permissions-Policy`.
- The Dockerfile builds successfully for `linux/amd64` and produces a release image running as `apiuser` with `node dist/index.mjs`. An unqualified local ARM64 build fails because `@railway/cli@5.25.1` requests a missing ARM64 Linux artifact; the target `linux/amd64` build passed.

The deployment target and final remote state are verified. Redis-outage behavior in production remains unverified; the code and unit test document an intentional fail-open choice.
