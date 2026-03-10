## Context

The notes application currently uses `react-router` v6 for all client-side routing. Route definitions and navigation components are spread across `apps/notes/src/routes.tsx`, various `Link` imports, and layout components. This setup requires manual configuration for nested layouts and shared UI.

`@tanstack/start` is a newer routing/startup framework with file-based routing, conventions, and faster build times. Migrating the notes app offers consistency with other modern packages and simplifies route management.

Constraints:
- Migration should not disrupt other apps or shared packages.
- Existing URL paths must remain stable unless a redirect is explicitly defined.

## Goals / Non-Goals

**Goals:**
- Fully replace `react-router` with `@tanstack/start` in the notes app
- Preserve all user-visible routes and navigation behavior
- Remove unused dependencies and test helpers
- Establish a pattern others can follow for future app migrations

**Non-Goals:**
- Migrating other applications (finance, mobile, etc.)
- Reworking authentication or data fetching logic unrelated to routing

## Decisions

- **Framework adoption**: Use `@tanstack/start` version consistent with workbook guidelines (check root `package.json`). Rationale: lightweight, built‑in file routes, common standard across new apps.
- **Route organization**: Convert current `src/routes.tsx` into a `src/app/` directory with `page.tsx` files per route and optional `layout.tsx` for nested layouts. This follows start's file-based convention and will allow automatic code-splitting.
- **Navigation components**: Replace all `react-router` `<Link>` / `<NavLink>` with the `@tanstack/start` `<Link>`; for programmatic navigation, use `useNavigate` hook from start.
- **Testing**: Update notes app tests to render routes using `start`'s `initializeTest` helpers or screen rendering from `@tanstack/start/react`. Stub or mock navigation as needed. Rationale: keep existing tests working with minimal rewrites.
- **Dependency cleanup**: Remove `react-router` packages from `apps/notes/package.json`; add `@tanstack/start` and any peer dependencies. Update `tsconfig` if type imports change.
- **E2E flows**: Update any Playwright or Cypress configs to start the dev server appropriately; routing changes should be transparent to test suites.

## Risks / Trade-offs

- [Risk] Breaking URL paths inadvertently during migration → **Mitigation**: maintain a list of current routes; run automated test scenarios covering each path before/after migration.
- [Risk] Developer unfamiliarity with `@tanstack/start` patterns → **Mitigation**: include a short migration note in README and pair with colleague for initial implementation.
- [Risk] Potential small bundle size regressions or build-time issues → **Mitigation**: compare build output, run `bun run check` and tests.

## Migration Plan

1. Add `@tanstack/start` to notes app dependencies alongside `react-router`.
2. Implement routes under new folder structure in parallel; keep original routes intact behind a feature flag or separate branch.
3. Update navigation components and tests to use new APIs.
4. Remove `react-router` imports and packages once all tests pass.
5. Run full QA and deploy to staging, verify route coverage.
6. Remove flag/branch, merge.

## Open Questions

- Should we keep both routing systems during a transitional period or switch all at once? (plan above assumes all-at-once with flag if needed)
- Are there any shared components outside notes app relying on `react-router` types? If so, will need careful refactor.
