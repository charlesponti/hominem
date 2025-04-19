# Hominem Project Guidelines

## Build & Test Commands
- Install: `pnpm install`
- Dev: `turbo run dev --parallel` or `pm2 start pnpm --name="hominem" -- run dev` 
- Build: `turbo run build` or `pnpm turbo run build --force`
- Lint: `turbo run lint --parallel` or `pnpm turbo run lint --force --parallel`
- Test: `turbo run test` or `pnpm run test`
- Single test: `pnpm test -- -t "test name"` or `pnpm test path/to/test.ts`
- Migrate: `pnpm turbo run migrate`

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

## JavaScript/TypeScript Standards
- Use 2 space indentation
- Always use === instead of ==
- Infix operators must be spaced
- Commas should have a space after them
- Keep else statements on the same line as their curly braces
- For multi-line if statements, use curly braces
- Always handle the err function parameter
- Prefer template literals over string concatenation
- Use for (const ... of ...) loops instead of .forEach
- Use specific functions like Number.parseFloat instead of parseFloat
- Import types with a separate import statement (e.g., import type { Foo } from 'bar').
 - If values and types are imported use the following pattern:
  ```js
  import type { Bar } from 'bar'
  import { bar } from 'bar'
  ```
- Never use any type in TypeScript

## React Best Practices
- Use functional components with hooks
- Avoid useEffect whenever possible
- Follow the Rules of Hooks (only call hooks at the top level, only call hooks from React functions)
- Create custom hooks to extract reusable component logic
- Use React.memo() for component memoization when appropriate
- Implement useCallback for memoizing functions passed as props
- Use useMemo for expensive computations
- Avoid inline function definitions in render to prevent unnecessary re-renders
- Prefer composition over inheritance
- Use children prop and render props pattern for flexible, reusable components
- Minimize 'use client', 'useEffect', and 'useState'; favor React Server Components (RSC)

## State Management
- Use zustand for global state management
- Use react-query and IndexedDB for data management
- Changes to data should be saved to IndexedDB and synced to external APIs
- Use optimistic updates
- Lift state up when needed to share state between components
- Use context for intermediate state sharing when prop drilling becomes cumbersome

## Hook Development Guidelines
- Each hook should focus on a single API operation (create, read, update, delete)
- Return consistent data structures: { data, setData, operation } where operation is the mutation or query
- Use useState for managing local form/input data
- Define query keys at the top of the file as constants
- Include both mutationFn and onSuccess handlers in mutations
- Always invalidate related queries on successful operations
- Use TypeScript types consistently across all hooks
- Expose loading and error states for better UX handling

## Error Handling and Validation
- Prioritize error handling and edge cases
- Handle errors and edge cases at the beginning of functions
- Use early returns for error conditions to avoid deeply nested if statements
- Place the happy path last in the function for improved readability
- Avoid unnecessary else statements; use if-return pattern instead
- Use guard clauses to handle preconditions and invalid states early
- Implement proper error logging and user-friendly error messages
- Use Zod or Joi for schema validation

## Performance Optimization
- Avoid premature optimization
- Use efficient data structures
- Minimize I/O operations
- Implement lazy loading
- Use caching strategies
- Implement asynchronous processing
- Profile code before optimizing
- Wrap client components in Suspense with fallback
- Use dynamic loading for non-critical components
- Optimize images: use WebP format, include size data, implement lazy loading
- Implement route-based code splitting in Next.js

## Accessibility (a11y)
- Use semantic HTML elements
- Implement proper ARIA attributes
- Ensure keyboard navigation support
- Follow WCAG guidelines

## Design Principles
- Follow SOLID principles
- DRY (Don't Repeat Yourself)
- KISS (Keep It Simple)
- YAGNI (You Aren't Gonna Need It)
- Single Responsibility Principle
