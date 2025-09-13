# Unified Auth Migration Guide

This guide shows how to migrate each app to use the unified `@hominem/auth` package.

## Overview

The unified auth system provides:
- ✅ Consistent user management across all apps
- ✅ Automatic integration with local users table
- ✅ Shared auth components and hooks
- ✅ Server-side and client-side auth utilities
- ✅ Type-safe auth context

## Migration Steps

### 1. Install the Auth Package

```bash
# In each app directory
npm install @hominem/auth
```

### 2. Update Environment Variables

Ensure each app has these environment variables:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Replace Auth Providers

#### Before (App-specific auth):
```tsx
// Old: apps/florin/app/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(url, key)
```

#### After (Unified auth):
```tsx
// New: Use unified auth provider
import { AuthProvider } from '@hominem/auth'

function App() {
  return (
    <AuthProvider>
      <YourApp />
    </AuthProvider>
  )
}
```

### 4. Update Auth Hooks

#### Before:
```tsx
// Old: Custom auth hooks
const { user, signOut } = useSupabaseAuth()
```

#### After:
```tsx
// New: Unified auth hooks
import { useAuth } from '@hominem/auth'

const { user, signOut, isAuthenticated } = useAuth()
```

### 5. Update Server-Side Auth

#### Before:
```tsx
// Old: Custom server auth
import { createSupabaseServerClient } from '~/lib/supabase/server'

export async function loader({ request }) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  // ...
}
```

#### After:
```tsx
// New: Unified server auth
import { getServerAuth, requireServerAuth } from '@hominem/auth'

export async function loader({ request }) {
  const auth = await getServerAuth(request, getServerAuthConfig())
  // auth.user is now a HominemUser with local table integration
}
```

### 6. Use Auth Guards

```tsx
import { AuthGuard, GuestGuard } from '@hominem/auth'

// Protect authenticated routes
<AuthGuard>
  <ProtectedContent />
</AuthGuard>

// Protect guest-only routes
<GuestGuard>
  <LoginForm />
</GuestGuard>

// Require admin access
<AuthGuard requireAdmin>
  <AdminPanel />
</AuthGuard>
```

## App-Specific Migration Examples

### Florin App Migration

1. **Replace root.tsx**:
```tsx
// apps/florin/app/root.tsx
import { AuthProvider } from '@hominem/auth'

export function Layout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

2. **Update route loaders**:
```tsx
// apps/florin/app/routes/dashboard.tsx
import { requireServerAuth, getServerAuthConfig } from '@hominem/auth'

export async function loader({ request }) {
  const { user } = await requireServerAuth(request, getServerAuthConfig())
  return { user }
}
```

3. **Update components**:
```tsx
// apps/florin/app/components/user-menu.tsx
import { useAuth } from '@hominem/auth'

export function UserMenu() {
  const { user, signOut } = useAuth()
  
  return (
    <div>
      <span>Welcome, {user?.name || user?.email}</span>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  )
}
```

### Notes App Migration

1. **Replace auth hooks**:
```tsx
// apps/notes/app/lib/hooks/use-user.ts
import { useAuth } from '@hominem/auth'

export function useUser() {
  const { user, isLoading, isAuthenticated } = useAuth()
  
  return {
    user,
    isLoading,
    isAuthenticated,
    signOut: useAuth().signOut,
    signIn: useAuth().signIn,
  }
}
```

2. **Update server-side auth**:
```tsx
// apps/notes/app/routes/notes.tsx
import { getServerAuth, getServerAuthConfig } from '@hominem/auth'

export async function loader({ request }) {
  const auth = await getServerAuth(request, getServerAuthConfig())
  
  if (!auth.isAuthenticated) {
    throw redirect('/login')
  }
  
  return { user: auth.user }
}
```

### Chat App Migration

1. **Replace auth context**:
```tsx
// apps/chat/app/root.tsx
import { AuthProvider } from '@hominem/auth'

export function Layout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

2. **Update route protection**:
```tsx
// apps/chat/app/lib/supabase/route-protection.ts
import { requireServerAuth, getServerAuthConfig } from '@hominem/auth'

export async function requireAuth(request: Request) {
  const { user } = await requireServerAuth(request, getServerAuthConfig())
  return user
}
```

## Benefits After Migration

✅ **Consistent User Data**: All apps use the same user object structure  
✅ **Automatic Sync**: User data automatically syncs with local database  
✅ **Shared Components**: Reuse auth guards and components across apps  
✅ **Type Safety**: Full TypeScript support with proper types  
✅ **Simplified Code**: Less boilerplate, more consistent patterns  
✅ **Better Testing**: Unified auth makes testing easier  

## Rollback Plan

If you need to rollback:
1. Keep the old auth files as `.backup` files
2. The new auth package is additive - old patterns still work
3. You can migrate app by app without breaking others

## Next Steps

1. Start with one app (recommend Florin or Notes)
2. Test thoroughly in development
3. Migrate remaining apps one by one
4. Remove old auth code once all apps are migrated
5. Consider adding more auth features (2FA, social login, etc.)
