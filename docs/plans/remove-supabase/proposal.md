# Proposal: Remove Supabase and Migrate to Cloudflare R2

## Summary

Remove all Supabase dependencies from the codebase and replace file storage functionality with Cloudflare R2 (S3-compatible API).

## Problem Statement

Supabase has been removed from the project, but residual references and code remain:
- `@supabase/supabase-js` and `@supabase/storage-js` packages still in dependencies
- Storage service in `@hominem/utils/supabase` still uses Supabase SDK
- Environment variables for Supabase still referenced across apps
- ~408 references to "supabase" throughout codebase

This creates maintenance burden and potential confusion. Additionally, Supabase Storage needs to be replaced with a functional alternative.

## Proposed Solution

1. **Remove Supabase packages** from `@hominem/utils`
2. **Implement Cloudflare R2 storage** as replacement using S3-compatible API
3. **Update environment variables** to use R2 credentials
4. **Remove Supabase references** from database schema (users.supabaseId)
5. **Update all consuming code** to use new storage service

## Benefits

- Eliminates unused dependencies
- Uses S3-compatible API that integrates seamlessly with existing Cloudflare Workers infrastructure
- R2 offers free tier with generous limits (1M Class A, 10M Class B requests/month)
- Single provider for auth (Better Auth) and storage (R2) simplifies architecture
- Reduces bundle size by removing Supabase SDKs

## Impact Analysis

### Files Requiring Changes

| Category | Count | Examples |
|----------|-------|----------|
| Direct imports | 10 | finance.import.ts, api.upload.ts, etc. |
| Environment configs | 5 | services/api, apps/*/lib/env.ts |
| Database schema | 1 | users.supabaseId field |
| Package dependencies | 1 | packages/utils/package.json |

### Risk Assessment

- **Low risk**: Storage is isolated functionality, well-abstracted behind service class
- **No breaking API changes**: New R2 service maintains same interface as old Supabase service
- **Easy rollback**: Can revert to Supabase if needed during transition period

## Timeline

- Phase 1: Remove Supabase dependencies and implement R2 service (1-2 hours)
- Phase 2: Update consuming code and environment configs (1 hour)
- Phase 3: Test and verify all storage operations work (1 hour)

**Total estimated time**: 3-4 hours

## Success Criteria

- [ ] No `@supabase/*` packages in dependencies
- [ ] All file operations work with R2 (upload, download, delete, list)
- [ ] No Supabase environment variables required
- [ ] All tests pass
- [ ] Typecheck and lint pass
