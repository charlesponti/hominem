# Design System Troubleshooting Guide

## Common Issues and Solutions

### Styling Issues

#### Styles not applying at all

**Problem:** Classes like `text-primary` or `btn btn-primary` have no effect.

**Solutions:**
1. **Check import path**: Ensure `@hominem/ui/src/styles/globals.css` is imported in your app root:
   ```tsx
   // apps/your-app/app/root.tsx
   import '@hominem/ui/src/styles/globals.css'
   ```

2. **Clear build cache**:
   ```bash
   rm -rf .turbo .next build dist
   bun run build
   ```

3. **Check Tailwind config**: Verify `packages/ui/tailwind.config.ts` is in the content paths

4. **Verify CSS is served**: Check DevTools → Elements → find `<style>` or `<link>` tag for Tailwind CSS

#### Color tokens not defined

**Problem:** Colors show as undefined or wrong shades

**Solutions:**
1. **Verify token names**: Check `packages/ui/src/styles/globals.css` for exact token names
   - Color names should use hyphens: `text-primary`, `bg-elevated-1`, `border-subtle`
   - NOT `textPrimary` or `text_primary`

2. **Check CSS variables**:
   ```bash
   # In browser console
   console.log(getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary'))
   ```

3. **Use correct prefix**: Our system uses specific prefixes:
   - Colors: `text-*`, `bg-*`, `border-*`
   - Not custom color names without prefix

#### Hardcoded colors showing instead of tokens

**Problem:** Inline styles with color values are showing instead of design system colors

**Solutions:**
1. **Replace inline styles**:
   ```diff
   - <div style={{ color: '#9ca3af' }}>Secondary</div>
   + <div className="text-secondary">Secondary</div>
   ```

2. **Search for hardcoded values**:
   ```bash
   grep -r "style={{.*color\|style={{.*background" apps/your-app/
   grep -r "#[0-9A-Fa-f]{6}" apps/your-app/
   ```

3. **Use tailwind color helpers**: Always prefer `className` over inline styles

### Typography Issues

#### Text size looks wrong

**Problem:** Text is too small, too large, or inconsistent

**Solutions:**
1. **Use correct typography class**:
   - `display-1`, `display-2`: Large hero text (48px, 40px)
   - `heading-1` through `heading-4`: Section headers (32px down to 20px)
   - `body-1` through `body-4`: Body text (18px down to 12px)
   - `text-xs`, `text-sm`, `text-base`: Tailwind sizes (use for specific needs)

2. **Check font loading**: Open DevTools → Network tab
   - Should see requests to `fonts.googleapis.com`
   - If missing, check globals.css for @import statements

3. **Test in different browsers**:
   ```bash
   # Check computed styles
   console.log(window.getComputedStyle(element).fontSize)
   console.log(window.getComputedStyle(element).fontFamily)
   ```

#### Font doesn't look right

**Problem:** Wrong font family, or sans-serif showing instead of Inter

**Solutions:**
1. **Verify font imports**:
   - Check `packages/ui/src/styles/globals.css` line 15-16 for @import statements
   - Should import from `fonts.googleapis.com`

2. **Check font stack order**:
   ```css
   font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
   ```

3. **Force font reload**:
   ```bash
   # Clear browser cache and reload
   # Chrome: Cmd+Shift+Delete → Clear browsing data
   # Safari: Develop → Empty Caches
   ```

4. **Check macOS specifically**:
   - On macOS, system-ui should resolve to SF Pro
   - If seeing SF Pro, that's correct (it's our fallback)

### Button and Interactive Issues

#### Buttons don't look clickable

**Problem:** Buttons blend with background or lack visual affordance

**Solutions:**
1. **Use correct button class**:
   ```tsx
   // Good
   <button className="btn btn-primary">Click me</button>
   
   // Bad
   <button className="px-4 py-2">Click me</button>
   ```

2. **Check hover state**:
   - Hover over button → should change color/opacity
   - If no change, check `.btn-primary:hover` CSS

3. **Verify button contrast**:
   - Button text should have 4.5:1 contrast ratio minimum
   - Use DevTools accessibility checker

#### Focus ring not visible

**Problem:** Can't see focus when tabbing through page

**Solutions:**
1. **Add focus ring class**:
   ```tsx
   <button className="btn btn-primary focus:outline-2 focus:outline-accent">
     Click me
   </button>
   ```

2. **Check browser settings**:
   - Some browsers disable focus rings by default
   - Try different browser or disable browser extensions

3. **Use .focus-ring utility**:
   ```tsx
   <button className="focus-ring">Custom button</button>
   ```

4. **Inspect focus styles**:
   ```bash
   # In DevTools, force :focus-visible state
   # Right-click element → Inspect → :focus-visible checkbox
   ```

### Spacing and Layout Issues

#### Spacing too tight or too loose

**Problem:** Gap between elements doesn't match design

**Solutions:**
1. **Use spacing scale**:
   - `p-1` = 4px, `p-2` = 8px, `p-3` = 12px, `p-4` = 16px
   - Always use multiples of 4px
   - Never use arbitrary values like `p-5.5` or `p-[7px]`

2. **Check margin vs padding**:
   ```tsx
   // Padding (inside element)
   <div className="p-4">Content</div>
   
   // Margin (outside element)
   <div className="m-4">Content</div>
   
   // Gap (between children)
   <div className="space-y-4">
     <div>Child 1</div>
     <div>Child 2</div>
   </div>
   ```

3. **Use space utilities correctly**:
   ```tsx
   // Space between items
   <div className="space-y-4">...</div>
   
   // Space in columns
   <div className="flex gap-4">...</div>
   
   // Space around all sides
   <div className="p-4">...</div>
   ```

#### Border radius looks different

**Problem:** Corners are too sharp or too rounded

**Solutions:**
1. **Use correct radius class**:
   - `rounded-sm` = 6px (buttons, inputs)
   - `rounded-md` = 10px (cards, dropdowns)
   - `rounded-lg` = 14px (modals)
   - `rounded-xl` = 20px (badges, pills)

2. **Check element type**:
   - Cards: `.rounded-md`
   - Buttons: `.rounded-md` (usually)
   - Small badges: `.rounded-xl`

### Colors and Contrast Issues

#### Text not readable

**Problem:** Text blends with background (low contrast)

**Solutions:**
1. **Use correct text color**:
   ```tsx
   // Good
   <p className="text-primary">Primary text - 18:1 contrast</p>
   <p className="text-secondary">Secondary text - 7.5:1 contrast</p>
   
   // Bad
   <p className="text-muted">Too light for body text</p>
   ```

2. **Check color combinations**:
   - `text-primary` on `bg-base`: ✅ Good contrast
   - `text-secondary` on `bg-elevated-1`: ✅ Good contrast
   - `text-primary` on `bg-elevated-3`: ⚠️ Less contrast
   - Never use `text-muted` for main content

3. **Test with accessibility tools**:
   ```bash
   # Use aXe DevTools extension or Wave
   # Check color contrast for all text
   ```

#### Accent color not consistent

**Problem:** Button color different from link color

**Solutions:**
1. **Use `accent` class consistently**:
   ```tsx
   <button className="bg-accent text-bg-base">Button</button>
   <a className="text-accent hover:text-accent-hover">Link</a>
   <div className="border-accent">Bordered box</div>
   ```

2. **Don't mix accent variants**:
   - `accent` = #7BD3F7 (main, use most)
   - `accent-hover` = #5dc4f0 (for hover states)
   - `accent-active` = #3db4eb (for pressed states)

3. **Check if using product-specific accent**:
   - Products use unified `accent` (#7BD3F7)
   - No more product-specific accent colors

### Transition and Animation Issues

#### Transitions feel jerky or don't smooth

**Problem:** Hover/click effects are instant or stuttery

**Solutions:**
1. **Add transition class**:
   ```tsx
   // Good
   <button className="transition-colors duration-300 hover:bg-accent">
     Hover me
   </button>
   
   // Bad
   <button className="hover:bg-accent">Click me</button>
   ```

2. **Use correct transition duration**:
   - `duration-200` = 200ms (quick)
   - `duration-300` = 300ms (standard, recommended)
   - `duration-500` = 500ms (slow)

3. **Don't combine too many transitions**:
   ```tsx
   // Good - specific
   <div className="transition-colors duration-300">...</div>
   
   // OK - all properties
   <div className="transition-all duration-300">...</div>
   
   // Bad - too slow
   <div className="transition-all duration-1000">...</div>
   ```

#### Animations don't respect reduced motion preference

**Problem:** Animations show even when user prefers reduced motion

**Solutions:**
1. **Use built-in transition classes** - they automatically respect preference
   ```tsx
   // Good - respects prefers-reduced-motion
   <div className="transition-all duration-300">Content</div>
   ```

2. **Test reduced motion**:
   ```bash
   # macOS: System Preferences → Accessibility → Display → Reduce motion
   # Windows: Settings → Ease of Access → Display → Show animations
   # Linux: dconf-editor → org/gnome/desktop/interface/enable-animations
   ```

3. **Check user preference programmatically**:
   ```tsx
   const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
   ```

### Modal and Overlay Issues

#### Modal not centered or too small

**Problem:** Dialog appears in wrong position or doesn't have enough space

**Solutions:**
1. **Use correct modal structure**:
   ```tsx
   <div className="fixed inset-0 flex items-center justify-center bg-black/50">
     <div className="card w-full max-w-md">
       {/* content */}
     </div>
   </div>
   ```

2. **Check z-index**:
   - Modal wrapper: `z-50` (or higher)
   - Content inside: `z-40` or inherit

3. **Ensure proper spacing**:
   - Modal padding: `p-4` or `p-6`
   - Max width prevents too-wide modals: `max-w-md`

#### Backdrop not visible

**Problem:** Black overlay behind modal is missing or too transparent

**Solutions:**
1. **Use proper backdrop class**:
   ```tsx
   // Good
   <div className="fixed inset-0 bg-black/50">...</div>
   
   // Bad
   <div className="fixed inset-0 bg-black/20">...</div> <!-- too transparent -->
   ```

2. **Check z-index layering**:
   - Backdrop: `z-50`
   - Modal: `z-50` (same layer, but modal on top due to DOM order)
   - Content: `z-40` (behind modal)

### Build and Compilation Issues

#### "Color variable not found" error

**Problem:** Build fails with CSS variable errors

**Solutions:**
1. **Ensure globals.css is imported**:
   ```tsx
   // apps/your-app/app/root.tsx
   import '@hominem/ui/src/styles/globals.css'
   ```

2. **Check for typos**:
   - `--color-text-primary` (correct)
   - `--text-primary` (incorrect)
   - `--color-text_primary` (incorrect)

3. **Rebuild everything**:
   ```bash
   rm -rf .turbo
   bun run build
   ```

#### Tailwind utilities not generating

**Problem:** Classes work locally but not in production

**Solutions:**
1. **Check content paths** in `packages/ui/tailwind.config.ts`:
   ```ts
   content: [
     './src/**/*.{ts,tsx}',
     '../../apps/**/*.{ts,tsx}',
     // etc
   ]
   ```

2. **Ensure all files are scanned**:
   ```bash
   # Look for *.tsx and *.jsx files
   find apps -name "*.tsx" -o -name "*.jsx" | wc -l
   ```

3. **Clear Tailwind cache**:
   ```bash
   rm -rf .turbo node_modules/.vite
   bun install
   bun run build
   ```

## Diagnostic Checklist

### When things look wrong

- [ ] Refresh page (Cmd+R or Ctrl+R)
- [ ] Clear browser cache (or hard refresh Cmd+Shift+R)
- [ ] Close DevTools (sometimes affects styling)
- [ ] Check console for errors (F12 → Console tab)
- [ ] Verify CSS is loaded (F12 → Network, search for "globals.css" or "tailwind")
- [ ] Check computed styles (F12 → Inspector → Computed tab)
- [ ] Try in a different browser
- [ ] Test in incognito/private mode

### When something breaks unexpectedly

1. **Find recent changes**:
   ```bash
   git log --oneline -n 20
   git diff HEAD~5
   ```

2. **Identify what changed**:
   - CSS imports?
   - Component structure?
   - Class names?

3. **Revert to last known good**:
   ```bash
   git checkout <commit-hash>
   bun run build
   ```

4. **Compare changes**:
   ```bash
   git diff <commit-hash>
   ```

## Performance Issues

#### CSS is huge

**Problem:** Design system CSS file is too large

**Solutions:**
1. **Check for unused utilities**:
   ```bash
   # Run Tailwind's built-in unused CSS detection
   bun run build --no-optimize
   ```

2. **Ensure content paths are correct** in tailwind.config.ts
   - Too broad paths = too many generated utilities
   - Too narrow paths = missing utilities

3. **Use PurgeCSS on production build** (should be automatic)

#### Page loads slowly

**Problem:** Design system CSS delays page load

**Solutions:**
1. **Profile CSS delivery**:
   - DevTools → Network → filter by CSS
   - Check file size and load time

2. **Ensure fonts load efficiently**:
   ```css
   @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
   ```
   - `display=swap` allows fallback font while loading

3. **Check for render-blocking resources**:
   - CSS should load in `<head>`
   - Scripts should be at end of `<body>`

## Getting Help

### Debug Commands

```bash
# Check all design system tokens
grep -n "@theme" packages/ui/src/styles/globals.css

# Find hardcoded colors
grep -r "#[0-9A-Fa-f]" apps/ --include="*.tsx" | head -20

# Check for VOID classes
grep -r "void-\|kanso\|ma-4" apps/ --include="*.tsx"

# Verify Tailwind is working
bun run build --filter=@hominem/rocco 2>&1 | grep -i "error\|warn"
```

### Resources

- **Design System Docs**: [Canonical merged design system](/Users/charlesponti/Developer/hominem/docs/DESIGN_SYSTEM.md)
- **Migration Guide**: `docs/MIGRATION_GUIDE.md`
- **Token Source**: `packages/ui/src/styles/globals.css`
- **Tailwind Config**: `packages/ui/tailwind.config.ts`
- **Component Examples**: `packages/ui/src/components/ui/`

### Asking for Help

Include:
1. What you're trying to do
2. What class/token you're using
3. What you expect vs. what you see
4. Browser and OS
5. Screenshot or video if helpful
6. Relevant code snippet

## Still Stuck?

1. Check the docs above (they cover 90% of issues)
2. Search for similar issues in git history
3. Ask a teammate or file an issue
4. The design system is actively maintained - feedback helps!
