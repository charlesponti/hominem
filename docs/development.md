# III. Development

The system must behave predictably from a clean checkout through deployment and production incidents.

## Commands

`just` provides `setup`, `check`, `db`, `mcp`, and `mobile`. Local infrastructure is managed by the shared foundation repository. Everything else is a root `pnpm` script, optionally scoped with `--filter`.

The full command list, the default dev/validation loops, local OpenTelemetry
setup, and the production user-data merge tool are runbook content — see the
`hominem-development` skill (`.agents/skills/hominem-development/`).

## Development rules

- Use `just` and the root `pnpm` scripts as the repository command interface. Package scripts are Turbo implementation details, not contributor instructions.
- Start with the smallest relevant validation command: `pnpm lint`, `pnpm typecheck`, `pnpm build`, or `pnpm test`. Scope it with `--filter=@hominem/<package>...`, for example `--filter=@hominem/api...`.
- The monorepo resolves types through compiled declaration contracts, not source. Package `exports` `types` conditions point at `build/`, and declaration emit is a types-only artifact. Run `pnpm dev:types` alongside `pnpm dev` when editing shared types: composite packages are watched via `tsc -b`, while the API/RPC boundaries use declaration-only emit watchers. Runtime (tsx, metro, vite) runs from source and is unaffected. If a type change ripples further than one hop, restart the TypeScript server. See [docs/type-system.md](type-system.md) for the model and its remaining tasks, and [docs/type-performance.md](type-performance.md) for why the watcher is shaped the way it is and what else was tried to speed up type-checking.
- Published shared packages expose compiled artifacts. Local development may use source aliases for hot reload, but CI, deployables, EAS, and external consumers must use the same compiled public exports.
- Keep the shared UI package registry-resolved in manifests and lockfiles. Use `just ui link [path]`, `just ui status`, and `just ui unlink` for a reversible local source link. Never commit the local path.
- Use the same Node and pnpm versions in local development, CI, Docker, Railway, and EAS. A version mismatch is a defect.
- `@hominem/env` defines shared environment-variable behavior. Framework prefixes adapt a variable for a runtime; they must not give it a second meaning.
- Redact secrets from logs. Use a safe identifier instead of a raw third-party URL when one is available.

## Deployment rules

Each production service must have one deployment authority. A Railway service managed by GitHub must not also use Railway linked-source auto-deploy.

A deployment target is identified by this set of values:

```text
repository + logical service + immutable Railway service ID
+ checked-in configuration path + triggering workflow
```

An accepted upload does not prove that deployment succeeded. Automation must verify the resolved target and the final remote deployment state.

Omiro's mobile delivery, release, and app-specific implementation notes are documented in [the Omiro README](../apps/omiro/README.md). General repository and deployment rules remain here.

## Environment variables
- **Dev Database**: `DATABASE_URL="postgresql://postgres:postgres@localhost:5434/hominem"`
- **Test Database**: `DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:4433/hominem-test"`