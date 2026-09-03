---
name: hominem-auth-e2e
description: Authenticate as a disposable test account against the dev Better Auth email-OTP flow (curl or browser), for any feature's end-to-end verification. Use whenever an e2e test needs a logged-in session — signing up a test user, checking whoami, or logging the browser in/out — regardless of which feature is actually under test.
---

Shared auth plumbing for e2e verification in this repo. Every
feature-specific test (collection invites, or another domain) needs the
same three things — a disposable logged-in account, a way to get the
browser itself logged in as one, and a safe way to tear it down — so that
logic lives here once instead of being reimplemented per feature.

## The two ways to be "logged in" here

1. **curl + cookie jar** (`lib.sh` / `driver.sh`) — fast, scriptable, no
   browser needed. Good for exercising API/service-layer behavior.
2. **the actual browser** — required only when a test needs to see the
   real UI render (a component, a button, a redirect). A curl-obtained
   session cookie is httpOnly and cannot be injected into the page via
   `document.cookie` or any JS — there's no shortcut here, the browser
   must walk its own OTP flow. See below for the fastest reliable way to
   do that.

Pick (1) whenever possible; drop to (2) only for the specific step that
needs eyes.

## Which URLs to use

The plain `http://localhost:4040` (API) / `http://localhost:4445` (web)
ports below are `lib.sh`'s and `packages/env`'s fallback defaults, and match
what the Browser pane's `.claude/launch.json` config starts on its own. If
the ambient dev environment was instead started with `pnpm dev` (the normal
path — see the `hominem-development` skill), the apps run through the
portless proxy at `https://api.lvh.me:4200` / `https://web.lvh.me:4200`
instead (`lvh.me`, not `.localhost` — see the `hominem-development` skill
for why), and `lib.sh`'s curl helpers need
`HOMINEM_API_URL=https://api.lvh.me:4200` set to reach it. Check which is
actually running before picking a URL.

## Default to the stable test user

For any test that only needs **one** identity, use the stable default
account — `test@hominem.local` — instead of minting a fresh disposable
one. It signs in the same way every time (`hominem_signin_default` /
`driver.sh signin-default`), persists across sessions, and is exempt
from `hominem_delete_user` (it can never be deleted through this
library — see the safety rail below). This means most single-actor
tests need zero account-lifecycle bookkeeping: no signup-then-cleanup
pair, just sign in and go.

Only create a disposable `@test.hominem.dev` account when a test
genuinely needs a **second, distinct** identity — e.g. an owner and an
invitee who must not be the same person, like a collection-invite test's
fast path. In that shape, `test@hominem.local` is naturally the owner
and a fresh `*-e2e@test.hominem.dev` account is the invitee.

## Safety rail (read this before calling anything)

Every function/command here refuses any email that isn't either exactly
`test@hominem.local` or ending in `@test.hominem.dev`. This is not a
suggestion to relax if it's inconvenient — a past session deleted a real
user's data by trusting a row it hadn't verified it created itself. The
rail exists so that mistake can't happen through these scripts, full
stop:

- Never call `hominem_signup` / `driver.sh signup` with the real user's
  email to "act as them" from a script — the real logged-in user always
  acts through the browser, because that's the only place their actual
  session lives.
- `hominem_delete_user` refuses `test@hominem.local` outright — that
  account is meant to persist across sessions. "Cleanup" for it means
  deleting the *data it created this run* (a feature driver's job), never the
  account.
- `hominem_delete_user` otherwise only takes one exact disposable email
  per call — no glob, no pattern match. Callers must track what they
  created themselves and only ever delete exactly that.

## Using it from another skill's driver.sh

```bash
source "$(dirname "${BASH_SOURCE[0]}")/../hominem-auth-e2e/lib.sh"

hominem_signin_default                                  # -> prints userId for test@hominem.local
jar="$(hominem_cookiejar_for "$HOMINEM_STABLE_TEST_USER")"
curl -sS -b "$jar" "$HOMINEM_API_URL/api/collections/invites"    # now authenticated

# only when a second identity is actually needed:
hominem_signup "invitee-e2e@test.hominem.dev"           # -> prints userId
hominem_delete_user "invitee-e2e@test.hominem.dev"       # teardown (disposable accounts only)
```

`source`, not a subprocess per call — a feature driver that shells out to
`hominem-auth-e2e/driver.sh signup ...` for every account pays a curl +
bash-startup round trip it doesn't need to.

## How test OTPs work

The OTP is always the real randomly generated code — verification is a
strict compare against the stored code, with no bypass anywhere. In local
dev and CI the server captures outbound OTP email to a same-host JSONL
mailbox (`~/.hominem/scripted-mailbox.jsonl` by default,
`HOMINEM_SCRIPTED_MAILBOX` overrides) instead of sending it — scripted is
the default outside production, the API refuses to boot scripted in
production, and `ENV=scripted` forces scripted AI and email mode. Test helpers read that file — `hominem_read_otp <email>` / `driver.sh otp <email>` in
shell, `readLatestScriptedOtp` from `@hominem/utils/scripted-mailbox` in
TypeScript. OTPs are single-use: always request a fresh code before signing
in (the helpers always send first).

OTPs are never retrievable over the API, by design — there is no endpoint
that returns them, so there is nothing to misconfigure into a leak.

## Using it standalone

```bash
D=.agents/skills/hominem-auth-e2e/driver.sh
$D signin-default
$D whoami test@hominem.local

# read the latest captured OTP for an email (empty when none captured yet):
$D otp test@hominem.local

# second identity, only when needed:
$D signup owner-e2e@test.hominem.dev
$D delete-user owner-e2e@test.hominem.dev
```

## Getting the browser itself logged in as a test account

1. `navigate` to `http://localhost:4445` — redirects to the `:4040`
   hosted login if signed out.
2. Click the email field, `type` the test email, click Continue.
3. The OTP screen is 6 separate single-char boxes, not one field.
   **Bulk-typing the code only fills the first box** — click the first
   box once, then issue six separate single-character `type` calls with
   the digits from `driver.sh otp <email>` (requested in step 2);
   focus auto-advances between boxes. The code is single-use: the stored
   code is consumed on the first attempt, so always request a fresh code
   before signing in (the curl helpers always send first; a browser
   session that verifies once then signs out must walk the flow again,
   not re-type the same code — it would fail with INVALID_OTP).
4. Click Verify — redirects back to `:4445`, signed in.

## Logging the browser out

The account-menu "Sign out" item has repeatedly failed to register
clicks in the Claude_Browser pane (Radix dropdown menuitem, root cause
unconfirmed). Skip it — run this via `javascript_tool` instead, which has
worked every time:

```js
fetch('http://localhost:4040/api/auth/logout', {method:'POST', credentials:'include'})
```

(`driver.sh logout-snippet` / `hominem_print_browser_logout_snippet`
prints the exact string.)

## Restoring the real user's session afterward

If you signed the browser out to test as someone else, sign back in as
the real user via the same OTP walk (request a fresh code first — codes
are single-use even for real accounts) before ending the
session. Never leave the browser authenticated as a disposable test
account.

## Endpoints this wraps

All under `http://localhost:4040/api`, from Better Auth's `emailOTP`
plugin (wired in `services/api/src/auth/better-auth.ts`):

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/email-otp/send-verification-otp` | `{email, type:"sign-in"}` |
| POST | `/auth/sign-in/email-otp` | `{email, otp}` — the real code from the scripted-provider mailbox (see above) |
| GET | `/auth/get-session` | current session for the cookie jar |
| POST | `/auth/logout` | browser-side, via `credentials:'include'` fetch |
