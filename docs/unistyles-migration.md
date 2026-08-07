# Unistyles v3 Migration for Omiro

A proposed migration from the custom `makeStyles` + `useThemeColors` styling system to `react-native-unistyles` v3. This document is a discovery artifact. Nothing in it is approved.

This supersedes an earlier NativeWind v5 proposal. NativeWind was rejected in favor of Unistyles because the ask was specifically **performance** (theme changes currently re-render every `makeStyles` consumer) and **removing indirection**, not a wholesale move to utility-class styling. Unistyles keeps the existing `(theme) => ({...})` object-literal shape almost verbatim and fixes the re-render problem at the native layer instead of asking every component to be rewritten in a different styling language.

---

## Current State

### How Omiro styles itself today

Omiro uses a two-layer styling system:

1. **`@ponti-studios/ui/native`** (external npm package v1.0.1) provides `createMakeStyles`, `useThemeColors`, `useColorMode`, and `nativeShadows` — a thin token bridge from the design system to React Native.

2. **`~/components/theme/`** (app-local wrappers) binds that bridge to Omiro's own theme shape and exports a custom `Text` component with 13 Apple HIG presets (`display`, `largeTitle`, `title1`, `headline`, `body`, `callout`, etc.), plus `useFloatingSurfaceStyles` — a shared card style for composer/toolbar-style chrome.

Every component follows the same pattern:

```tsx
import { makeStyles } from '~/components/theme';

const useStyles = makeStyles((theme) => ({
  container: { backgroundColor: theme.colors.background, padding: theme.spacing.md },
  text: { color: theme.colors['text-primary'], fontSize: 17 },
}));

function MyComponent() {
  const styles = useStyles(); // re-runs the factory on every render
  return <View style={styles.container}><Text style={styles.text} /></View>;
}
```

`createMakeStyles` is documented (by its own author) as calling the theme hook "on every render, so styles re-resolve when the color mode changes" — the cost of a full style-object rebuild is accepted everywhere, on every render, to cover the rare case of an OS appearance change.

### Scale

| Metric | Value |
|---|---|
| Files using `makeStyles` / `useStyles` | 50 |
| Files importing from `~/components/theme` | 54 |
| Largest `makeStyles` block | ~150 lines (`chat-message.tsx`) |
| Average block | ~30 lines |
| Total style boilerplate (estimate) | ~1,500 lines |
| Color tokens in palette | 25 |
| Color tokens actually used | 13 (52%) |
| Files with dynamic/conditional `theme.colors.X` ternaries | ~8 (`Composer.tsx`, `TimeComposer.tsx`, `TimeWorkspace.tsx`, others) |
| Unistyles already installed | No |
| `react-native-nitro-modules` already installed | **Yes** (`^0.36.1`) — Unistyles v3's native layer is built on Nitro Modules |
| `expo-dev-client` already installed | **Yes** — Unistyles requires a dev client; Expo Go isn't supported, which is a non-issue here |

### `@ponti-studios-ui` web side

The same package's web components (Button, Badge, Dialog, Table, etc.) already use Tailwind v4 + `class-variance-authority`, unrelated to how Omiro styles native views. Unistyles doesn't touch this — it's a native-only concern, so there's no cross-platform token unification story here the way there was in the NativeWind proposal. That's an explicit trade-off (see "Why Not," below).

---

## What Unistyles v3 Is

Unistyles is a drop-in-shaped replacement for `StyleSheet.create` that resolves theme/breakpoint-aware styles at the **native Shadow Tree level via JSI**, instead of through a React hook. Per the official docs: it achieves "no re-renders across the entire app" for theme changes by using "pure JSI bindings" and a "cross-platform parser written in C++" built on **Nitro Modules** — the same native module system Omiro already depends on.

### Key characteristics

- **Same call shape as today** — `StyleSheet.create(theme => ({ container: {...} }))` looks almost identical to `makeStyles((theme) => ({...}))`. The theme-callback pattern survives; what disappears is the `useStyles()` hook call and its per-render re-execution.
- **No Context, no Provider** — configured once via `StyleSheet.configure({ themes, breakpoints, settings })`, imported early (e.g. `unistyles.ts` at the app root). No `ThemeProvider` wraps the tree.
- **Variants replace inline ternaries** — the `borderColor: focused ? theme.colors.primary : ...` pattern used in `Composer.tsx` and `TimeComposer.tsx` today becomes a `variants` block selected via `styles.useVariants({...})` — still declarative, still typed, no manual conditional logic in the render body.
- **`useUnistyles()` exists but is explicitly discouraged** — the docs say to avoid it for standard components; it re-subscribes to theme changes the old-fashioned (re-rendering) way and "undermines Unistyles' performance benefits." Reserve it for the same narrow case `useThemeColors()` covers today: JS logic that needs a color value outside of a style object (e.g. an icon's `tintColor` prop).
- **`withUnistyles` bridges third-party components** — for libraries that don't forward a native ref or don't accept a `style` prop (this codebase's `@expo/ui` SwiftUI components in `InlineEnhanceTray.tsx` are a candidate for this).
- **Breakpoints, for free** — not something the current system has at all; low priority for a phone-only app, but zero-cost to configure.

### Required dependencies

```
react-native-unistyles
react-native-nitro-modules   # already installed
```

Plus a Babel plugin entry:

```js
// babel.config.js
plugins: [
  ['react-native-unistyles/plugin', { root: 'components' }],
],
```

### Hard requirements (all already satisfied by Omiro)

| Requirement | Unistyles v3 needs | Omiro has |
|---|---|---|
| New Architecture (Fabric) | Required, no opt-out | Default on Expo SDK 57 |
| React Native | 0.78.0+ | 0.86.0 |
| Expo SDK | 53+ | 57 |
| Xcode | 16+ (ideally 16.3+) | 26.6 |
| Dev client (not Expo Go) | Required | Already using `expo-dev-client` |

This is a materially different risk profile than the NativeWind proposal, which required no such platform floor but demanded a full rewrite of every styled component's markup.

### What the migration looks like in practice

```tsx
// Before (current)
const useStyles = makeStyles((theme) => ({
  container: { backgroundColor: theme.colors.background, padding: theme.spacing.md },
}));

function MyComponent() {
  const styles = useStyles();
  return <View style={styles.container} />;
}

// After (Unistyles)
import { StyleSheet } from 'react-native-unistyles';

const styles = StyleSheet.create((theme) => ({
  container: { backgroundColor: theme.colors.background, padding: theme.spacing.md },
}));

function MyComponent() {
  return <View style={styles.container} />; // no hook call, no per-render rebuild
}
```

The object literal is unchanged. The migration is mechanically: delete the `useStyles()` call, delete the `const styles = ` hook indirection, move `StyleSheet.create` to module scope, swap the import. This is a **search-and-replace-shaped** migration, not a rewrite — the opposite of NativeWind's className conversion.

---

## Why Migrate

### 1. Solves the actual performance complaint

The original problem was `useTheme()` (and by extension every `makeStyles` consumer) rebuilding on every render. Unistyles removes the React render cycle from the equation entirely for theme-driven styles — updates happen on the native Shadow Tree via JSI. This is the most direct fix available for "theme changes shouldn't cascade re-renders through the app."

### 2. Near-zero conceptual migration cost

Every one of the 50 `makeStyles((theme) => ({...}))` blocks keeps its shape. Engineers already fluent in the current pattern don't need to learn a new styling language (unlike NativeWind's utility classes) — they need to learn one hook (`useVariants`) and one config file.

### 3. Removes the `createMakeStyles`/`useTheme` indirection this whole conversation started from

`createTheme(useThemeColors())` disappears along with the two-layer factory (`createMakeStyles` → `makeStyles` → `useStyles`). `StyleSheet.configure({ themes: { light, dark } })` is one flat, standard config call — themes are registered once, not reconstructed per render, per file, per component instance.

### 4. Variants formalize the existing ad-hoc dynamic-style pattern

`Composer.tsx`, `TimeComposer.tsx`, and `TimeWorkspace.tsx` all hand-roll `condition ? theme.colors.X : theme.colors.Y` inline. Unistyles' `variants` + `useVariants()` is the same idea with a name, a type, and a runtime that doesn't require re-deriving the whole style object.

### 5. Breakpoints and adaptive theming come for free

Not used today, but zero marginal cost once `StyleSheet.configure` is in place — useful if Omiro ever ships an iPad layout.

### 6. Already satisfies every platform requirement

`react-native-nitro-modules` and `expo-dev-client` are already dependencies. New Architecture is already the default. There's no floor-raising work before this can start, unlike most native-tooling migrations.

---

## Why Not

### 1. 50 files still need mechanical edits

Smaller diffs than NativeWind's (delete a hook call vs. rewrite markup), but it's still 50 files, each needing the `useStyles()` → module-scope `StyleSheet.create` conversion, plus an import swap. Not zero-effort.

### 2. New Architecture is non-negotiable

If Omiro ever needed to ship a build with the old architecture (a regression, a third-party library incompatibility), Unistyles v3 has no fallback — "Unistyles 2.0+ remains compatible with older versions" is the documented escape hatch, meaning a downgrade, not a workaround.

### 3. Third-party component friction

Anything that doesn't forward a native ref or doesn't take a `style` prop needs `withUnistyles` wrapping. `@expo/ui`'s SwiftUI-backed components (`Host`, `Picker`, `Label` used in `InlineEnhanceTray.tsx`) are the concrete case in this codebase — need to verify `withUnistyles` can wrap them or whether they stay on `useThemeColors()`-style JS access.

### 4. `useUnistyles()` is a trap disguised as a migration shortcut

It's the "just make it work" hook for anyone reflexively converting `useThemeColors()` call sites, but every such conversion silently reintroduces the exact re-render behavior this migration exists to remove. Needs an explicit lint rule or code-review convention to catch.

### 5. No web-side token unification

Unlike NativeWind, this doesn't move Omiro toward sharing a CSS token pipeline with `@ponti-studios-ui`'s web components. If "one design system, one syntax, both platforms" is a goal independent of the performance question, Unistyles doesn't advance it — NativeWind or Tamagui would.

### 6. Debugging changes shape, not disappears

Styles are still plain objects you can inspect, but they're now updated by a native JSI layer outside the normal React DevTools render trace. A style that "isn't updating" needs a different debugging instinct (check `StyleSheet.configure`, check whether the underlying host component actually got wrapped for shadow-tree access) than today's "log the hook's return value."

### 7. `@ponti-studios/ui/native`'s `createMakeStyles` becomes fully obsolete

No graceful in-between state — once a file moves to `StyleSheet.create`, it no longer needs `useTheme()` or `createMakeStyles` at all. The package's native subpath loses its primary consumer in this app; whether it's still exported for other apps in the monorepo is a separate question.

### 8. New dependency surface, new failure mode

A Babel plugin that walks the `root` directory looking for `StyleSheet.create` calls is a new build-time step. If it misses a file (wrong `root`, an edge-case import pattern), that file silently falls back to plain, non-reactive styles rather than erroring — worth confirming what the plugin's failure mode actually is before relying on it app-wide.

---

## Migration Scope

### What changes

- **50 component files** — `makeStyles((theme) => ({...}))` + `useStyles()` becomes module-scope `StyleSheet.create((theme) => ({...}))`, no hook call at the use site
- **`~/components/theme/theme.ts`** — `useTheme()`, `createTheme()`, `createMakeStyles` binding become unnecessary; `useThemeColors()`/`useColorMode()` may be kept for the few genuine dynamic-JS cases
- **`~/components/theme/floating-surface.ts`** and other shared style hooks — become shared `StyleSheet.create` objects instead of `makeStyles`-based hooks
- **Ad-hoc conditional-color patterns** (`Composer.tsx`, `TimeComposer.tsx`, `TimeWorkspace.tsx`) — convert to `variants` + `useVariants()`
- **`babel.config.js`** — adds `react-native-unistyles/plugin`
- **New file** — `unistyles.ts` (or similar) at the app root calling `StyleSheet.configure({ themes: { light, dark }, settings: { adaptiveThemes: true } })`, imported first thing in `app/_layout.tsx`
- **`package.json`** — adds `react-native-unistyles`
- **`InlineEnhanceTray.tsx`** and any other `@expo/ui` consumer — needs `withUnistyles` wrapping or an explicit decision to keep it on `useThemeColors()`

### What stays

- **`@ponti-studios-ui/tokens`** — token values are unchanged; they become the `theme` object passed into `StyleSheet.configure({ themes })` instead of `createTheme()`'s input
- **The custom `Text` component and its 13 presets** — unaffected; it can keep using `StyleSheet.create` under the hood exactly like every other component
- **`useThemeColors()` / `useColorMode()`** — kept for the narrow set of genuinely dynamic, non-style JS values (an icon `tintColor` prop, for example)
- **Reanimated animated styles** (`components/theme/animations.ts`, `useAnimatedStyle` call sites) — Unistyles doesn't replace Reanimated; animated styles continue to be merged into the `style` array alongside Unistyles-resolved styles, same as today
- **All component logic** — only the styling call-site mechanics change; behavior, state, and data flow are untouched
- **`nativeShadows`, `radii`, `spacing`, `componentSizes`** — same token values, now referenced from inside a `StyleSheet.create` theme callback instead of a `makeStyles` one

### What is out of scope

- **Cross-platform (web) token unification** — Unistyles is native-only; sharing a syntax with `@ponti-studios-ui`'s web Tailwind components is not a goal of this migration (see "Why Not," #5)
- **Android** — Omiro remains iOS-only; Unistyles supports Android, but nothing here is verified against it

---

## Migration Phases

### Phase 1: Scaffold (1 PR)

Add `react-native-unistyles`, confirm `react-native-nitro-modules` version compatibility, add the Babel plugin, create `unistyles.ts` with `StyleSheet.configure({ themes: { light, dark } })` using the existing `colorThemes` values verbatim. Migrate one isolated leaf component (e.g. `components/ui/otp-input.tsx`) end to end and confirm identical rendering on the simulator.

**Success criterion:** the migrated component renders pixel-identical to its `makeStyles` version, confirmed by screenshot comparison, and toggling OS appearance updates it without a visible re-render/flash.

### Phase 2: Theme parity + dynamic-value audit

Register all 25 color tokens (and `spacing`, `borderRadii`, `componentSizes`, `streamItem`, `typography`) in the Unistyles theme shape. Audit every `theme.colors.X : theme.colors.Y` ternary in the codebase (`Composer.tsx`, `TimeComposer.tsx`, `TimeWorkspace.tsx`, and any missed by that initial grep) and convert each to a `variants` block.

**Success criterion:** `grep -rn "theme.colors\[.*\] :" apps/omiro/components` returns zero results outside of genuinely non-style JS logic.

### Phase 3: Incremental migration

Migrate components from leaf nodes inward:
1. **UI primitives** (`components/ui/` — Button, TextField, IconButton, etc.)
2. **Shared surfaces** (`components/theme/floating-surface.ts` and its consumers — Composer, NoteToolbar, InlineErrorBanner, ChatSearchModal, TimeWorkspace's toast)
3. **Feature components** — Chat, Inbox, Notes, Tasks, Time workspace
4. **Route screens** (`app/(protected)/` pages)
5. **`@expo/ui` boundary** — resolve `InlineEnhanceTray.tsx` via `withUnistyles` or a documented exception
6. **Cleanup** — remove `makeStyles`, `createMakeStyles` binding, and `useTheme()`/`createTheme()` from `~/components/theme/`

Each PR migrates one category and ships independently. Both styling systems coexist throughout — a `StyleSheet.create`-based component can sit next to a `makeStyles`-based one with no conflict.

**Success criterion:** after each PR, the app passes the existing test suite, and a screenshot diff on that PR's components shows no visual regression.

### Phase 4: Remove the old system

Once zero files import `makeStyles`, delete `useTheme()`, `createTheme()`, and the `createMakeStyles` binding from `~/components/theme/theme.ts` and `index.ts`. Confirm whether `@ponti-studios/ui/native`'s `createMakeStyles` export still has other consumers in the monorepo before deciding whether to deprecate it upstream.

**Success criterion:** `grep -rn "makeStyles\|createTheme" apps/omiro/components apps/omiro/app` returns zero results outside of this migration's own historical commits.

---

## Decision Log

| Decision | Date | Rationale |
|---|---|---|
| Evaluate Unistyles v3, not NativeWind | 2026-08-07 | The ask was specifically to fix theme-change re-render cost and remove factory indirection, not to adopt utility-class styling; Unistyles solves the stated problem with a near-identical call shape, at the cost of not unifying tokens with the web side |
| Confirm platform floor before writing this doc | 2026-08-07 | Unistyles v3 requires New Architecture, RN 0.78+, Expo SDK 53+, a dev client — all already true for Omiro, so there's no floor-raising prerequisite work |
| Keep `useThemeColors()` for dynamic JS values | 2026-08-07 | `useUnistyles()` exists but is explicitly documented as re-render-causing; the few genuine non-style dynamic-color cases should stay on the existing hook rather than reach for Unistyles' discouraged escape hatch |
| `makeStyles` and `StyleSheet.create` coexist during migration | 2026-08-07 | Avoids a feature-freeze; incremental migration de-risks the rollout, same rationale as the original NativeWind proposal |
| Android support out of scope | 2026-08-07 | Omiro is iOS-only per project rules; Unistyles supports Android but nothing here is verified against it |

---

## Open Questions

1. **What's the actual failure mode of the Babel plugin missing a file?** Confirm whether an unprocessed `StyleSheet.create` call throws, warns, or silently degrades to static (non-reactive) styles. This determines whether the `root` config option is a one-time setup detail or an ongoing risk per new file added.

2. **Can `withUnistyles` wrap `@expo/ui`'s SwiftUI-backed components** (`Host`, `Picker`, `Label` in `InlineEnhanceTray.tsx`)? If not, does that component stay permanently on `useThemeColors()`, or does it need a different theming bridge?

3. **Does the existing Babel config (React Compiler via `babel-preset-expo`) compose cleanly with `react-native-unistyles/plugin`?** Confirm plugin ordering doesn't matter, or determine the required order, before Phase 1.

4. **What's the convention for the `variants` conversion?** Every `theme.colors.X : theme.colors.Y` ternary needs a variant name. Do we standardize on semantic names (`focused`, `error`, `default` — matching the official example) app-wide, or let each component name its own?

5. **Should `nativeShadows`' `boxShadow`-shaped values be re-expressed as Unistyles theme values, or kept as a separate import used inside `StyleSheet.create` callbacks?** Functionally either works; this is a convention choice for where "shadow" lives in the new theme object.

6. **Do any Reanimated `useAnimatedStyle` call sites read Unistyles-resolved theme values directly** (as opposed to static colors, which is the current, correct pattern per `expo-native-ui`'s animation guidance)? If any do, they need auditing — Reanimated worklets run on a different thread than the JSI style-resolution layer, and mixing them incorrectly could reintroduce the exact stale-color bugs Unistyles is meant to prevent.

7. **Single large PR or 5-10 small PRs?** Same trade-off as the original NativeWind proposal — atomic-but-risky vs. safe-but-mixed-state-for-weeks. Given each individual file's diff is much smaller than a NativeWind conversion, a higher PR count is more feasible here.

8. **Does this affect EAS Update / OTA payloads?** Unistyles resolves styles via a native module rather than shipping CSS-derived class strings, so the NativeWind proposal's "does the class set change between updates" question doesn't apply — but confirm there's no equivalent native-module-versioning constraint for OTA updates.

---

## References

- **Unistyles v3 docs**: unistyl.es/v3
- **`@ponti-studios-ui` source**: `/Users/charlesponti/Developer/ponti-studios-ui`
- **Omiro theme system**: `apps/omiro/components/theme/`
- **Current styling inventory**: 50 files on `makeStyles`, 54 files importing `~/components/theme`, 13 color tokens in active use
- **Expo SDK**: 57 (`expo@^57.0.8`, `react-native@0.86.0`)
- **Already-satisfied Unistyles prerequisites**: `react-native-nitro-modules@^0.36.1`, `expo-dev-client@~57.0.9`, New Architecture (default on Expo SDK 57)
