---
name: jinn-build
description: Use when running builds, running tests, or debugging failures in either.
license: MIT
compatibility: Works with any project.
metadata:
  author: jinn
  version: "1.0"
  generatedBy: "1.0.0"
  category: Engineering
  tags: [build, test, ci, debug]
when:
  - running a production build
  - running tests or debugging a test failure
  - diagnosing a CI failure that doesn't reproduce locally
  - debugging a build failure after a dependency or config change
applicability:
  - Use when building or testing a project
  - Use when a build or test is failing and the root cause is unknown
termination:
  - Build succeeds with zero errors and zero suppressed warnings
  - All tests pass
  - Root cause of any failure is identified and fixed
outputs:
  - Passing build and test suite
  - Root cause analysis if a failure was diagnosed
---

Run builds and tests, and debug failures in either.

## Building for Production

### Before building
- Confirm all dependencies are installed and up to date.
- Set the correct environment (`NODE_ENV=production` or equivalent).
- Clean previous artifacts: `dist/`, `build/`, `.cache/`, `__pycache__/`.

### Build commands by stack

| Stack | Command |
|---|---|
| Node.js | `npm run build` / `pnpm build` |
| Python | `python -m build` / `poetry build` |
| Go | `go build ./...` |
| Rust | `cargo build --release` |

### After building
- Verify artifacts exist and sizes are plausible.
- Run a smoke test or preview to confirm the build is functional.
- Check build logs for warnings that should be treated as errors.

## Testing

Run the right test level for the scope of change:

| Type | When to run |
|---|---|
| **Unit** | After every change to a function or component |
| **Integration** | After changes that affect module boundaries or shared state |
| **E2E** | Before deploying or merging to main |
| **Performance** | After changes to hot paths, queries, or rendering |

### Rules
- Tests must pass before committing to the main branch.
- Tests must pass before deploying to any environment.
- A failing test is a blocker — do not work around it by skipping or marking expected.

## Debugging a Failed Build or Test

1. Read the full error — don't skim; the actual message is usually at the bottom.
2. Identify whether it's a type error, a missing module, a config issue, or a logic failure.
3. Check if the failure is local only (environment mismatch) or reproducible in CI.
4. Fix the root cause — do not suppress warnings or errors to make the build pass.
5. Re-run to confirm the fix didn't introduce a new failure.

### CI vs. local differences

When a test passes locally but fails in CI (or vice versa):
- **Environment variables** — CI may be missing something your shell sets.
- **File paths** — CI may be case-sensitive where your local filesystem is not.
- **Dependencies** — CI installs from lockfile; local may have drift.
- **Timing** — CI may be slower; tests that assume fast I/O can be flaky.

## Guardrails
- Never suppress a warning or error to make a build pass — fix or explicitly justify it.
- Do not ship or deploy from a build that produced warnings unless each one is reviewed and accepted.
