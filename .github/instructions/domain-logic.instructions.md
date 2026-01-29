---
applyTo: 'apps/rocco/**, apps/finance/**, packages/data/**, packages/finance/**'
---

# Domain-Specific Logic Tactics

Implementing complex, stateful systems with high reliability and separation of concerns.

### 1. Token-Based Auth Systems (Invites)

- **Tactical Goal:** Decouple account creation from authorization logic.
- **Action:** Use stateless signed tokens for invite systems. Verify tokens at the gateway before hitting the database.
- **State Management:** Map tokens to specific workspace IDs to ensure users are automatically joined to the correct organization upon successful authentication.

### 2. Analytics & Aggregation

- **Tactical Goal:** Zero-latency data visualization with complex aggregations.
- **Action:** offload expensive calculations (e.g., net worth tracking, category spending) to SQL views or materialized aggregates where possible.
- **Query Strategy:** Use the "Pre-Aggregation" pattern: fetch raw events but display cached or computed totals to maintain <1s UI responsiveness.

### 3. Feature Encapsulation

- **Tactical Goal:** Maintain a clean monorepo by grouping related logic.
- **Action:** Group domain handlers, schemas, and tests together in the corresponding `packages/*` directory.
- **Shared Access:** Only expose the minimal necessary surface area (types and service classes) via the package `index.ts`.
