# Brainstorm: Resolve Type Errors Post-Migration

## What We're Building

We're addressing the remaining type errors that emerged after completing the major type optimization migration. The migration successfully optimized type checking performance from ~3.5s to target <1s, but several issues remain that prevent full TypeScript validation across the monorepo. These include critical CLI package errors where the RPC client is typed as `unknown`, coding guideline violations, and cleanup of unused imports.

## Why This Approach

The migration plan indicated completion, but the explore analysis revealed 8+ type errors in CLI tools where async headers in Hono client creation broke type inference. This is blocking full monorepo type checking. We'll prioritize fixing these critical errors first, then address code quality violations (like `as any` usage), and finally clean up unused imports to reduce bundle size and improve maintainability.

## Key Decisions

- **Priority Order**: Fix CLI RPC typing first (critical blocker), then code quality violations, then unused imports cleanup
- **Scope**: Focus on migration-related type errors only; defer unrelated improvements
- **Validation**: Run `bunx turbo run typecheck --force` after each major fix to verify progress

## Open Questions

- What specific pattern in Hono client creation causes the RPC client to be typed as unknown?
- Should we modify the client creation to avoid async headers, or implement proper typing for async functions?
- Are there any legitimate uses of `as any` that should be grandfathered in?

## Success Criteria

- ✅ All CLI type errors resolved (RPC properly typed)
- ✅ No `as any` assertions in core packages
- ✅ Unused imports cleaned up across all packages
- ✅ `bunx turbo run typecheck --force` passes with <1s execution time
- ✅ Bundle size reduced by removing unused imports

## Risks & Mitigations

- **Risk**: Changing client creation might break runtime functionality → **Mitigation**: Test CLI commands thoroughly after changes
- **Risk**: Over-cleanup of "unused" imports that are actually needed → **Mitigation**: Use TypeScript's --noUnusedLocals flag to verify before removal
- **Risk**: Type assertion fixes introduce new errors → **Mitigation**: Fix one package at a time and verify type checking

## Next Steps

Proceed to `/workflows:plan` to create detailed implementation plan for fixing these type errors.