# Hominem Security Audit — 2026-08-11

## Scope

- `services/api`: Hono API, Better Auth, MCP/OAuth, Redis-backed rate limiting.
- `packages/auth`, `packages/db`, `packages/ai`: authentication, database, and OpenRouter boundaries.
- `apps/career`: React Router web application and server routes.
- `apps/omiro`: Apple-only Expo/iOS application.
- Workspace dependency graph and Git-tracked files.

## Trust boundaries

1. Internet and mobile/web clients enter through the API and web routes.
2. Better Auth sessions and MCP OAuth tokens establish caller identity.
3. Per-route middleware maps identity to user-owned database and file-storage operations.
4. `packages/ai` sends application/user content to OpenRouter and receives model output.
5. CI, EAS, Railway, and local developer tooling consume workspace dependencies.

## Audit methods

- Cloudflare security-audit methodology: reconnaissance, exploitability review, validation, and structured output.
- OWASP code-security procedures: API, general code, dependency, secret, mobile, and AI-agent reviews.
- `pnpm audit --json` against the committed pnpm lockfile.
- Git-tracked secret-pattern scan.
- Static source review of auth, MCP, API routing, AI adapters, and ownership checks.
- Live unauthenticated HTTP probes against the running API on `127.0.0.1:4040`.
- Live authenticated probes with two isolated E2E users and a temporary, deleted wishlist record.

## Limitations

- No new service was started; the user's already-running API, database, and Redis were used for live probes.
- Dynamic endpoint testing and production ingress validation remain outstanding.
- OSV-Scanner, Gitleaks, Semgrep, and TruffleHog were not installed in the workspace; dependency auditing used pnpm's registry audit and secret review used Git-aware pattern checks.
- Authenticated probing was limited to the E2E helper's local development mode and did not exercise production identity providers or deployment ingress.
