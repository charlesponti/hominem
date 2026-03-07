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

### D3: Native Tab Bar navigation

**Decision:** Replace Drawer + Tabs with iOS-native Tab Bar (UITabBarController / BottomTabNavigator) organized as: Chat, Notes, Focus, Account.

**Rationale:** Chat-based note app benefits from quick tab access and iOS-native feel. Simpler than drawer for mobile-first UX. Aligns with Expo 55 native tabs capability and template patterns. Reduces code complexity.

**Alternatives Considered:**
- Keep drawer + tabs: legacy pattern, adds JS complexity and drawer state management
- Stack-only navigation: loses quick access pattern
- Split tabs differently (e.g. Chat | All | Focus | Settings): current structure is already well-organized by domain

**Tab structure:**
- **Chat**: Conversations (threads, recent, search)
- **Notes**: All notes, collections, and quick-capture
- **Focus**: Focus sessions, insights, and history
- **Account**: Profile, settings, help, sign out

### D4: Data/state separation (2026 standard)

**Decision:** Adopt the 2026 standard pattern:
- `@tanstack/react-query` for server state
- `zustand` for feature-local state
- Context API for root providers only (theme, auth, queries)
- **Avoid Redux** for this scope

**Rationale:** This three-layer pattern reduces coupling, improves testability, and matches industry consensus. React Query eliminates boilerplate, Zustand keeps local state simple, and Context remains for global concerns.

**Alternatives Considered:**
- Centralized global state for everything: simpler short-term, brittle long-term
- Rebuild with Redux: unnecessary complexity for app scope
- MobX: Zustand is lighter and more widely adopted

### D5: Apple-native primitives in platform-adaptive code

**Decision:** Prioritize native-like behavior in layout, touch targets, symbols, blur/motion, and safe-area behavior while retaining cross-platform fallback parity.

**Rationale:** Expo apps judged today are expected to feel platform-native without losing web compatibility.

**Alternatives Considered:**
- Web-first styling only: lower fidelity on iOS, weaker usability in long-term app reviews
- Native-first only: less efficient across platforms for web and e2e parity

### D6: Advanced Expo Router patterns (2026 features)

**Decision:** Adopt advanced Expo Router capabilities:
- **Route Protection** via guarded groups for auth/onboarding flows
- **Server Components (RSC)** for secure API integration
- **Deep Linking + Native Intent** for app-level routing and deferred deep links
- **Groups and Array Syntax** for feature reuse across routes
- **Custom Tab Layouts** (headless mode) for advanced styling needs
- **Bottom Sheets** with native presentation form sheet
- **Static Rendering (SSG)** for marketing pages and web SEO

**Rationale:** These patterns reduce boilerplate, improve native feel, and enable server-side logic without backend infrastructure. They're production-ready in Expo 55+.

**Alternatives Considered:**
- Stick with basic navigation: misses native UX patterns and server-side safety
- Custom implementations: unnecessary complexity, Expo Router now handles this

## Risks / Trade-offs

[Risk: Scope explosion] → [Mitigation: enforce phased execution with explicit pass criteria per phase]

[Risk: Tab navigation routing regressions] → [Mitigation: validate deep linking and tab persistence in each feature smoke test]

[Risk: Visual behavior drift] → [Mitigation: define component-level visual acceptance criteria before each migration batch]

[Risk: Provider reordering regressions] → [Mitigation: run route guard, startup, and auth flow smoke in each variant]

[Risk: Legacy dependency breakage] → [Mitigation: keep old and new UI paths behind migration flags where needed]

[Risk: Variant/build drift] → [Mitigation: prebuild diff review and release-profile gating]

[Risk: Tab icon/label consistency] → [Mitigation: use shared design-system tab primitives and validate across platforms]

[Risk: Accessibility regression] → [Mitigation: run axe-core and manual screen reader testing on all migrated screens]

[Risk: Performance degradation] → [Mitigation: capture pre/post metrics for startup, memory, and frame rate]

## Advanced Expo Router Patterns (2026)

Your app will leverage these production-ready features:

### 1. **Route Protection (Guarded Groups)**
- Protected auth routes via route groups
- Cleaner than manual middleware
- Onboarding flow using guarded groups

### 2. **Server Components (RSC)**
- Server-side rendering for data fetching
- Safe handling of API keys and secrets
- Reduced client bundle size

### 3. **Deep Linking + Native Intent**
- Rewrite incoming deep links via `+native-intent` file
- Trigger app-specific actions
- Deferred deep links (handle before UI renders)

### 4. **Route Groups + Array Syntax**
- Feature reuse across routes (e.g., shared profile)
- Group-level layout wrapping
- Cleaner feature domain organization

### 5. **Bottom Sheets**
- Native presentation form sheet on iOS
- Smooth animations
- Shared across feature domains

### 6. **Link Preview (iOS)**
- Long-press link preview
- Customizable context menu
- Native UILinkPreview integration

### 7. **Unstable Native Tabs**
- More polished than custom tab UI
- Native feel on iOS and Android
- Your primary navigation approach

### 8. **Custom Tab Layouts (Headless)**
- Fallback for advanced styling needs
- Full control over tab UI
- Route-aware tab state management

### 9. **Static Rendering (SSG)**
- Marketing pages and web content
- SEO benefits
- Combined with dynamic routes

## 2026 Standards Alignment

### State Management (Standard Pattern)
```
Root Providers (app-shell)
├─ QueryClientProvider (@tanstack/react-query)
├─ ThemeProvider
├─ AuthProvider (better-auth)
└─ Navigation

Feature Domains
├─ useQuery() - server state via React Query
├─ useShallow() - local state via Zustand
└─ Local Context - feature-specific only
```

**Your adoption:**
- ✓ Continuing React Query for server state
- 🔄 Adding Zustand for feature-local state
- ✓ Context API for root providers
- ✓ No Redux (appropriate for app scope)

### UI/UX Standards
- ✓ Native tab bar (UITabBarController / BottomTabNavigator)
- ✓ SF Symbols (iOS) + Material Icons (Android)
- ✓ Safe area awareness and inset handling
- ✓ Platform-specific conventions and haptics

### Performance Standards
- ✓ New Architecture enabled
- ✓ React Compiler enabled (`experiments.reactCompiler: true`)
- ✓ Hermes engine (default for Expo 55)
- 🔄 expo-image for optimized image loading
- 🔄 Code splitting by route via Expo Router

### Testing Standards
- Unit: Vitest + React Testing Library (target 80%+)
- E2E: Detox (mobile smoke tests)
- 🔄 E2E: Playwright (web smoke tests)
- 🔄 Visual: Percy or similar for regressions
- 🔄 Accessibility: axe-core automated + manual screen reader testing

### Accessibility (WCAG 2.1 AA)
- Touch targets: ≥44pt (iOS) / 48dp (Android)
- VoiceOver (iOS) + TalkBack (Android) support
- Color contrast: 4.5:1 for text, 3:1 for graphics
- Reduced motion: Animations can be disabled via system settings

### Library Ecosystem
**Already using:**
- ✓ `@tanstack/react-query` - server state
- ✓ `better-auth` - authentication
- ✓ `react-native-reanimated` v4.2.1 - animations

**Adopting this migration:**
- 🔄 `zustand` - feature-local state management
- 🔄 `zod` - runtime validation at API boundaries
- ✓ SF Symbols / Material Icons - native iconography

### Deployment & Release
- Multi-variant configs: dev, e2e, preview, production
- OTA updates via `eas update` for rapid iteration
- TestFlight/Play Internal for QA validation
- App Store/Play Store releases with OTA fallback

## Migration Plan

1. **Architecture baseline (no behavior change)**
   - Capture current component inventory, route map, feature ownership, and startup/auth behavior
   - Define canonical layer boundaries and migration contracts
2. **Native Tab structure implementation**
   - Create new tab navigation shell using Expo Router native tabs
   - Map existing screens to Chat | Notes | Focus | Account tabs
   - Ensure tab-level provider hierarchy is stable (query, RPC, auth, theme)
3. **Foundation layer first**
   - Add `src/shared/ui/primitives` and `src/shared/system` with HIG-aware tokens
   - Add tab bar label and icon primitives (SF Symbols / Material Icons)
   - Add `src/infra` boundaries for rpc, storage, and diagnostics
4. **Shell and routing stabilization**
   - Move route wrappers and provider composition to explicit app-shell modules
   - Ensure auth and onboarding routing logic remains functionally identical
   - Add deep-link validation for all tab-accessible screens
5. **Feature extraction passes**
   - Migrate one feature slice at a time (chat, notes, focus, account)
   - Keep parity tests and smoke checks for each pass
   - Validate tab switching does not lose local UI state
6. **Animation and motion hardening**
   - Align animated components to updated reanimated/worklet contracts
   - Validate tab transition animations are smooth on native
   - Replace bespoke ad-hoc patterns with shared motion primitives
7. **Apple primitives adoption**
   - Replace legacy UI primitives selectively with shared design-system components
   - Validate safe areas, tab spacing, and badge indicators
   - Use SF Symbols for tab icons and prioritize native feel
8. **Release and validation gate**
   - Run full variant smoke including tab switching and deep link flows
   - Validate tab persistence and state retention across app backgrounding
   - Full QA checklist before rollout

Rollback strategy:
- Keep checkpoints at each phase boundary
- If high-impact regressions occur, pause migration, patch compatibility path, then resume from last clean checkpoint

## Open Questions

- Which feature slices should migrate first for highest risk reduction?
- Which screen sets should keep current component implementations during first architecture wave?
- What baseline Apple-HIG acceptance thresholds should gate future architectural phases?
