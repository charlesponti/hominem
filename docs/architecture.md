# II. Architecture

Hominem is a monorepo because boundaries are shared decisions. The system grows by making authority narrower and interfaces more explicit—not by adding layers that merely rename imports.

## Authority map

```text
Omiro / web products
  -> transport and domain packages
  -> API
  -> database and infrastructure

API
  -> authentication authority
  -> authorization context
  -> persistence and orchestration
```

- Omiro is an RPC client. It does not reach into the database or recreate server authority locally.
- API resolves identity exactly once at the edge into canonical auth context. Route families authorize against that context; they do not perform a second session lookup.
- Career may use the database only from server-owned files. Browser code does not depend on the database.
- A deployable service is not automatically a client contract package. Runtime handlers and public transport contracts are separate responsibilities.
- Shared packages expose narrow, real boundaries. Root barrels stay small and must not become import-anything buckets.
- Type-only imports do not create workspace dependency edges. Use a local TypeScript path alias to the source contract instead.
