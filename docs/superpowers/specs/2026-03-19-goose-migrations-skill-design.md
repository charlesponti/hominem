# Goose Migrations Skill Design

## Goal

Add a repo-local skill that teaches Codex how to author, inspect, validate, and run Goose migrations for Hominem. The skill must serve as the formal exception to the current repo rule that otherwise forbids creating SQL migration files.

## Scope

- Create a new `.codex/skills/goose-migrations/` skill.
- Encode Hominem-specific migration paths, commands, file structure, safety rules, scaffold helpers, rollback helpers, verify-only helpers, and the canonical `make` targets for migration plus Kysely refresh.
- Require Kysely generated type refreshes whenever migrations change schema shape.
- Update `AGENTS.md` so SQL migration authoring is allowed only when work is performed under the `goose-migrations` skill.
- Keep the skill focused on migration lifecycle work rather than all `packages/db` concerns.

## Design

The skill is workflow-based and uses progressive disclosure.

- `SKILL.md` contains the trigger, scope, lifecycle steps, authoring rules, validation rules, and scope boundaries.
- `references/hominem-goose-workflow.md` contains the exact repo commands, SQL template, authoring checklist, Kysely sync requirement, validation flow, rollback guidance, and reporting expectations.
- `agents/openai.yaml` provides UI metadata and a default prompt snippet.

This design keeps the trigger narrow while still making the Hominem-specific details easy to load on demand.

## Policy override

`AGENTS.md` currently forbids creating SQL migration files. That conflicts with the intended migration workflow already documented in the root `Makefile` and the existing database skill. The new skill resolves that conflict by making migration authoring explicitly allowed only when:

- the task is clearly about Goose migration work
- the file is created in `packages/db/migrations/`
- the workflow defined by the skill is followed

This preserves a strong default prohibition while allowing the agent to perform the full migration lifecycle when explicitly in scope.

## Validation

- Run the skill creator validator against the new skill directory.
- Verify the documented commands match `Makefile` and `packages/db/package.json`.
- Confirm the new `AGENTS.md` wording no longer contradicts the migration workflow.
- Verify the root `check` target enforces Kysely type freshness.

## Risks

- A broad skill could accidentally weaken the SQL migration prohibition. Mitigation: keep the trigger narrow and the override explicit.
- Migration guidance could drift from the repo commands. Mitigation: anchor commands to the existing `Makefile` and package scripts.
