# Pre-Push Validation

Run the full validation suite before opening a PR or pushing to main:

```bash
just check
```

This runs `pnpm format:check && pnpm lint && pnpm typecheck && pnpm build && pnpm test` across all workspaces.

If it fails, triage in this order:

1. **Typecheck errors** — fix type issues first; they often cascade into lint failures
2. **Lint errors** — `pnpm lint:fix` and `pnpm format` apply formatting and lint fixes
3. **Build errors** — check for missing exports or broken package references
4. **Test failures** — ensure the test DB is up and migrations are applied (`just db migrate test`)

For a faster per-package check on the API only:

```bash
pnpm lint --filter=@hominem/api...
pnpm typecheck --filter=@hominem/api...
pnpm build --filter=@hominem/api...
pnpm test --filter=@hominem/api...
```