# AGENTS.md - Coding Guidelines for Hominem

## Core Workflow Commands

Always run commands from the monorepo root. Do NOT `cd` into packages.

| Task | Command |
| :--------------- | :------------------------------------------- |
| **Install** | `bun install` |
| **Dev** | `bun run dev` (or `--filter <package>`) |
| **Build** | `bun run build` |
| **Test** | `bun run test` (or `--filter <package>`) |
| **Typecheck** | `bun run typecheck` |
| **Lint/Format** | `bun run lint --parallel` / `bun run format` |
| **Safety Check** | `bun run check` |

## Project Structure

- `apps/` - Applications
- `packages/` - Shared libraries
- `services/` - Standalone services

## Universal Coding Rules

### Code Style

- 2 spaces, no semicolons.
- Single quotes for code, double quotes for JSX attributes.
- `camelCase` variables/functions, `PascalCase` components/classes, `UPPER_CASE` constants.
- Boolean names use `is/has/can` prefixes.
- Use `===`, template literals, and `for...of` loops.
- Use `Number.parseInt()`/`Number.parseFloat()`.
- `} else {` on the same line.
- Use braces for multi-line `if` blocks.

### TypeScript

- No `any` or `unknown`.
- Use `import type { ... }` for type-only imports.
- Use `interface` for object shapes, `type` for unions/primitives/intersections.

### Error Handling

- Use guard clauses and early returns.
- Always handle promises with `try/catch` or `.catch()`.
- Do not leak internal errors to users.

### Security

- Validate external inputs with Zod.
- Sanitize user-generated content.
- Use parameterized DB queries.
- Verify auth and authorization for sensitive operations.

## Specialized Rules

See `.github/instructions/` for scoped guidance.
See `docs/engineering-guidelines.md` for non-normative details.
