---
name: kernel-conventions
description: "Use when defining, reviewing, or documenting the standards that govern how a project is built and maintained."
license: MIT
compatibility: Works with any project.
metadata:
  author: project
  version: "1.0"
  generatedBy: "1.0.0"
  category: Engineering
  tags: [conventions, standards, style, workflow, documentation]
when:
  - establishing conventions on a new project
  - reviewing whether existing conventions are being followed
  - documenting standards for a project that doesn't have them yet
  - onboarding contributors who need to know how the project operates
applicability:
  - Use when a project lacks documented or enforced conventions
  - Use when reviewing a codebase for convention drift
termination:
  - Conventions documented in the appropriate files (README.md, CONTRIBUTING.md, inline reference docs)
  - Automated enforcement configured in CI where possible
  - Open convention gaps identified for human decision
outputs:
  - Documented project conventions
  - CI enforcement configuration
  - List of gaps requiring decisions
---

Define, review, or document the standards that govern how a project is built and maintained.

A convention that isn't enforced automatically will drift. For every standard defined here, identify how it is enforced — linter, formatter, CI check, or explicit documentation.

## Code Style

Define and enforce formatting and naming before the first PR is merged. Retrofitting it later generates noise.

| Standard | Enforce via |
|---|---|
| Formatting | Formatter in CI (Prettier, black, gofmt, rustfmt) |
| Linting | Linter in CI (ESLint, ruff, golangci-lint) |
| Naming patterns | Linter rules where possible; documented where not |
| File organization | Linter rules or a documented structure |

Rule: if the formatter and linter pass, style is correct. Don't leave style feedback in code reviews for things the tools should catch.

## Git Workflow

| Convention | Recommended default |
|---|---|
| Branch naming | `type/short-description` (e.g., `feat/user-auth`, `fix/login-redirect`) |
| Commit format | Conventional Commits: `type(scope): message` |
| PR requirements | At least one reviewer approval + CI green before merge |
| Merge strategy | Squash for features, merge for release branches |
| Main branch | Protected — no direct pushes |

Document the workflow in `CONTRIBUTING.md`. Enforce branch protection in the repository settings.

## Testing Standards

| Standard | Definition |
|---|---|
| Coverage floor | Minimum % that CI enforces (recommended: 80% line coverage for critical paths) |
| Required test types | Unit for all business logic; integration for module boundaries; E2E for critical user flows |
| Test file location | Co-located (`*.test.ts` next to source) or separate (`tests/` directory) — pick one, enforce it |
| Test naming | Describes behavior, not implementation (`it("returns 401 when token is expired")`) |
| Test data | Use factories or fixtures, not hard-coded magic values |

A test that passes for the wrong reason is worse than no test. Reviewers should check that tests actually fail when the behavior is wrong.

## Documentation Standards

| Area | What to document | Where |
|---|---|---|
| Project setup | How to install, build, and run locally | `README.md` |
| Architecture | Major components, data flow, key decisions | `README.md` or inline ADRs |
| API endpoints | Request/response shapes, auth requirements, errors | OpenAPI spec, `README.md`, or inline reference docs |
| Configuration | All env vars, their purpose, and their defaults | `README.md` or `.env.example` |
| Contributing | Workflow, standards, review process | `CONTRIBUTING.md` |

Document decisions, not just facts. A future reader needs to know *why*, not just *what*.

## Guardrails
- Every convention must have an enforcement mechanism (tooling or documentation) — undocumented conventions don't exist.
- Do not define conventions that require humans to remember to apply them manually; automate them.
- If a convention is violated, fix it and add the enforcement that would have caught it.
