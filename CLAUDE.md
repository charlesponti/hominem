# Hominem Project Guidelines

## Build & Test Commands
- Install: `bun install`
- Dev: `turbo run dev --parallel` or `pm2 start bun --name="hominem" -- run dev` 
- Build: `turbo run build` or `bunx turbo run build --force`
- Lint: `turbo run lint --parallel` or `bunx turbo run lint --force --parallel`
- Test: `turbo run test` or `bun run test`
- Single test: `bun test -- -t "test name"` or `bun test path/to/test.ts`
- Migrate: `bun turbo run migrate`

## Code Style Guidelines
- Follow Biome formatting (2-space indent, 100 char line width)
- Use single quotes for strings, double quotes for JSX
- No semicolons except when required
- Use camelCase for variables/functions, PascalCase for components
- Prefer TypeScript with explicit types for function parameters and returns
- Use functional programming patterns where appropriate
- Handle errors with try/catch blocks, prefer early returns
- Use async/await for asynchronous code
- Import order: external libraries first, then internal modules
- Document complex functions with JSDoc comments
- Use appropriate error logging with context
