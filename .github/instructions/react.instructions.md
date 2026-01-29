---
applyTo: '**/*.{tsx,jsx}'
---

# UI Guidelines (Concise)

Goal: Build beautiful, responsive, and fast user interfaces that are accessible by default and easy to maintain.

Principles

- Prefer Server Components for static/SSR content; only use client components for interactivity/state that requires them.
- Mobile-first and responsive design: design for small screens first and adapt up.
- Accessibility by default: semantic HTML, keyboard support, focus management, ARIA where needed, and text alternatives for visuals.
- Measure performance: use Lighthouse, Web Vitals, and local profiling to target real bottlenecks.

Practical Rules

- Avoid expensive renders: prefer pure components, avoid inline functions in JSX, and memoize only as needed after profiling.
- Image handling: serve responsive images (srcset), lazy-load below-the-fold images, and prefer optimized image formats.
- Data & loading states: use skeletons/placeholders, debounce user input, paginate/virtualize long lists, and cache results where appropriate.
- Animations: keep them subtle and GPU-accelerated; avoid layout-shifting animations.

Styling & Components

- Use Tailwind for utilities and `@hominem/ui` for shared primitives; avoid `@apply` in component libraries.
- Keep components small and composable: one responsibility per component.
- Centralize tokens (colors, spacing, typography) in `@hominem/ui` and use semantic names (e.g., `color-success`).

Forms & Validation

- Use React Hook Form + Zod for schemas and field-level error handling.
- Validate on submit by default; provide helpful inline error messages.

Testing & Observability

- Unit test interactions (Vitest + React Testing Library), visual snapshots for critical UI.
- Track key UX metrics (Time to Interactive, Largest Contentful Paint) and add lightweight telemetry for hotspots.

Keep it short: Put long examples or app-specific patterns in `docs/` and keep this file as the canonical, minimal checklist.
