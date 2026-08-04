# NativeWind v5 Migration for Omiro

A proposed migration from the custom `makeStyles` + `useThemeColors` styling system to NativeWind v5 with Tailwind CSS v4. This document is a discovery artifact. Nothing in it is approved.

---

## Current State

### How Omiro styles itself today

Omiro uses a two-layer styling system:

1. **`@ponti-studios/ui/native`** (external npm package v0.6.0) provides `createMakeStyles`, `useThemeColors`, `useColorMode`, and `nativeShadows` — a thin token bridge from the design system to React Native.

2. **`~/components/theme/`** (app-local wrappers) binds that bridge to Omiro’s own theme shape and exports a custom `Text` component with 13 Apple HIG presets (`display`, `largeTitle`, `title1`, `headline`, `body`, `callout`, etc.).

Every component follows the same pattern:

```tsx
import { makeStyles } from '~/components/theme';

const useStyles = makeStyles((theme) => ({
  container: { backgroundColor: theme.colors.background, padding: theme.spacing.md },
  text: { color: theme.colors['text-primary'], fontSize: 17 },
}));

function MyComponent() {
  const styles = useStyles();
  return <View style={styles.container}><Text style={styles.text} /></View>;
}
```

### Scale

| Metric | Value |
|---|---|
| Files using `makeStyles` / `useStyles` | 50 |
| Files importing from `~/components/theme` | 56 |
| Largest `makeStyles` block | 152 lines (`chat-message.tsx`) |
| Average block | ~30 lines |
| Total style boilerplate (estimate) | ~1,500 lines |
| Color tokens in palette | 25 |
| Color tokens actually used | 13 (52%) |
| CSS files in the project | 0 |
| Tailwind or NativeWind anywhere | No |

### `@ponti-studios-ui` web side

The same package’s web components (Button, Badge, Dialog, Table, etc.) already use Tailwind v4 + `class-variance-authority`. The `src/styles/` directory exports a full CSS theme file with `@theme` definitions, CSS custom properties, shared utility classes, and light/dark mode support. The web side speaks Tailwind fluently. The native side does not.

---

## What NativeWind v5 + Tailwind v4 Is

NativeWind v5 is the Metro/bundler layer that makes Tailwind utility classes work in React Native. Tailwind v4 provides the CSS engine — configuration via `@theme` in CSS files, PostCSS plugin, platform media queries, and `light-dark()` color support.

### Key characteristics

- **No Babel plugin** — v5 uses `withNativewind` in `metro.config.js` and `@tailwindcss/postcss` in `postcss.config.mjs`. Omiro’s `babel-preset-expo` with React Compiler stays untouched.
- **CSS-first theme** — Colors, spacing, fonts, radii, and shadows are defined as CSS custom properties in a `global.css`, not in a JS config object.
- **Component wrappers** — Every React Native primitive (View, Text, Pressable, ScrollView, TextInput, Image) needs a thin `useCssElement` wrapper to accept `className` props.
- **Platform media queries** — `@media ios { ... }` for platform-specific styles, including `platformColor()` for Apple semantic colors.
- **No `StyleSheet.create`** — Styles are class strings resolved at build time by the Metro transformer.

### Required dependencies

```
tailwindcss@^4
nativewind@^5
react-native-css
@tailwindcss/postcss
```

### What the upgrade looks like in practice

```tsx
// Before (current)
const useStyles = makeStyles((theme) => ({
  container: { backgroundColor: theme.colors.background, padding: theme.spacing.md },
}));
// ... in component: <View style={styles.container}>

// After (NativeWind)
<View className="bg-background p-md" />
```

---

## Why Migrate

### 1. Eliminate ~1,500 lines of style boilerplate

50 files each define a `makeStyles` callback. Most are 20-50 lines of `backgroundColor: theme.colors.X` and `fontSize: N` that Express nothing a utility class wouldn’t. Inline `className` strings collapse this into the JSX where the intent is immediately visible.

### 2. Unify the design token pipeline across web and native

`@ponti-studios-ui`'s web components already use Tailwind classes (`bg-background`, `text-primary`, `rounded-md`). Its `styles.css` already defines the CSS custom properties these classes reference. NativeWind would let Omiro consume the same CSS custom properties and the same class vocabulary. One token source, two platforms.

### 3. Auto dark mode via CSS, not React hooks

Today: `useThemeColors()` fetches tokens on every render; a re-render on OS appearance change re-computes every `makeStyles` consumer. With CSS: `light-dark()` handles mode switching at the CSS layer with zero React overhead.

### 4. Faster iteration

No need to create or update a `useStyles` hook for every new component. Add a `className` and move on. New team members don’t need to learn a custom theme DSL — Tailwind is the most widely known styling language in the ecosystem.

### 5. Reduces theme abstraction layers

Currently: DTCG JSON → Style Dictionary → JS token constants → `~/components/theme/` wrappers → `makeStyles((theme) => {...})`. With NativeWind: DTCG JSON → Style Dictionary → CSS custom properties → `className="..."`. Three layers collapse to two, and the final consumption layer is a standard.

### 6. Tailwind tooling

Editor autocompletion, class deduplication via `tailwind-merge` (already in the monorepo), and static analysis tools work out of the box. The current `makeStyles` pattern has no tooling support beyond TypeScript.

### 7. Shared utility class vocabulary

The `@ponti-studios-ui` stylesheet already defines shared classes like `.ui-flat-card`, `.ui-data-label`, `.ui-eyebrow`, and `.layout-stack`. NativeWind could make these available on native as well — or at minimum, the underlying tokens would be consistent.

---

## Why Not

### 1. 52 files to migrate

Every component that uses `makeStyles` needs its style objects converted to `className` strings. This is a mechanical, line-by-line conversion. The two systems can coexist during migration (a component using `makeStyles` can sit next to one using `className`), but until migration is complete, the project has two styling systems.

### 2. Component wrapping

Every React Native primitive used in JSX needs a `useCssElement` wrapper to accept `className`. This requires creating a `~/tw/` directory with wrapped View, Text, Pressable, ScrollView, TextInput, Image, and Reanimated-compatible variants. Those wrappers must be maintained and kept in sync with upstream component signatures.

### 3. Custom Text component

Omiro’s `Text` component supports 13 preset variants, the `color` prop, and the `muted` shortcut. These must be mapped to Tailwind utilities — either via `@utility` definitions in `global.css` (`.text-body`, `.text-headline`, etc.) or by merging the `Text` component with `className` support while preserving the presets API.

### 4. Dynamic theme values

Some components access theme values in JavaScript logic (e.g., a dynamic border color based on state). `className` covers static styles but can’t replace every `theme.colors.X` access in imperative code. The `useThemeColors()` hook (or a CSS variable hook) remains necessary for JS-driven styling.

### 5. `@ponti-studios-ui/native` becomes partially obsolete

`createMakeStyles` would have no consumers after migration. The `useThemeColors` and `useColorMode` hooks remain useful for dynamic cases. The package’s native subpath needs a v2 that exports CSS variable definitions and deprecates the `makeStyles` factory.

### 6. Build pipeline changes

Metro config gets `withNativewind`; a new `postcss.config.mjs` and `global.css` appear; package.json gains three dependencies. Every config file change is a point of friction for CI, EAS Build, and local dev setup.

### 7. Learning curve

The team knows the `makeStyles` + `theme` pattern. Tailwind’s class vocabulary requires a learning ramp, though it’s smaller than learning a custom theme DSL from zero.

### 8. Debugging changes

Today, a style misbehavior is a JS object you can inspect in React DevTools. With NativeWind, styles are resolved by the Metro transformer into opaque output. Debugging a missing class requires checking the CSS source, the generated output, and whether the transformer picked it up — an added layer of indirection.

### 9. EAS Update payload

Every class used in the app is embedded in the bundle at build time. Tailwind’s utility class approach generates a finite set of classes, so this is bounded — but it is a new variable in bundle size that does not exist today.

---

## Migration Scope

### What changes

- **50 component files** — `makeStyles` blocks become `className` strings
- **`~/components/theme/`** — Most files become unnecessary; the custom `Text` component may be preserved if the presets API is worth keeping
- **`metre.config.js`** — Adds `withNativewind`
- **New files** — `postcss.config.mjs`, `global.css`, `~/tw/` (wrapped primitives)
- **`package.json`** — Adds `nativewind`, `react-native-css`, `@tailwindcss/postcss`
- **App root** — Imports `global.css` (likely in `_layout.tsx` or `index.js`)
- **`oxlint.config.mjs`** — May need rule adjustments (no new banned imports expected)

### What stays

- **`@ponti-studios-ui/tokens`** — Token values become CSS custom properties instead of JS constants, but the source of truth (DTCG JSON) is unchanged
- **`useThemeColors()` and `useColorMode()`** — Remain for JS-driven dynamic styling
- **`@ponti-studios-ui/native`** — Present during migration; `createMakeStyles` deprecated after
- **Font families, radii, shadows, durations** — Same values, different delivery format
- **Reanimated layout animations** (`components/theme/animations.ts`) — Unaffected
- **`expo-glass-effect`, `expo-symbols`** — Unaffected
- **All component logic** — Only styling changes; behavior, state, and data flow are untouched

### What is out of scope

- Migrating `@ponti-studios-ui` web components to `@ponti-studios-ui/native` — This migration only covers Omiro’s styling consumption. Sharing actual component code between platforms is a separate, much larger conversation.
- Android support — Omiro remains iOS-only.

---

## Migration Phases

### Phase 1: Scaffold (1 PR)

Add dependencies, create `postcss.config.mjs`, `global.css`, `~/tw/` primitives, and wire `withNativewind` in Metro. Verify with one migration target: convert a single, isolated component (e.g., `components/ui/otp-input.tsx`) and confirm it renders identically on the simulator with Maestro evidence.

**Success criterion:** `className="bg-background text-primary rounded-md p-md"` renders the same visual output as the previous `makeStyles` block.

### Phase 2: Token alignment

Map all 25 `@ponti-studios-ui` color tokens to CSS custom properties in `global.css`. Create `@utility` classes for the 13 Text presets. Verify light/dark mode switching still works via OS appearance changes.

**Success criterion:** `useThemeColors()` and `className="text-primary"` resolve to the same hex value in both light and dark modes, confirmed by screenshot comparison.

### Phase 3: Incremental migration

Migrate components from leaf nodes inward:
1. **UI primitives** (`components/ui/` — Button, TextField, IconButton, OTPInput, etc.)
2. **Feature components** — Chat, Composer, Inbox, Notes, Tasks, Workspace
3. **Route screens** (`app/(protected)/` pages)
4. **Cleanup** — Remove `makeStyles`, theme wrappers, and unused `components/theme/` files

Each PR migrates one category and ships independently. Both styling systems coexist throughout. No feature-freeze required.

**Success criterion:** After each PR, the app passes the same Maestro test suite it passed before.

### Phase 4: Deprecate `createMakeStyles`

Once zero files import `makeStyles`, remove it from `~/components/theme/`. Update `@ponti-studios-ui/native` to v0.7 (or v1.0) with `createMakeStyles` marked deprecated and CSS variable exports added.

**Success criterion:** `grep -r "makeStyles" apps/omiro/src` returns zero results.

---

## Decision Log

| Decision | Date | Rationale |
|---|---|---|
| Evaluate NativeWind v5, not v4 | 2026-07-31 | v4 required a Babel plugin and JS config; v5 is CSS-first with `@theme` and matches the direction of Tailwind v4 |
| Keep `useThemeColors()` for dynamic styles | 2026-07-31 | Some styles are computed from state; not every style can be a static class string |
| Do not port `@ponti-studios-ui` web components to native | 2026-07-31 | Out of scope for this migration; a component-sharing bridge is a separate decision |
| iOS-only, no Android fallbacks | 2026-07-31 | Omiro is Apple-only per project rules; NativeWind supports both but we only test/verify iOS |
| `makeStyles` and `className` coexist during migration | 2026-07-31 | Avoids a feature-freeze; incremental migration de-risks the rollout |

---

## Open Questions

1. **Does the team prefer `className` inline in JSX or a separate `styles.ts` with `cn()` calls?** The Tailwind ecosystem is comfortable with long className strings directly in JSX, but this is a stylistic preference with readability and line-length trade-offs. We should agree on a convention before migration begins.

2. **Should the 13 Text presets be preserved as a component API (`<Text variant="headline" />`) or converted to `@utility` classes (`className="text-headline"`)?** The presets are a deliberate design choice — Apple HIG alignment. Mapping them to classes makes them available anywhere but loses the component-level prop validation. Which surface do we prefer?

3. **What is the bundle size impact?** Tailwind generates a finite set of utility classes at build time, but the set depends on what tokens and utilities are defined in `global.css`. We should measure bundle size on a scaffolded branch before committing to Phase 2.

4. **How does NativeWind interact with EAS Update?** OTA updates ship JS bundles. If the class set changes between updates (e.g., a new component uses a new utility), does the Metro output change in a way that’s compatible with the native shell? Confirm with a test update on a scaffolded branch.

5. **Should `@ponti-studios-ui` ship a `nativewind.css` that Omiro `@import`s?** Currently the web side ships `styles.css` with `@theme` and CSS custom properties. The native side could consume a similar file — but does that coupling belong in the `ui` package, or should Omiro define its own `global.css` that independently maps tokens?

6. **What happens to `nativeShadows`?** The current `@ponti-studios-ui/native` exports shadow tokens translated to React Native’s `boxShadow` shape. NativeWind supports shadow utilities (`shadow-sm`, `shadow-md`, etc.). Do the DTCG shadow token names map cleanly to Tailwind shadow tokens, or do we need custom shadow utilities?

7. **Do we need `tailwind-merge` on native?** The `cn()` utility (already in the monorepo for web apps) deduplicates conflicting Tailwind classes. NativeWind recommends `clsx` for class merging but does not require `tailwind-merge`. Should we adopt `cn()` or `clsx` for className composition?

8. **How does `react-native-keyboard-controller` interact with NativeWind?** Omiro uses this package for keyboard-aware layouts. If its components need `className` support, do they accept it natively, or do we need additional wrappers?

9. **Should the migration be a single large PR or 5-10 small PRs?** A single PR is atomic but high-risk (50 files changed). Small PRs by component category are safer but leave the codebase in a mixed state for weeks. What cadence does the team prefer?

10. **What’s the testing strategy per migration PR?** Each PR should pass the existing Maestro suite, but should we also run screenshot diffs (visual regression) between the `makeStyles` and `className` versions of each component? If so, what tooling?

11. **Does `expo-glass-effect` work with NativeWind?** The glass effect package may require native styling props (`style={{...}}`) rather than CSS classes. Identify which non-standard RN packages need special handling.

12. **How do we handle the `theme` callback pattern for dynamic values?** Today, `makeStyles((theme) => ({ color: someCondition ? theme.colors.primary : theme.colors.destructive }))` expresses conditional styles. `className` handles static styles but conditional ones need `clsx` or inline `style` fallbacks. What’s the convention for dynamic class switching?

13. **Does the Metro `withNativewind` transformer play well with the existing custom resolver?** Omiro’s `metro.config.js` already has a custom `resolveRequest` for `@ponti-studios/auth` local source mapping and `.js` extension retry. Does `withNativewind`’s transformer compose cleanly with this, or does it need a different ordering?

14. **What Reanimated components need special wrapping?** Omiro uses `Animated.View`, `Animated.ScrollView`, and animated layout transitions. The `~/tw/` wrappers need Reanimated-compatible variants. Are there any Animated components that resist `useCssElement` wrapping (e.g., `Animated.FlatList`, `Animated.Image`)?

15. **Should this migration block other Omiro feature work?** If the team favors an incremental approach, feature development continues alongside migration. If single-PR, feature work pauses during migration. What’s the priority relative to the product roadmap?

---

## References

- **NativeWind v5 docs**: nativewind.dev
- **Tailwind CSS v4 docs**: tailwindcss.com
- **`@ponti-studios-ui` source**: `/Users/charlesponti/Developer/ponti-studios-ui`
- **Omiro theme system**: `apps/omiro/components/theme/`
- **Current styling inventory**: 50 files, 13 color tokens, 13 Text presets, 0 CSS files
- **Expo SDK**: 57 (`expo@^57.0.8`, `react-native@0.86.0`)
- **Maestro test suite**: `apps/omiro/tests/`
