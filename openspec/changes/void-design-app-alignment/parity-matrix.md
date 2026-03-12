# Cross-Platform Design Parity Matrix

Verified as of Phase 6 audit. Each row documents alignment status and any platform-specific exceptions.

## Legend
- ✓ Aligned — identical across all verified platforms
- ~ Partial — mostly aligned, minor differences documented
- ✗ Diverges — needs follow-up
- N/A — not applicable on this platform

---

## Color Tokens

| Token Source | Notes (web) | Rocco (web) | Mobile |
|---|---|---|---|
| Background colors | ✓ `@hominem/ui/tokens` | ✓ `@hominem/ui/tokens` | ✓ `@hominem/ui/tokens` via Restyle |
| Text colors | ✓ CSS vars | ✓ CSS vars | ✓ `theme.colors['text-primary/secondary/tertiary']` |
| Border colors | ✓ CSS vars | ✓ CSS vars | ✓ `theme.colors['border-default']` |
| Accent/primary | ✓ | ✓ | ✓ |

## Typography

| Element | Notes (web) | Rocco (web) | Mobile |
|---|---|---|---|
| Page headings | ✓ `heading-2` / `heading-3` tokens | ✓ `heading-2` / `heading-3` tokens | ✓ Restyle `header`/`large` variants |
| Body text | ✓ `body-1` / `body-2` | ✓ `body-2` / `body-3` | ✓ Restyle `body` variant (17px) |
| Labels | ✓ `body-3` / `body-4` | ✓ shared `Label` component | ✓ Restyle `label` variant (14px) |
| Code/mono | ✓ `mono` utility | ✓ `mono` utility | ✓ Restyle `mono` variant |
| Markdown headings | ✓ `heading-3` / `heading-4` | N/A | N/A |

**Exception:** Web uses fluid clamp-based sizes; mobile uses fixed pt sizes from Restyle. Both are derived from the same token scale — visual result is equivalent at typical viewport/screen sizes.

## Spacing

| Surface | Notes (web) | Rocco (web) | Mobile |
|---|---|---|---|
| Page padding | ✓ Tailwind `px-4` / `py-4` = 16px | ✓ Tailwind `px-4` | ✓ `m_16` token = 16px |
| Component gaps | ✓ Tailwind `gap-4` = 16px | ✓ Tailwind `gap-4` | ✓ `sm_8` / `m_16` tokens |
| Inline spacing | ✓ No hardcoded values (audit clean) | ✓ No hardcoded values | ✓ Token-based |

## Motion / Animation

| Element | Notes (web) | Rocco (web) | Mobile |
|---|---|---|---|
| Enter transitions | ✓ `.void-anim-enter` | ✓ `.void-anim-enter` | ✓ `FadeIn.duration(VOID_MOTION_DURATION_STANDARD)` |
| Exit transitions | ✓ `.void-anim-exit` | ✓ `.void-anim-exit` | ✓ `FadeOut.duration(VOID_MOTION_DURATION_STANDARD)` |
| Shimmer/loading | ✓ CSS `animate-pulse` (~1200ms) | N/A | ✓ `VOID_MOTION_DURATION_STANDARD * 5` = equivalent |
| AI thinking dots | ✓ `void-anim-breezy-stagger` (0/120/240ms) | N/A | ✓ `withDelay(0/120/240)` — matches |
| Swipe dismiss | N/A | N/A | ✓ `VOID_MOTION_DURATION_STANDARD` |
| `prefers-reduced-motion` | ✓ CSS media query in `animations.css` | ✓ | ~ Mobile: Reanimated respects system setting via `useReducedMotion` (not yet wired) |

## Focus / Accessibility

| Element | Notes (web) | Rocco (web) | Mobile |
|---|---|---|---|
| Focus rings | ✓ `focus-visible:ring-2` | ✓ | N/A (native focus handling) |
| ARIA labels | ✓ Audited Phase 4 | ✓ | ✓ `accessibilityLabel` on Pressables |
| Contrast ≥4.5:1 | ✓ Token colors pass | ✓ | ✓ Same token values |

## Chat Surface (Key Flow)

| Element | Notes (web) | Mobile |
|---|---|---|
| Loading state | ✓ `ShimmerMessage × 3` | ✓ `ChatShimmerMessage × 3` |
| Thinking indicator | ✓ `ThinkingIndicator` (Bot icon + 3 dots) | ✓ `ChatThinkingIndicator` (icon box + 3 dots) |
| Message list | ✓ scrollable `div` | ✓ `FlashList` |
| Input | ✓ `PromptInput` from `ai-elements` | ✓ `ChatInput` (RN) |
| Markdown rendering | ✓ `MarkdownContent` with token heading classes | ✓ async `react-native-markdown-display` |

## Icon Usage

| Rule | Notes (web) | Rocco (web) | Mobile |
|---|---|---|---|
| No decorative emojis | ✓ None found | ✓ Removed Phase 5 | ✓ Removed Phase 5 |
| Icons communicate info | ✓ Lucide icons only where informational | ✓ | ✓ `AppIcon` only where informational |

---

## Platform-Specific Exceptions

See `specs/void-design-app-alignment/spec.md` for the formal spec. Code-level exceptions:

### Mobile
- **Safe area insets**: `apps/mobile/app/(protected)/` layouts use `useSafeAreaInsets()` — no web equivalent needed.
- **Gesture navigation**: Swipe-to-dismiss on `swipeable-card.tsx` is mobile-only.
- **Typography sizing**: Restyle uses fixed pt values; web uses fluid clamp. Both meet the ≥17px body minimum at standard sizes.
- **Tab bar**: Bottom tab navigation is mobile-only; web uses sidebar/top nav.

### Web (Notes)
- **Markdown rendering**: `MarkdownContent.tsx` applies heading tokens to dynamically rendered content — no mobile equivalent since mobile chat doesn't render rich markdown inline.

### Web (Rocco)
- **Place type tags**: `PlaceTypes` component is Rocco-only (no mobile equivalent).
- **Map integration**: Google Maps rendering is web-only.

---

## Manual Verification Checklist (requires running apps)

These items require visual inspection and cannot be automated:

- [ ] Side-by-side screenshots: auth flow (sign-in page) on mobile vs. notes vs. rocco
- [ ] Side-by-side screenshots: chat surface on mobile vs. notes
- [ ] Side-by-side screenshots: focus ring appearance on all web inputs
- [ ] Keyboard navigation: tab order through notes chat, auth, account pages
- [ ] Screen reader test: VoiceOver (mobile) + keyboard nav (web)
- [ ] `prefers-reduced-motion`: verify shimmer/thinking animations stop when enabled
