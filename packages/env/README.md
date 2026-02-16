# @hominem/env

Unified environment variable handling with explicit client/server separation for the Hominem monorepo.

## Problem This Solves

Environment variables were accessed inconsistently across the codebase:
- **Client components** used `import.meta.env.VITE_*` (Vite compile-time)
- **Server loaders** used `process.env` (Node.js runtime)
- **Shared code** used fallbacks like `import.meta.env.X || process.env.X`

This caused a production bug where SSR loaders fell back to `http://localhost:4040` because `import.meta.env` isn't available during server-side rendering.

## Solution

This package provides explicit `clientEnv` and `serverEnv` exports that:
1. **Force explicit context choice** - Must choose client or server
2. **Validate at runtime** - Zod schemas ensure correct format
3. **Fail fast with clear errors** - Helpful messages when env is missing
4. **Prevent SSR issues** - Server env always uses `process.env`

## Installation

```bash
# Already included in workspace
import { roccoClientEnv } from '@hominem/env/client';
import { roccoServerEnv } from '@hominem/env/server';
```

## Usage

### Client Components (Browser)

```typescript
import { roccoClientEnv } from '@hominem/env/client';

const apiUrl = roccoClientEnv.VITE_PUBLIC_API_URL;
const supabaseUrl = roccoClientEnv.VITE_SUPABASE_URL;
```

### Server Loaders (SSR)

```typescript
import { roccoServerEnv } from '@hominem/env/server';

export async function loader({ request }: Route.LoaderArgs) {
  const apiUrl = roccoServerEnv.PUBLIC_API_URL; // Guaranteed to work
  // ...
}
```

### Shared Code (Explicit Context)

For code used in both contexts, accept env as a parameter:

```typescript
// utils/api.ts
type ApiConfig = {
  apiUrl: string;
  supabaseUrl: string;
};

export function createApiClient(config: ApiConfig) {
  // Use config.apiUrl, config.supabaseUrl
}

// Client usage
import { roccoClientEnv } from '@hominem/env/client';
const client = createApiClient({
  apiUrl: roccoClientEnv.VITE_PUBLIC_API_URL,
  supabaseUrl: roccoClientEnv.VITE_SUPABASE_URL,
});

// Server usage  
import { roccoServerEnv } from '@hominem/env/server';
const client = createApiClient({
  apiUrl: roccoServerEnv.PUBLIC_API_URL,
  supabaseUrl: roccoServerEnv.SUPABASE_URL,
});
```

## Available Exports

### Client (`@hominem/env/client`)

```typescript
import { 
  roccoClientEnv,    // Rocco app client env
  notesClientEnv,    // Notes app client env
  financeClientEnv,  // Finance app client env
  type RoccoClientEnv,
  type NotesClientEnv,
  type FinanceClientEnv,
  EnvValidationError
} from '@hominem/env/client';
```

### Server (`@hominem/env/server`)

```typescript
import {
  roccoServerEnv,    // Rocco app server env
  notesServerEnv,    // Notes app server env
  financeServerEnv,  // Finance app server env
  serverEnv,         // Generic server env (services/api)
  type RoccoServerEnv,
  type NotesServerEnv,
  type FinanceServerEnv,
  EnvValidationError
} from '@hominem/env/server';
```

### Schema (`@hominem/env/schema`)

```typescript
import {
  // Base schemas
  baseClientSchema,
  baseServerSchema,
  
  // App schemas
  roccoClientSchema,
  roccoServerSchema,
  notesClientSchema,
  notesServerSchema,
  financeClientSchema,
  financeServerSchema,
  
  // Types
  type BaseClientEnv,
  type BaseServerEnv,
  // ... app-specific types
} from '@hominem/env/schema';
```

## Environment Variables

### Client Variables (VITE_* prefix)

All client-side variables must use `VITE_` prefix for Vite to expose them:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_PUBLIC_API_URL` | Yes | API base URL |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `VITE_APP_BASE_URL` | Yes | App's own base URL |
| `VITE_GOOGLE_API_KEY` | App-specific | Google Maps/Places API |

### Server Variables (no prefix)

Server-only variables should NOT use `VITE_` prefix:

| Variable | Required | Description |
|----------|----------|-------------|
| `PUBLIC_API_URL` | Yes | API base URL |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role |
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `REDIS_URL` | No | Redis connection |
| `PORT` | No | Server port (default: 3000) |

## Error Handling

### Missing Variable

```
EnvValidationError: Environment validation failed:
  - VITE_PUBLIC_API_URL: Required
Context: roccoClientEnv
```

### Wrong Context

```
EnvValidationError: clientEnv can only be used in browser/client context.
Use serverEnv for server-side code.
Context: clientEnv
```

### Invalid Format

```
EnvValidationError: Environment validation failed:
  - VITE_PUBLIC_API_URL: Invalid url
Context: roccoClientEnv
```

## Migration Guide

### From Direct import.meta.env

**Before:**
```typescript
// apps/rocco/app/components/MyComponent.tsx
const apiUrl = import.meta.env.VITE_PUBLIC_API_URL;
```

**After:**
```typescript
// apps/rocco/app/components/MyComponent.tsx
import { roccoClientEnv } from '@hominem/env/client';
const apiUrl = roccoClientEnv.VITE_PUBLIC_API_URL;
```

### From Direct process.env

**Before:**
```typescript
// apps/rocco/app/routes/lists.$id.tsx
const apiUrl = process.env.VITE_PUBLIC_API_URL || 'http://localhost:4040';
```

**After:**
```typescript
// apps/rocco/app/routes/lists.$id.tsx
import { roccoServerEnv } from '@hominem/env/server';
const apiUrl = roccoServerEnv.PUBLIC_API_URL;
```

### From Merged/Fallback Pattern

**Before:**
```typescript
// apps/rocco/app/lib/api.server.ts
const baseUrl = 
  import.meta.env.VITE_PUBLIC_API_URL || 
  process.env.VITE_PUBLIC_API_URL || 
  'http://localhost:4040';
```

**After:**
```typescript
// apps/rocco/app/lib/api.server.ts
import { roccoServerEnv } from '@hominem/env/server';
const baseUrl = roccoServerEnv.PUBLIC_API_URL;
```

## Adding New Environment Variables

1. Add to appropriate schema in `src/schema/`:
   - Client vars: `base.ts` or `apps/[app].ts` with `VITE_` prefix
   - Server vars: `base.ts` or `apps/[app].ts` without prefix

2. Update `.env` files with the new variable

3. Use via `roccoClientEnv` or `roccoServerEnv`

## Security

- **Server variables cannot leak to client** - Separate entry points enable tree-shaking
- **Build test verifies** server code is not in client bundle
- **Runtime check** throws if `serverEnv` is accessed in browser
- **No secrets in client schemas** - Only `VITE_` prefixed vars in client schemas

## Architecture

```
packages/env/
├── src/
│   ├── schema/
│   │   ├── base.ts          # Shared base schemas
│   │   ├── index.ts         # Schema exports
│   │   └── apps/            # App-specific schemas
│   │       ├── rocco.ts
│   │       ├── notes.ts
│   │       └── finance.ts
│   ├── client.ts            # Client env exports
│   ├── server.ts            # Server env exports
│   └── types.ts             # Type re-exports
├── tests/                   # Unit tests
├── package.json             # Package config with exports
├── tsconfig.json            # TypeScript config
└── README.md                # This file
```

## Related

- [Vite Env Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Zod Documentation](https://zod.dev/)
