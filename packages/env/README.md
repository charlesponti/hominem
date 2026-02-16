# @hominem/env

Environment variable handling utilities with explicit client/server separation for the Hominem monorepo.

## Problem This Solves

Environment variables were accessed inconsistently across the codebase:
- **Client components** used `import.meta.env.VITE_*` (Vite compile-time)
- **Server loaders** used `process.env` (Node.js runtime)
- **Shared code** used fallbacks like `import.meta.env.X || process.env.X`

This caused a production bug where SSR loaders fell back to `http://localhost:4040` because `import.meta.env` isn't available during server-side rendering.

## Solution

This package provides factory functions that create lazy-validated environment proxies:

1. **`createClientEnv()`** - Creates a client env proxy that validates on first property access
2. **`createServerEnv()`** - Creates a server env proxy that validates on first property access

Apps define their own Zod schemas - the package provides only the validation mechanics.

## Installation

```bash
# Already included in workspace via workspace:*
import { createClientEnv, createServerEnv } from '@hominem/env';
```

## Usage

### Quick Start

```typescript
// apps/my-app/app/lib/env.ts
import * as z from 'zod';
import { createClientEnv, createServerEnv } from '@hominem/env';

// Define your app's schema
const clientSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
});

const serverSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
});

// Create validated env objects
export const clientEnv = createClientEnv(clientSchema, 'myAppClient');
export const serverEnv = createServerEnv(serverSchema, 'myAppServer');
```

### Using in Your App

```typescript
// Client component
import { clientEnv } from '~/lib/env';
const apiUrl = clientEnv.VITE_PUBLIC_API_URL;

// Server loader
import { serverEnv } from '~/lib/env';
const dbUrl = serverEnv.DATABASE_URL;
```

## API

### createClientEnv()

```typescript
function createClientEnv<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  context?: string
): z.infer<T>
```

Creates a lazy-validated client environment proxy.

- Validates against `import.meta.env`
- Throws if accessed in Node.js/server context
- Validates on first property access (lazy)

### createServerEnv()

```typescript
function createServerEnv<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  context?: string
): z.infer<T>
```

Creates a lazy-validated server environment proxy.

- Validates against `process.env`
- Throws if accessed in browser context
- Validates on first property access (lazy)

### EnvValidationError

```typescript
class EnvValidationError extends Error {
  context: string;
  issues?: Array<{ path: string; message: string }>;
}
```

Thrown when environment validation fails.

## Key Features

### Lazy Validation

Validation only runs on first property access, not at import time. This prevents crashes during SSR and testing.

```typescript
// This does NOT validate immediately
const env = createClientEnv(mySchema, 'myApp');

// Validation runs here, on first access
const url = env.VITE_PUBLIC_API_URL;
```

### Context Awareness

- `createClientEnv()` throws if accessed in server context
- `createServerEnv()` throws if accessed in browser context

### Helpful Errors

```typescript
// Missing required variable
EnvValidationError: Environment validation failed:
  - VITE_PUBLIC_API_URL: Invalid input: expected string, received undefined
Context: myAppClient

// Wrong context
EnvValidationError: clientEnv can only be used in browser/client context.
Use serverEnv for server-side code.
Context: myAppClient
```

## Environment Variable Naming

Use `VITE_` prefix for both client and server:

| Context | Variable | Example |
|---------|----------|---------|
| Both | `VITE_*` | `VITE_PUBLIC_API_URL` |

**Note:** Vite automatically injects `VITE_*` variables into both `import.meta.env` (browser) and `process.env` (SSR) during build.

## Migration Guide

### From direct import.meta.env

**Before:**
```typescript
const apiUrl = import.meta.env.VITE_PUBLIC_API_URL;
```

**After:**
```typescript
import { clientEnv } from '~/lib/env';
const apiUrl = clientEnv.VITE_PUBLIC_API_URL;
```

### From direct process.env

**Before:**
```typescript
const dbUrl = process.env.DATABASE_URL;
```

**After:**
```typescript
import { serverEnv } from '~/lib/env';
const dbUrl = serverEnv.DATABASE_URL;
```

### From fallback pattern

**Before:**
```typescript
const baseUrl = 
  import.meta.env.VITE_PUBLIC_API_URL || 
  process.env.VITE_PUBLIC_API_URL || 
  'http://localhost:4040';
```

**After:**
```typescript
import { serverEnv } from '~/lib/env';
const baseUrl = serverEnv.VITE_PUBLIC_API_URL;
```

## Package Structure

```
packages/env/
├── src/
│   ├── create-client-env.ts    # createClientEnv factory
│   ├── create-server-env.ts    # createServerEnv factory
│   └── index.ts               # Exports
├── tests/
├── package.json
└── README.md
```

## Why This Architecture?

**Goals:**
- Single responsibility - package handles validation mechanics only
- Apps own their schemas - no coordination needed
- Lazy validation - no import-time crashes
- Type-safe - full TypeScript support via Zod

**Benefits:**
- No schema conflicts between apps
- Each app defines exactly the vars it needs
- Easy to add/remove vars without affecting others
- Tests pass without mocking process.env
