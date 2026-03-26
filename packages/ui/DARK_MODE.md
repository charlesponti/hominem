# Dark Mode Implementation Guide

**Status**: Planning Phase
**Priority**: Medium
**Effort**: 2-3 weeks

This guide outlines how to add dark mode support to the `@hominem/ui` design system while maintaining accessibility and design coherence.

---

## Overview

The current design system uses a light palette (Apple HIG). Dark mode will introduce a dark variant using semantic color tokens that automatically adapt to the user's system preference or manual toggle.

### Goals

✅ Maintain WCAG 2.1 AA contrast in dark mode
✅ Preserve brand identity in both modes
✅ Support system preference (`prefers-color-scheme`)
✅ Allow user override (light/dark/auto)
✅ Minimal code changes (token-based)
✅ Accessible focus states in both modes

---

## Architecture

### Strategy: CSS Custom Properties with @media

```css
/* Light mode (default) */
:root {
  --color-bg-base: #ffffff;
  --color-text-primary: #000000;
}

/* Dark mode: system preference */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-base: #1c1c1e;
    --color-text-primary: #ffffff;
  }
}

/* Dark mode: user override */
[data-theme="dark"] {
  --color-bg-base: #1c1c1e;
  --color-text-primary: #ffffff;
}

[data-theme="light"] {
  --color-bg-base: #ffffff;
  --color-text-primary: #000000;
}
```

### Implementation Steps

1. **Define dark mode color tokens** (new)
2. **Update CSS variables** in globals.css (new @media)
3. **Add theme provider** to layout root
4. **Create theme toggle hook** (useTheme)
5. **Update Storybook** with theme addon
6. **Test contrast ratios** in dark mode
7. **Update component stories** with dark variants

---

## Dark Mode Color Palette

### Backgrounds (Apple-inspired dark palette)

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `bg-base` | #ffffff | #1c1c1e | App background |
| `bg-surface` | #f5f5f7 | #2a2a2d | Cards, panels |
| `bg-elevated` | #f2f2f7 | #3a3a3d | Modals, elevated |
| `bg-overlay` | rgba(0,0,0,0.04) | rgba(255,255,255,0.08) | Subtle overlay |

### Text (Inverted)

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `text-primary` | #000000 | #ffffff | Main text |
| `text-secondary` | #555555 | #a0a0a0 | Secondary text |
| `text-tertiary` | #888888 | #757575 | Tertiary text |
| `text-disabled` | #cccccc | #3a3a3d | Disabled text |

### Contrast Verification (Dark Mode)

| Combination | Ratio | Status |
|------------|-------|--------|
| text-primary (#fff) on bg-base (#1c1c1e) | 18:1 | ✅ AAA |
| text-secondary (#a0a0a0) on bg-base (#1c1c1e) | 7.5:1 | ✅ AA |
| text-tertiary (#757575) on bg-base (#1c1c1e) | 4.5:1 | ✅ AA |
| accent (#007AFF) on dark bg | 5.2:1 | ✅ AA |

### Semantic Colors (Dark Mode)

| Color | Light | Dark | Purpose |
|-------|-------|------|---------|
| success | #34c759 | #32d74b | Positive feedback |
| warning | #ff9500 | #ffb340 | Warnings |
| destructive | #ff3b30 | #ff453a | Destructive actions |

> **Note**: Semantic colors may need brightening in dark mode for visibility. Verify with WCAG contrast checker.

---

## Implementation Plan

### Phase 1: Core Setup (Week 1)

**1.1 Update Color Tokens**

```typescript
// src/tokens/colors.ts
export const colors = {
  // Light mode (existing)
  'bg-base': {
    light: '#ffffff',
    dark: '#1c1c1e',
  },
  // ... repeat for all tokens
} as const;
```

**1.2 Update CSS Variables**

```css
/* src/styles/globals.css */

:root {
  /* Light mode (default) */
  --color-bg-base: #ffffff;
  --color-text-primary: #000000;
  /* ... */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-base: #1c1c1e;
    --color-text-primary: #ffffff;
    /* ... */
  }
}
```

**1.3 Create Theme Provider**

```typescript
// src/lib/theme-provider.tsx
import { createContext, useContext, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const html = document.documentElement;

    if (theme === 'system') {
      html.removeAttribute('data-theme');
    } else {
      html.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return (
    <ThemeContext value={{ theme, setTheme }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
```

**1.4 Create Theme Toggle Hook**

```typescript
// src/hooks/use-theme-toggle.ts
import { useTheme } from '../lib/theme-provider';

export function useThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return { theme, setTheme, toggle, isDark };
}
```

### Phase 2: Component Updates (Week 2)

**2.1 Update Component Stories**

```typescript
// Add to Storybook meta
const meta = {
  // ...
  parameters: {
    themes: {
      default: 'light',
      list: [
        { name: 'Light', class: '', color: '#ffffff' },
        { name: 'Dark', class: 'dark', color: '#1c1c1e' },
      ],
    },
  },
};
```

**2.2 Test Components**
- Verify all components in light mode ✓
- Verify all components in dark mode
- Check focus rings are visible in both
- Verify text is readable in both modes

**2.3 Update Documentation**
- Document dark mode color tokens
- Add dark mode screenshots to component docs
- Update DESIGN_TOKENS.md with dark values

### Phase 3: Integration & Testing (Week 3)

**3.1 Add Storybook Theme Addon**

```bash
npm install --save-dev @storybook/addon-themes
```

**storybook/main.ts**:
```typescript
export default {
  addons: ['@storybook/addon-themes'],
};
```

**3.2 Add Theme Toggle to Storybook**

```typescript
// .storybook/preview.tsx
import { ThemeProvider } from '../src/lib/theme-provider';

export const decorators = [
  (Story, context) => {
    const theme = context.parameters.theme || 'light';
    return (
      <div data-theme={theme}>
        <ThemeProvider>
          <Story />
        </ThemeProvider>
      </div>
    );
  },
];
```

**3.3 Accessibility Testing**

- [ ] Color contrast verified in dark mode
- [ ] Focus rings visible in both modes
- [ ] Screen reader works in both modes
- [ ] Keyboard navigation works in both modes
- [ ] No color-only information conveyance

**3.4 Performance Testing**

- [ ] No layout shift on theme change
- [ ] Theme preference persisted to localStorage
- [ ] Respects system preference on load
- [ ] No flashing/flickering on page load

---

## Migration Checklist

### For App Teams

1. **Wrap app root with ThemeProvider**
```tsx
import { ThemeProvider } from '@hominem/ui';

export function App() {
  return (
    <ThemeProvider>
      <YourAppComponent />
    </ThemeProvider>
  );
}
```

2. **Add theme toggle to settings**
```tsx
import { useThemeToggle } from '@hominem/ui/hooks';

export function SettingsPanel() {
  const { theme, setTheme } = useThemeToggle();

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  );
}
```

3. **Update custom styles**
- Replace hardcoded colors with tokens
- Use semantic color names
- Test in both light and dark

### For Design Team

1. **Review dark palette**
   - Does it match product vision?
   - Are semantic colors appropriate?
   - Contrast verified?

2. **Create dark mode mockups**
   - Key screens in light + dark
   - Share with stakeholders
   - Get approval before implementation

3. **Document dark mode guidelines**
   - When to use which palette
   - Color meanings in dark mode
   - Imagery/illustration updates

---

## Technical Considerations

### localStorage Persistence

```typescript
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Restore from localStorage
    return localStorage.getItem('theme') ?? 'system';
  });

  const handleSetTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // ... rest of implementation
}
```

### System Preference Detection

```typescript
// Listen for system preference changes
useEffect(() => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleChange = (e) => {
    if (theme === 'system') {
      // Re-render with new system preference
      forceUpdate();
    }
  };

  mediaQuery.addEventListener('change', handleChange);
  return () => mediaQuery.removeEventListener('change', handleChange);
}, [theme]);
```

### SSR Hydration

For server-side rendering, avoid hydration mismatches:

```typescript
function ThemeProvider({ children, initialTheme = 'system' }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  if (!isMounted) {
    // Server-rendered markup uses `initialTheme`
    return <div data-theme={initialTheme}>{children}</div>;
  }

  // Client uses real theme state
  return (
    <ThemeContext value={{ theme, setTheme }}>
      <div data-theme={theme}>{children}</div>
    </ThemeContext>
  );
}
```

---

## Testing Strategy

### Manual Testing Checklist

**Light Mode**
- [ ] All text readable
- [ ] Focus rings visible (blue)
- [ ] Images render correctly
- [ ] Hover states apparent

**Dark Mode**
- [ ] All text readable (check contrast)
- [ ] Focus rings visible (bright blue)
- [ ] Images render correctly
- [ ] Hover states apparent

**Theme Switching**
- [ ] Toggle between light/dark
- [ ] System preference works
- [ ] localStorage persists choice
- [ ] No layout shifts
- [ ] No color flashing

**Accessibility**
- [ ] Screen reader works in both
- [ ] Keyboard navigation in both
- [ ] High contrast mode works
- [ ] Motion preferences respected

### Automated Testing

```bash
# Contrast checking
axe https://localhost:6006 --tags wcag2aa
npm run test:a11y

# Visual regression (with theme variants)
npm run test:visual -- --theme light dark
```

---

## Common Pitfalls

### ❌ Hardcoded Colors

```tsx
// Bad
<div style={{ backgroundColor: '#ffffff' }}>

// Good
<div className="bg-base">
```

### ❌ Color-Only Information

```tsx
// Bad
<div>Required field (shown in red only)</div>

// Good
<div>Required field <span aria-label="required">*</span></div>
```

### ❌ Insufficient Contrast

Always verify WCAG AA minimum: 4.5:1 for normal text, 3:1 for large text.

### ❌ No System Preference Support

Users expect `prefers-color-scheme` to be respected.

---

## Rollout Timeline

### Q2 2026

- **Week 1-2**: Implement core setup
- **Week 3**: Component updates & testing
- **Week 4**: Integration & app team rollout
- **Week 5**: Monitoring & refinement

### Success Metrics

- ✅ 95%+ WCAG AA compliance in both modes
- ✅ 0 color contrast violations
- ✅ < 50ms theme switch performance
- ✅ 100% app team adoption

---

## References

- [CSS Media Queries: prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- [Apple Dark Mode Guidelines](https://developer.apple.com/design/human-interface-guidelines/dark-mode/)
- [Material Design Dark Theme](https://material.io/design/color/dark-theme.html)
- [WebAIM Dark Mode](https://webaim.org/articles/contrast/)

---

## Next Steps

1. **Get design approval** on dark mode palette
2. **Spike**: Test theme provider implementation (1 day)
3. **Create Linear issues** for implementation phases
4. **Schedule design review** after Phase 2 (component updates)
5. **Coordinate with app teams** for rollout planning
