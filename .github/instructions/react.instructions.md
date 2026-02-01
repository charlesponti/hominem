---
applyTo: '**/*.{tsx,jsx}'
---

# UI & React (Checklist)

**Goal:** Build beautiful, accessible, mobile-first, and fast UIs.

Core rules

- Default to Server Components; use client components only when interactivity or browser APIs are required.
- Design mobile-first and test responsive breakpoints early.
- Accessibility by default: semantic HTML, keyboard support, focus management, ARIA where needed, and strong color contrast.
- Measure performance: use Lighthouse, Web Vitals, and local profiling; add lightweight telemetry for hotspots.

Practical rules

- Avoid inline functions/objects in JSX and memoize only after profiling.
- Lazy-load images and heavy assets; serve responsive images and optimized formats.
- Use skeletons/placeholders, debounce inputs, and paginate/virtualize long lists.
- Keep animations subtle and avoid layout-shift (CLS) issues.

Styling & components

- Use Tailwind + `@hominem/ui` tokens; avoid hardcoded colors and `@apply` in shared libraries.
- Keep components small, focused, and composable.
- Centralize tokens in `@hominem/ui` and prefer semantic names (e.g., `color-success`).

Forms & validation

- Use React Hook Form + Zod; keep schemas separate and show field-level errors.

Testing & observability

- Test user interactions with Vitest + React Testing Library; include accessibility checks and storybook stories for key states.
- Monitor UX metrics (TTI, LCP) and add lightweight telemetry for hotspots.

Keep it short: Put long examples or app-specific patterns in `docs/` and keep this file as the canonical, minimal checklist.
