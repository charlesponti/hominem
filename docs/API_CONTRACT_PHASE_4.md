# API Contract Design - Phase 4: Testing & Documentation

**Project:** Hominem Monorepo  
**Initiative:** Superior API Contract Design with Type-Safe Error Handling  
**Phase:** 4 of 4  
**Status:** 📅 Planned  
**Estimated Duration:** 4-6 hours  
**Last Updated:** 2024

---

## Executive Summary

Phase 4 is the final stage of the API Contract Design initiative. After migrating services (Phase 2) and updating consumers (Phase 3), Phase 4 focuses on ensuring the long-term stability, correctness, and discoverability of the new system.

The goal is to implement automated contract testing that prevents regressions in the `ApiResult` shape, provide comprehensive documentation for developers, and establish performance benchmarks for the new type-safe architecture.

---

## Objectives

- **Contract Validation:** Implement automated tests to ensure API responses strictly adhere to the `ApiResult` discriminated union.
- **Regression Prevention:** Add type-level tests to catch breaking changes in error codes or data shapes during build time.
- **Developer Experience:** Create clear, accessible documentation and onboarding materials for the new patterns.
- **Observability:** Ensure error codes are correctly logged and searchable in production monitoring.
- **Final Audit:** Verify that all `any` and `unknown` types related to API handling have been eliminated.

---

## Scope and Priorities

### Priority 1: Contract & Type Testing (2-3 hours)

_Automating the verification of our type safety guarantees._

- [ ] Implement `tsd` or `vitest` type-level tests for `ApiResult` narrowing.
- [ ] Create a "Contract Guard" test suite that validates runtime JSON responses against Zod schemas.
- [ ] Ensure every error code in `ErrorCode` has a corresponding test case in the service layer.

### Priority 2: Documentation & Guidelines (1-2 hours)

_Codifying knowledge for current and future team members._

- [ ] Update `.github/copilot-instructions.md` with new API patterns.
- [ ] Create a "Troubleshooting Errors" guide mapping `ErrorCode` to UI patterns.
- [ ] Finalize the `API_CONTRACT_QUICKSTART.md` with real-world examples from Phase 2 & 3.

### Priority 3: Monitoring & Audit (1 hour)

_Validating the migration in production and cleanup._

- [ ] Audit all apps for remaining `// @ts-ignore` or `any` usage in API code.
- [ ] Verify that the `ApiError` details are correctly captured in logs (e.g., Sentry/Posthog).
- [ ] Performance check: Compare build times and IDE responsiveness after type simplification.

---

## Detailed Implementation Plan

### 1. Type-Level Testing

We need to ensure that TypeScript _always_ requires checking `success` before accessing `data`.

```typescript
// packages/services/src/__tests__/api-result.test-d.ts
import { expectTypeOf } from 'vitest';
import type { ApiResult } from '../api-result';

interface User {
  id: string;
  name: string;
}
type UserResult = ApiResult<User>;

// Test narrowing
const result = {} as UserResult;
if (result.success) {
  expectTypeOf(result.data).toEqualTypeOf<User>();
} else {
  // @ts-expect-error: data should not exist on error result
  console.log(result.data);
  expectTypeOf(result.code).toBeString();
}
```

### 2. Runtime Contract Validation

Create a utility to verify that our Hono routes actually return what their types claim.

```typescript
// packages/services/src/test-utils/contract-validator.ts
export async function validateContract<T>(response: Response, schema: z.ZodSchema<T>) {
  const body = await response.json();
  if (body.success) {
    return schema.parse(body.data);
  } else {
    // Ensure error shape is correct even on failure
    expect(body).toHaveProperty('code');
    expect(body).toHaveProperty('message');
  }
}
```

### 3. Error Mapping Documentation

A central reference for how back-end errors should be handled in the UI.

| Error Code         | HTTP | Recommended UI Strategy                   |
| :----------------- | :--- | :---------------------------------------- |
| `VALIDATION_ERROR` | 400  | Inline form field errors                  |
| `UNAUTHORIZED`     | 401  | Modal login overlay or redirect           |
| `FORBIDDEN`        | 403  | "Access Denied" empty state               |
| `NOT_FOUND`        | 404  | Toast + redirect to list view             |
| `CONFLICT`         | 409  | "Duplicate name" warning with edit option |

---

## Migration Checklist

### Testing Infrastructure

- [ ] **Type Tests:** Added `.test-d.ts` files for core service results.
- [ ] **Integration Tests:** Updated at least 2 core flows in `apps/rocco` to test error narrowing.
- [ ] **Zod Synchronization:** Verified that Zod schemas in `hono-rpc` match service logic.

### Documentation

- [ ] **README Updates:** All package READMEs reflect `ApiResult` usage.
- [ ] **Quickstart:** Added "Common Pitfalls" section to `API_CONTRACT_QUICKSTART.md`.
- [ ] **API Reference:** Generated or updated OpenAPI/Swagger docs if applicable.

### Final Audit

- [ ] **Search for `any`:** `grep -r "any" .` returns no results in API/Service layers.
- [ ] **Search for `error` in data:** Ensure no old `{ error: string }` shapes remain.
- [ ] **Bundle Analysis:** Verify no significant increase in bundle size from extra Zod schemas.

---

## Success Criteria

- [ ] **Zero Contract Violations:** Automated tests confirm all migrated endpoints return `ApiResult`.
- [ ] **100% Type Safety:** `bun run typecheck` passes across the monorepo.
- [ ] **Developer Ready:** A new engineer can implement a safe API call using only the documentation.
- [ ] **Error Clarity:** Production logs show structured error codes instead of generic "500 Internal Server Error".

---

## Estimated Timeline

| Priority  | Task                       | Hours         |
| :-------- | :------------------------- | :------------ |
| 1         | Automated Contract Testing | 3             |
| 2         | Documentation & Training   | 1.5           |
| 3         | Final Audit & Cleanup      | 1             |
| **Total** |                            | **5.5 Hours** |

---

## Resources

- **Phase 1 (Foundations):** `API_CONTRACT_PHASE_1.md`
- **Phase 2 (Services):** `API_CONTRACT_PHASE_2.md`
- **Phase 3 (Consumers):** `API_CONTRACT_PHASE_3.md`
- **Error Definitions:** `packages/services/src/errors.ts`
- **Result Types:** `packages/services/src/api-result.ts`

---

## Status Tracking

| Task                        | Status     | Notes |
| :-------------------------- | :--------- | :---- |
| Type-level Testing          | ⏳ Pending |       |
| Runtime Contract Validation | ⏳ Pending |       |
| Internal Documentation      | ⏳ Pending |       |
| Onboarding Examples         | ⏳ Pending |       |
| Final Monorepo Audit        | ⏳ Pending |       |

---

**Phase 4 Lead:** [Your Name]  
**Estimated Completion:** [Date + 6 hours]  
**Initiative Status:** 🏁 Final Phase

Ready to cross the finish line! 🏁
