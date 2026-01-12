---
applyTo: '**'
---

# Universal Coding Principles

This file contains coding standards that apply to ALL files in the codebase.
For specialized guidelines, see:
- React components: `react.instructions.md`
- API development: `api.instructions.md`
- Database operations: `database.instructions.md`

# Package References
- Authentication: `@hominem/auth`
- Data models and services: `@hominem/data`
- Utility functions: `@hominem/utils`
- UI components: `@hominem/ui`

# Code Style & Formatting (Biome)
- **Indentation:** 2 spaces.
- **Semicolons:** None (except where required).
- **Quotes:** Single quotes for code, double quotes for JSX.
- **Naming:**
  - Variables/Functions: `camelCase`.
  - Components: `PascalCase`.
  - Booleans: Auxiliary verbs (e.g., `isLoading`, `hasError`).
- **Syntax Preferences:**
  - Use `===` strict equality.
  - Use template literals over string concatenation.
  - Use `for (const ... of ...)` instead of `.forEach`.
  - Use specific number methods (e.g., `Number.parseFloat`).
  - Keep `else` on the same line as closing curly braces.
  - Always use curly braces for multi-line `if` statements.

# TypeScript Standards
- **Strictness:** NEVER use `any`. Prefer strict typing with `unknown` or specific types
- **Imports:**
  - Import types separately
  - **Pattern:**
    ```typescript
    import type { Foo } from 'bar'
    import { foo } from 'bar'
    ```
- **Utilities:** Use utility types like `PartialWithId<T>`, `Pick<T>`, `Omit<T>` to reduce redundancy
- **Type Safety:**
  - Prefer interfaces for object shapes
  - Use type aliases for unions, intersections, and primitives
  - Use const assertions for literal types
  - Leverage discriminated unions for complex state

# Error Handling
- **Pattern:**
  - Handle errors early with guard clauses.
  - Put the "happy path" last.
  - Avoid `else` blocks where an early return works.
- **Server Actions:** Model errors as return values.
- **Callbacks:** Always handle the `err` parameter in callbacks.

# Testing (Vitest)
- Run with `bun run test`.
- Focus on critical paths and security boundaries (input sanitization).

  - Put the "happy path" last
  - Avoid `else` blocks where an early return works
  - Use early returns for error conditions
- **Specific Contexts:**
  - Server Actions: Model errors as return values
  - Callbacks: Always handle the `err` parameter
  - Async operations: Always use try/catch or .catch()
- **User-Facing Errors:**
  - Provide clear, actionable error messages
  - Never expose internal errors to users
  - Log errors with sufficient context for debugging

# Input Validation & Security
- **Validation:** Use **Zod** schemas for all external inputs
- **Sanitization:** Sanitize user-generated content, especially HTML
- **SQL Safety:** Use parameterized queries only (Drizzle handles this)
- **Authentication:** Verify tokens and user permissions before sensitive operations
- **File Uploads:** Validate file types, sizes, and content

# Testing (Vitest)
- Run with `bun run test --force`
- Focus on critical paths and security boundaries
- Test input validation and sanitization
- Use React Testing Library for component tests
- Mock external dependencies (API calls, database)
- Aim for high coverage on business logic