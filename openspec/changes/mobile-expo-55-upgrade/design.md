## Context

The mobile app at `apps/mobile` currently works, but its architecture has grown through incremental additions across auth, tabs, drawer, analytics, and chat workflows. In 2026, an Expo-first app is typically evaluated less as a feature collection and more as a layered product shell:

- route layer (Expo Router)
- app shell and navigation layer
- feature domains
- shared primitives and platform services

The migration should produce this structure while preserving existing behavior and all active variant workflows.

Current state:
- Mixed architectural layers in the app package
- UI relies primarily on `@shopify/restyle`
- Drawer + Tab navigation with auth/public route groups
- Multi-variant config (dev/e2e/preview/prod) with OTA channels
- React Native 0.81.5, Expo 54, and New Architecture
- Checked-in native folders (`ios/`, `android/`) used in releases

## Goals / Non-Goals

**Goals:**
- Upgrade to Expo SDK 55 and aligned React/React Native
- Redesign the app structure to an Expo-native architecture with clear feature boundaries
- Introduce an Apple design-system layer for primitives, spacing, and motion semantics
- Preserve all existing routes and user journeys while restructuring internals
- Keep multi-variant behavior intact (dev/e2e/preview/prod)
- Establish deterministic validation gates for upgrades and architecture shifts

**Non-Goals:**
- Rewrite authentication logic or API contracts
- Change database schema or app domain rules
- Remove drawer/tab navigation topology
- Add new end-user features in this release

## Decisions

### D1: Architecture target: route + feature + shell layers

**Decision:** Reorganize to:
- `app/` for route composition and authentication/feature entry boundaries
- `src/feature/*` for domain orchestration and screen containers
- `src/shared/*` for reusable UI primitives and platform utilities
- `src/infra/*` for API clients, persistence, and platform integration services

**Rationale:** This reduces coupling, makes onboarding easier, and aligns with how Expo and React Native apps scale in 2026.

**Alternatives Considered:**
- Continue current folder layering with incremental fixes: lower initial risk but preserves long-term sprawl
- Full monolithic rewrite: fastest to define once, highest regression risk

### D2: Apple design primitives first, restyle migration second

**Decision:** Create new shared primitives (surface, typography, symbol wrapper, spacing, motion, navigation affordances) and migrate high-traffic screens first.

**Rationale:** This keeps user-facing quality high while avoiding a risky global one-shot UI rewrite.

**Alternatives Considered:**
- Immediate full visual migration: high churn and higher regression risk
- No migration now: misses long-term accessibility, consistency, and parity gains

### D3: Best-practice navigation contract

**Decision:** Keep existing drawer + tabs but enforce one source of truth for layout and route-level providers.

**Rationale:** Existing flows remain stable, while nested route providers and guards become explicit and testable.

**Alternatives Considered:**
- Keep current route and provider placement as-is: easier but harder to maintain as scale grows
- Drop drawer and migrate to native tabs only: user-impacting and out of scope

### D4: Data/state separation

**Decision:** Continue `@tanstack/react-query` for remote state; isolate feature-specific query hooks under `feature/*/data` and keep local UI state in feature-local providers.

**Rationale:** This aligns with 2026 guidance to avoid state mixing and accidental prop drilling at app level.

**Alternatives Considered:**
- Centralized global state for everything: simpler short-term, brittle long-term
- Rebuild with Redux or another heavy global store: unnecessary complexity for current scope

### D5: Apple-native primitives in platform-adaptive code

**Decision:** Prioritize native-like behavior in layout, touch targets, symbols, blur/motion, and safe-area behavior while retaining cross-platform fallback parity.

**Rationale:** Expo apps judged today are expected to feel platform-native without losing web compatibility.

**Alternatives Considered:**
- Web-first styling only: lower fidelity on iOS, weaker usability in long-term app reviews
- Native-first only: less efficient across platforms for web and e2e parity

## Risks / Trade-offs

[Risk: Scope explosion] → [Mitigation: enforce phased execution with explicit pass criteria per phase]

[Risk: Visual behavior drift] → [Mitigation: define component-level visual acceptance criteria before each migration batch]

[Risk: Provider reordering regressions] → [Mitigation: run route guard, startup, and auth flow smoke in each variant]

[Risk: Legacy dependency breakage] → [Mitigation: keep old and new UI paths behind migration flags where needed]

[Risk: Variant/build drift] → [Mitigation: prebuild diff review and release-profile gating]

## Migration Plan

1. **Architecture baseline (no behavior change)**
   - Capture current component inventory, route map, feature ownership, and startup/auth behavior
   - Define canonical layer boundaries and migration contracts
2. **Foundation layer first**
   - Add `src/shared/ui/primitives` and `src/shared/system` with HIG-aware tokens
   - Add `src/infra` boundaries for rpc, storage, and diagnostics
3. **Shell and routing stabilization**
   - Move route wrappers and provider composition to explicit app-shell modules
   - Ensure auth and onboarding routing logic remains functionally identical
4. **Feature extraction passes**
   - Migrate one feature slice at a time (for example onboarding, account, focus, chat)
   - Keep parity tests and smoke checks for each pass
5. **Animation and motion hardening**
   - Align animated components to updated reanimated/worklet contracts
   - Replace bespoke ad-hoc patterns with shared motion primitives where possible
6. **Apple primitives adoption**
   - Replace legacy UI primitives selectively with shared design-system components
   - Validate safe areas, typography scales, iconography, and spacing tokens
7. **Release and validation gate**
   - Run full variant smoke and full QA checklist before rollout

Rollback strategy:
- Keep checkpoints at each phase boundary
- If high-impact regressions occur, pause migration, patch compatibility path, then resume from last clean checkpoint

## Open Questions

- Which feature slices should migrate first for highest risk reduction?
- Which screen sets should keep current component implementations during first architecture wave?
- What baseline Apple-HIG acceptance thresholds should gate future architectural phases?
