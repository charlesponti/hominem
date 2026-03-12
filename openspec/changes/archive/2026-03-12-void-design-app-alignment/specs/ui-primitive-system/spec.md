# UI Primitive System Spec

## Purpose

Eliminate raw platform elements from feature code by providing a shared higher-level component layer in `packages/ui`. Feature code should express product intent; the component layer handles rendering mechanics, accessibility, and cross-platform differences.

## Core Rule

Raw platform primitives (`<input>`, `<button>`, `TextInput`, `Pressable`, etc.) are banned in feature code. They are only allowed:
- Inside `packages/ui` component implementations
- For edge cases with no suitable abstraction (must be documented with `// design-system: no abstraction exists because...`)
- For performance or platform API requirements that clearly justify direct use

## Primitive Inventory

### Inputs and Form Controls

| Primitive | Replaces (web) | Replaces (native) | Notes |
|-----------|---------------|-------------------|-------|
| `TextField` | `<input type="text|email|password|search|url|tel">` | `TextInput` | Supports label, helpText, error, disabled, size |
| `TextArea` | `<textarea>` | multiline `TextInput` | Auto-grows optional |
| `SelectField` | `<select>` | custom picker | Native picker on mobile |
| `Checkbox` | `<input type="checkbox">` | custom toggle | Radix on web, Pressable on native |
| `RadioGroup` | `<input type="radio">` | custom | Radix on web |
| `Switch` | — | — | Toggle for boolean settings |
| `Field` | `<label>` + input + error span | label + input + error Text | Wires `htmlFor`/`accessibilityLabelledBy` automatically |
| `Form` | `<form>` | — | Web only; semantic wrapper with gap |

### Actions

| Primitive | Replaces (web) | Replaces (native) | Notes |
|-----------|---------------|-------------------|-------|
| `Button` | `<button>` | `Pressable`, `TouchableOpacity` | Variants: default, primary, destructive, ghost, link; sizes: sm, md, lg |
| `IconButton` | icon-only `<button>` | icon-only `Pressable` | Requires `aria-label` / `accessibilityLabel` |
| `Link` | `<a>` for app navigation | — | Uses router Link internally |

### Layout

| Primitive | Replaces | Notes |
|-----------|---------|-------|
| `Stack` | `flex flex-col gap-*` div / `View` | Vertical; gap via token; optional dividers; responsive direction |
| `Inline` | `flex items-center gap-*` div / horizontal `View` | Horizontal; wrapping option |
| `Container` | one-off max-width wrapper divs | Canonical max-width + horizontal padding |
| `Screen` | root scroll/safe-area wrapper in native | Expo `SafeAreaView` + scroll behavior |
| `Page` | top-level route wrapper on web | max-width, padding, scroll |
| `Section` | named content region | `<section>` on web |
| `CenteredLayout` | auth/onboarding page shells | Centered vertically + horizontally |
| `SidebarLayout` | settings/account page shells | Sidebar + main content split |
| `SplitLayout` | list+detail page shells | Left list + right detail |

### Typography

| Primitive | Replaces | Notes |
|-----------|---------|-------|
| `Heading` | `<h1>`–`<h4>`, direct `Text` for headings on native | Maps to display/heading scale; `level` prop |
| `Text` | `<p>`, `<span>`, direct `<Text>` for body copy | Maps to body scale; `variant` prop |
| `Label` | standalone `<label>` outside Field | For non-form label contexts |
| `Caption` | small/secondary text | Mapped to body-4 |

### Feedback

| Primitive | Notes |
|-----------|-------|
| `ErrorText` | Error message under form fields; aria-live |
| `HelperText` | Assistive hint under form fields |
| `Banner` | Page-level status messages |
| `EmptyState` | Zero-data placeholder |

## Component API Contract

Every primitive must:

1. **Accept `className` / `style`** as an escape hatch for one-off overrides
2. **Accept `asChild`** (web Radix pattern) where composition is needed
3. **Encode accessibility** — focus handling, roles, label wiring — by default
4. **Use token-based props** for spacing (`gap`, `padding`), size (`size`), and variant
5. **Have a Storybook story** covering: Default, all variants, all states (hover/focus/disabled/error/loading)
6. **Be documented** with a comment explaining the intent and platform notes

## Cross-Platform Strategy

- Shared props type in a `.types.ts` file (e.g., `button.types.ts`)
- Web implementation in `button.tsx`
- Native implementation in `button.native.tsx` (Metro resolves `.native.tsx` automatically)
- No `Platform.OS` checks in feature code
- No platform detection imports in shared primitive files

## Banned / Restricted Elements

### Web / Electron Feature Code

```
<input>           → TextField, Checkbox, RadioGroup, Switch
<textarea>        → TextArea
<select>          → SelectField
<button>          → Button, IconButton
<form>            → Form
<label>           → Field (label prop), Label
<h1>–<h4>         → Heading
<p>, <span>       → Text
```

### React Native Feature Code

```
TextInput         → TextField, TextArea
Pressable         → Button, IconButton
TouchableOpacity  → Button, IconButton
TouchableHighlight → Button
Text (direct)     → Text, Heading, Label, Caption
View (ad hoc layout) → Stack, Inline, Section
ScrollView (ad hoc) → Screen, Page
```

## Spacing Token Mapping

Use props instead of raw class combinations:

| Instead of | Use |
|------------|-----|
| `gap-2` | `gap="xs"` |
| `gap-4` | `gap="sm"` |
| `gap-6` | `gap="md"` |
| `gap-8` | `gap="lg"` |
| `gap-12` | `gap="xl"` |
| `p-4` | `padding="sm"` |
| `px-6 py-4` | `paddingX="md" paddingY="sm"` |

Token values live in `packages/ui/src/tokens/spacing.ts`.

## Responsive Breakpoints

Defined in `packages/ui/src/tokens/breakpoints.ts`:

| Token | Value |
|-------|-------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

Stack responsive direction example:
```tsx
<Stack direction={{ base: 'column', md: 'row' }} gap="md">
```

## Enforcement

### ESLint Rules (Phase 12)

- `no-restricted-elements`: warn on `input`, `textarea`, `select`, `button`, `form` in `apps/**`
- Custom rule or import restriction: warn on `TextInput`, `Pressable`, `TouchableOpacity` imports in `apps/**`

### Exemptions File

`packages/ui/.eslint-primitives-allowed.json` — list of component files allowed to use raw primitives.

### PR Review Checklist Addition

- [ ] No raw `<input>`, `<button>`, `<textarea>`, `<select>`, `<form>` in feature routes/components
- [ ] No raw `TextInput`, `Pressable`, `TouchableOpacity` imports in mobile feature code
- [ ] New forms use `Field` for label + control + error wiring
- [ ] New layouts use `Stack`, `Inline`, `Container`, or layout shells
- [ ] New typography uses `Heading` or `Text`

## Definition of Done

- All high-frequency raw primitive usages in feature code replaced (Phase 10)
- All new primitives have Storybook stories with full state coverage
- ESLint rules active and passing on CI
- Design system skill updated with banned element table and new screen checklist
- At least one auth page, one settings page, and one list+detail page migrated to layout shells
