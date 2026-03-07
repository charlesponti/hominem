# Ponti Studios Unified Design System

A premium dark-mode design system replacing the VOID design system across all Ponti Studios products (finance, notes, rocco, mobile apps).

## Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Token Reference](#token-reference)
4. [Component Utilities](#component-utilities)
5. [Usage Examples](#usage-examples)
6. [Accessibility](#accessibility)
7. [Migration Guide](#migration-guide)
8. [Developer Guide](#developer-guide)

---

## Overview

### What Changed

The new design system replaces the VOID design system with a unified, premium aesthetic combining:

- **Ponti Studios Principles**: Opacity-based elevation, off-white foreground colors
- **Apple HIG Principles**: Semantic tokens, typography scales, spacing grids
- **Modern Aesthetic**: Smooth transitions, rounded corners, cohesive visual language

### Key Characteristics

| Aspect | Details |
|--------|---------|
| **Color Palette** | Dark mode with opacity-based elevation and unified accent (#7BD3F7) |
| **Typography** | Inter (UI) + JetBrains Mono (code) with system font fallbacks |
| **Spacing** | 8px primary grid + 4px secondary grid |
| **Radius** | 6px, 10px, 14px, 20px scale |
| **Shadows** | Low/medium/high with opacity-based depths |
| **Transitions** | Smooth 150-300ms transitions enabled by default |

### File Locations

| File | Purpose |
|------|---------|
| `packages/ui/src/styles/globals.css` | Web design system (784 lines): `@theme`, `@utility`, `@layer base/components` |
| `packages/ui/tailwind.config.ts` | Tailwind v4 configuration for content scanning |
| `apps/mobile/theme/theme.ts` | Mobile (React Native/Expo) design tokens |

---

## Design Principles

### 1. Opacity-Based Elevation

Instead of using multiple background shades, we use opacity layers to create visual depth:

```
Base: #111111 (almost black)
Layer 1: #111111 + 5% white opacity   = slightly elevated
Layer 2: #111111 + 10% white opacity  = more elevated
Layer 3: #111111 + 20% white opacity  = highest elevation
```

This creates a cohesive, modern look where lighter elements feel "closer" to the user.

### 2. Unified Accent Color

Single accent color (#7BD3F7 - light cyan) used across all products for:
- Interactive elements (buttons, links)
- Focus rings
- Highlights
- Active states

Previously, each product had its own accent color. This has been simplified for brand consistency.

### 3. Semantic Color Tokens

Colors are named for their purpose, not their appearance:

- `text-primary`: Main text content
- `text-secondary`: Secondary text (metadata, timestamps)
- `border-subtle`: Soft borders for cards/inputs
- `border-strong`: Prominent borders for focused elements
- `bg-elevated-1/2/3`: Elevation layers

This makes it easier to maintain consistency and refactor later.

### 4. Smooth Transitions

All interactive elements use 150-300ms transitions by default. Transitions respect `prefers-reduced-motion` preference.

---

## Token Reference

### Color Tokens

#### Backgrounds

| Token | Value | Usage |
|-------|-------|-------|
| `bg-base` | #111111 | Page/app background |
| `bg-elevated-1` | #1a1a1a | First elevation layer (cards, inputs) |
| `bg-elevated-2` | #252525 | Second elevation layer (hovered cards) |
| `bg-elevated-3` | #333333 | Third elevation layer (active states) |

#### Text

| Token | Value | Usage |
|-------|-------|-------|
| `text-primary` | #f5f5f5 | Main content, headings |
| `text-secondary` | #a0a0a0 | Metadata, timestamps, captions |
| `text-muted` | #6b6b6b | Disabled text, placeholders |
| `text-inverse` | #0a0a0a | Text on light/accent backgrounds |

#### Borders

| Token | Value | Usage |
|-------|-------|-------|
| `border-subtle` | rgba(255, 255, 255, 0.08) | Input/card borders |
| `border-strong` | rgba(255, 255, 255, 0.16) | Focused input borders |

#### Interactive

| Token | Value | Usage |
|-------|-------|-------|
| `accent` | #7BD3F7 | Buttons, links, focus rings |
| `accent-hover` | #5dc4f0 | Hover state |
| `accent-active` | #3db4eb | Active/pressed state |

#### Semantic

| Token | Value | Usage |
|-------|-------|-------|
| `success` | #4ade80 | Success messages, checkmarks |
| `warning` | #facc15 | Warnings, cautions |
| `error` | #ef4444 | Errors, destructive actions |
| `info` | #3b82f6 | Informational messages |

### Typography Tokens

#### Font Families

```css
font-inter: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
font-mono: 'JetBrains Mono', SFMono-Regular, Consolas, monospace;
```

#### Font Sizes (px)

| Token | Size | Usage |
|-------|------|-------|
| `text-xs` | 12px | Small labels, captions |
| `text-sm` | 14px | Body text (secondary) |
| `text-base` | 16px | Default body text |
| `text-lg` | 18px | Large body text |

#### Heading Scales

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `display-1` | 48px | 700 | Large hero text |
| `display-2` | 40px | 700 | Page titles |
| `heading-1` | 32px | 700 | Main sections |
| `heading-2` | 28px | 700 | Section headers |
| `heading-3` | 24px | 700 | Subsections |
| `heading-4` | 20px | 700 | Component headers |

#### Body Text

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `body-1` | 18px | 400 | Large body text |
| `body-2` | 16px | 400 | Default body text |
| `body-3` | 14px | 400 | Secondary body text |
| `body-4` | 12px | 400 | Small text |

### Spacing Tokens (px)

Follows 8px primary grid + 4px secondary grid:

```
4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 56px, 64px, 72px, 80px
```

Use multiples of 8px for major spacing, multiples of 4px for fine-tuning.

### Radius Tokens (px)

| Token | Size | Usage |
|-------|------|-------|
| `rounded-sm` | 6px | Small interactive elements |
| `rounded-md` | 10px | Buttons, inputs, cards |
| `rounded-lg` | 14px | Larger components, modals |
| `rounded-xl` | 20px | Maximum radius (badges, pills) |

### Shadow Tokens

| Token | Definition | Usage |
|-------|-----------|-------|
| `shadow-low` | `0 1px 2px rgba(0, 0, 0, 0.5)` | Subtle elevation |
| `shadow-medium` | `0 4px 6px rgba(0, 0, 0, 0.5)` | Standard elevation |
| `shadow-high` | `0 20px 25px rgba(0, 0, 0, 0.5)` | Strong elevation (modals, dropdowns) |

---

## Component Utilities

Ready-to-use component classes combining multiple tokens. All defined in `packages/ui/src/styles/globals.css`.

### Buttons

```html
<!-- Primary Button -->
<button class="btn btn-primary">Click me</button>

<!-- Secondary Button -->
<button class="btn btn-secondary">Secondary</button>

<!-- Destructive Button -->
<button class="btn btn-destructive">Delete</button>

<!-- Disabled Button -->
<button class="btn btn-primary" disabled>Disabled</button>
```

**Styles Applied:**
- Proper padding and sizing
- Hover, focus, and active states
- Disabled state (reduced opacity)
- Smooth transitions

### Cards

```html
<!-- Basic Card -->
<div class="card">
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</div>

<!-- Elevated Card -->
<div class="card card-elevated">
  <p>This card has extra shadow</p>
</div>
```

**Styles Applied:**
- Elevation background with rounded corners
- Subtle border
- Medium shadow
- Proper padding

### Inputs

```html
<!-- Text Input -->
<input type="text" class="input" placeholder="Enter text..." />

<!-- Input with Error -->
<input type="text" class="input input-error" value="Invalid input" />

<!-- Disabled Input -->
<input type="text" class="input" disabled placeholder="Disabled" />
```

**Styles Applied:**
- Proper focus ring (accent color)
- Border styling
- Error state styling
- Disabled state

### Forms

```html
<form>
  <label for="name">Name</label>
  <input type="text" id="name" class="input" />
  
  <label for="message">Message</label>
  <textarea class="input" id="message"></textarea>
  
  <button type="submit" class="btn btn-primary">Submit</button>
</form>
```

### Badges

```html
<!-- Default Badge -->
<span class="badge">New</span>

<!-- Accent Badge -->
<span class="badge badge-accent">Featured</span>
```

**Styles Applied:**
- Small padding and font size
- Proper radius
- Color variants

### Typography

```html
<h1 class="display-1">Hero Text</h1>
<h2 class="heading-1">Section Title</h2>
<p class="body-1">Regular body text</p>
<p class="body-4 text-secondary">Small secondary text</p>
<code class="font-mono text-sm">const x = 42;</code>
```

### Transitions

```html
<!-- Smooth color transition on hover -->
<div class="transition-colors hover:text-accent">Hover me</div>

<!-- Smooth opacity transition -->
<div class="transition-opacity opacity-50 hover:opacity-100">Fade in/out</div>

<!-- Smooth all properties -->
<div class="transition-all duration-300">Smooth everything</div>
```

### Utilities

```html
<!-- Screen Reader Only (accessibility) -->
<span class="sr-only">Visible only to screen readers</span>

<!-- Shadows -->
<div class="shadow-low">Subtle shadow</div>
<div class="shadow-medium">Standard shadow</div>
<div class="shadow-high">Strong shadow</div>

<!-- Glass Morphism -->
<div class="glass backdrop-blur-md">Frosted glass effect</div>

<!-- Focus Ring (manual) -->
<button class="focus-ring">Keyboard accessible</button>
```

---

## Usage Examples

### Building a Card Component

```tsx
export function MyCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div class="card card-elevated">
      <h3 class="heading-4 text-primary">{title}</h3>
      <p class="body-2 text-secondary mt-3">{children}</p>
    </div>
  )
}
```

### Building a Form

```tsx
export function LoginForm() {
  return (
    <form class="space-y-4">
      <div>
        <label for="email" class="block text-sm font-medium text-primary mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          class="input w-full"
          placeholder="you@example.com"
        />
      </div>
      
      <div>
        <label for="password" class="block text-sm font-medium text-primary mb-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          class="input w-full"
          placeholder="••••••••"
        />
      </div>
      
      <button type="submit" class="btn btn-primary w-full">
        Sign In
      </button>
    </form>
  )
}
```

### Interactive Element with Transitions

```tsx
export function InteractiveCard() {
  return (
    <div class="card transition-all duration-300 hover:card-elevated hover:shadow-high">
      <p class="body-2 text-secondary transition-colors duration-300 hover:text-primary">
        Hover over me for smooth transition
      </p>
    </div>
  )
}
```

---

## Accessibility

### Color Contrast

All text colors meet WCAG AA standards (4.5:1 ratio for normal text, 3:1 for large text):

- Primary text (#f5f5f5) on dark background: 18:1 contrast
- Secondary text (#a0a0a0) on dark background: 7.5:1 contrast
- Accent (#7BD3F7) on dark background: 7.5:1 contrast

### Focus States

All interactive elements have visible focus rings:

```css
.btn:focus-visible,
.input:focus-visible,
a:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

### Keyboard Navigation

- All buttons are keyboard accessible
- Tab order follows logical reading order
- Focus visible states are clearly visible
- No focus traps

### Motion

Transitions respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

### Screen Readers

Use semantic HTML and aria labels:

```html
<!-- Good -->
<button aria-label="Close dialog">×</button>
<input aria-describedby="password-hint" type="password" />
<span id="password-hint" class="sr-only">Must be 8+ characters</span>

<!-- Avoid -->
<div role="button" onclick="...">×</div>
```

### Font Sizing

- Never use px-based font sizes that prevent user scaling
- Use relative units (em, rem) or CSS variables
- Minimum body text size: 14px (body-3)

---

## Migration Guide

### From VOID to New Design System

#### Removed VOID Tokens

The following VOID-specific features have been removed:

| VOID Feature | Replacement | Notes |
|--------------|-------------|-------|
| `kanso` utility | Typography classes | Use `.heading-*`, `.body-*`, `.display-*` |
| `ma` utility | Margin tokens | Use standard Tailwind `m-4`, `m-8`, etc. |
| `wabi-sabi` utility | Standard utilities | Use color and opacity tokens |
| ASCII texture utilities | Native shadows | Use `.shadow-low/medium/high` |
| Product-specific colors | Unified accent (#7BD3F7) | Single color across all apps |
| `transition: none !important` | Smooth transitions | Transitions enabled by default |

#### Color Token Mapping

| VOID Token | New Token | Value |
|-----------|-----------|-------|
| `void-bg-base` | `bg-base` | #111111 |
| `void-text` | `text-primary` | #f5f5f5 |
| `void-text-secondary` | `text-secondary` | #a0a0a0 |
| Product accent colors | `accent` | #7BD3F7 |

#### CSS Class Updates

```diff
- <div class="kanso text-lg">Old heading</div>
+ <div class="heading-2">New heading</div>

- <button class="ma-4">Old button</button>
+ <button class="m-4 btn btn-primary">New button</button>

- <div style="transition: none !important;">No transition</div>
+ <div class="transition-colors">Smooth transition</div>
```

#### Steps to Migrate a Component

1. **Replace typography classes** with new `.heading-*`, `.body-*`, `.display-*`
2. **Remove hardcoded colors** - use Tailwind classes from new palette
3. **Use component utilities** - `.btn`, `.card`, `.input`, `.badge`
4. **Update spacing** - ensure multiples of 4px or 8px
5. **Test transitions** - verify smooth animations work
6. **Check contrast** - ensure text meets accessibility standards

### Breakage Areas

#### Before: Product-Specific Theming

```tsx
// This no longer works
<div data-product="finance">
  {/* Previously had finance-specific accent color */}
</div>
```

**Now:** Use unified design system across all products.

#### Before: Custom Transitions

```tsx
// This is now different
<div style={{ transition: 'none' }}>
  {/* Transitions are enabled by default now */}
</div>
```

**Now:** Override with `.transition-none` class if truly needed (use sparingly).

---

## Developer Guide

### Adding New Design Tokens

Edit `packages/ui/src/styles/globals.css`:

```css
@theme {
  /* Add new color token */
  --color-success: #4ade80;
  
  /* Add new spacing token */
  --spacing-new-size: 32px;
  
  /* Add new radius token */
  --radius-new: 12px;
}

/* Create utility if needed */
@utility .custom-class {
  @apply p-4 bg-elevated-1 text-primary rounded-md;
}
```

### Creating Custom Components

Use `@layer components` for new component classes:

```css
@layer components {
  .my-custom-component {
    @apply p-4 bg-elevated-2 rounded-lg shadow-medium transition-all duration-300;
  }
  
  .my-custom-component:hover {
    @apply shadow-high;
  }
}
```

### Overriding Token Values

For app-specific customizations, create an override file:

```css
/* apps/rocco/styles/overrides.css */
@import '../../packages/ui/src/styles/globals.css';

/* Override a specific token if needed */
:root {
  --color-accent: #your-custom-color;
}
```

### Testing Design System Changes

1. **Visual regression tests**: Screenshot components before/after
2. **Accessibility audit**: Run aXe or similar tools
3. **Performance check**: Monitor CSS file size
4. **Cross-browser testing**: Test on Chrome, Safari, Firefox

### Common Pitfalls

❌ **Don't:**
- Hardcode colors in components (`style={{ color: '#fff' }}`)
- Use `!important` to override design system tokens
- Create product-specific styling (use unified accent)
- Disable transitions globally
- Use arbitrary Tailwind values that don't match token scale

✅ **Do:**
- Use Tailwind classes from the design system
- Extend tokens through `globals.css` `@theme` block
- Leverage component utilities (`.btn`, `.card`, etc.)
- Keep spacing on 4px/8px grid
- Test accessibility with focus rings and contrast

---

## Troubleshooting

### Styles not applying?

1. Check `packages/ui/src/styles/globals.css` is imported in app root
2. Verify Tailwind config imports correct content paths
3. Check build output: `bun run build`
4. Clear cache: `rm -rf .turbo && bun run build`

### Colors look wrong?

1. Verify CSS variables are defined: Open DevTools → Inspect → Computed
2. Check color token names: Use Cmd+F in `globals.css` to verify
3. Ensure app has dark mode enabled
4. Check for conflicting CSS (search for `color:` or `background:` overrides)

### Transitions not working?

1. Verify transition utilities are applied: `.transition-colors`, `.transition-all`
2. Check `prefers-reduced-motion` setting (some devices disable transitions)
3. Ensure property is transitionable (some properties can't animate)
4. Check for `transition: none !important` (legacy VOID code)

### Focus rings not visible?

1. Check `.focus-ring` or `:focus-visible` CSS is applied
2. Verify outline colors are visible against background
3. Tab through page to test keyboard navigation
4. Check browser focus indicators aren't disabled

---

## Advanced Component Patterns

### Data Tables

```tsx
export function DataTable({ data, columns }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border-subtle">
            {columns.map((col) => (
              <th key={col.id} className="text-left p-4 text-xs font-semibold text-secondary">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className="border-b border-border-subtle transition-colors hover:bg-bg-elevated-1"
            >
              {columns.map((col) => (
                <td key={col.id} className="p-4 text-sm text-primary">
                  {row[col.id]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Modal Dialog

```tsx
export function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-md shadow-high">
        <div className="flex items-center justify-between border-b border-border-subtle p-4">
          <h2 className="heading-3 text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="text-secondary transition-colors hover:text-primary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
```

### Form with Validation

```tsx
export function LoginForm({ onSubmit, isLoading }) {
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validation logic...
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-primary mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          className={`input w-full ${errors.email ? 'input-error' : ''}`}
          placeholder="you@example.com"
        />
        {errors.email && <p className="text-xs text-error mt-1">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-primary mb-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          className={`input w-full ${errors.password ? 'input-error' : ''}`}
          placeholder="••••••••"
        />
        {errors.password && <p className="text-xs text-error mt-1">{errors.password}</p>}
      </div>

      <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
```

### Sidebar Navigation

```tsx
export function Sidebar({ items, activeId, onItemClick }) {
  return (
    <nav className="h-screen w-64 bg-bg-elevated-1 border-r border-border-subtle p-4 overflow-y-auto">
      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item.id)}
            className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
              activeId === item.id
                ? 'bg-accent text-bg-base'
                : 'text-primary hover:bg-bg-elevated-2'
            }`}
          >
            {item.icon && <span className="mr-2">{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
```

### Dropdown Menu

```tsx
export function DropdownMenu({ trigger, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="text-primary hover:text-accent transition-colors"
      >
        {trigger}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-bg-elevated-2 rounded-md shadow-high border border-border-subtle py-2 z-40">
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-primary hover:bg-bg-elevated-3 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Alert/Toast Component

```tsx
export function Alert({ type = 'info', title, message, onClose }) {
  const bgClass = {
    info: 'bg-bg-elevated-1 border-info/30',
    success: 'bg-bg-elevated-1 border-success/30',
    warning: 'bg-bg-elevated-1 border-warning/30',
    error: 'bg-bg-elevated-1 border-error/30',
  }[type];

  const textClass = {
    info: 'text-info',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
  }[type];

  return (
    <div className={`rounded-md border p-4 ${bgClass}`}>
      <div className="flex items-start justify-between">
        <div>
          {title && <p className={`font-medium ${textClass}`}>{title}</p>}
          {message && <p className="text-sm text-secondary mt-1">{message}</p>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## Quick Reference Card

```
COLORS:
  bg-base (#111111)          text-primary (#f5f5f5)
  bg-elevated-1 (#1a1a1a)    text-secondary (#a0a0a0)
  bg-elevated-2 (#252525)    accent (#7BD3F7)
  bg-elevated-3 (#333333)

TYPOGRAPHY:
  .display-1/2  .heading-1/2/3/4  .body-1/2/3/4  .font-mono

SPACING:
  4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px

RADIUS:
  .rounded-sm (6px)  .rounded-md (10px)  .rounded-lg (14px)  .rounded-xl (20px)

COMPONENTS:
  .btn, .btn-primary, .btn-secondary, .btn-destructive
  .card, .card-elevated
  .input, .input-error
  .badge, .badge-accent

TRANSITIONS:
  .transition-colors  .transition-opacity  .transition-all  .duration-300
```

---

## Questions or Issues?

- Check this guide for answers
- Review `packages/ui/src/styles/globals.css` for token definitions
- Look at app examples: `apps/rocco`, `apps/notes`, `apps/finance`
- See mobile theme: `apps/mobile/theme/theme.ts`
