## 1. Dependency updates

- [ ] 1.1 Add `@tanstack/start` and related packages to `apps/notes/package.json`
- [ ] 1.2 Keep `react-router` temporarily for coexistence

## 2. Route structure migration

- [ ] 2.1 Create `apps/notes/src/app/` directory with page/layout files matching current routes
- [ ] 2.2 Implement a simple start entrypoint (e.g. `src/main.tsx`) that initializes the router
- [ ] 2.3 Port each route component from `routes.tsx` into file-based pages
- [ ] 2.4 Add nested `layout.tsx` files where shared UI exists

## 3. Navigation and helpers

- [ ] 3.1 Replace all `Link`/`NavLink` imports and usages with `@tanstack/start` equivalents
- [ ] 3.2 Update any programmatic navigation hooks to use start
- [ ] 3.3 Adjust shared components that reference `react-router` types

## 4. Testing updates

- [ ] 4.1 Modify unit tests to render pages using start's testing utilities
- [ ] 4.2 Ensure each spec scenario is covered by a test
- [ ] 4.3 Update or add e2e tests to start the app and verify navigation paths

## 5. Cleanup

- [ ] 5.1 Remove `react-router` dependencies and leftover code
- [ ] 5.2 Update README/notes with migration instructions
- [ ] 5.3 Run `bun run lint --parallel` and `bun run test --filter=apps/notes` to verify

## 6. Deployment and verification

- [ ] 6.1 Deploy to staging, click through all routes
- [ ] 6.2 Roll back if any critical issue arises (revert to previous commit)
