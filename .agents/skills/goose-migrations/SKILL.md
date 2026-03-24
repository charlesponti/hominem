---
name: goose-migrations
description: Author, inspect, validate, and run Goose SQL migrations for the Hominem monorepo. Use when work involves `packages/db/migrations/*.sql`, schema changes, Goose status/apply/rollback commands, or repo-specific migration safety rules and execution flow.
---

# Goose Migrations

Use this skill for the full Hominem Goose migration lifecycle. Treat this skill as the repo-specific exception that allows creating SQL migration files when the task is in scope for `packages/db` migrations.

Read `references/hominem-goose-workflow.md` before editing or running migrations. It contains the canonical file template, root-run commands, validation steps, and safety rules.

## Workflow

1. Confirm the task actually requires a database migration rather than an app-layer change.
2. Inspect the current migration set in `packages/db/migrations/` and any active OpenSpec change that depends on the schema change.
3. Scaffold new migrations with `make db-new-migration NAME=descriptive_change`, then edit only the generated file in `packages/db/migrations/`.
4. Write both `-- +goose Up` and `-- +goose Down` blocks.
5. Keep the migration additive by default and follow expand -> backfill -> contract.
6. Refresh the generated Kysely types whenever the migration changes the schema shape.
7. Run `make db-migrate-sync` from the monorepo root for the canonical local apply-and-refresh workflow.
8. Use `make db-verify-types` and `bun run lint` to prove generated types and the repo still agree with the schema.
9. Use `make db-rollback-sync` when you intentionally roll back a local migration and need Kysely types regenerated to match.
10. Report what changed, what ran, and any follow-up rollout risks.

## Authoring Rules

- Create files named `YYYYMMDDHHMMSS_description.sql`.
- Prefer `make db-new-migration NAME=...` over creating files by hand.
- Use SQL files only. Do not generate Drizzle migrations or edit schema through direct database commands.
- Keep `Up` and `Down` blocks explicit and reversible when feasible.
- Avoid destructive operations such as `DROP COLUMN`, `DROP TABLE`, and incompatible type rewrites in normal migrations.
- If a destructive or hard-to-reverse change is unavoidable, pause and surface the rollout risk before proceeding.
- Prefer small migrations with one clear purpose over broad rewrites.

## Validation Rules

- Run migration commands from the monorepo root unless the referenced workflow explicitly requires otherwise.
- Validate both development and test databases when the change should apply to local environments.
- Use `make db-migrate-sync` as the default command after schema-changing migrations so `packages/db/src/types/database.ts` stays aligned with the live schema.
- Use `make db-verify-types` before finishing migration work, especially before commits or review handoff.
- Use the repo's migration linting and safety checks from the root `Makefile`.
- Run `bun run lint` when the schema change can affect generated types, downstream packages, or repo-wide integrity. This repo's `lint` target also verifies generated Kysely types.
- Never claim a migration is complete without telling the user exactly which commands ran and whether they passed.

## Scope Boundary

This skill applies only to Goose migration work for Hominem.

- It authorizes creating SQL migration files for this repo when the request is clearly about Goose migrations.
- It does not authorize unrelated schema rewrites, ad hoc `psql` changes, or bypassing the repo's DB access rules.
- For non-migration `packages/db` work, use the broader `database-workflow` guidance instead of forcing this skill.
