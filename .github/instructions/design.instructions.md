---
applyTo: 'apps/**'
---

# Design

## Analytics

- Show metric definition, unit, and time window with timezone.
- Use shared formatting helpers and design tokens.
- Mobile-first; tables collapse to stacked cards.
- Provide loading, empty, and error states.
- Charts and tables must be accessible and keyboard friendly.
- Provide text summaries for charts and table fallbacks when needed.
- Aggregate and paginate server-side; debounce filters.
- Include exports for actionable datasets.
- Use semantic color tokens for positive/negative values.

## Minimalist & Accessibility

### Visual Design

- Maintain WCAG AA contrast ratio (4.5:1 for text, 3:1 for UI components).
- Use a constrained color palette; limit to 4-6 semantic colors plus neutral tones.
- Embrace whitespace; avoid visual clutter and cognitive overload.
- Use a single, clear typography scale (max 3-4 font sizes for hierarchy).
- Apply consistent spacing using design tokens (multiples of 4px or 8px).

### Interaction & Navigation

- Every interactive element must be keyboard accessible with visible focus states.
- Support tab order that matches visual layout; test with keyboard-only navigation.
- Use semantic HTML (`<button>`, `<nav>`, `<main>`, `<label>`) before ARIA.
- Provide ARIA labels only when semantic HTML is insufficient.
- Support `prefers-reduced-motion` media query; disable animations for users who need it.

### Forms & Input

- Always pair inputs with explicit `<label>` elements (not placeholders alone).
- Use `aria-describedby` for helper text and error messages.
- Provide clear, constructive error messages below invalid fields.
- Mark required fields with asterisks and `aria-required="true"`.
- Disable form submission until critical validation passes.

### Content & Language

- Use plain language; avoid jargon and unnecessary complexity.
- Break content into scannable sections with clear headings.
- Use lists instead of dense paragraphs for multiple items.
- Keep instructions concise and action-focused.
- Provide helpful, contextual information (e.g., format hints) near inputs.

### Icons & Images

- Never rely on icons alone; pair with text labels.
- Provide `alt` text for all images (concise and meaningful).
- Use `aria-hidden="true"` for decorative icons; expose functional ones.
- Ensure icon colors pass contrast requirements.

### State & Feedback

- Provide immediate, clear feedback for user actions (success, error, loading).
- Use progress indicators for multi-step processes.
- Announce dynamic content changes with `aria-live="polite"`.
- Maintain focus position or return focus to trigger element after updates.
