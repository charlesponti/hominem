---
title: Deep VOID Design System - Apps Implementation
type: feat
date: 2026-02-06
---

# Deep VOID Design System - Apps Implementation

## Overview

Complete the VOID design system transformation by applying Japanese minimalism principles (Kanso, Ma, Shibui, Wabi-sabi) to the apps layer. While the UI component library and globals.css enforce VOID at the framework level, the three applications (rocco, finance, notes) still contain numerous violations: animations, transitions, rounded corners, shadows, emojis, and inconsistent typography. This plan eliminates those violations systematically across 30-45 files.

## Problem Statement / Motivation

The VOID design system is **100% implemented in the UI component library** (`packages/ui/src/`), but **0% enforced in app implementation** (`apps/`). Apps continue using:

- **Framer Motion animations** violating *Shibui* (no motion principle)
- **CSS transitions and duration classes** contradicting global animation disable
- **50+ rounded-corner instances** breaking sharp precision mandate
- **Shadows and backdrop-blur effects** introducing false depth
- **Emojis and decorative icons** violating *Kanso* (no non-essential elements)
- **Mixed typography scales** lacking monospace uppercase standardization
- **Scale/transform hover states** with smooth transitions (vs. instant feedback)

This creates cognitive dissonance: UI primitives are perfectly VOID-compliant, but pages feel conventional and animated. Apps contradict the global CSS rules.

**Impact**: Users experience VOID design system inconsistently. Pages with heavy animations (rocco about page, finance imports) feel less minimalist than their underlying button components.

## Proposed Solution

**Systematic, phase-based purge of anti-VOID patterns** across three apps following this roadmap:

1. **Phase 1**: Remove all animations (framer-motion, animate-spin, transitions)
2. **Phase 2**: Remove all visual depth (rounded corners, shadows, blur)
3. **Phase 3**: Standardize typography (form labels, buttons, headings to VOID system)
4. **Phase 4**: Remove decorative elements (emojis, custom SVG icons)
5. **Phase 5**: Refactor hover states (instant color/border changes only)
6. **Phase 6**: Component-specific cleanups (headers, spinners, dialogs, maps)

**Total scope**: 30-45 files across `apps/rocco/`, `apps/finance/`, `apps/notes/`. Estimated effort: 15-20 engineering hours.

## Technical Approach

### Phase 1: Animation Purge (Shibui Enforcement)

**Philosophy**: Remove all motion. Replace with instant state display.

#### 1.1 Remove Framer Motion Imports & Motion Variants

**Files**:
- `apps/rocco/app/routes/$.tsx` - Fadeout animations, staggered containers
- `apps/rocco/app/routes/about.tsx` - Hero section fadeIn, staggered feature cards, origin story section
- `apps/finance/app/routes/import.tsx` - Multi-step dialog transitions

**Changes**:
- Remove `import { motion } from 'framer-motion'`
- Remove animation `variants` objects (`fadeIn`, `staggerContainer`, `slideIn`, etc.)
- Replace `<motion.X>` with standard DOM elements (`<div>`, `<section>`, etc.)
- Remove `initial`, `whileInView`, `animate`, `exit` props
- Remove `transition` objects from variant definitions

**Example**:
```typescript
// BEFORE
const fadeIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

<motion.section initial="hidden" whileInView="visible" variants={fadeIn}>
  Content
</motion.section>

// AFTER
<section>
  Content
</section>
```

#### 1.2 Remove animate-spin, animate-pulse Classes

**Files**:
- `apps/finance/app/routes/accounts.$id.tsx` - Spinner in account loading state
- `apps/notes/app/routes/tasks/page.tsx` - Task list spinner
- `apps/finance/app/components/loading.tsx` - Global loading component

**Changes**:
- Remove `animate-spin`, `animate-pulse` classes from spinner elements
- Replace with static border styling: `border-b-2 border-foreground`
- Keep size and positioning; remove motion

**Example**:
```typescript
// BEFORE
<div className="animate-spin rounded-full border-2 border-border border-t-blue-600" />

// AFTER
<div className="border-b-2 border-foreground" style={{ width: '32px', height: '32px' }} />
```

#### 1.3 Remove All Transition Classes

**Scope**: ~30 files across all three apps

**Target classes**:
- `transition-*` (colors, opacity, transform, all, etc.)
- `duration-*` (75, 100, 150, 200, 300, 500, etc.)
- `ease-*` (in, out, linear, etc.)

**Files** (representative):
- `apps/rocco/app/components/places/place-row.tsx` - `group-hover:scale-105 transition-transform`
- `apps/finance/app/routes/home.tsx` - Button with `transition-all duration-200`
- `apps/rocco/app/components/places/place-types.tsx` - Badge with `transition-all duration-200`
- Form inputs across finance budget components

**Tool**: Global search/replace: `transition-\w+|duration-\w+` (regex)

#### 1.4 Remove Inline CSS Transitions

**Files**:
- `apps/rocco/app/components/map.tsx` - Marker styling with `transition: 'width 0.2s, height 0.2s, background-color 0.2s'`

**Changes**:
- Strip `transition` property from inline `style` objects
- Keep size/color changes as instant (no easing)

**Example**:
```typescript
// BEFORE
style={{ transition: 'width 0.2s, height 0.2s, background-color 0.2s' }}

// AFTER
// (property removed entirely)
```

---

### Phase 2: Visual Structure Collapse (Kanso + Sharp Precision)

**Philosophy**: Maximize functional minimalism. Use borders and opacity for visual hierarchy, not depth or curves.

#### 2.1 Global rounded-* Removal

**Scope**: ~50 instances across apps

**Files** (representative):
- `apps/rocco/app/components/places/PlacePhotos.tsx` - `rounded-2xl` on photo gallery
- `apps/rocco/app/components/places/PlaceMap.tsx` - `rounded-2xl` on map embed
- `apps/rocco/app/routes/about.tsx` - Icon containers with `rounded-lg`
- All form dialogs and cards with `rounded-md` or `rounded-lg`
- Badge/pill components with `rounded-full`

**Tool**: Global find-replace: `rounded-\w+` → remove class entirely (or use `rounded-none` explicitly)

#### 2.2 Remove All Shadow Classes

**Target classes**: `shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`

**Files** (representative):
- `apps/rocco/app/components/map.lazy.tsx` - `shadow-md` on map placeholder
- `apps/rocco/app/routes/about.tsx` - CTA section with `shadow-md`
- `apps/rocco/app/components/places/place-types.tsx` - Badge with `shadow-sm`
- Finance card components with shadows

**Tool**: Global find-replace: `shadow-\w+` → remove class

#### 2.3 Remove Backdrop Blur Effects

**Target classes**: `backdrop-blur-sm`, `backdrop-blur-md`, `backdrop-blur-lg`

**Files**:
- `apps/rocco/app/components/places/PlacePhotoLightbox.tsx` - Lightbox overlay buttons
- `apps/rocco/app/components/places/place-types.tsx` - Badge backgrounds

**Changes**:
- Remove `backdrop-blur-*` classes
- Replace with solid background (use semantic color tokens: `bg-muted`, `bg-secondary`, etc.)

---

### Phase 3: Typography Standardization (VOID Form Aesthetic)

**Philosophy**: All text is monospace. Form labels are uppercase. Hierarchy is via semantic classes from globals.css.

#### 3.1 Standardize Form Labels

**Pattern**: Add `font-mono uppercase text-xs tracking-tight` to all form labels

**Files**:
- `apps/finance/app/components/budget-category-form.tsx` - All input labels
- `apps/notes/app/components/priority-select.tsx` - Dropdown label
- `apps/rocco/app/components/lists/list-form.tsx` - Form field labels
- All dialog input wrappers across apps

**Example**:
```typescript
// BEFORE
<label className="block text-sm font-medium text-gray-700">Category Name</label>

// AFTER
<label className="block font-mono uppercase text-xs tracking-tight text-foreground">Category Name</label>
```

#### 3.2 Apply VOID Typography Hierarchy

**Pattern**: Use semantic classes from globals.css:
- `heading-1`, `heading-2`, `heading-3`, `heading-4` for page/section titles
- `body-sm`, `body-md` for body text (inherit from theme)
- `display-1`, `display-2` for hero/landing pages

**Files**:
- `apps/rocco/app/routes/about.tsx` - Hero title, feature section titles
- `apps/finance/app/routes/home.tsx` - Dashboard titles
- `apps/notes/app/routes/home.tsx` - Notes list title

**Example**:
```typescript
// BEFORE
<h1 className="text-4xl font-serif font-light">Your places</h1>

// AFTER
<h1 className="heading-1">Your places</h1>
```

#### 3.3 Button Text Uppercase

**Pattern**: All button labels become `uppercase text-sm tracking-tight`

**Files**: Button components in all forms, dialogs, CTAs across apps

---

### Phase 4: Decoration Removal (Wabi-sabi Technical Honesty)

**Philosophy**: All visual elements serve function. No emoji, no custom SVG if lucide-react equivalent exists.

#### 4.1 Replace Emojis with Monospace Text

**Instances**:
- `apps/rocco/app/components/places/PlacePriceLevel.tsx` - 🤑 emoji → "PRICE LEVEL" text with numeric indicator
- Star emoji in ratings → monospace "RATING: 4.5 / 5" format
- Custom emoji indicators elsewhere

**Example**:
```typescript
// BEFORE
<span className="text-green-500 px-[4px]">🤑</span>

// AFTER
<span className="text-foreground px-[2px]">$$</span>
```

#### 4.2 Consolidate Icons to lucide-react

**Files**:
- `apps/notes/app/components/icons/SocialX.tsx` - Replace with lucide-react's `X` or custom monospace text
- Any custom SVG icon file

**Rule**: If lucide-react has the icon (Mail, MapPin, Star, etc.), use that. Otherwise, use monospace character or remove.

#### 4.3 Remove Decorative Background Elements

**Files**:
- `packages/ui/src/components/background-elements.tsx` - Decorative emoji array
- Any gradient overlays or decorative pseudo-elements

---

### Phase 5: Hover State Refactoring (No Transforms)

**Philosophy**: Hover feedback is instant binary state change (color/border shift), not smooth motion or scale.

#### 5.1 Replace Hover Scale Transforms

**Pattern**: Replace `hover:scale-105` + `transition-transform` with simple opacity/color change

**Files**:
- `apps/rocco/app/components/places/place-row.tsx` - List item hover
- `apps/rocco/app/components/places/place-types.tsx` - Badge hover
- `apps/rocco/app/components/places/PlacePhotos.tsx` - Photo grid item hover

**Example**:
```typescript
// BEFORE
<div className="hover:scale-105 transition-transform">...</div>

// AFTER
<div className="hover:opacity-80">...</div>
// or
<div className="hover:bg-muted">...</div>
```

#### 5.2 Remove Group Hover Transforms

**Pattern**: Replace `group-hover:scale-*`, `group-hover:shadow-*` with opacity/color shifts

**Files**: List items, menu items, card components across apps

---

### Phase 6: Component-Specific Updates

#### 6.1 Loading Spinner Standardization

**Files**:
- `packages/ui/src/components/ui/loading-spinner.tsx` - Already updated (no animate-spin)
- Verify all uses in apps follow this pattern

**Target state**: Static border element, no animation

#### 6.2 Map Component Marker Transitions

**File**: `apps/rocco/app/components/map.tsx`

**Changes**:
- Remove inline `transition` CSS from marker inline styles
- Keep color/size changes as instant state updates

#### 6.3 Dialog/Modal Entry States

**Changes**:
- Remove animate-in/fade-in data-state animations (already done in UI components)
- Verify all dialog routing uses instant overlay display

#### 6.4 Header/Navigation Simplification

**Files**:
- `apps/rocco/app/components/header.tsx`, `apps/finance/app/components/header.tsx`, `apps/notes/app/components/header.tsx`

**Optional enhancement**: Consider text-only navigation labels vs. icon-heavy layouts (not critical, defer if time-constrained)

---

## Alternative Approaches Considered

### 1. "UI-Only" Approach (Rejected)
Keep apps as-is, rely on global CSS enforced animations disable. **Problem**: Page-level components still violate VOID philosophy conceptually; visual inconsistency remains.

### 2. "Selective Cleanup" (Rejected)
Remove only the most egregious violations (framer-motion, shadows). **Problem**: Leaves half-measures; gaps in VOID compliance remain (rounded corners, emojis).

### 3. **Proposed: Comprehensive Phase-Based Refactor** (Selected)
Systematic elimination of all anti-VOID patterns in order of impact. Phases are independent; can interrupt/pause after Phase 2 if needed. Achieves 100% VOID compliance across all three apps.

---

## Acceptance Criteria

### Functional Requirements

- [ ] **Zero framer-motion imports** in any app file (search should return zero results)
- [ ] **Zero animation/transition classes** in app code (`animate-*`, `transition-*`, `duration-*`)
- [ ] **Zero rounded-corner classes** (`rounded-*`) in app files
- [ ] **Zero shadow classes** (`shadow-*`) in app files
- [ ] **Zero backdrop-blur classes** (`backdrop-blur-*`)
- [ ] **Zero emojis** in components; replaced with monospace text or lucide-react icons
- [ ] **All form labels** follow pattern: `font-mono uppercase text-xs tracking-tight`
- [ ] **All page titles** use semantic heading classes (`heading-1`, `heading-2`, etc.)
- [ ] **All buttons** have uppercase text with `tracking-tight`
- [ ] **All hover states** use instant color/opacity changes, no scale transforms
- [ ] **Loading spinners** render as static borders (no `animate-spin`)

### Non-Functional Requirements

- [ ] **Type safety**: Zero TypeScript errors after all changes (`bun run typecheck` passes all 26 packages)
- [ ] **No visual regressions**: Interactive states (focus, hover, active) remain distinct via border/color/opacity
- [ ] **Form usability**: Focus states and error indicators remain visible
- [ ] **Page navigation**: All dynamic routing continues to work (instant view changes)

### Quality Gates

- [ ] **Code review**: All changes reviewed for pattern consistency
- [ ] **Visual inspection**: Spot-check key pages in all three apps (rocco places list, finance budget, notes tasks)
- [ ] **Search verification**: Run grep to verify zero remaining VOID violations:
  ```bash
  grep -r "rounded-\|shadow-\|transition-\|animate-\|backdrop-blur\|framer-motion" apps/ | wc -l
  # Should return 0 (or only hits in node_modules)
  ```

---

## Success Metrics

| Metric | Current | Target | Impact |
|--------|---------|--------|--------|
| **Framer Motion imports** | 3 files | 0 files | Eliminates all animations |
| **Transition classes** | ~30 files | 0 files | Ensures instant feedback |
| **Rounded-corner instances** | ~50 | 0 | 100% sharp precision |
| **Shadow instances** | ~20 | 0 | Removes false depth |
| **Emoji count** | ~5 | 0 | Pure typographic design |
| **Form labels w/o uppercase** | ~15 | 0 | Uniform VOID aesthetic |
| **Type errors** | 0 | 0 | Zero regressions |

---

## Dependencies & Prerequisites

- **Git**:  Current branch: `main` (no branch switching needed; work directly on main or create feature branch)
- **Type safety**: All changes must pass `bun run typecheck` (automated validation)
- **UI library**: Assumes `packages/ui/` is already 100% VOID-compliant (completed in previous phase)
- **Test coverage**: Manual visual testing in browsers; no automated test updates required (no tests exist for styling)

---

## Risk Analysis & Mitigation

| Risk | Probability | Severity | Mitigation |
|------|-------------|----------|-----------|
| Breaking page layout due to removed transitions | Low | Medium | Changes are class removals only; structure preserved. Test pages in Firefox/Chrome. |
| Hover states become indistinguishable from non-hover | Low | Medium | Use border-color shift or opacity change; test interactive elements. |
| Focus states lost on form inputs | Low | High | Verify all focus selectors still apply border/color (globals.css handles this). Test keyboard navigation. |
| Animation dependencies in routes (framer-motion coords) | Low | Low | Replace with instant view swaps; React Router handles state. Test navigation transitions (instant). |
| Loading spinners appear "broken" (static vs. spinning) | Low | Low | Expected behavior; static border is VOID-compliant. Document in commit message. |
| Emoji replacement text too long | Very Low | Low | Use short monospace indicators: "PRICE: $$", "RATING: 4.5". |

---

## Resource Requirements

**Team**: 1 engineer (you)

**Time**: 15-20 hours
- Phase 1 (Animation purge): 4 hours
- Phase 2 (Visual structure): 3 hours
- Phase 3 (Typography): 3 hours
- Phase 4 (Decoration): 2 hours
- Phase 5 (Hover states): 2 hours
- Phase 6 (Component-specific): 1 hour
- Q/A, testing, fixes: 2-3 hours

**Tools**:
- VS Code find/replace (batch operations)
- `multi_replace_string_in_file` for parallel edits
- `bun run typecheck` for validation
- Browser DevTools for visual verification

---

## Future Considerations

### Extensibility

1. **New components**: All future components in `apps/` will automatically inherit VOID constraints from globals.css; no special effort needed.
2. **Feature additions**: Form enhancements, new pages—developers should use VOID typography/color utilities from `packages/ui/src/constants/chart-colors.ts` and globals classes.

### Long-Term VOID Compliance

- **Linting rule**: Consider adding ESLint rule to flag `rounded-`, `shadow-`, `transition-`, `animate-` classes (warns developers).
- **Documentation**: Add VOID design system guide to `docs/` with examples for developers.
- **CI/CD**: Optionally add pre-commit hook to lint for anti-VOID patterns.

### Optional Enhancements (Out of Scope)

- Header/navigation text-only redesign (defer unless UX audit requests)
- Loading skeleton pulse animations (use opacity fade instead—defer to Phase 6 if time)
- Map component marker redesign (current changes sufficient)

---

## References & Research

### Internal References

- **VOID Philosophy**: [packages/ui/src/styles/globals.css](packages/ui/src/styles/globals.css#L1-L50) — Complete VOID design system definition
- **Typography System**: [globals.css heading classes](packages/ui/src/styles/globals.css#L345-L420) — Defined `heading-1` through `heading-4`, display scaless
- **Color Palette**: [packages/ui/src/constants/chart-colors.ts](packages/ui/src/constants/chart-colors.ts) — Semantic color tokens for all components
- **UI Component Cleanup**: Previous session completed all 35 UI components; app layer is final frontier

### External Documentation

- **Japanese Minimalism**: Kanso, Ma, Shibui, Wabi-sabi principles define VOID aesthetic
- **CSS Best Practices**: Flat design (no shadows), instant feedback (no transitions), monospace typography (terminal aesthetic)

### Related Issues/PRs

- None currently (this is the final VOID phase)

---

## Implementation Checklist

- [ ] **Phase 1**: Remove framer-motion, animate-spin, all transitions
- [ ] **Phase 2**: Remove rounded-*, shadows, backdrop-blur
- [ ] **Phase 3**: Standardize form labels, apply heading classes
- [ ] **Phase 4**: Replace emojis, consolidate icons
- [ ] **Phase 5**: Replace hover transforms with color/opacity
- [ ] **Phase 6**: Component-specific cleanup
- [ ] **Validation**: Run typecheck (26/26 packages pass)
- [ ] **Verification**: Grep for remaining violations (0 results)
- [ ] **Testing**: Visual spot-check of rocco/finance/notes apps
- [ ] **Documentation**: Commit message summarizing changes by phase

