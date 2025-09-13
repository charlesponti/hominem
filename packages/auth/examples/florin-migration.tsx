// Example: Migrating Florin app to unified auth
// This shows the before/after for key files

// ============================================================================
// BEFORE: apps/florin/app/root.tsx
// ============================================================================
/*
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import { createSupabaseServerClient } from '~/lib/supabase/server'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  
  return { user }
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}
*/

import { AuthProvider, getServerAuth, getServerAuthConfig } from '@hominem/auth'
// ============================================================================
// AFTER: apps/florin/app/root.tsx
// ============================================================================
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'

export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await getServerAuth(request, getServerAuthConfig())

  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
  }
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

// ============================================================================
// BEFORE: apps/florin/app/routes/dashboard.tsx
// ============================================================================
/*
import { requireAuth } from '~/lib/supabase/server'

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request)
  
  return { user }
}

export default function Dashboard() {
  const { user } = useLoaderData<typeof loader>()
  
  return (
    <div>
      <h1>Welcome, {user?.email}</h1>
      <p>User ID: {user?.id}</p>
    </div>
  )
}
*/

// ============================================================================
// AFTER: apps/florin/app/routes/dashboard.tsx
// ============================================================================
import { getServerAuthConfig, requireServerAuth, useAuth } from '@hominem/auth'

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireServerAuth(request, getServerAuthConfig())

  return { user }
}

export default function Dashboard() {
  const { user } = useAuth() // Now using unified auth hook

  return (
    <div>
      <h1>Welcome, {user?.name || user?.email}</h1>
      <p>User ID: {user?.id}</p>
      <p>Admin: {user?.isAdmin ? 'Yes' : 'No'}</p>
    </div>
  )
}

// ============================================================================
// BEFORE: apps/florin/app/components/user-menu.tsx
// ============================================================================
/*
import { useSupabaseAuth } from '~/lib/supabase/use-auth'

export function UserMenu() {
  const { user, signOut } = useSupabaseAuth()
  
  if (!user) return null
  
  return (
    <div className="user-menu">
      <span>{user.email}</span>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  )
}
*/

// ============================================================================
// AFTER: apps/florin/app/components/user-menu.tsx
// ============================================================================
import { AuthGuard, useAuth } from '@hominem/auth'

export function UserMenu() {
  const { user, signOut } = useAuth()

  return (
    <AuthGuard>
      <div className="user-menu">
        <span>{user?.name || user?.email}</span>
        <button onClick={() => signOut()}>Sign Out</button>
      </div>
    </AuthGuard>
  )
}

// ============================================================================
// BEFORE: apps/florin/app/routes/login.tsx
// ============================================================================
/*
import { useSupabaseAuth } from '~/lib/supabase/use-auth'

export default function Login() {
  const { signIn } = useSupabaseAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const { error } = await signIn(email, password)
    if (error) {
      console.error('Login error:', error)
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
      />
      <input 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
      />
      <button type="submit">Sign In</button>
    </form>
  )
}
*/

// ============================================================================
// AFTER: apps/florin/app/routes/login.tsx
// ============================================================================
import { GuestGuard, useAuth } from '@hominem/auth'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    
    const { error: signInError } = await signIn(email, password)
    if (signInError) {
      setError(signInError.message)
    }
  }
  
  return (
    <GuestGuard>
      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="Email"
        />
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="Password"
        />
        <button type="submit">Sign In</button>
      </form>
    </GuestGuard>
  )
}

// ============================================================================
// BEFORE: apps/florin/app/routes/admin.tsx
// ============================================================================
/*
import { requireAuth } from '~/lib/supabase/server'

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request)
  
  // Manual admin check
  if (!user.user_metadata?.isAdmin) {
    throw new Response('Forbidden', { status: 403 })
  }
  
  return { user }
}

export default function Admin() {
  const { user } = useLoaderData<typeof loader>()
  
  return (
    <div>
      <h1>Admin Panel</h1>
      <p>Welcome, {user.email}</p>
    </div>
  )
}
*/

// ============================================================================
// AFTER: apps/florin/app/routes/admin.tsx
// ============================================================================
import { AuthGuard, getServerAuthConfig, requireServerAuth, useAuth } from '@hominem/auth'

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireServerAuth(request, getServerAuthConfig())

  // Admin check is now handled by the auth service
  if (!user.isAdmin) {
    throw new Response('Forbidden', { status: 403 })
  }

  return { user }
}

export default function Admin() {
  const { user } = useAuth()
  
  return (
    <AuthGuard requireAdmin>
      <div>
        <h1>Admin Panel</h1>
        <p>Welcome, {user?.name || user?.email}</p>
      </div>
    </AuthGuard>
  )
}
