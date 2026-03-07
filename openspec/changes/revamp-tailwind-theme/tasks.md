# Tasks for revamp-tailwind-theme

1. **Create Tailwind config**
   - Add `packages/ui/tailwind.config.ts` with dark mode, prefix, and initial
     theme values based on Apple guidelines.
   - Configure `content` paths to scan `packages/ui/src/**/*` and apps.

2. **Split globals.css**
   - Move `@theme` variables into `tokens.css`.
   - Extract base rules (html/body, resets, typography) into `base.css`.
   - Keep only a small set of custom utilities in `utilities.css` and prefix them.
   - Update each app’s `globals.css` import accordingly.

3. **Add transitional alias layer**
   - In new utilities or a separate file, define old class names mapping to
     prefixed Tailwind classes for incremental migration.

4. **Export theme tokens to TypeScript**
   - Write a script (e.g., `packages/ui/scripts/generate-theme.ts`) that reads
     `tailwind.config.ts` and emits `src/theme.ts` with typed colors/spacing.
   - Add a build step or Vite plugin to run the generator.

5. **Update UI components**
   - Replace hard‑coded class names (`text-primary`, `btn`) with new utilities or
     theme references.
   - Use `theme.ts` import where appropriate.

6. **Update apps**
   - Point each app’s `globals.css` at new token/base/utilities files.
   - Find and replace occurrences of old classes throughout apps and update them.
   - Ensure build passes and visual diffs are minimal.

7. **Documentation and cleanup**
   - Add a `packages/ui/README.md` describing the design system and tokens.
   - Remove philosophical comments from CSS and, if needed, move them to docs.
   - Delete deprecated `globals.css` once it's no longer referenced.

8. **Mobile coordination (optional spike)**
   - Investigate how to sync tokens with `@shopify/restyle` theme.
   - Consider exporting a shared JSON or TS file for colors/spacing.

9. **Testing and validation**
   - Run linting/knip to ensure no unused utilities or missing tailwind scans.
   - Add a visual smoke test to catch regressions in theme (e.g., screenshot suite).  

10. **Review & merge**
    - Get design review from stakeholders, adjust tokens as needed.
    - Merge changes once apps are stable.


