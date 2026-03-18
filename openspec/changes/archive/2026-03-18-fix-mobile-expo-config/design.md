## Context

The mobile app currently hardcodes Expo owner and project metadata inside `apps/mobile/app.config.ts` while a separate reference file records different values. This drift already caused OTA publish failures. Separately, EAS attempts to read app config through `npx expo config`, but this Bun workspace can fail before Expo starts because npm-based invocation does not resolve cleanly against the repo's dependency setup. Release commands still sometimes work because EAS falls back to its bundled config parser, but that path is noisy and fragile.

## Goals / Non-Goals

**Goals:**
- Establish one canonical Expo owner/project identity for the mobile app.
- Make `expo config` succeed in the monorepo using the repo-standard package manager path.
- Add verification so release flows can prove config resolution works before publish/build.

**Non-Goals:**
- Changing mobile runtime behavior beyond configuration plumbing.
- Reworking unrelated Apple auth settings or release automation.
- Introducing new Expo projects, channels, or distribution strategies.

## Decisions

Use the mobile app config as the runtime source of truth and update supporting reference files to match it. This avoids adding another translation layer during release commands.

Fix local config resolution by using Bun-aware Expo invocation for repo validation, and remove or isolate any npm-path assumptions that make `npx expo config` fail in this workspace. The change should target the actual command path used by developers and CI verification rather than depending on EAS fallback behavior.

Add a focused verification step that checks Expo config resolution and owner/project consistency before release commands run. This catches drift early and keeps failures actionable.

## Risks / Trade-offs

- Runtime source of truth remains in app config code rather than a shared JSON file -> Mitigation: keep reference files synchronized and verify consistency automatically.
- Expo CLI invocation behavior can differ between local and CI environments -> Mitigation: verify the exact command path used in both contexts and prefer Bun-managed execution from the monorepo root.
- Tightening verification could block releases on config drift that previously slipped through -> Mitigation: keep checks small, deterministic, and scoped to release-critical values.
