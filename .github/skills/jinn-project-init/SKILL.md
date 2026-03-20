---
name: jinn-project-init
description: Use when setting up a new project from scratch or from a template.
license: MIT
compatibility: Works with any project.
metadata:
  author: jinn
  version: "1.0"
  generatedBy: "1.0.0"
  category: Engineering
  tags: [project, init, setup, tooling]
---

Set up a new project from scratch or from a template.

## Steps

### 1. Choose a starting point
- Framework default, existing project template, or a custom spec.
- Confirm the target ecosystem (Node.js, Python, Go, Rust, etc.).

### 2. Install dependencies
- Confirm the package manager (`npm`, `pnpm`, `yarn`, `poetry`, `cargo`, etc.).
- Install core + dev dependencies.

| Ecosystem | Package Manager | Install Command |
|---|---|---|
| Node.js | npm | `npm install` |
| Node.js | pnpm | `pnpm install` |
| Node.js | yarn | `yarn` |
| Python | pip | `pip install -r requirements.txt` |
| Python | poetry | `poetry install` |
| Go | go modules | `go mod download` |
| Rust | cargo | `cargo build` |

### 3. Configure tooling
- **Linting**: use the ecosystem default (ESLint for Node.js, ruff for Python, golangci-lint for Go).
- **Formatting**: enforce via CI, not just locally (Prettier, black, gofmt).
- **Type checking**: enable strict mode from day one — relaxing later is easy, tightening is not.
- **Testing**: wire up the runner before writing tests so the first test can be run immediately.
- Follow conventions already in the repo if one exists; don't invent new ones.

### 4. Initialize git
- Create a `.gitignore` appropriate for the ecosystem.
- Make an initial commit on `main`.

### 5. Verify
Run these before writing any application code:
- `build` — must succeed with zero errors and zero warnings treated as errors.
- `test` — must run and pass (even if no tests are written yet).
- Linter and formatter — must run cleanly with no violations.

## Guardrails
- Do not proceed to application code until all five verification checks pass.
- A project that cannot build clean at initialization will only get harder to fix later.
- Do not suppress linter warnings to make setup pass — fix or explicitly disable them with a comment explaining why.
