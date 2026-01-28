---
applyTo: '**'
---

# Performance-First Development

Maintain a high-velocity development cycle by optimizing for build speed, type-checking performance, and minimal runtime overhead.

### 1. Minimal Dependency Graph
- **Tactical Goal:** Prevent transitive dependency bloat.
- **Action:** Use `import type` for all type-only dependencies to avoid loading heavy module code during type checking.
- **Audit:** Before adding a new package, evaluate its impact on the monorepo's instantiation count. Prefer local utilities over heavy third-party libraries for simple tasks.

### 2. Type Instantiation Management
- **Tactical Goal:** Keep `tsc` execution under 1 second per package.
- **Action:** Avoid deep recursive types, huge conditional unions, and circular Type references.
- **Optimization:** Flatten complex `Pick<Omit<Partial<...>>>` chains into named helper types to break expensive inference chains.

### 3. Build & Runtime Efficiency
- **Tactical Goal:** Fast local iteration and lean production artifacts.
- **Action:** Respect the `Internal Packages` pattern (no path mappings). Leverage Bun's native workspace resolution.
- **Constraint:** Ensure `skipLibCheck: true` and `incremental: true` are configured in all package `tsconfig.json` files to maximize compiler speed.

### 4. Database Optimization
- **Tactical Goal:** Efficient query execution and clear data contracts.
- **Action:** Use Drizzle's `$inferSelect` selectively. Prefer explicit interface definitions for joined or complex query results to avoid expensive generic inference.
