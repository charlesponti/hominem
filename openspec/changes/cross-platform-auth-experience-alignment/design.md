## Context

Web auth now shares route builders and auth route layout composition, but mobile still uses its own auth provider, passkey hook, and screen flow. The two platforms share some auth package primitives, yet the shared abstraction line is still below the user experience layer. That means both behavior and styling can drift.

The goal of this change is not to force identical runtime code where platform mechanics differ. The goal is to define one canonical auth experience and one shared set of presentation and flow primitives, then let each platform provide the minimum wrapper needed to execute that contract.

## Goals / Non-Goals

**Goals:**
- Define one canonical auth screen/state model used by both web and mobile.
- Share auth UI primitives, copy, spacing, hierarchy, and error presentation across platforms.
- Share auth flow helpers wherever platform differences do not require separate code.
- Centralize per-app auth destinations and redirect policy in shared configuration.

**Non-Goals:**
- Eliminating all platform-specific code.
- Replacing native mobile auth mechanics with web route concepts.
- Changing the backend auth protocol beyond what is needed to support shared experience helpers.

## Decisions

### Use a canonical auth experience contract

Auth will be modeled as a small set of platform-agnostic states:
- email entry
- OTP verification
- passkey sign-in
- loading/submitting
- error/recovery
- signed-in handoff

Each app will map into that contract rather than inventing its own auth sequence.

### Split shared auth into contract, presentation, and platform adapter layers

The shared solution should be layered:
- `@hominem/auth`: shared flow helpers, redirect/result handling, error normalization, and config types
- `@hominem/ui`: shared auth presentation primitives and screen composition building blocks
- platform adapters in web/mobile apps: route wrappers, navigation wrappers, native passkey entry points, and storage/session handoff concerns

This keeps true shared logic and visuals centralized without pretending web and mobile runtimes are the same.

### Centralize app-specific auth config

Per-app auth config should define:
- app display name
- default post-auth destination
- allowed destinations
- copy variants if truly necessary

This config should be shared by both web and mobile for a given product so a single app cannot drift by platform.

### Preserve native mobile mechanics behind shared interfaces

Mobile may continue using Expo/Better Auth integrations and native passkey prompts, but the user-facing state transitions and surrounding UI should come from the shared auth contract.

## Risks / Trade-offs

- Sharing too high in the stack could hide genuine platform needs.
  Mitigation: keep thin adapter seams for routing, native capabilities, and storage.
- Shared UI abstractions can become too rigid if the contract is not explicit first.
  Mitigation: define the auth state/screen contract before extracting components.
- Destination alignment may expose existing inconsistencies across apps.
  Mitigation: explicitly inventory per-app destination policy and normalize it in config.

## Migration Plan

1. Document the canonical auth UX contract and app-level config shape.
2. Extract shared auth presentation primitives that can render on both web and mobile.
3. Move shared auth flow/result helpers into the auth package.
4. Update web and mobile to consume the shared contract through platform adapters.
5. Add cross-platform verification for copy, transitions, and redirect/destination behavior.

## Open Questions

- Which auth screens should be literally shared component logic versus parallel implementations over shared primitives?
- Whether account/security/passkey-management surfaces are part of this change or a follow-on.
