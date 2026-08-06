---
name: conventional-commit
description: 'Mandatory commit workflow for hominem. Craft every commit message to the Conventional Commits spec (https://www.conventionalcommits.org/en/v1.0.0/#specification). Load before staging, committing, or pushing on the user''s behalf.'
disable-model-invocation: true
---

Every commit in this repository must follow the Conventional Commits specification: <https://www.conventionalcommits.org/en/v1.0.0/#specification>.

## Message format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

1. **type** — one of `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `build`, `ci`, `perf`, `style`, `revert`. Pick the single type that describes the primary intent of the change.
2. **scope** — optional, lowercase, the area changed. Use the package or domain name (`api`, `career`, `omiro`, `db`, `auth`, `workflows`, `test-db`, `deps`). Use the same scope consistently with recent history.
3. **description** — imperative mood, lowercase, no trailing period. Summarize what the change does, not how. Max ~72 characters including the type and scope.
4. **body** — optional. Explain the why and the context, wrapped at 72 characters. Use it when the description alone does not capture the intent.
5. **footer** — optional. `BREAKING CHANGE: <description>` for breaking changes, or `Refs: #<issue>` / `Closes: #<issue>`.

## Rules

- **A commit may only be made after the change is validated.** Follow the repo's validation rules (typecheck, lint, format, and tests for the affected packages) before committing.
- Commit related work together. Do not split one logical change into several commits, and do not bundle unrelated changes into one commit.
- Breaking changes MUST have a `BREAKING CHANGE:` footer (or a `!` after type/scope), regardless of type.
- Do not invent types. If none of the standard types fit, prefer `chore` over a custom type.
- Never use generic messages like `update`, `fix`, or `wip` — they do not satisfy the spec.
- Re-read the staged diff with `git diff --cached` before writing the message; the message must describe exactly what is staged.

## Workflow

1. Run `git status` and `git diff` to understand exactly what changed.
2. Stage the intended files with `git add` (never `git add -A` unless everything is intentionally included and you have confirmed nothing stray is staged).
3. Read the staged diff with `git diff --cached` and draft the message from it.
4. Verify the message against the spec above before running the commit.
5. Commit with the single-line message, e.g.:

   ```bash
   git commit -m "feat(api): add finance MCP tools for hominem-owned finance surface"
   ```

   For a body and/or footer, pass them as separate `-m` flags:

   ```bash
   git commit -m "fix(api): reconcile MCP scope tests and finance import cancel route" -m "Scopes now come from a single source of truth in services/api/src/scopes.ts."
   ```

6. Do not push unless the user asked you to push.

## Validation checklist before committing

- [ ] Change is validated (typecheck, lint, format, tests pass for the affected packages)
- [ ] Message uses the correct type and optional scope
- [ ] Description is imperative, lowercase, ≤72 chars, no trailing period
- [ ] Body and `BREAKING CHANGE:`/`Refs:` footers present where needed
- [ ] Staged diff (`git diff --cached`) matches the message
- [ ] Only intended files are staged
