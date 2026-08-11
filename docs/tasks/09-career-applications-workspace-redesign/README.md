---
type: project-index
status: proposed
priority: high
team: career
project: career-applications-workspace-redesign
labels:
  - career
  - applications
  - product-design
  - frontend
source: ../09-career-applications-workspace-redesign.md
---

# Career Applications Workspace Redesign

This folder decomposes the proposal in [09-career-applications-workspace-redesign.md](../09-career-applications-workspace-redesign.md) into implementation tickets.

## Delivery order

1. [Decision gate](00-decision-gate.md) - required before implementation.
2. [Data and presentation contract](01-data-and-presentation-contract.md) - verify the existing card data and define null handling.
3. [Query model and filter behavior](02-query-model-and-filters.md) - make filtering, sorting, active state, and pagination deterministic.
4. [Workspace frame](03-workspace-frame.md) - rebuild the header and query rail.
5. [Dense application list](04-dense-application-list.md) - rebuild row hierarchy and interaction affordances.
6. [Verification](05-verification.md) - validate every required state in tests and the browser.

Tickets are intentionally blocked where the proposal contains an unresolved product choice. Do not infer a product decision from the current implementation.

## Shared scope

- Route: `apps/career/app/routes/applications.tsx`
- Filter component: `apps/career/app/components/career/applications/ApplicationsFilters.tsx`
- Filter props: `apps/career/app/components/career/applications/types.ts`
- Shared list primitive: `apps/career/app/components/career/career-list.tsx`
- Query helpers: `apps/career/app/lib/career/queries/job-applications.ts`
- Card loader: `apps/career/app/lib/career/queries/job-applications.server.ts`
- Route tests: `apps/career/app/routes/applications.test.tsx`
