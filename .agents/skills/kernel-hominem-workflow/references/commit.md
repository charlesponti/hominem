# Commit Message Contract

Every commit in the hominem monorepo follows the Conventional Commits
specification. For the full spec, message format, and edge cases, defer to the
`kernel-git-commit` skill. This reference covers the hominem scope list and
repo-specific rules.

## Scopes

Use the hominem domain scope, lowercase, consistent with recent history:

- `api`
- `career`
- `omiro`
- `db`
- `auth`
- `workflows`
- `test-db`
- `deps`

## Repo rules

- **A commit may only be made after the change is validated** (`just check`, or
  the targeted per-package checks in the validation reference).
- Commit related work together; do not bundle unrelated changes into one commit.
- Breaking changes MUST have a `BREAKING CHANGE:` footer.
- Never use generic messages like `update`, `fix`, or `wip` — they do not
  satisfy the spec.

## Workflow

1. Run `git status` and `git diff` to understand exactly what changed.
2. Stage the intended files (never `git add -A` unless everything is
   intentionally included).
3. Read the staged diff with `git diff --cached` and draft the message from it.
4. Commit with a single-line message, e.g.:

```bash
git commit -m "feat(api): add finance MCP tools for hominem-owned finance surface"
```

5. Do not push unless the user asked you to push.