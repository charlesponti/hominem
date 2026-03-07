## Why

The mobile app at `apps/mobile` is on Expo SDK 54 and React Native 0.81.5 while the latest template reference is SDK 55. In 2026, Expo/RN ecosystems move quickly, so keeping the stack current is a reliability and security requirement, not a cosmetic modernization. The upgrade should modernize dependency management, runtime performance, compile pipeline, and architecture.

## What Changes

- **Core Runtime Upgrade**: move Expo 54.0.0 to Expo 55.x (coordinated with React Native and React versions)
- **Dependency Alignment Strategy**: use Expo-managed version alignment instead of manual package-by-package pinning
- **React Native Upgrade**: 0.81.5 → 0.83.2 (or the Expo 55 matching version set)
- **React Upgrade**: 19.1.0 → 19.2.0
- **Expo Router Upgrade**: 6.0.23 → 55.0.4
- **Animation Stack Update**: update `react-native-reanimated`, validate `react-native-worklets` compatibility
- **New Capabilities from Template**: `expo-glass-effect`, `expo-symbols`, `expo-image` where they support current product screens
- **Compiler and Build Performance**: enable React Compiler and keep `newArchEnabled` intact
- **Typed Routes Hygiene**: maintain route typing and regenerate `.expo/types` as part of checks
- **Web and Native Output Stability**: keep existing web/static strategy and ensure variant prebuild parity
- **Operational Safety Net**: add explicit pre-upgrade and post-upgrade validation gates (`expo-doctor`, typecheck, lint, E2E smoke)
- **Navigation Modernization**: migrate from Drawer + Tabs to native Tab Bar using Expo Router's native tabs (UITabBarController on iOS, BottomTabNavigator on Android)
- **Architecture Alignment**: re-structure the app around Expo Router and Apple design-system primitives, replacing legacy layout patterns where possible
- **Design System Modernization**: migrate UI foundations to Apple HIG-compatible tokens, symbols, and navigation semantics while preserving product behavior
- **State + Network Layer Clarity**: separate presentation, orchestration, and integration boundaries for easier testing and incremental delivery
- **Tab-Based Feature Organization**: organize chat, notes, focus, and account into primary tab structure with optional deep nesting for detail views
- **Theming**: defer full restyle-to-custom migration; document a compatibility shim approach so behavior is preserved

## Capabilities

### New Capabilities

- `expo-55-migration`: Full migration of mobile app to Expo SDK 55 with all dependency updates, configuration changes, and architectural improvements
- `native-tab-navigation`: Migrate from Drawer + Tabs to iOS-native Tab Bar interface, reorganizing chat/notes/focus/account as primary tabs
- `expo-apple-architecture`: Reorganize mobile app architecture around Expo Router composition, feature-sliced domains, and Apple HIG-aligned primitives
- `apple-design-system`: Establish a foundational Apple design system layer for typography, spacing, color, and navigation controls

### Additional Notes

- This capability is intentionally scoped as a platform infrastructure upgrade and includes validation and rollout discipline so functional behavior stays stable.

### Modified Capabilities

- No existing requirement-level product capabilities change in business logic; this is an architecture-infrastructure change to improve maintainability, accessibility, and platform fit.

## Impact

- **Code**: `apps/mobile/` - package.json, app.config.ts, theme files, component structure
- **Dependencies**: Expo SDK group, React Native + React, Expo modules, animation stack
- **Architecture**: `app/` routing structure, feature boundaries, service/context boundaries, component layering
- **Design System**: New primitive components, theme tokens, and semantic color system
- **Configuration**: `app.config.ts`, `metro.config.js`, `babel.config.js`, `tsconfig.json`
- **Validation**: `bun.lockb`, lockfile drift checks, `expo-doctor`, unit and e2e tests
- **Build Assets**: `ios/`, `android/`, and generated native artifacts must remain in sync post-upgrade
- **Breaking Risk**: `react-native` engine or dependency behavior changes, animation/runtime behavior, and any optional theming API modernization.
