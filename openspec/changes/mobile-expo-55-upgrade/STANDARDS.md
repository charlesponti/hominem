# React Native & Expo 2026 Standards Reference

This document outlines the industry standards and best practices this migration aligns with.

## Architecture Standards

### 1. **New Architecture** (Mandatory)
Your upgrade will enable New Architecture (`newArchEnabled: true`), which uses:
- **Fabric**: Modern rendering system replacing the legacy bridge
- **TurboModules**: Type-safe native modules (vs legacy NativeModules)
- **JSI**: Direct JS-to-native calls for high-performance features

**Status in your app**: Already enabled in current config ✓

### 2. **Expo Router** (File-based routing)
Standard pattern for Expo apps since 2024:
- Routes defined in `app/` directory structure
- Type-safe route generation with `typedRoutes: true`
- Native tab support (UITabBarController on iOS)
- Deep linking as a first-class citizen
- Replaces React Navigation for most use cases

**Your migration**: Moving to native tabs via Expo Router ✓

### 3. **React 19 + React Compiler**
Modern React standards:
- React Compiler for automatic optimizations
- Automatic batching and state updates
- Suspense + Error Boundaries
- Server Component support (partial in React Native)

**Your upgrade**: React 19.2.0 + React Compiler enabled ✓

### 4. **TypeScript Strict Mode**
Industry standard for type safety:
- `noImplicitAny: true` - No untyped values
- Zod for runtime validation
- Codegen for native modules
- 100% type coverage

**Your requirement**: Already using strict mode ✓

## State Management Standards

### Recommended Pattern for 2026
```
┌─────────────────────────────────┐
│    Root Providers (app-shell)   │
│  ├─ ErrorBoundary               │
│  ├─ QueryClientProvider         │
│  ├─ ThemeProvider               │
│  ├─ AuthProvider                │
│  └─ NavigationProvider          │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│      Feature Domain             │
│  ├─ useQuery() - server state   │
│  ├─ useShallow() - local state  │
│  └─ Context - feature-local     │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│    UI Components (no logic)     │
│  Display only                   │
└─────────────────────────────────┘
```

**Your migration**: Adopting feature-sliced with data/UI separation ✓

### Specific Tools
- **Server state**: `@tanstack/react-query` (not Redux)
- **Local state**: `zustand` or `useReducer` (not Context everywhere)
- **Validation**: `zod` (at API boundary)
- **Auth**: `better-auth` (not custom sessions)

**Your current setup**:
- ✓ Already using React Query
- ✓ Already using better-auth
- 🔄 Need to add Zod for API validation
- 🔄 Consider Zustand for feature-local state

## Performance Standards

### Expo 55 Baseline
```
New Architecture:     ✓ Enabled
React Compiler:      ✓ Enabled
Hermes Engine:       ✓ Default
expo-image:          ✓ For optimized images
Code splitting:      ✓ Per-route via Router
Dynamic imports:     ✓ Supported
```

**Target metrics**:
- Cold start: <2s (iOS), <3s (Android)
- Memory: <100MB baseline
- Bundle size: <5MB (JS only)
- Frame rate: 60fps sustained

## UI/UX Standards

### Native Platform Conventions
✅ **DO**:
- Use native tab bar (iOS UITabBarController)
- SF Symbols on iOS, Material Icons on Android
- Safe area awareness
- Platform-specific haptics
- Light/dark mode support

❌ **DON'T**:
- Custom tab bar (use native)
- Web-style drawers on mobile
- Unresponsive touch targets (<44pt)
- Ignoring notch/safe areas

### Your app:
- Moving to native tabs ✓
- Supporting SF Symbols ✓
- Apple HIG-aligned primitives ✓

## Testing Standards

### Expected Coverage
- **Unit tests**: 80%+ via Vitest + RTL
- **E2E smoke**: All critical flows (auth, primary tasks)
- **E2E comprehensive**: Detox for iOS/Android
- **Visual**: Percy or similar for regressions
- **Accessibility**: axe-core or similar

**Your current**:
- ✓ Unit tests with Vitest
- ✓ E2E tests with Detox
- 🔄 Need accessibility audit

## Accessibility Standards

### Mandatory (WCAG 2.1 AA)
- Touch targets: ≥44pt (iOS) / 48dp (Android)
- Color contrast: 4.5:1 for text, 3:1 for graphics
- Labels for all interactive elements
- Support for VoiceOver (iOS) and TalkBack (Android)
- Reduced motion: Animations can be disabled

**Your app**:
- 🔄 Need explicit touch target audit
- 🔄 Need color contrast verification
- 🔄 Need screen reader testing

## Build & Deployment Standards

### Standard CI/CD Flow
```
Code push
  ↓
[typecheck] ✓ TypeScript
  ↓
[lint] ✓ Code quality
  ↓
[test] ✓ Unit + integration
  ↓
[eas build] ✓ Native compilation
  ↓
[smoke test] ✓ E2E on testable platform
  ↓
[deploy] ✓ To preview/production
```

### Release Channels
```
dev      → Local dev + dev client
e2e      → CI/CD test builds
preview  → Beta testers (OTA)
production → App Store/Play Store (OTA fallback)
```

**Your current**: Multi-variant workflow ✓

## Library Ecosystem (2026)

### Recommended
| Purpose | Library | Status |
|---------|---------|--------|
| Server state | `@tanstack/react-query` | ✓ Using |
| Local state | `zustand` | 🔄 Consider |
| Validation | `zod` | 🔄 Adopt |
| Auth | `better-auth` | ✓ Using |
| Navigation | `expo-router` | ✓ Upgrading |
| Animations | `react-native-reanimated` | ✓ v4.2.1 |
| Forms | React Hook Form + Zod | 🔄 Consider |
| Icons | SF Symbols / Material Icons | ✓ New |

### Avoid
- Redux (unless 10+ top-level state slices)
- MobX (Zustand is simpler)
- Styled Components (use Tailwind/Restyle)
- Manual API calls (use React Query)
- Custom authentication

## Deprecated Patterns

**Don't use in 2026:**
- React Navigation Drawer (use native tabs)
- Redux (use React Query + local state)
- Class components (use hooks)
- PropTypes (use TypeScript)
- Untyped axios/fetch (use React Query)
- Global Context for everything

## Your App's Standards Alignment

### ✅ Already Following
- TypeScript strict mode
- New Architecture enabled
- React Query for server state
- Better-auth for authentication
- Expo Router file-based routing
- Multi-variant builds
- Vitest + Detox testing

### 🔄 Adopting This Migration
- Expo Router native tabs (vs drawer)
- React 19.2.0 + React Compiler
- Feature-sliced architecture
- Design system primitives
- Zod for validation
- Zustand for local state (consider)

### 📋 Future Improvements
- Accessibility audit & WCAG AA compliance
- Hermes engine hardening
- Code splitting optimization
- Performance budgets
- Visual regression testing

---

**Reference**: These standards are based on React Native 0.84, Expo 55, and industry consensus from App.js Conf 2025 and React Conf 2025.
