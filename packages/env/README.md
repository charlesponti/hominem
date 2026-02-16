# @hominem/env

Shared environment variable handling with explicit client/server separation for the Hominem monorepo.

## Problem This Solves

Environment variables were accessed inconsistently across the codebase:
- **Client components** used `import.meta.env.VITE_*` (Vite compile-time)
- **Server loaders** used `process.env` (Node.js runtime)
- **Shared code** used fallbacks like `import.meta.env.X || process.env.X`

This caused a production bug where SSR loaders fell back to `http://localhost:4040` because `import.meta.env` isn't available during server-side rendering.

## Solution

This package provides **shared base schemas** that apps extend with their own app-specific variables:

1. **Base schemas** for common infrastructure (API URL, Supabase, etc.)
2. **Apps extend** the base with their own variables
3. **Explicit context choice** - Must choose client or server
4. **Runtime validation** - Zod schemas ensure correct format

## Architecture

```
packages/env/              # SHARED - Common/infra variables only
├── baseClientEnv          # API_URL, SUPABASE_URL, etc.
├── baseServerEnv          # DATABASE_URL, API keys, etc.
└── schemas                # Reusable Zod schemas

apps/rocco/                # APP-SPECIFIC
├── app/lib/env.ts         # Extends base with VITE_GOOGLE_API_KEY, etc.

apps/notes/                # APP-SPECIFIC
├── app/lib/env.ts         # Extends base with app-specific vars
```

## Installation

```bash
# Already included in workspace
import { baseClientEnv } from '@hominem/env/client';
import { baseServerEnv } from '@hominem/env/server';
import { baseClientSchema, baseServerSchema } from '@hominem/env/schema';
```

## Usage

### Pattern 1: Use Base Env (Simple Cases)

For code that only needs shared infrastructure variables:

```typescript
// Client (Browser)
import { baseClientEnv } from '@hominem/env/client';
const apiUrl = baseClientEnv.VITE_PUBLIC_API_URL;

// Server (SSR)
import { baseServerEnv } from '@hominem/env/server';
const apiUrl = baseServerEnv.PUBLIC_API_URL;
```

### Pattern 2: Extend in Your App (Recommended)

Create app-specific env that extends the base:

```typescript
// apps/rocco/app/lib/env.ts
import { baseClientSchema, baseServerSchema } from '@hominem/env/schema';
import { z } from 'zod';

// Extend base with app-specific variables
const roccoClientSchema = baseClientSchema.extend({
  VITE_APP_BASE_URL: z.string().url(),
  VITE_GOOGLE_API_KEY: z.string(),
});

const roccoServerSchema = baseServerSchema.extend({
  GOOGLE_API_KEY: z.string().optional(),
});

// Create validated env objects
export const clientEnv = roccoClientSchema.parse(import.meta.env);
export const serverEnv = roccoServerSchema.parse(process.env);

// Export types
export type ClientEnv = z.infer<typeof roccoClientSchema>;
export type ServerEnv = z.infer<typeof roccoServerSchema>;
```

Then use in your app:

```typescript
// apps/rocco/app/components/MyComponent.tsx
import { clientEnv } from '~/lib/env';
const apiUrl = clientEnv.VITE_PUBLIC_API_URL;
const googleKey = clientEnv.VITE_GOOGLE_API_KEY;

// apps/rocco/app/routes/lists.$id.tsx
import { serverEnv } from '~/lib/env';
const apiUrl = serverEnv.PUBLIC_API_URL;
```

### Pattern 3: Shared Utilities (Explicit Context)

For utilities used in both client and server:

```typescript
// packages/utils/api.ts
type ApiConfig = {
  apiUrl: string;
  supabaseUrl: string;
};

export function createApiClient(config: ApiConfig) {
  // Use config.apiUrl, config.supabaseUrl
}

// Client usage
import { baseClientEnv } from '@hominem/env/client';
import { createApiClient } from '@hominem/utils/api';
const client = createApiClient({
  apiUrl: baseClientEnv.VITE_PUBLIC_API_URL,
  supabaseUrl: baseClientEnv.VITE_SUPABASE_URL,
});

// Server usage  
import { baseServerEnv } from '@hominem/env/server';
import { createApiClient } from '@hominem/utils/api';
const client = createApiClient({
  apiUrl: baseServerEnv.PUBLIC_API_URL,
  supabaseUrl: baseServerEnv.SUPABASE_URL,
});
```

## Available Exports

### Client (`@hominem/env/client`)

```typescript
import { 
  baseClientEnv,        // Base client env (infra only)
  type BaseClientEnv,
  EnvValidationError
} from '@hominem/env/client';
```

### Server (`@hominem/env/server`)

```typescript
import {
  baseServerEnv,        // Base server env (infra only)
  type BaseServerEnv,
  EnvValidationError
} from '@hominem/env/server';
```

### Schema (`@hominem/env/schema`)

```typescript
import {
  // Base schemas (extend these in your app)
  baseClientSchema,
  baseServerSchema,
  
  // Types
  type BaseClientEnv,
  type BaseServerEnv,
} from '@hominem/env/schema';
```

## Base Environment Variables

These are included in the shared package:

### Client Variables (VITE_* prefix)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_PUBLIC_API_URL` | Yes | API base URL |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key |

### Server Variables (no prefix)

| Variable | Required | Description |
|----------|----------|-------------|
| `PUBLIC_API_URL` | Yes | API base URL |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role |
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `REDIS_URL` | No | Redis connection |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (default: development) |
| `GOOGLE_API_KEY` | No | Google API key |
| `OPENAI_API_KEY` | No | OpenAI API key |
| `PLAID_*` | No | Plaid configuration |
| `TWITTER_*` | No | Twitter OAuth |
| `RESEND_*` | No | Resend email |
| `ROCCO_URL` | No | CORS allowed origin |
| `NOTES_URL` | No | CORS allowed origin |
| `FLORIN_URL` | No | CORS allowed origin |

## Adding App-Specific Variables

Each app manages its own additional variables:

1. **Create app env file:**
   ```typescript
   // apps/[app]/app/lib/env.ts
   import { baseClientSchema, baseServerSchema } from '@hominem/env/schema';
   import { z } from 'zod';
   
   export const clientSchema = baseClientSchema.extend({
     VITE_MY_VAR: z.string(),
   });
   
   export const serverSchema = baseServerSchema.extend({
     MY_SECRET: z.string(),
   });
   
   export const clientEnv = clientSchema.parse(import.meta.env);
   export const serverEnv = serverSchema.parse(process.env);
   ```

2. **Update app's `.env` file**

3. **Use in your app:**
   ```typescript
   import { clientEnv } from '~/lib/env';
   ```

## Error Handling

### Missing Variable

```
EnvValidationError: Environment validation failed:
  - VITE_PUBLIC_API_URL: Required
Context: baseClientEnv
```

### Wrong Context

```
EnvValidationError: clientEnv can only be used in browser/client context.
Use serverEnv for server-side code.
Context: baseClientEnv
```

### Invalid Format

```
EnvValidationError: Environment validation failed:
  - VITE_PUBLIC_API_URL: Invalid url
Context: baseClientEnv
```

## Migration Guide

### From Direct import.meta.env

**Before:**
```typescript
// apps/rocco/app/components/MyComponent.tsx
const apiUrl = import.meta.env.VITE_PUBLIC_API_URL;
```

**After (using base env):**
```typescript
// apps/rocco/app/components/MyComponent.tsx
import { baseClientEnv } from '@hominem/env/client';
const apiUrl = baseClientEnv.VITE_PUBLIC_API_URL;
```

**After (using app-specific env - recommended):**
```typescript
// apps/rocco/app/components/MyComponent.tsx
import { clientEnv } from '~/lib/env';
const apiUrl = clientEnv.VITE_PUBLIC_API_URL;
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
import { baseServerEnv } from '@hominem/env/server';
const apiUrl = baseServerEnv.PUBLIC_API_URL;
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
import { baseServerEnv } from '@hominem/env/server';
const baseUrl = baseServerEnv.PUBLIC_API_URL;
```

## Security

- **Server variables cannot leak to client** - Separate entry points enable tree-shaking
- **Runtime check** throws if `serverEnv` is accessed in browser
- **No secrets in base client schema** - Only `VITE_` prefixed vars
- **Apps control their own secrets** - Each app manages server-only vars

## Package Structure

```
packages/env/
├── src/
│   ├── client.ts            # baseClientEnv export
│   ├── server.ts            # baseServerEnv export
│   ├── schema/
│   │   ├── base.ts          # Shared base schemas
│   │   └── index.ts         # Schema exports
│   └── types.ts             # TypeScript types
├── tests/                   # Unit tests
├── package.json             # Package config
├── tsconfig.json            # TypeScript config
└── README.md                # This file
```

## Why This Architecture?

**Before (centralized):**
- ❌ Package had to know about every app's variables
- ❌ Adding a var required updating shared package
- ❌ App-specific concerns leaked into shared code

**After (decentralized):**
- ✅ Shared package only knows about infrastructure
- ✅ Apps own their specific variables
- ✅ Changes to one app don't affect others
- ✅ Shared schemas are reusable building blocks

## Related

- [Vite Env Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Zod Documentation](https://zod.dev/)
