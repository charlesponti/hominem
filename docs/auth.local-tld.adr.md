# Development auth local TLD

## Status

Accepted (2026-09-02)

## Context

The repo adopted [portless](https://github.com/vercel-labs/portless) so `api`/`web`/`career`/`finance` each get a stable `https://<name>.<tld>:4200` URL under `pnpm dev` instead of a fixed port — the point being that multiple git worktrees can run `pnpm dev` concurrently without port collisions (portless prefixes each worktree's branch name onto the hostname). The default TLD portless uses is `.localhost`.

Hominem's hosted-login architecture (see [docs/authentication.md](../authentication.md)) depends on a cross-subdomain session cookie: the browser signs in on the API's own origin, then the app it came from (Career, Finance, ...) has to see that same session on its own origin. Production does this with `AUTH_COOKIE_DOMAIN` set to the shared parent domain. Local dev under portless needs the same mechanism, since `api`/`career`/`finance`/`web` are now separate subdomains rather than one host on different ports — so we set `AUTH_COOKIE_DOMAIN=localhost` to match.

That looked correct and wasn't: the `Set-Cookie` response header was exactly right, but no session ever actually persisted in the browser. We traced this to a real, sign-in flow, confirmed both empirically and end-to-end:

- `document.cookie = "x=1; Domain=localhost"` silently produces an empty cookie jar in Chrome — no console error, no rejected-cookie warning, nothing. A host-only cookie (no `Domain` attribute) on the same origin works fine.
- Following the real flow with server-side debug logging showed `/login/verify` computing the correct redirect target every time (`resume.url` = the calling app's URL) and Better Auth issuing a correct `Set-Cookie: ...; Domain=localhost; ...` — but the browser's own `/api/auth/get-session` check, run immediately after, came back `null`, and the destination app's SSR loader (which independently checks the session against `HOMINEM_INTERNAL_API_URL`) redirected back to `/login`, having found no session either. Sign-in looked like it worked and then silently bounced.
- This is deliberate Chrome hardening, not a bug: since anyone on a shared machine can bind an arbitrary service to `foo.localhost`, Chrome refuses `Domain=` cookies for `localhost` (and `.localhost`) so one such service can't set a cookie that leaks to another.

We considered four options:

1. **Keep `.localhost`, find another way to share the session.** Rejected: there's no cookie-based cross-subdomain sharing without a `Domain=` attribute, and Chrome's restriction is unconditional — no config permutation of `AUTH_COOKIE_DOMAIN` under `.localhost` can work around it.
2. **Drop subdomain-based local dev entirely** — go back to one shared hostname with per-app ports (host-only cookies are shared across ports on the same host automatically, no `Domain=` needed). Rejected for now: it stops mirroring production's actual cross-subdomain cookie topology in dev, which is exactly the class of bug this investigation surfaced — reverting would trade "catches this in dev" for "never catches this in dev." It also reintroduces the original port-collision-across-worktrees problem portless was adopted to fix.
3. **A custom local-only TLD** via portless's own `--tld` support (e.g. `--tld test`, with its built-in local CA and `/etc/hosts` sync — no need for a separate tool like Caddy; portless already does what Caddy would add here). Tested empirically and rejected: Chrome's restriction isn't specific to the literal string `localhost` — it covers RFC 2606's whole reserved special-use-TLD group (`localhost`, `test`, `example`, `invalid`). `document.cookie = "x=1; Domain=test"` on a `*.test` origin is silently rejected exactly the same way, confirmed directly.
4. **A real, registrable wildcard-DNS-to-`127.0.0.1` domain** — `lvh.me` (like `nip.io`/`sslip.io`, but with unrestricted-shape subdomains, which `lvh.me` supports and IP-address-shaped schemes like `sslip.io` don't for our `<worktree>.<app>.<tld>` naming). Chosen: confirmed via `document.cookie = "x=1; Domain=lvh.me"` that Chrome accepts it (a real registrable domain isn't on Chrome's reserved-TLD list), and confirmed end-to-end with a full curl-based sign-in — OTP verify → session cookie issued with `Domain=.lvh.me` → followed the redirect into `career.lvh.me/work` with that same cookie jar → `200`, authenticated user's email rendered in the page, zero mentions of "login" anywhere in the response. This also isn't a new pattern for the repo: `apps/career/playwright.config.ts` and `apps/finance/playwright.config.ts` already used `AUTH_COOKIE_DOMAIN: 'lvh.me'` for e2e cross-subdomain auth, for the same underlying reason.

## Decision

Local dev's portless TLD is `lvh.me`, not `.localhost`:

- `pnpm exec portless proxy start --port 4200 --tld lvh.me`
- `services/api/.env(.example)`: `API_URL`/`WEB_URL`/`CAREER_URL`/`FINANCE_URL` point at `https://<name>.lvh.me:4200`, and `AUTH_COOKIE_DOMAIN="lvh.me"`.
- `apps/{career,finance,web}/.env(.example)`: `VITE_PUBLIC_API_URL`/`HOMINEM_INTERNAL_API_URL`/`PUBLIC_APP_URL` point at the matching `.lvh.me` origins.
- Documented in the `hominem-development` and `hominem-auth-e2e` skills, and in [docs/authentication.md](../authentication.md), including the specific "don't reach for `--tld test`, it hits the identical wall" note, so this isn't rediscovered the hard way.

## Consequences

**Fixed:** local cross-app login actually persists a session now — verified end-to-end (see above), not just "the response headers look right."

**New dependency:** local dev now needs real DNS resolution for `*.lvh.me` (a third-party service, `lvh.me`, resolving wildcard subdomains to `127.0.0.1`), where `.localhost` needed none. If `lvh.me` ever became unavailable or untrustworthy, local dev would need a different real domain — the mechanism (any real, non-reserved registrable domain with wildcard DNS to `127.0.0.1`) is what matters, not this specific one.

**Known limitation, not a project blocker:** the Claude Code Browser pane used for interactive verification in this repo blocks sub-resource loads (`ERR_BLOCKED_BY_CLIENT`) on both `lvh.me` and `localtest.me` — a real domain but not `.localhost` — while `.test` and `.localhost` load freely in that same pane. This looks like a `*.localhost`-specific allowlist in that tool's own safety layer, not a real end-user Chrome restriction (real Chrome, tested directly via `document.cookie` on `lvh.me`, has no such issue), so it doesn't change the decision — but it does mean that specific tool can't be used to visually click through the login flow on `lvh.me`; curl-based verification (as used above) or a real browser is required instead.

**Not done:** dropping subdomain-based local dev (option 2). Revisit if `lvh.me`'s external-DNS dependency ever becomes a real practical problem — the fallback is well understood (shared host, per-app ports, no `Domain=` cookie needed), just at the cost of no longer catching cross-subdomain-cookie bugs like this one in local dev.
