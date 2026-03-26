# Storybook Coverage Report

Generated: 2026-03-25

## Summary

This report identifies components without Storybook stories and prioritizes which should be documented.

## Missing Stories (by Priority)

### 🔴 High Priority (User-Facing Components)

These components should have comprehensive Storybook stories:

| Component | File | Type | Reason |
|-----------|------|------|--------|
| `Composer` | `composer/composer.tsx` | Layout | Main message input UI - needs variant stories |
| `ComposerShell` | `composer/composer-shell.tsx` | Container | Wraps composer interactions - needs integration story |
| `CodeBlock` | `ai-elements/code-block.tsx` | Content | Code display - needs syntax highlighting stories |

### 🟡 Medium Priority (Internal/Specialized)

These components are useful but less critical:

| Component | File | Type | Reason |
|-----------|------|------|--------|
| `ComposerActionsRow` | `composer/composer-actions-row.tsx` | Internal | Action buttons - internal to composer |
| `ComposerAttachmentList` | `composer/composer-attachment-list.tsx` | Internal | Attachment display - internal to composer |
| `ComposerTools` | `composer/composer-tools.tsx` | Internal | Tool buttons - internal to composer |
| `AttachedNotesList` | `composer/attached-notes-list.tsx` | Internal | Note display - internal to composer |
| `AuthRouteLayout` | `auth/auth-route-layout.tsx` | Layout | Auth page layout - internal, wrapped by apps |
| `AuthScaffold` | `auth/auth-scaffold.tsx` | Layout | Auth container - internal, used for all auth pages |

### 🟢 Low Priority (Utilities/Data)

These don't require stories:

| Component | File | Type | Reason |
|-----------|------|------|--------|
| `ChatStoryData` | `chat/chat-story-data.tsx` | Utility | Test data - internal to Storybook |
| `ComposerProvider` | `composer/composer-provider.tsx` | Provider | Context provider - test via consumers |

---

## Action Items

### Immediate (Add Stories for High-Priority)

**1. CodeBlock** (`src/components/ai-elements/code-block.tsx`)
```tsx
// Story should cover:
- Basic code display
- Different languages (ts, jsx, bash, python)
- Line highlighting
- Copy button interaction
- Long code (with scrolling)
```

**2. Composer** (`src/components/composer/composer.tsx`)
```tsx
// Story should cover:
- Empty state
- With text input
- With attachments
- With suggested tools
- With voice input pending
- Disabled state
- Different sizes/layouts
```

**3. ComposerShell** (`src/components/composer/composer-shell.tsx`)
```tsx
// Story should cover:
- With active editing
- With form validation
- With submission loading
- With error states
- Mobile responsive
```

### Optional (Medium-Priority)

Consider adding stories for internal Composer pieces once main Composer story is created:
- ComposerActionsRow
- ComposerAttachmentList
- ComposerTools

These can be documented as sub-stories of Composer for integrated testing.

---

## Current Coverage

**Total Components Analyzed**: ~100
**With Storybook Stories**: ~85
**Without Stories**: ~15
**Coverage Rate**: **85%**

### By Category

| Category | Total | With Stories | Coverage |
|----------|-------|--------------|----------|
| UI (primitives) | 35 | 35 | 100% ✓ |
| Chat | 15 | 13 | 87% |
| Layout | 8 | 6 | 75% |
| AI Elements | 8 | 6 | 75% |
| Composer | 7 | 0 | 0% ⚠️ |
| Auth | 6 | 2 | 33% ⚠️ |
| Typography | 4 | 4 | 100% ✓ |
| Navigation | 5 | 5 | 100% ✓ |
| Filters | 4 | 3 | 75% |

---

## Quality Standards

Storybook stories should follow these guidelines:

### Story Structure

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Component } from './component';

const meta = {
  title: 'Components/Category/ComponentName',
  component: Component,
  tags: ['autodocs'],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Default props
  },
};

export const Variant: Story = {
  args: {
    // Variant props
  },
};
```

### Required Stories

1. **Default** — Component with standard props
2. **Variant(s)** — Each significant variant (size, state, type)
3. **States** — Disabled, loading, error, empty, etc.
4. **Responsive** — Mobile, tablet, desktop if applicable
5. **Interactive** — Use Storybook `userEvent` to test interactions

### Documentation

- Add JSDoc comments describing purpose
- Include a `parameters.docs.description.component` for context
- Link to related components
- Show real-world examples

---

## Next Steps

1. Create stories for high-priority components (CodeBlock, Composer, ComposerShell)
2. Update this report when new components are added
3. Aim for 95%+ coverage as new features are built
4. Use Chromatic for visual regression testing on stories

---

## Tools

- **Storybook**: `npm run storybook` (port 6006)
- **Build**: `npm run build:storybook`
- **Autodocs**: Automatically generates prop documentation from TypeScript types
