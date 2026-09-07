# Pre-Push Validation

Run the full validation suite before opening a PR or pushing to main:

```bash
pnpm run check
```

This runs `pnpm check:dts && pnpm lint && pnpm build && pnpm typecheck && pnpm test` across all workspaces, with `DATABASE_URL` set (see the root `check` script in `package.json`).

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

## Build order after changing a `services/api` route or schema

Rule: if the change also touches `apps/web`/`apps/omiro`, `@hominem/api` typechecking clean is
not enough — rebuild it before touching the frontend, in this order:

```bash
pnpm --filter @hominem/api build     # regenerates build/rpc/app.d.ts — required, not optional
pnpm --filter @hominem/rpc typecheck # or build, if packages/rpc/src/types/*.ts changed too
pnpm --filter @hominem/web typecheck
```

Why: `packages/rpc`'s `HonoClient`/`AppType` (and anything derived via
`InferResponseType`/`InferRequestType`) resolve against the committed
`services/api/build/rpc/app.d.ts`, not live source. Skip the build and you get a "property doesn't
exist on client" error in frontend code that hasn't changed — the fix is never in the file the
error points at.

## Local pre-commit hooks

- `.githooks/pre-commit` — tracked, `core.hooksPath` points here, runs oxfmt on staged files.
- `.git/hooks/pre-commit` — untracked, machine-local, may run
  `react-doctor --staged --blocking warning` and abort the commit on any warning. If this blocks
  a commit, load the `react-doctor` skill.
- Before fixing a react-doctor finding, check it against `.oxlintrc.json` and existing merged
  code. react-doctor does not read `.oxlintrc.json` ("no supported framework detected" in its
  output means it fell back to a generic default ruleset) — a finding oxlint already accepts
  everywhere is a tool-mismatch false positive, not a regression. Use `--scope changed` to see
  only what the current change actually introduced.