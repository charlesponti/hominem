# Hakumi Mobile — Code Quality Analysis

**Date:** 2026-03-26
**Scope:** `apps/mobile/` — React Native (Expo Router) iOS/Android app
**Branch:** `fix/mobile-build`

---

## Table of Contents

1. [Recommended Priority](#recommended-priority)
2. [Critical Issues](#critical-issues)
   - [#1 Hooks Called Inside Class Components](#1-hooks-called-inside-class-components-runtime-crash)
   - [#2 Deep Link Path Traversal](#2-deep-link-path-traversal)
3. [Should Fix](#should-fix)
   - [#3 Unnecessary eslint-disable](#3-unnecessary-eslint-disable-react-hooksrules-of-hooks)
   - [#4 Unused _queryClient Variable](#4-unused-_queryclient-variable)
   - [#5 Double onAudioTranscribed Callback](#5-double-invocation-of-onaudiotranscribed-callback)
   - [#6 FlashList Missing estimatedItemSize](#6-flashlist-missing-estimateditemsize)
   - [#7 AuthProvider Context Value Recreated Every Render](#7-authprovider-context-value-recreated-every-render)
   - [#8 NoteListItem Not Wrapped in React.memo](#8-notelistitem-not-wrapped-in-reactmemo)
4. [Consider Improving](#consider-improving)
   - [#9 PulsingCircle Has No Animation](#9-pulsingcircle-renders-static-view--no-actual-animation)
   - [#10 Inline ItemSeparatorComponent](#10-inline-anonymous-itemseparatorcomponent-defeats-flashlist-recycling)
   - [#11 Avatar Uploads at quality: 1](#11-avatar-uploads-at-quality-1)
   - [#12 utils/storage.ts Dead Code](#12-utilsstoragets-is-in-memory-only--likely-dead-code)
   - [#13 Keyboard Listener Uses keyboardDidShow](#13-keyboard-listener-uses-keyboarddidshow-instead-of-keyboardwillshow)
   - [#14 Serial File Uploads](#14-serial-file-uploads-could-be-parallelized)
   - [#15 signOut Closure Captures Stale State](#15-signout-closure-captures-stale-stateuseremail)
   - [#16 onSearchClose Triggers Full Refetch](#16-onsearchclose-triggers-full-server-refetch-instead-of-using-cache)
5. [Test Coverage Assessment](#test-coverage-assessment)

---

## Recommended Priority

| Urgency | Action |
|---------|--------|
| **Now** | Fix hooks-in-class-component bug (#1) — it is a crash waiting to happen |
| **Soon** | Deep link validation (#2), FlashList `estimatedItemSize` (#6), AuthProvider memoization (#7) |
| **Next sprint** | Increase test coverage for note/chat CRUD hooks, keyboard listener fix, dead code cleanup |

---

## Critical Issues

### #1 Hooks Called Inside Class Components (Runtime Crash)

**Files:**
- `components/error-boundary/feature-error-boundary.tsx:48`
- `components/error-boundary/root-error-boundary.tsx:47`

**Severity:** Critical — guaranteed runtime crash when an error boundary activates

#### What Happens

Both `FeatureErrorBoundary` and `RootErrorBoundary` are **class components** (they extend `React.Component`). This is required — React error boundaries *must* be class components because the `getDerivedStateFromError` and `componentDidCatch` lifecycle methods are only available on class components. There is no hooks-based error boundary API.

Inside each class's `render()` method, when `this.state.hasError` is `true`, the code calls `useStyles()`:

```tsx
// feature-error-boundary.tsx — line 48
render() {
  if (this.state.hasError) {
    if (this.props.fallback) {
      return this.props.fallback;
    }
    const styles = useStyles(); // <-- ILLEGAL HOOK CALL
    return (
      <View style={styles.container}>
        ...
      </View>
    );
  }
  return this.props.children;
}
```

`useStyles` is created by `makeStyles()` from the theme system and is a React hook (it calls `useContext` or similar internally). React's Rules of Hooks state:

> **Hooks can only be called inside function components or other hooks.** They cannot be called inside class components, event handlers, `useMemo`, `useReducer`, or `useEffect` cleanup functions.

Calling a hook inside a class component's `render()` method causes React to throw:

```
Invalid hook call. Hooks can only be called inside of the body of a function component.
```

#### Why This is Critical

This code path only executes when an error has *already occurred* — meaning the user is already in a degraded state. The error boundary is supposed to catch the error and show a recovery UI. Instead, the hook violation causes a *second* unhandled exception, which:

1. Crashes the `FeatureErrorBoundary` — the error propagates up to `RootErrorBoundary`
2. Crashes the `RootErrorBoundary` — the error propagates to React's root, which shows a blank screen or the native crash handler
3. The original error is swallowed — you lose all diagnostic information about what actually went wrong

This creates a **double-fault scenario**: the safety net itself is broken, and it's only detectable when something else breaks first.

#### Why It Hasn't Crashed Yet

The `useStyles()` call is behind the `if (this.state.hasError)` guard. In normal operation, `hasError` is `false`, so `render()` returns `this.props.children` and never reaches the hook call. This means the bug is dormant until a child component throws during rendering — which may never have happened in development or testing, but *will* happen in production eventually.

#### Fix

Extract the fallback UI into a standalone function component:

```tsx
// FeatureErrorFallback.tsx
const FeatureErrorFallback = ({ featureName, onReset }: {
  featureName?: string;
  onReset: () => void;
}) => {
  const styles = useStyles(); // Now legal — this is a function component
  return (
    <View style={styles.container}>
      <Text variant="body" color="text-tertiary">
        {createFeatureFallbackLabel(featureName)}
      </Text>
      <Button variant="outline" size="sm" style={styles.button}
        onPress={onReset} title="Retry" />
    </View>
  );
};
```

Then in the class component's `render()`:

```tsx
render() {
  if (this.state.hasError) {
    return this.props.fallback ?? (
      <FeatureErrorFallback
        featureName={this.props.featureName}
        onReset={this.handleReset}
      />
    );
  }
  return this.props.children;
}
```

Apply the same pattern to `RootErrorBoundary`.

**Estimated effort:** 30 minutes for both files, including tests for the extracted components.

---

### #2 Deep Link Path Traversal

**File:** `app/+native-intent.ts:36-48`

**Severity:** Critical — security vulnerability

#### What Happens

The `redirectSystemPath` function rewrites incoming deep link URLs before Expo Router processes them. Several branches use string interpolation to construct route paths from user-controlled input:

```tsx
// Line 36-37
if (normalized.startsWith('chat')) {
  return `/(protected)/(tabs)/${normalized}`;
}

// Line 41-42
if (normalized.startsWith('focus')) {
  return `/(protected)/(tabs)/${normalized}`;
}

// Line 31-32
if (normalized.startsWith('verify')) {
  return `/(auth)/${normalized}`;
}
```

The `normalized` variable is derived directly from the incoming deep link URL's path. It is only stripped of a leading `/` — no further sanitization is applied.

#### Attack Scenarios

**Path traversal via `..` segments:**

A crafted deep link like `hakumi://chat/../../../some-path` would:
1. Pass the `normalized.startsWith('chat')` check (it starts with "chat")
2. Produce the route string `/(protected)/(tabs)/chat/../../../some-path`
3. When Expo Router resolves the `..` segments, this could navigate to `/(some-path)` or any route outside the `(protected)` group

Depending on the app's route structure, this could:
- Bypass the auth guard by navigating directly to a route outside the `(protected)` layout group
- Navigate to internal debug/admin screens not intended for deep link access
- Cause unexpected crashes if the resolved route doesn't exist

**Query parameter injection:**

A link like `hakumi://chat?chatId=x&admin=true` passes through unchanged — the `chat` branch doesn't validate or strip unexpected query parameters. While Expo Router's `useLocalSearchParams` would need to explicitly read these, any screen that reads params generically could be affected.

**Excessively long paths:**

There's no length limit on the incoming path. A link with thousands of characters could cause memory pressure during route resolution.

#### Why It Hasn't Been Exploited

Deep link exploitation requires either:
- A malicious app installed on the same device that sends intents
- A crafted web page that triggers the `hakumi://` scheme via a link click
- An NFC tag, QR code, or AirDrop payload with the crafted URL

The attack surface is real but requires physical or social-engineering access to the device.

#### Fix

Apply a whitelist of allowed route segments and strip path traversal:

```tsx
const ALLOWED_ROUTES = new Set(['chat', 'focus', 'account', 'verify']);

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  const normalized = path.startsWith('/') ? path.slice(1) : path;

  // Block path traversal
  if (normalized.includes('..') || normalized.includes('//')) {
    return '/';
  }

  // Extract the root segment (everything before the first / or ?)
  const rootSegment = normalized.split(/[/?]/)[0];
  if (!ALLOWED_ROUTES.has(rootSegment)) {
    return path; // Unknown route — pass through unmodified
  }

  // ... rest of routing logic with validated rootSegment
}
```

**Estimated effort:** 1 hour including test cases for traversal payloads.

---

## Should Fix

### #3 Unnecessary eslint-disable react-hooks/rules-of-hooks

**File:** `components/chat/chat.tsx:37`

**Severity:** Low — code smell, masks real violations

#### What Happens

```tsx
export const Chat = ({ chatId, onChatArchive, source }: ChatProps) => {
  const { speakingId, speak } = useSpeech();
  const queryClient = useQueryClient();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const styles = useStyles();
  // ...
```

The `eslint-disable` comment suppresses the `react-hooks/rules-of-hooks` lint rule for the `useStyles()` call. But `Chat` is a **function component** — calling a hook here is perfectly legal. The lint rule should not be firing at all.

#### Why the Disable Was Added

This typically happens when:
1. The variable name `useStyles` or the file structure causes a false positive in the ESLint plugin (e.g., if the linter can't determine that the enclosing function is a component)
2. A developer saw a lint error and suppressed it without investigating

#### Why It Matters

Every `eslint-disable` comment is a small crack in the linting safety net. If someone later refactors this code and introduces a *real* rules-of-hooks violation on the same line, the suppression will hide it. The rule exists to prevent the class of bugs documented in issue #1.

#### Fix

Remove the `eslint-disable` comment. If the rule still fires, investigate why — it may indicate a misconfigured ESLint plugin version or a naming convention issue.

**Estimated effort:** 5 minutes.

---

### #4 Unused _queryClient Variable

**File:** `utils/services/chat/use-chat-messages.ts:65`

**Severity:** Low — dead code, minor bundle impact

#### What Happens

```tsx
export const useChatMessages = ({ chatId }: { chatId: string }) => {
  const client = useApiClient();
  const _queryClient = useQueryClient(); // <-- never used
  // ...
```

The `_queryClient` variable is initialized by calling `useQueryClient()` but is never referenced anywhere in the function. The underscore prefix is a convention indicating "intentionally unused," but calling the hook still has effects:

1. It registers a dependency on the nearest `QueryClientProvider`, creating an unnecessary subscription
2. It may trigger re-renders when the query client reference changes (unlikely but possible)
3. It imports and bundles `useQueryClient` for no reason

#### Context

This is likely a leftover from a refactor where `useChatMessages` previously used the query client directly (e.g., for cache manipulation) but was later simplified to a pure `useQuery` call. The sibling function `useSendMessage` in the same file *does* use `useQueryClient()` for optimistic updates.

#### Fix

Remove the line. If the `useQueryClient` import becomes unused, remove it from the import statement.

**Estimated effort:** 2 minutes.

---

### #5 Double Invocation of onAudioTranscribed Callback

**File:** `components/media/use-mobile-audio-recorder.ts:51,76`

**Severity:** Medium — duplicate side effects

#### What Happens

The `onAudioTranscribed` callback is invoked in two separate locations:

**Location 1 — `useAudioTranscribe` onSuccess handler (line 50-51):**
```tsx
const { mutateAsync: transcribeAudio } = useAudioTranscribe({
  onSuccess: (data) => {
    onAudioTranscribed?.(data);   // <-- First invocation
  },
  // ...
});
```

**Location 2 — `runTranscription` after awaiting transcribeAudio (line 76):**
```tsx
const runTranscription = useCallback(async (audioUri: string) => {
  // ...
  const transcription = await transcribeAudio(audioUri);
  // ...
  onAudioTranscribed?.(transcription);   // <-- Second invocation
  // ...
}, [...]);
```

When `runTranscription` is called, it calls `transcribeAudio(audioUri)` which is `mutateAsync`. When the mutation succeeds:
1. React Query fires the `onSuccess` callback → `onAudioTranscribed?.(data)` (first call)
2. `mutateAsync` resolves → `runTranscription` continues → `onAudioTranscribed?.(transcription)` (second call)

Both calls receive the same transcription string.

#### Impact

Any consumer of `useMobileAudioRecorder` that passes `onAudioTranscribed` will see the callback fire twice per transcription. If the callback appends text to an input field (which is the likely use case for voice-to-text), the transcription will be duplicated. If it triggers a network request, the request fires twice.

#### Why It Hasn't Been Noticed

If the consumer's `onAudioTranscribed` implementation is idempotent (e.g., `setText(transcription)` where it *sets* rather than *appends*), the double call has no visible effect. But this is a fragile assumption.

#### Fix

Remove the `onSuccess` handler from `useAudioTranscribe` and rely solely on the `await` in `runTranscription`:

```tsx
const { mutateAsync: transcribeAudio } = useAudioTranscribe({
  onError: () => {
    onError?.();
  },
});
```

Or remove the manual call in `runTranscription` and rely on the mutation's `onSuccess`. Pick one path — not both.

**Estimated effort:** 10 minutes.

---

### #6 FlashList Missing estimatedItemSize

**Files:**
- `components/focus/note-list.tsx:43`
- `components/workspace/inbox-stream.tsx:53`
- `components/chat/session-card.tsx:114`

**Severity:** Medium — performance degradation and console warnings

#### What Happens

`FlashList` from `@shopify/flash-list` requires an `estimatedItemSize` prop to efficiently calculate the scroll viewport and determine how many items to render. When omitted:

1. FlashList logs a **console warning** on every mount:
   ```
   FlashList: estimatedItemSize is not set. Please provide a value for estimatedItemSize
   to improve performance.
   ```

2. FlashList falls back to a default estimate of **200px**, which is unlikely to match the actual item height for any of these lists.

3. If the actual item height differs significantly from 200px, FlashList will:
   - Over-render (items much smaller than 200px) — wasting memory and CPU
   - Under-render (items much larger than 200px) — showing blank space during fast scrolling

#### Each Instance

**NoteList (`note-list.tsx:43`):**
```tsx
<FlashList
  data={data}
  keyExtractor={keyExtractor}
  renderItem={renderItem}
  // Missing: estimatedItemSize={??}
/>
```
Each `NoteListItem` includes a title, preview, optional due date, and icon — approximately **72-80px** on most devices.

**InboxStream (`inbox-stream.tsx:53`):**
```tsx
<FlashList
  data={items}
  ItemSeparatorComponent={InboxStreamDivider}
  keyExtractor={keyExtractor}
  renderItem={renderItem}
  // Missing: estimatedItemSize={??}
/>
```
Each `InboxStreamItem` height depends on its `kind` (note vs. chat session) — approximately **64-72px**.

**SessionList (`session-card.tsx:114`):**
```tsx
<FlashList
  data={sessions}
  keyExtractor={keyExtractor}
  renderItem={renderItem}
  scrollEnabled={false}
  ItemSeparatorComponent={() => <View style={styles.separator} />}
  // Missing: estimatedItemSize={??}
/>
```
Each `SessionCard` has a fixed layout with icon, title, subtitle, and chevron — approximately **60-64px**.

#### Fix

Add `estimatedItemSize` to each `FlashList` based on the approximate rendered height of a single item:

```tsx
// NoteList
<FlashList estimatedItemSize={76} ... />

// InboxStream
<FlashList estimatedItemSize={68} ... />

// SessionList
<FlashList estimatedItemSize={62} ... />
```

These values should be measured empirically using the FlashList developer overlay or React DevTools, but reasonable estimates are sufficient to eliminate the warning and improve initial render performance.

**Estimated effort:** 15 minutes (measure + set for all three instances).

---

### #7 AuthProvider Context Value Recreated Every Render

**File:** `utils/auth-provider.tsx:531-553`

**Severity:** Medium-High — causes unnecessary re-renders across the entire app

#### What Happens

The `AuthProvider` constructs its context value as a plain object literal inside the component body:

```tsx
const value: AuthContextType = {
  authStatus,
  authError,
  isLoadingAuth,
  isSignedIn,
  currentUser,
  requestEmailOtp,
  verifyEmailOtp,
  completePasskeySignIn,
  signOut,
  updateProfile,
  getAuthHeaders,
  clearError,
  retrySessionRecovery: async () => {        // <-- inline closure
    dispatch({ type: 'CLEAR_ERROR' });
    captureAuthAnalyticsEvent('auth_session_recovery_requested', {
      phase: 'session_recovery',
      email: state.user?.email ?? undefined,  // <-- captures state
    });
    await bootSession({ force: true });
  },
  resetAuthForE2E,
};

return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
```

Every time `AuthProvider` re-renders (which happens on *any* state change via `useReducer`), a new object reference is created for `value`. React's `Context.Provider` uses **referential equality** (`===`) to determine if consumers need to re-render. Since `value` is a new object every time, **every `useAuth()` consumer re-renders on every state change**, even if only unrelated fields changed.

#### Specific Problems

1. **No `useMemo` on the context value:** The `value` object should be memoized so it only changes when its constituent values change.

2. **Inline `retrySessionRecovery` closure:** This anonymous `async` function is recreated every render. It also captures `state.user?.email` from the closure scope, which means it reads a potentially stale value (see issue #15 for the parallel problem in `signOut`).

3. **`signOut` depends on `state.user?.email`:** The `signOut` callback (line 424-471) has `[state.user?.email]` in its dependency array. Every time the user object changes (e.g., profile update), `signOut` gets a new reference, which would invalidate the memoized context value even if nothing auth-related changed.

#### Impact

The `AuthProvider` wraps the entire app. Every consumer of `useAuth()` — which includes auth guards, headers, profile displays, and any component that checks `isSignedIn` — re-renders whenever *any* auth state field changes. In a typical session:

- `bootSession` triggers multiple dispatches (`SESSION_LOADED`, intermediate states)
- Each dispatch creates a new `state`, triggering `AuthProvider` to re-render
- Each re-render creates a new `value` object
- All `useAuth()` consumers re-render

For a tree with 20+ `useAuth()` consumers, this means 20+ unnecessary re-renders per auth state transition.

#### Fix

Wrap the context value in `useMemo`:

```tsx
const retrySessionRecovery = useCallback(async () => {
  dispatch({ type: 'CLEAR_ERROR' });
  captureAuthAnalyticsEvent('auth_session_recovery_requested', {
    phase: 'session_recovery',
    email: state.user?.email ?? undefined,
  });
  await bootSession({ force: true });
}, [bootSession, state.user?.email]);

const value = useMemo<AuthContextType>(() => ({
  authStatus,
  authError,
  isLoadingAuth,
  isSignedIn,
  currentUser,
  requestEmailOtp,
  verifyEmailOtp,
  completePasskeySignIn,
  signOut,
  updateProfile,
  getAuthHeaders,
  clearError,
  retrySessionRecovery,
  resetAuthForE2E,
}), [
  authStatus,
  authError,
  isLoadingAuth,
  isSignedIn,
  currentUser,
  requestEmailOtp,
  verifyEmailOtp,
  completePasskeySignIn,
  signOut,
  updateProfile,
  getAuthHeaders,
  clearError,
  retrySessionRecovery,
  resetAuthForE2E,
]);
```

For maximum impact, also consider splitting the context into a "state" context (values that change) and an "actions" context (stable callback references), so components that only need `signOut` don't re-render when `isLoadingAuth` changes.

**Estimated effort:** 45 minutes including testing for render count regression.

---

### #8 NoteListItem Not Wrapped in React.memo

**File:** `components/focus/note-list-item.tsx:153`

**Severity:** Low-Medium — unnecessary re-renders during scrolling

#### What Happens

`NoteListItem` is exported as a plain function component:

```tsx
export const NoteListItem = ({
  item,
  label,
  itemIndex,
}: { item: Note; label: string; itemIndex?: number }) => {
  // ... ~180 lines of hooks, gesture handlers, animated styles
};
```

The parent `NoteList` wraps the render callback in a `memo`'d `RenderNote` component, which is good. However, `RenderNote` passes `item` (a full `Note` object) and `index` (a number) as props to `NoteListItem`. If the `Note` object reference changes (e.g., after a cache update from React Query), `RenderNote`'s memo check passes the new reference through, and `NoteListItem` re-renders.

Inside `NoteListItem`, each render:
- Creates multiple `useSharedValue` instances
- Sets up a `Gesture.Pan()` handler with `onChange` and `onEnd` callbacks
- Computes multiple `useAnimatedStyle` hooks
- Creates `useCallback` closures for delete and complete actions
- Renders a complex tree with `ContextMenu`, `GestureDetector`, and `Reanimated.View`

This is expensive compared to a simple text component.

#### Fix

Wrap the export in `React.memo` with a custom comparator that checks only the fields that affect rendering:

```tsx
export const NoteListItem = memo(({ item, label, itemIndex }: Props) => {
  // ... existing implementation
}, (prev, next) =>
  prev.item.id === next.item.id &&
  prev.label === next.label &&
  prev.itemIndex === next.itemIndex &&
  prev.item.status === next.item.status &&
  prev.item.scheduledFor === next.item.scheduledFor
);
```

**Estimated effort:** 15 minutes.

---

## Consider Improving

### #9 PulsingCircle Renders Static View — No Actual Animation

**File:** `components/animated/pulsing-circle.tsx`

**Severity:** Low — misleading component name

#### What Happens

```tsx
export const PulsingCircle = () => {
  const styles = useStyles();
  return <View style={styles.circle} />;
};
```

The component is named `PulsingCircle` and lives in `components/animated/`, but it renders a static `View` with no animation whatsoever. There is no `Animated.Value`, no `useSharedValue`, no `withRepeat`/`withTiming`, and no opacity or scale interpolation. It's a plain gray circle with a border.

#### Impact

- Misleading to developers who expect loading feedback
- Users see a static circle during the loading state of the Focus screen (`focus/index.tsx:99`), which provides no visual indication that something is happening
- The component's placement in `components/animated/` suggests it was intended to animate but was never finished

#### Fix

Either implement the pulsing animation:

```tsx
import Reanimated, { withRepeat, withTiming, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

export const PulsingCircle = () => {
  const styles = useStyles();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.3, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Reanimated.View style={[styles.circle, animatedStyle]} />;
};
```

Or rename it to `PlaceholderCircle` and move it out of `components/animated/`.

**Estimated effort:** 20 minutes.

---

### #10 Inline Anonymous ItemSeparatorComponent Defeats FlashList Recycling

**File:** `components/chat/session-card.tsx:119`

**Severity:** Low — performance anti-pattern

#### What Happens

```tsx
<FlashList
  data={sessions}
  keyExtractor={keyExtractor}
  renderItem={renderItem}
  scrollEnabled={false}
  ItemSeparatorComponent={() => <View style={styles.separator} />}
/>
```

The `ItemSeparatorComponent` is an inline arrow function. On every render of `SessionList`, a new function reference is created. FlashList uses the component reference for its recycling pool — when the reference changes, FlashList discards recycled separator instances and creates new ones.

Note: `InboxStream` in `inbox-stream.tsx` does this correctly with a memoized `InboxStreamDivider` component.

#### Fix

Extract the separator into a stable reference:

```tsx
const SessionSeparator = memo(() => {
  const styles = useStyles();
  return <View style={styles.separator} />;
});
SessionSeparator.displayName = 'SessionSeparator';

// In JSX:
<FlashList ItemSeparatorComponent={SessionSeparator} ... />
```

**Estimated effort:** 5 minutes.

---

### #11 Avatar Uploads at quality: 1

**File:** `components/avatar.tsx:30`

**Severity:** Low — inconsistency and bandwidth waste

#### What Happens

```tsx
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsMultipleSelection: false,
  allowsEditing: true,
  quality: 1,      // <-- Full quality, no compression
  exif: false,
});
```

The `quality: 1` setting means images are saved at 100% quality (no JPEG compression). For avatar images, which are typically displayed at small sizes (32-150px circles), full quality is wasteful:

- A 4032x3024 iPhone photo at quality 1 is ~8-12 MB
- The same photo at quality 0.8 is ~2-4 MB
- After the user crops it to a square (via `allowsEditing: true`), it's still much larger than needed

The rest of the app uses `quality: 0.8` for image uploads.

#### Fix

Change to `quality: 0.8` for consistency, or even lower (0.6-0.7) since avatars are displayed small:

```tsx
quality: 0.8,
```

**Estimated effort:** 2 minutes.

---

### #12 utils/storage.ts Is In-Memory Only — Likely Dead Code

**File:** `utils/storage.ts`

**Severity:** Low — dead code confusion

#### What Happens

```tsx
// utils/storage.ts
const memoryStorage = new Map<string, string>();

export const storage = {
  getString: (key: string) => memoryStorage.get(key),
  set: (key: string, value: string) => { memoryStorage.set(key, value); },
  delete: (key: string) => { memoryStorage.delete(key); },
};
```

This exports a `storage` object backed by an in-memory `Map`. All data is lost when the app process terminates. Meanwhile, the app has a proper persistent storage module:

```tsx
// lib/storage.ts
import { createMMKV } from 'react-native-mmkv';
export const storage = createMMKV({ id: 'app-storage' });
```

MMKV is a high-performance key-value store that persists to disk, used by React Native apps for synchronous storage needs (replacing AsyncStorage).

#### Why It Exists

The `utils/storage.ts` file was likely created as:
- A test mock that leaked into the source tree
- A placeholder during early development before MMKV was integrated
- A polyfill for environments where MMKV isn't available (e.g., server-side rendering during Expo web builds)

#### Fix

1. Search for imports of `utils/storage` — if nothing imports it, delete the file
2. If something imports it, determine whether it should be using `lib/storage` instead
3. If it's needed as a test mock, move it to `__mocks__/` or the test setup

**Estimated effort:** 15 minutes (search + verify + delete).

---

### #13 Keyboard Listener Uses keyboardDidShow Instead of keyboardWillShow

**File:** `utils/use-keyboard-listener.ts`

**Severity:** Low-Medium — iOS UX jank

#### What Happens

```tsx
useEffect(() => {
  const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
    setKeyboardVisible(true);
  });
  const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
    setKeyboardVisible(false);
  });
  // ...
}, []);
```

The hook listens to `keyboardDidShow` and `keyboardDidHide`, which fire **after** the keyboard animation completes. On iOS, keyboard animations take 250-300ms. During this window, `isKeyboardVisible` is stale:

- When the keyboard is opening, `isKeyboardVisible` remains `false` for 250ms
- When the keyboard is closing, `isKeyboardVisible` remains `true` for 250ms

Any UI that depends on `isKeyboardVisible` (layout adjustments, scroll offsets, bottom bar visibility) will visibly lag behind the keyboard animation.

#### iOS vs. Android

- **iOS** provides `keyboardWillShow` / `keyboardWillHide` events that fire *before* the animation starts, giving you time to synchronize your UI with the keyboard
- **Android** does not support `keyboardWill*` events — `keyboardDid*` is the only option

The current implementation works correctly on Android but produces a suboptimal experience on iOS.

#### Fix

Use platform-specific events:

```tsx
import { Platform, Keyboard } from 'react-native';

const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

useEffect(() => {
  const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
  const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
  return () => { showSub.remove(); hideSub.remove(); };
}, []);
```

**Estimated effort:** 10 minutes.

---

### #14 Serial File Uploads Could Be Parallelized

**File:** `utils/services/files/use-file-upload.ts:131-187`

**Severity:** Low — performance opportunity

#### What Happens

```tsx
export async function performMobileUploads(
  api: PrepareUploadClient,
  assets: MobileUploadAsset[],
  options?: { fetchImpl?: typeof fetch; onProgress?: (progress: number) => void },
): Promise<MobileUploadBatchResult> {
  // ...
  for (const [index, asset] of assets.entries()) {
    // ... validation, blob read, prepare, PUT, complete — all sequential
  }
}
```

When a user attaches multiple files, each file goes through a 4-step pipeline sequentially:
1. Read local blob (`readLocalAssetBlob`)
2. Prepare upload (`api.prepareUpload` — gets a presigned URL)
3. PUT to presigned URL
4. Complete upload (`api.completeUpload`)

For 3 files, this means 12 sequential network requests. If each takes 200ms, that's 2.4 seconds of waiting. With parallelization (e.g., `Promise.allSettled` with a concurrency limit of 3), total time would be ~800ms.

#### Why Serial Might Be Intentional

- **Progress reporting:** The `onProgress` callback currently reports sequential progress. Parallel uploads would need a different progress model (e.g., tracking per-file completion).
- **Error isolation:** Serial uploads make it easy to continue after one failure. Parallel uploads need `Promise.allSettled` rather than `Promise.all`.
- **Server rate limits:** The API might throttle concurrent upload requests.

#### Fix

Use `Promise.allSettled` with bounded concurrency:

```tsx
const CONCURRENCY = 3;

// Process in chunks
for (let i = 0; i < assets.length; i += CONCURRENCY) {
  const chunk = assets.slice(i, i + CONCURRENCY);
  const results = await Promise.allSettled(
    chunk.map((asset) => uploadSingle(api, asset, fetchImpl))
  );
  // ... collect results, report progress
}
```

**Estimated effort:** 1 hour including progress reporting rework.

---

### #15 signOut Closure Captures Stale state.user?.email

**File:** `utils/auth-provider.tsx:424-471`

**Severity:** Low — analytics inaccuracy, contributes to context instability

#### What Happens

```tsx
const signOut = useCallback(async () => {
  // ...
  captureAuthAnalyticsEvent('auth_sign_out_started', {
    phase: 'sign_out',
    email: state.user?.email ?? undefined,  // <-- captured from closure
  });
  // ...
  captureAuthAnalyticsEvent('auth_sign_out_succeeded', {
    phase: 'sign_out',
    email: state.user?.email ?? undefined,  // <-- same stale reference
  });
  // ...
}, [state.user?.email]);  // <-- dependency on state.user?.email
```

The `signOut` callback closes over `state.user?.email` and has it in its dependency array. This creates two problems:

1. **Stale closure:** Between the time `signOut` is created and called, the user's email could have changed (e.g., profile update). The analytics events would log the email from when `signOut` was last memoized, not the current value.

2. **Context instability (ties to #7):** Since `signOut` depends on `state.user?.email`, it gets a new reference whenever the email changes. This new `signOut` reference would invalidate any `useMemo` on the context value (issue #7), causing all `useAuth()` consumers to re-render even though the sign-out function's *behavior* hasn't meaningfully changed.

#### Fix

Read the email from a ref instead of the closure:

```tsx
const userEmailRef = useRef(state.user?.email);
userEmailRef.current = state.user?.email;

const signOut = useCallback(async () => {
  captureAuthAnalyticsEvent('auth_sign_out_started', {
    phase: 'sign_out',
    email: userEmailRef.current ?? undefined,
  });
  // ...
}, []);  // <-- no dependency on state.user
```

The `retrySessionRecovery` inline closure at line 544-550 has the same issue.

**Estimated effort:** 15 minutes.

---

### #16 onSearchClose Triggers Full Server Refetch Instead of Using Cache

**File:** `app/(protected)/(tabs)/focus/index.tsx:84-87`

**Severity:** Low — unnecessary network request

#### What Happens

```tsx
const onSearchClose = useCallback(() => {
  onRefresh();            // <-- calls refetch() which hits the server
  setActiveSearch(null);  // <-- clears the search state
}, [onRefresh]);
```

When the user closes a search overlay, `onSearchClose` calls `onRefresh()`, which calls `refetch()` on the `useNoteStream` query. This makes a full server request to reload the note stream.

But the note stream data is *already in the React Query cache* — it was loaded before the search was opened, and search doesn't modify it. The search results are displayed via a separate `ActiveSearchSummary` component. Clearing `activeSearch` to `null` is sufficient to show the cached data again.

#### Fix

```tsx
const onSearchClose = useCallback(() => {
  setActiveSearch(null);
  // Data is already in the React Query cache — no refetch needed
}, []);
```

If freshness is desired, use `queryClient.invalidateQueries` with a shorter `staleTime` rather than an explicit refetch, which lets React Query decide whether a background refresh is needed.

**Estimated effort:** 5 minutes.

---

## Test Coverage Assessment

**Overall estimated coverage: ~25-35%**

| Category | Tested / Total | Coverage | Assessment |
|----------|---------------|----------|------------|
| Auth system | ~80% | Strong | Well-tested state machine, OTP flows, session boot |
| Integration contracts | 8/8 | 100% | API client contracts fully covered |
| Components | 3-5 / 25+ | ~15% | Only error boundaries and a few UI atoms tested |
| Hooks/Utils | 8 / 40+ | ~20% | Auth hooks covered; CRUD hooks, voice, file upload untested |
| Screens | 4 / 15+ | ~25% | Focus, auth screens covered; chat, account, onboarding untested |
| E2E scenarios | 3 test files | Minimal | Auth flow, smoke test, deep links only |

### Untested Critical Paths

These are the highest-risk untested areas, ranked by likelihood of user-facing breakage:

1. **Note CRUD hooks** (`use-delete-note`, `use-note-complete`, `use-note-stream`) — These drive the primary user workflow. A regression here breaks the core experience.

2. **Chat rendering and message flow** (`Chat` component, `useChatMessages`, `useSendMessage`) — The optimistic update logic in `useSendMessage` is particularly complex and fragile.

3. **Voice input pipeline** (`useMobileAudioRecorder`, `useAudioTranscribe`) — Multiple async state transitions, permission handling, and the double-callback bug (#5) indicate this area needs test coverage.

4. **File upload** (`useFileUpload`, `performMobileUploads`) — Complex multi-step async flow with error handling at each stage.

5. **Onboarding flow** — If broken, new users cannot complete setup. Zero test coverage.

6. **Tab navigation and deep linking** — The deep link handler (#2) has a security issue that tests would have caught.

7. **Media/camera integration** — Device-dependent functionality that's easy to break during Expo SDK upgrades.

8. **Notification handling** — Untested; regressions here are invisible until a user misses a notification.

### Recommended Testing Strategy for Next Sprint

**Unit tests (highest ROI):**
- `useSendMessage` — test optimistic updates, rollback on error, offline handling
- `useMobileAudioRecorder` — test state machine transitions, verify single callback invocation
- `performMobileUploads` — test serial upload logic, error accumulation, progress reporting
- `redirectSystemPath` — test all route patterns and path traversal defense

**Component tests:**
- `NoteListItem` — test swipe gestures, context menu actions
- `Chat` — test message list rendering, send flow
- `SessionCard` — test navigation on press

**E2E tests:**
- Note creation and deletion flow
- Chat session lifecycle (create → send message → archive)
- File attachment in chat
