# Instruction Files Index & Guidelines

Purpose: keep the repository instruction files simple, canonical, and easy to find. Use these rules when adding or editing any file under `.github/instructions/`.

Canonical instruction files

- **Universal rules & engineering principles:** `AGENTS.md` (canonical for repository-wide engineering rules)
- **API contracts & patterns:** `.github/instructions/api-contracts.instructions.md`
- **API architecture & types-first guidance:** `.github/instructions/api-architecture.instructions.md`
- **Performance-first & TypeScript perf:** `.github/instructions/performance-first.instructions.md`
- **React & UI guidance:** `.github/instructions/react.instructions.md`
- **Database & data layer guidance:** `.github/instructions/database.instructions.md`
- **Domain-specific guides (app-level):** use the `applyTo` frontmatter to scope files to apps or packages

Rules & checklist (short)

1. Keep things short and focused (2–10 sections). If a file grows large, move detailed content to `docs/` and replace with a pointer here.
2. Use `applyTo:` frontmatter with a glob to scope the file (example: `applyTo: 'apps/api/**'`).
3. Avoid duplicating guidance. If the content belongs in a canonical file above, add a one-line pointer and a short app-specific checklist instead.
4. Use clear, action-oriented language; prefer checklists for step-by-step guidance.
5. When updating instructions that affect code patterns, run format, lint, tests, and typecheck before committing.

Quick review tasks for PRs that change instruction files

- Does this content duplicate an existing canonical doc? If yes, replace with pointer.
- Is the `applyTo:` correct and narrow enough? (Prefer narrower globs.)
- Does the file contain code examples that are small and focused? Big examples belong in `docs/`.
- Did you run `bun run format` and `bun run test` locally?

Contact

If you are unsure where to put guidance, ping the repo maintainers or open a short issue describing the change and proposed new/updated instruction file.
