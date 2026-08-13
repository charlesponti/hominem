# Omiro release pipeline hardening — 2026-08-12

## Summary

A production TestFlight submission for Omiro failed with Apple error `-19000`
("No suitable application records were found"). Root cause: a locally-run
"production" build silently compiled with the **dev** app identity
(`com.pontistudios.hakumi.dev`) instead of production
(`com.pontistudios.hakumi`), because an ambient `APP_ENV=development` in a
gitignored local dotenv file overrode the build profile's intended
environment — and nothing in the pipeline could detect or reject the
mismatch before it reached Apple.

This document covers the investigation, the fixes implemented, and two
additional failures hit while rolling the fix out live (both fixed in the
same session).

Commits: `2b0bbb07f`, `85aabdbad`, `dbbc4e1c7` (all on `main`).

---

## Root cause

`apps/omiro/app.config.ts` resolved the app's identity like this:

```ts
function getAppEnvironment(rawEnvironment = process.env.APP_ENV ?? 'development')
```

`apps/omiro/.env.development.local` (gitignored, machine-local) contained
`APP_ENV="development"`. Expo's CLI auto-loads `.env.*.local` files during
local config evaluation — before `eas.json`'s per-profile `env` block ever
applies. So when a **production** build was kicked off from a local
terminal, that file's `APP_ENV=development` won, silently producing a
dev-identity `.ipa`.

Evidence that nailed this down:

| Build | Started by | Resolved bundle ID | Build # |
|---|---|---|---|
| `77b76746` / `4b839798` (Aug 4) | `github` (CI) | `com.pontistudios.hakumi` ✅ | 112 / 114 |
| `c42972aa` (Aug 12) | `cponti44` (local) | `com.pontistudios.hakumi.dev` ❌ | **13** |

CI builds never see the `.local` file (gitignored, and `.easignore` also
strips `.env*` from the uploaded build context), so they always resolved
correctly. Only locally-initiated builds were exposed. The build number
jump (114 → 13, not 114 → 115) was the tell: EAS tracks build numbers
per bundle identifier, and the dev bundle had never shipped to the store
before, so it started its own counter.

A secondary, unrelated finding during the audit: `apps/omiro/ios/` — 24
files, the **dev** Xcode project — was checked into git, directly
contradicting the README's claim that the directory is CNG-generated and
excluded from Git.

---

## Fixes implemented

### 1. Fail-loud app identity resolution
**File:** `apps/omiro/app.config.ts`

`getAppEnvironment()` no longer silently defaults. It now:
- Trusts `EAS_BUILD_PROFILE` (injected by EAS on the actual builder, and
  unlike `APP_ENV` it can't be shadowed by a local dotenv file) whenever
  `EAS_BUILD=true`.
- **Throws** if `APP_ENV` is also set and disagrees with the profile,
  instead of picking one silently.
- **Throws** under `CI=true` with no `APP_ENV` set, instead of defaulting.
- Only defaults to `'development'` for plain local dev (`expo start`, etc.)
  outside both EAS and CI.

Exported for testability; covered by 8 new unit tests in
`apps/omiro/tests/app-config-identity.test.ts` covering every branch
(default, direct `APP_ENV`, matching profile, conflicting profile, missing
profile, CI-with-no-`APP_ENV`, invalid value).

### 2. Removed the footgun itself
Deleted the `APP_ENV` line from `.env.development.local` and
`.env.example` — every `package.json` script already prefixes `APP_ENV=`
explicitly, so nothing depended on the ambient value; it only existed to
be silently picked up by something that shouldn't.

### 3. Release preflight guard
**New:** `apps/omiro/scripts/verify-release-identity.mjs`

Runs `expo config --json` (the same resolution path a real build uses) and
asserts the result matches the production identity
(`com.pontistudios.hakumi`, `Omiro`, `appEnvironment: production`) before
allowing a build or submit to proceed. Wired into `pnpm build:prod`,
`pnpm submit`, and the EAS Workflow's `guard_identity` job. Refuses with a
clear diff (`expected "X", got "Y"`) rather than proceeding on a guess.

### 4. Untracked `apps/omiro/ios/`
Diffed a fresh `prebuild:prod` output against the committed tree first —
confirmed the only differences were the dev→prod identity swap itself
(Podfile target name, bundle properties, formatting), no hand-edited native
code would be lost. Then `git rm -r --cached`, added `/ios/` to
`.gitignore`, and fixed the README's now-accurate claim.

### 5. Repo hygiene
- Removed a dead `eas update --channel production` script pointing at a
  project that (at the time) had no `expo-updates`/`channel`/`runtimeVersion`
  configured.
- Added `just mobile prebuild <env>`, `release`, and `update` recipes
  (`prebuild` was referenced 7× across the README/AGENTS.md but had been
  deleted in an earlier cleanup commit).
- Added `build:prod` and `submit` scripts to `package.json`, both gated on
  `verify-release-identity.mjs`.

### 6. Restored EAS Update
An earlier commit (`eaa3ce139`) had stripped `expo-updates`,
`runtimeVersion`, `updates` config, and `eas.json`'s `channel`, without
fully cleaning up references to them. Restored: `expo-updates` installed,
`runtimeVersion: { policy: 'fingerprint' }` + `updates.url` for production
only, `channel: production` back in `eas.json`.

### 7. Release orchestration moved to EAS Workflows
**New:** `apps/omiro/.eas/workflows/production-release.yml`,
`ota-update.yml`

`production-release.yml`: `build` → `guard_identity` (the exact check that
would have caught the original incident, using the build job's
`app_identifier`/`distribution` outputs) → `require-approval` → `submit`.
Nothing reaches App Store Connect without passing the identity check and a
manual approval.

`ota-update.yml`: `require-approval` → `update` (production channel only).

Both validated against the EAS Workflows JSON schema and `eas
workflow:validate`.

### 8. Retired the old GitHub Actions release workflow
Removed `.github/workflows/deploy-mobile.yml` (workflow_dispatch-only,
re-implemented validation without the Postgres/Redis services the PR lane
gets). `validate-mobile.yml` (push/PR checks) is untouched. README updated
to point at `just mobile release` / `just mobile update`.

---

## Challenges hit rolling this out live

Two more real failures surfaced only once the actual EAS Workflow was
triggered for real — neither was visible from static analysis or local
testing, since both are specific to the remote builder/runner environment.

### Challenge A: the `build` job failed on pnpm version mismatch

While auditing `eas.json`, `apps/omiro/AGENTS.md` explicitly warned: *"With
Corepack enabled, do not pin `pnpm` in `apps/omiro/eas.json`. EAS may
attempt a conflicting global install and fail with `npm ERR! EEXIST`."*
Trusting that, the `"pnpm": "11.10.0"` pin was removed from
`eas.json`'s `build.base` as part of the cleanup.

Triggering the real workflow immediately failed:

```
[ERROR] This project is configured to use 11.10.0 of pnpm. Your current pnpm is v11.9.0
```

**Fix:** restored the pin. The AGENTS.md warning described a different,
apparently stale failure mode — on the current EAS build image, the
builder's preinstalled pnpm doesn't match the workspace's
`packageManager` version, and without the pin nothing corrects that before
`pnpm install --frozen-lockfile` runs. Updated `AGENTS.md` to reflect the
tested, current reality instead of removing the pin again.

### Challenge B: the `submit` job failed on the *same* mismatch, differently

With the build fixed, the workflow re-ran successfully through `build_ios`
(now correctly `com.pontistudios.hakumi`, build 115, continuing the real
production counter) and `guard_identity` (passed). It then failed at
`submit_ios` with the identical pnpm error.

Cause: `eas.json`'s `build.base.pnpm` pin only applies to `build` jobs.
EAS Workflows' pre-packaged `submit` (and `update`) job types run on a
separate generic runner that installs the project's dependencies
independently and never consults that field.

The tempting fix — set `pmOnFail: warn` or `download` in
`pnpm-workspace.yaml` — was rejected: the repo already has
`pmOnFail: error` set deliberately, paired with several other supply-chain
hardening settings (`engineStrict`, `verifyStoreIntegrity`,
`strictStorePkgContentCheck`, `trustPolicy: needsFix`, `blockExoticSubdeps`,
`strictDepBuilds`). Loosening it repo-wide to fix one job would have
weakened an intentional security posture for every app in the monorepo.

**Fix:** added a `before_install_node_modules` hook to the `submit_ios`
and `publish_update` jobs that activates the correct pnpm version via
Corepack before EAS's automatic install step runs:

```yaml
hooks:
  before_install_node_modules:
    - run: corepack prepare pnpm@11.10.0 --activate
```

This fixes the mismatch at its actual source (the runner's stale
preinstalled binary) without touching the repo's global policy.

### A near-miss worth noting

Rather than pay for a third full rebuild after fix B, the already-built,
already-guard-verified artifact (build 115) was submitted directly via
`eas submit --id <build_id>`. That command was run without `APP_ENV`
set in the local shell, so its internal credentials-lookup step logged
*"Looking up credentials configuration for com.pontistudios.hakumi.dev"* —
alarming to see, but harmless: `--id` pins the exact artifact being
uploaded, and the ASC App ID came from `eas.json`'s `submit.production`
profile, not from local bundle-id resolution. The submission completed
correctly. Worth remembering for next time: always export `APP_ENV=production`
before any local `eas submit`/`eas build` invocation, even when `--id`
makes the local config resolution cosmetically irrelevant.

---

## Final state

- Build 115 (`com.pontistudios.hakumi`) submitted successfully; processing
  in TestFlight.
- `just mobile release` now runs build → identity guard → approval →
  submit end-to-end without hitting either pnpm issue.
- `just mobile update "<message>"` publishes an OTA update the same way.
- `pnpm build:prod` / `pnpm submit` remain available for ad hoc local use,
  both gated on the same identity guard.

## Verification performed

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` — clean.
- `pnpm test` — 156 tests passed, including 8 new resolver tests.
- `NODE_ENV=production pnpm run export:embed:ios` — production bundle
  export succeeds.
- `verify-release-identity.mjs` — confirmed it blocks with no `APP_ENV`
  set and passes with `APP_ENV=production`.
- Both workflow YAML files validated via the EAS Workflows JSON schema and
  `eas workflow:validate`.
- End-to-end: real workflow run, real build, real guard, real approval,
  real submission — all observed directly via `eas workflow:status`/`eas
  build:view`, not assumed.
