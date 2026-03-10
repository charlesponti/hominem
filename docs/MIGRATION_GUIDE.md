# Design System Migration Guide

## Quick Start

## Purpose

Use this guide for tactical migration of existing code patterns to the current canonical VOID design system defined in [docs/DESIGN_SYSTEM.md](/Users/charlesponti/Developer/hominem/docs/DESIGN_SYSTEM.md). This is the canonical reference for design audits.

## Before and After Examples

### Typography

**Before (VOID):**
```tsx
<h1 className="kanso text-3xl">Heading</h1>
<p className="text-base">Body text</p>
```

**After (New System):**
```tsx
<h1 className="heading-1">Heading</h1>
<p className="body-2">Body text</p>
```

### Buttons

**Before:**
```tsx
<button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
  Click me
</button>
```

**After:**
```tsx
<button className="btn btn-primary">Click me</button>
```

### Cards

**Before:**
```tsx
<div className="bg-gray-800 p-4 rounded border border-gray-700">
  <h3>Title</h3>
  <p>Content</p>
</div>
```

**After:**
```tsx
<div className="card">
  <h3 className="heading-3">Title</h3>
  <p className="body-2">Content</p>
</div>
```

### Forms

**Before:**
```tsx
<input
  type="text"
  className="border border-gray-600 bg-gray-700 text-white p-2 rounded"
  placeholder="Enter text..."
/>
```

**After:**
```tsx
<input
  type="text"
  className="input"
  placeholder="Enter text..."
/>
```

### Colors

**Before:**
```tsx
<div style={{ color: '#9ca3af' }}>Secondary text</div>
<div style={{ backgroundColor: '#1f2937' }}>Elevated surface</div>
```

**After:**
```tsx
<div className="text-secondary">Secondary text</div>
<div className="bg-bg-elevated-1">Elevated surface</div>
```

### Spacing & Layout

**Before:**
```tsx
<div className="ma-4 space-y-2">
  <p>Item 1</p>
  <p>Item 2</p>
</div>
```

**After:**
```tsx
<div className="p-4 space-y-2">
  <p>Item 1</p>
  <p>Item 2</p>
</div>
```

### Transitions

**Before:**
```tsx
<div style={{ transition: 'none !important' }}>Static content</div>
<div className="transition-all duration-200">Animated content</div>
```

**After:**
```tsx
<div className="transition-none">Static content (if really needed)</div>
<div className="transition-all duration-300">Animated content</div>
```

## Token Mapping Reference

### Background Colors

| Use Case | VOID | New System | Token |
|----------|------|-----------|-------|
| Page background | `#0a0a0a` | `bg-bg-base` | `#111111` |
| First level card | `#1f2937` | `bg-bg-elevated-1` | `#1a1a1a` |
| Hover state | `#2d3748` | `bg-bg-elevated-2` | `#252525` |
| Active state | `#374151` | `bg-bg-elevated-3` | `#333333` |

### Text Colors

| Use Case | VOID | New System | Token |
|----------|------|-----------|-------|
| Primary text | `#ffffff` | `text-primary` | `#f5f5f5` |
| Secondary text | `#9ca3af` | `text-secondary` | `#a0a0a0` |
| Muted text | `#6b7280` | `text-muted` | `#6b6b6b` |
| Text on light bg | - | `text-inverse` | `#0a0a0a` |

### Interactive Colors

| Use Case | VOID | New System | Token |
|----------|------|-----------|-------|
| Primary action | `#3b82f6` | `accent` | `#7BD3F7` |
| Hover | `#2563eb` | `accent-hover` | `#5dc4f0` |
| Active | `#1d4ed8` | `accent-active` | `#3db4eb` |

### Semantic Colors

| Use Case | New System | Token |
|----------|-----------|-------|
| Success | `success` | `#4ade80` |
| Warning | `warning` | `#facc15` |
| Error | `error` | `#ef4444` |
| Info | `info` | `#3b82f6` |

### Spacing Grid

All spacing uses 8px base grid with 4px sub-grid:

```
4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 56px, 64px
```

Use Tailwind classes:
```
p-1 = 4px      p-2 = 8px      p-3 = 12px     p-4 = 16px
p-5 = 20px     p-6 = 24px     p-8 = 32px     p-10 = 40px
p-12 = 48px    p-14 = 56px    p-16 = 64px
```

### Border Radius

| Use Case | New System | Token |
|----------|-----------|-------|
| Small | `rounded-sm` | `6px` |
| Medium | `rounded-md` | `10px` |
| Large | `rounded-lg` | `14px` |
| Extra large | `rounded-xl` | `20px` |

### Shadows

| Use Case | New System | Definition |
|----------|-----------|-----------|
| Subtle | `shadow-low` | `0 1px 2px rgba(0,0,0,0.5)` |
| Standard | `shadow-medium` | `0 4px 6px rgba(0,0,0,0.5)` |
| Strong | `shadow-high` | `0 20px 25px rgba(0,0,0,0.5)` |

## Component Utilities

### Buttons

```tsx
// Primary action
<button className="btn btn-primary">Save</button>

// Secondary action
<button className="btn btn-secondary">Cancel</button>

// Destructive action
<button className="btn btn-destructive">Delete</button>

// With state
<button className="btn btn-primary" disabled>Disabled</button>
<button className="btn btn-primary" aria-busy="true">Loading...</button>
```

**Includes:**
- Proper padding and sizing
- Hover, focus, active states
- Disabled state styling
- Smooth transitions

### Input Fields

```tsx
// Text input
<input className="input" type="text" placeholder="Enter text..." />

// With error
<input className="input input-error" value="Invalid" />

// Disabled
<input className="input" disabled placeholder="Disabled input" />

// In a group
<div className="input-group">
  <span>$</span>
  <input className="input" type="number" />
</div>
```

**Includes:**
- Focus ring (accent color)
- Error state styling
- Proper height and padding
- Placeholder styling

### Cards

```tsx
// Basic card
<div className="card">
  <h3>Title</h3>
  <p>Content</p>
</div>

// Elevated card (more shadow)
<div className="card card-elevated">
  <p>More prominent</p>
</div>

// Card with actions
<div className="card">
  <div className="flex items-center justify-between border-b border-border-subtle pb-4 mb-4">
    <h3 className="heading-3">Title</h3>
    <button className="text-secondary hover:text-primary">⋯</button>
  </div>
  <p className="body-2">Content</p>
</div>
```

### Badges

```tsx
<span className="badge">Default</span>
<span className="badge badge-accent">Featured</span>
<span className="badge bg-success/10 text-success">Active</span>
```

## Typography Scale

### Headings

```tsx
<h1 className="display-1">Hero - 48px/700</h1>
<h1 className="display-2">Large Page Title - 40px/700</h1>
<h2 className="heading-1">Main Section - 32px/700</h2>
<h3 className="heading-2">Section Header - 28px/700</h3>
<h4 className="heading-3">Subsection - 24px/700</h4>
<h5 className="heading-4">Component Header - 20px/700</h5>
```

### Body Text

```tsx
<p className="body-1">Large body - 18px/400</p>
<p className="body-2">Default body - 16px/400</p>
<p className="body-3">Secondary body - 14px/400</p>
<p className="body-4">Small text - 12px/400</p>
```

### Monospace (Code)

```tsx
<code className="font-mono text-sm bg-bg-elevated-1 px-2 py-1 rounded">
  const x = 42;
</code>

<pre className="bg-bg-elevated-1 p-4 rounded font-mono text-sm overflow-x-auto">
  function example() {'{'}
    return 'Hello, World!';
  {'}'}
</pre>
```

## Accessibility Migration

### Focus States

**Before:**
```tsx
<button style={{ outline: 'none' }}>Inaccessible</button>
```

**After:**
```tsx
<button className="focus-ring">Keyboard accessible</button>
// or use native focus-visible
<button className="focus:outline-2 focus:outline-offset-2 focus:outline-accent">
  Native focus
</button>
```

### Color Contrast

All text colors are WCAG AA compliant:
- Primary text: 18:1 contrast ratio
- Secondary text: 7.5:1 contrast ratio
- Minimum body size: 14px

### Reduced Motion

Transitions automatically respect `prefers-reduced-motion`:

```tsx
// This works automatically
<div className="transition-all duration-300 hover:scale-105">
  Respects reduced motion preference
</div>
```

### Screen Reader

```tsx
// Use semantic HTML
<button aria-label="Close dialog">×</button>
<input aria-describedby="hint" />
<span id="hint" className="sr-only">Helper text</span>
```

## Common Migration Patterns

### List with Items

**Before:**
```tsx
<ul className="space-y-2">
  {items.map(item => (
    <li key={item.id} className="p-2 bg-gray-800 rounded">
      {item.name}
    </li>
  ))}
</ul>
```

**After:**
```tsx
<ul className="space-y-2">
  {items.map(item => (
    <li key={item.id} className="card p-3">
      {item.name}
    </li>
  ))}
</ul>
```

### Form Section

**Before:**
```tsx
<fieldset className="border border-gray-600 p-4 rounded">
  <legend className="text-sm font-semibold text-gray-300">Settings</legend>
  <div className="space-y-4 mt-4">
    {/* form fields */}
  </div>
</fieldset>
```

**After:**
```tsx
<fieldset className="card p-6">
  <legend className="heading-4 mb-4">Settings</legend>
  <div className="space-y-4">
    {/* form fields */}
  </div>
</fieldset>
```

### Table

**Before:**
```tsx
<table className="w-full border-collapse">
  <thead className="bg-gray-800">
    <tr>
      <th className="text-left p-3 text-gray-300 text-sm font-semibold">Name</th>
    </tr>
  </thead>
  <tbody>
    {rows.map(row => (
      <tr key={row.id} className="border-b border-gray-700">
        <td className="p-3 text-gray-100">{row.name}</td>
      </tr>
    ))}
  </tbody>
</table>
```

**After:**
```tsx
<table className="w-full border-collapse">
  <thead>
    <tr className="border-b border-border-subtle">
      <th className="text-left p-3 text-secondary text-xs font-semibold">Name</th>
    </tr>
  </thead>
  <tbody>
    {rows.map(row => (
      <tr key={row.id} className="border-b border-border-subtle hover:bg-bg-elevated-1 transition-colors">
        <td className="p-3 text-primary">{row.name}</td>
      </tr>
    ))}
  </tbody>
</table>
```

## Testing Your Migration

### Checklist

- [ ] All text passes WCAG color contrast checks
- [ ] Buttons have visible focus rings when tabbing
- [ ] Hover states work on interactive elements
- [ ] Forms can be filled without hardcoded styles
- [ ] Modals and overlays appear with proper shadows
- [ ] Spacing is consistent (multiples of 4px/8px)
- [ ] No `transition: none !important` remains
- [ ] Icons display with correct colors
- [ ] Print styles work (if applicable)
- [ ] Mobile responsive layouts work

## Getting Help

### Resources

- **Design System Reference**: `/docs/DESIGN_SYSTEM.md`
- **Token Definitions**: `packages/ui/src/styles/globals.css`
- **Component Examples**: Look at app code in `apps/rocco`, `apps/notes`, `apps/finance`
- **Mobile Theme**: `apps/mobile/theme/theme.ts`

### Common Issues

**Q: My custom color isn't applying**
A: Remove inline styles and use Tailwind classes: `className="text-primary"` instead of `style={{ color: '#fff' }}`

**Q: Fonts look wrong**
A: Check that `@hominem/ui` styles are imported in your app root. Fonts are loaded from Google Fonts.

**Q: Transitions aren't smooth**
A: Make sure you're using the transition classes: `.transition-all`, `.transition-colors`, etc.

**Q: Focus ring isn't visible**
A: Use `.focus-ring` class or ensure `:focus-visible` CSS is applied.

**Q: Component doesn't match figma**
A: Check token values in `DESIGN_SYSTEM.md` - all values are documented there.

## Questions?

File an issue or ask the team. The design system is evolving and feedback is valuable!
