# Desktop Shell Foundation

## 1. Project Metadata

| Field | Value |
| --- | --- |
| Change Slug | `desktop-shell-foundation` |
| Merge Date | `2026-03-10` |
| Status | `Completed` |
| Tech Lead | `Platform` |
| Team | `Platform` |
| Primary Repo | `hackefeller/hominem` |
| Source Artifacts | Retired after merge from `openspec/archive/2026-03-10-desktop-shell-foundation/{proposal,design,tasks}.md`; no delta specs were created for this change |
| Evidence Commits | `0dacecdd` |

## 2. Executive Summary

| Item | Detail |
| --- | --- |
| Problem | The desktop product existed as a separate Electron app outside the monorepo and could not share the authenticated product surface used by the web and mobile apps. |
| Outcome | The repo now includes `apps/desktop` as a monorepo Electron app with a minimal authenticated shell, desktop-safe auth bootstrap, and server-side bearer revocation on logout. |
| Business/User Impact | Hominem now has a desktop entry point that can safely participate in the shared signed-in product journey and is ready for future feature reuse. |
| Delivery Shape | `Incremental` |

This change migrated the standalone `neko` Electron app into the monorepo as `apps/desktop`, stripped it down to a shell, and aligned it with the shared product auth contract. The result is a smaller, clearer desktop foundation that can build, package, and run inside the main workspace.

The scope expanded during implementation to include desktop authentication because an anonymous shell would not be able to exercise protected APIs or validate the shared user journey. The final close-out also fixed a server-side gap where bearer-token logout returned success without revoking the session.

## 3. Scope

### 3.1 In Scope

| Area | Change |
| --- | --- |
| Monorepo integration | Migrated the standalone Electron app into `apps/desktop` and aligned scripts, config, and packaging with the workspace. |
| Renderer shell | Replaced tracker-specific UI with a minimal React shell using the shared design system and desktop-local styling tokens. |
| Desktop auth | Added session bootstrap, email OTP sign-in, auth gating, signed-in shell rendering, and sign-out handling for Electron. |
| API hardening | Fixed server-side logout so desktop bearer sessions are revoked on the backend, not only cleared locally. |

### 3.2 Out of Scope

| Area | Rationale |
| --- | --- |
| Shared feature modules | Phase 2 work to reuse application business logic across desktop, web, and mobile remains separate. |
| Full account management parity | The desktop app only needed signed-out bootstrap, sign-in, signed-in shell entry, and sign-out for this phase. |
| Passkey-first desktop UX | Passkeys remain progressive enhancement until Electron renderer support is fully validated across environments. |

## 4. Baseline and Targets

| Metric / Characteristic | Before | Target | Actual |
| --- | --- | --- | --- |
| Desktop app location | Standalone `~/Developer/neko` repo outside the monorepo | Ship a workspace app under `apps/desktop` | `apps/desktop` now builds and packages in the monorepo |
| Desktop renderer scope | Tracker-specific renderer with domain code and custom IPC | Minimal shell with no tracker domain coupling | Renderer now exposes an authenticated shell only |
| Desktop auth state | No shared product authentication boundary | Signed-out, loading, and signed-in states using the shared backend contract | Desktop bootstraps session state and supports email OTP sign-in/sign-out |
| Logout semantics | Desktop logout cleared local state while bearer session remained valid server-side | Revoke desktop bearer sessions on logout | `/api/auth/logout` now invalidates the server-side session and the same bearer token returns `401` |

## 5. Architecture and Design Decisions

| Decision | Options Considered | Why Selected | Tradeoff |
| --- | --- | --- | --- |
| Keep a minimal Electron surface and remove tracker IPC | Preserve more of the old app, or rebuild the shell around fewer responsibilities | A smaller shell reduced migration risk and made future shared-logic work cleaner | The desktop app intentionally shipped with less functionality until Phase 2 |
| Use a desktop-local auth provider over browser-route redirects | Reuse browser-only auth redirects, or add a renderer-local session client | Electron cannot rely on `/auth/*` route transitions, so local auth composition was safer and clearer | Desktop owns a small auth adapter layer instead of using the browser flow directly |
| Fix logout by resolving the session from bearer or cookie on `/api/auth/*` routes | Leave renderer-only sign-out, or force auth middleware onto `/api/auth/*` routes | Resolving the session directly in logout fixed the bug with the least disruption to existing middleware behavior | Logout now carries a small amount of token parsing logic in the route layer |

### 5.1 Final Architecture

The completed architecture keeps Electron main and preload intentionally small, with the renderer owning a desktop-specific auth provider and gate. The renderer talks to the shared auth API contract for session bootstrap, OTP send, OTP verify, and sign-out. The API side revokes sessions by resolving the session identifier from bearer tokens or auth cookies for logout requests, ensuring desktop and other first-party clients share the same server-side invalidation behavior.

## 6. Implementation Breakdown

| Workstream | Key Changes | Owner | Status |
| --- | --- | --- | --- |
| Desktop migration | Moved the Electron app into `apps/desktop`, aligned package metadata, TypeScript, Vite, and builder configuration | Platform | `done` |
| Shell reduction | Removed domain-specific renderer and IPC behavior, leaving a minimal shell-safe Electron surface | Platform | `done` |
| Design alignment | Reworked the renderer shell to follow the desktop style guide and shared design-system expectations | Platform | `done` |
| Auth alignment | Added desktop-safe auth env config, session client, provider, gate, and signed-out/signed-in renderer states | Platform | `done` |
| API revocation fix | Patched `/api/auth/logout` and added a regression contract test for bearer-token revocation | Platform | `done` |

### 6.1 File and System Footprint

| Path / System | Change Type | Notes |
| --- | --- | --- |
| `apps/desktop/package.json` | `added` | Added the monorepo desktop workspace package, scripts, and Electron runtime install flow |
| `apps/desktop/electron.vite.config.ts` | `added` | Configured Electron + renderer build integration for the monorepo |
| `apps/desktop/src/main/index.ts` | `updated` | Reduced the Electron main process to a minimal shell-safe surface |
| `apps/desktop/src/preload/index.ts` | `updated` | Reduced preload exposure to the shell-safe API |
| `apps/desktop/src/renderer/src/App.tsx` | `updated` | Composed the desktop auth provider and auth gate |
| `apps/desktop/src/renderer/src/app-shell.tsx` | `added` | Introduced the authenticated desktop shell surface |
| `apps/desktop/src/renderer/src/auth/*` | `added` | Added session client, auth gate, and desktop auth provider |
| `apps/desktop/src/renderer/src/globals.css` | `updated` | Applied the design-guide-aligned desktop shell styling |
| `services/api/src/routes/auth.ts` | `updated` | Fixed logout to revoke bearer-token sessions server-side |
| `services/api/src/routes/auth.email-otp.contract.test.ts` | `updated` | Added regression coverage for bearer logout revocation |

## 7. Data and Migration Notes

| Topic | Details |
| --- | --- |
| Strategy | Migrate the desktop codebase first, then reduce scope and layer auth on top once the shell was stable |
| Ordering | Monorepo integration preceded shell reduction, then auth wiring, then logout hardening and validation |
| Safety Controls | Auth used the existing API contract, desktop kept passkeys optional, and logout hardening was backed by contract tests plus live API verification |
| Rollback | Revert the desktop workspace and auth route changes, or temporarily disable desktop sign-in while keeping the app as a shell |
| Residual Risk | Full desktop account-surface parity and feature sharing remain future work, and passkey behavior still needs broader renderer validation |

## 8. Validation and Quality Gates

| Layer | What Ran | Result | Evidence |
| --- | --- | --- | --- |
| Desktop validation | `bun run --filter @hominem/desktop typecheck` | `pass` | Verified during implementation close-out |
| Desktop validation | `bun run --filter @hominem/desktop lint` | `pass` | Verified during implementation close-out |
| Desktop validation | `bun run --filter @hominem/desktop build` | `pass` | Verified during implementation close-out |
| Desktop packaging | `bun run --filter @hominem/desktop package` | `pass` | Produced release artifacts under `apps/desktop/release` |
| API validation | `bun run --filter @hominem/api lint` | `pass` | Verified after the bearer revocation fix |
| API validation | `bun run --filter @hominem/api typecheck` | `pass` | Verified after the bearer revocation fix |
| API contract test | `bun run --filter @hominem/api test -- src/routes/auth.email-otp.contract.test.ts` | `pass` | Includes the bearer logout regression case |
| Live auth verification | OTP send, verify, session fetch, logout, and post-logout session fetch against `http://localhost:4040` | `pass` | Same bearer token returned `401` after logout |

### 8.1 Known Gaps

| Gap | Impact | Mitigation |
| --- | --- | --- |
| Desktop shell remains intentionally minimal | Low | Phase 2 will restore feature modules through shared logic packages |
| No delta spec was authored for this change | Low | The merged record captures the delivered behavior and rationale for archive-time auditability |
| Active change selection must be reset after archive | Low | `openspec/ACTIVE_CHANGE.md` is returned to a neutral state during close-out |

## 9. Deployment and Operations

| Item | Details |
| --- | --- |
| Deployment Plan | No production rollout was required; this work prepares the desktop app and API contract for future desktop delivery |
| Dependencies | Electron runtime, electron-builder packaging, shared auth API endpoints, Redis-backed session state |
| Monitoring | Watch desktop auth success/failure rates and logout/session-revocation behavior once desktop usage expands |
| Incident Response | If logout regressions reappear, use the auth email-OTP contract suite and live `/api/auth/session` verification as the first checks |
| Rollback Trigger | Desktop sign-in fails, bearer sessions survive logout again, or the desktop app stops building/packaging in the workspace |

## 10. Security and Compliance

| Check | Result | Notes |
| --- | --- | --- |
| Auth/AuthZ impact | `changed` | Desktop now uses the shared auth contract and server-side logout revokes bearer sessions correctly |
| Data handling impact | `ok` | Desktop only consumes protected API session state and auth payloads already used by other first-party clients |
| Secrets/config changes | `yes` | Desktop environment files were added for API base URL configuration without introducing hardcoded credentials |

## 11. Learnings

| Learning | Action for Future Projects |
| --- | --- |
| Desktop apps cannot assume browser-only auth navigation patterns | Prefer explicit desktop-local auth composition when renderer origins differ from web routing assumptions |
| Shell-first migrations reduce risk when bringing external apps into a monorepo | Keep the first phase narrow, then restore functionality through shared packages |
| Logout success responses are not enough without post-logout authorization checks | Keep revocation checks in contract tests whenever bearer-token auth is introduced to a new client surface |

## 12. Follow-ups

| ID | Follow-up | Owner | Priority | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| `F-001` | Start Phase 2 shared-logic planning so the desktop shell can regain product functionality through reusable packages | `Platform` | `P1` | `2026-03-24` | `open` |
| `F-002` | Expand desktop auth verification to cover passkey support and broader renderer-environment compatibility | `Platform` | `P2` | `2026-03-31` | `open` |
