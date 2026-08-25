---
name: kernel-hominem-workflow
kind: skill
tags:
  - hominem
  - build
  - validation
  - git
license: MIT
description: >
  Hominem monorepo development workflow: pre-push validation via `just check`
  with failure triage, and the Conventional Commits message contract with the
  hominem scope list. Load the relevant reference below; use kernel-git-commit
  for the full generic commit spec.
compatibility: Hominem monorepo.
metadata:
  author: project
  version: "1.0"
  category: Engineering
when:
  - running pre-push validation (just check) across the monorepo
  - triaging typecheck, lint, build, or test failures
  - crafting a commit message for the hominem monorepo
outputs:
  - Validation outcome or commit message per the loaded reference's workflow
termination:
  - Validation gates pass or the failure is triaged; commit message conforms to the spec
argumentHint: the validation or commit task in the hominem monorepo
---

# Kernel Hominem Workflow

One skill covering the hominem monorepo's development workflow — validation and
commit conventions. Pick the reference that matches the task and follow it
end-to-end.

## References

| Task | Reference |
| --- | --- |
| Pre-push validation across all workspaces (`just check`, per-package filters, triage order) | `references/validation.md` |
| Conventional Commits message format + hominem scope list | `references/commit.md` |

## Cross-cutting rules

- **Validate before commit.** The full validation suite gates pushing to main.
- **Follow the Conventional Commits spec.** For the generic message format and
  edge cases, defer to `kernel-git-commit`.
- **Scope from the list.** Use only the scopes in the commit reference; do not
  invent new ones.