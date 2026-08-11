# Omiro agent instructions

Scoped to `apps/omiro`. The root [AGENTS.md](../../AGENTS.md) is the primary
instruction authority; this file adds mobile-specific detail and must not
duplicate or contradict it.

## Expo and EAS

- `apps/omiro` uses Expo managed workflow with Metro package exports enabled.
- Shared ESM packages may use explicit `.js` imports while their source files are TypeScript. Keep the Omiro Metro resolver fallback that retries an explicit `.js` import without the extension so Metro can resolve the source file; do not rewrite shared Node ESM imports just to satisfy Metro.
- With Corepack enabled, do not pin `pnpm` in `apps/omiro/eas.json`. EAS may attempt a conflicting global install and fail with `npm ERR! EEXIST`.
- Verify an EAS fix with the same embed command used by the build: `pnpm --filter @hominem/omiro exec expo export:embed --eager --platform ios --dev false`.

## Navigation and components

- Uses Expo Router file-based routes. Route files live in `apps/omiro/app/`; the `~` alias maps to the Omiro project root.
- Navigation architecture is user-owned. Do not introduce a root tab bar, remove a context from the header, move Tasks into a separate root destination, or otherwise change the Chats/Notes/Tasks information architecture without explicit approval in the current user request and governing spec.
- `app/(auth)/` contains unauthenticated screens. `app/(protected)/` requires auth and is guarded through `resolveAuthRedirect` in its layout. Auth redirect logic lives in `services/navigation/auth-route-guard.ts`.
- Root provider order is `GestureHandlerRootView` → `SafeAreaProvider` → `KeyboardProvider` → `QueryClientProvider` → `AuthProvider` → `PostHogProvider`. Do not add a provider without checking that chain.
- Use `makeStyles` and `theme` from `~/components/theme`; do not introduce hardcoded style values through raw `StyleSheet.create`.

## Commands

```bash
just mobile dev                  # launch on iOS simulator
just mobile lint                 # lint
just mobile prebuild development # Expo prebuild for development
just mobile test                 # Omiro test lane
```

## Evidence

A user-visible interaction requires Maestro evidence on the booted iPhone simulator and visual inspection of every changed acceptance state. A type check or unit test may supplement this evidence but never replace it.

Root-scene gestures also require evidence for the exact interaction, interruption, accessibility, Reduce Motion, and smallest supported viewport behavior. If an enhancement is unsupported or fails, use the normal Expo Router Stack behavior and record the limitation.

## Testing the omiro app (iOS Simulator)

Use **Maestro** for programmatic UI testing of `apps/omiro`. The app is installed on the booted simulator as `com.pontistudios.hakumi.dev`.

**Prerequisites — Java 17 must be on PATH before running Maestro:**

```bash
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
```

**Launch the app:**

```bash
xcrun simctl launch booted com.pontistudios.hakumi.dev
```

**Take a screenshot:**

```bash
xcrun simctl io booted screenshot /tmp/omiro_screen.png
```

**Run a Maestro flow:**

```bash
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH" && export JAVA_HOME="/opt/homebrew/opt/openjdk@17" && maestro test my_flow.yaml
```

**Maestro flow skeleton:**

```yaml
appId: com.pontistudios.hakumi.dev
---
- launchApp
- assertVisible: 'Omiro'
- tapOn:
    id: 'feed-composer-input' # use testID values from source
- inputText: 'some text'
- takeScreenshot: /tmp/omiro_step
```

Tap targets use the React Native `testID` prop. Key IDs already in the codebase:

- `feed-composer` — the composer shell on the home screen
- `feed-composer-input` — the text input inside the home composer
- `chat-composer` / `chat-composer-input` — same for the chat detail screen

The booted simulator is iPhone 17 Pro (UDID `BD390792-D3EC-4351-BE57-EAF642FABD34`).

**Known issue — always tap by `id`, not by fuzzy text:** iOS's accessibility tree merges all children of a screen (e.g. a bottom sheet) into a single node whenever no text field currently has focus. When that happens, `tapOn: text: '...'` (or the Maestro MCP `tap_on` tool's `text` param) resolves to the center point of that merged node's bounds — which is often the modal backdrop, not the element you meant — and silently dismisses the sheet instead of tapping the target. Tapping by `id` (i.e. the element's `testID`) works reliably regardless of focus state and does not suffer from this merging. Prefer `id` selectors over `text` selectors for anything inside a modal/sheet.
