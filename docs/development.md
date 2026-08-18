# III. Development

The system must behave predictably from a clean checkout through deployment and production incidents.

## Commands

`just` provides `setup`, `check`, `db`, `mcp`, and `mobile`. Everything else is a root `pnpm` script, optionally scoped with `--filter`.

Use the smallest possible loop by default.

1. `just setup`
2. `pnpm --filter @hominem/api dev`
3. `pnpm test --filter=@hominem/api...`

When you are working on the API or shared backend code, run the API validation lane instead:

1. Start the local test services you need.
2. Run `pnpm lint --filter=@hominem/api...`, `pnpm typecheck --filter=@hominem/api...`, `pnpm build --filter=@hominem/api...`, `pnpm test --filter=@hominem/api...`
3. `pnpm build` for a full workspace build when needed

For Omiro work, use the app bootstrap loop in [apps/omiro/README.md](../apps/omiro/README.md):

1. `just mobile prebuild development`
2. `just mobile dev`

### Canonical commands

- `just setup`: install dependencies and prepare the repo toolchain
- `just check`: read-only format, lint, typecheck, build, and test validation across the whole repo
- `pnpm dev` / `pnpm typecheck` / `pnpm build` / `pnpm test`: run for every package, or scope with `--filter=@hominem/<pkg>...` (e.g. `--filter=@hominem/api...`)
- `pnpm format`: apply formatting across the repo
- `pnpm lint` / `pnpm lint:fix`: lint the repo, or lint and apply fixes
- `just db backup`: create a timestamped SQL backup of the dev database in `~/.hominem/`
- `just db migrate [test]`: apply database migrations
- `just db codegen`: regenerate database types against the caller's `DATABASE_URL`
- `pnpm --filter @hominem/api merge-user-data`: dry-run-first, insert-only local-to-production user-data merge; see the API script help before use
- `just mobile <action>`: iOS development, test, build, update, and release commands

## Development rules

- Use `just` and the root `pnpm` scripts as the repository command interface. Package scripts are Turbo implementation details, not contributor instructions.
- Start with the smallest relevant validation command: `pnpm lint`, `pnpm typecheck`, `pnpm build`, or `pnpm test`. Scope it with `--filter=@hominem/<package>...`, for example `--filter=@hominem/api...`.
- Published shared packages expose compiled artifacts. Local development may use source aliases for hot reload, but CI, deployables, EAS, and external consumers must use the same compiled public exports.
- Keep the shared UI package registry-resolved in manifests and lockfiles. Use `just ui link [path]`, `just ui status`, and `just ui unlink` for a reversible local source link. Never commit the local path.
- Use the same Node and pnpm versions in local development, CI, Docker, Railway, and EAS. A version mismatch is a defect.
- `@hominem/env` defines shared environment-variable behavior. Framework prefixes adapt a variable for a runtime; they must not give it a second meaning.
- Redact secrets from logs. Use a safe identifier instead of a raw third-party URL when one is available.

## Production user-data merge

`pnpm --filter @hominem/api merge-user-data --sourceEmail <email> --targetEmail <email>` plans a merge without writing to either database. It requires `SOURCE_DATABASE_URL` and `TARGET_DATABASE_URL`, resolves one user in each database, verifies the complete Goose history and app schema fingerprint, and writes a permission-restricted manifest under `~/.hominem/user-data-merges/`.

Use `--apply --yes` only after reviewing that manifest. The tool creates a production `pg_dump` backup beside the manifest, inserts rows atomically, never updates or deletes production data, and aborts on any non-identical primary-key or unique-key collision. It excludes `app.ai_usage_events` and every `app.purchase_*` table. For Railway, use a temporary `pnpm dlx @railway/cli@5.25.1 connect database --tunnel-only --environment production` tunnel as `TARGET_DATABASE_URL`, then close the tunnel after the command finishes.

## Deployment rules

Each production service must have one deployment authority. A Railway service managed by GitHub must not also use Railway linked-source auto-deploy.

A deployment target is identified by this set of values:

```text
repository + logical service + immutable Railway service ID
+ checked-in configuration path + triggering workflow
```

An accepted upload does not prove that deployment succeeded. Automation must verify the resolved target and the final remote deployment state.

Omiro's mobile delivery, release, and app-specific implementation notes are documented in [the Omiro README](../apps/omiro/README.md). General repository and deployment rules remain here.
