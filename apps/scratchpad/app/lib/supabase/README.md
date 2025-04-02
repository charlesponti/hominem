# Supabase Authentication

This directory contains a complete Supabase authentication implementation for React applications. It provides hooks, context, and components for authentication flows including:

- Email/password login
- Social login (Google, GitHub)
- Signup
- Password reset
- Protected routes
- User profile access

## Setup

1. Create a Supabase project at [https://supabase.com](https://supabase.com)
2. Enable the authentication methods you need in the Supabase dashboard
3. Copy `.env.example` to `.env` and add your Supabase URL and anon key:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Usage

### Basic Authentication

To use authentication in your components:

```tsx
import { useAuth } from '../lib/supabase/auth-context'

function MyComponent() {
  const { 
    user, 
    isAuthenticated, 
    login, 
    signup, 
    logout 
  } = useAuth()

  // Use authentication features
  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome {user?.email}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <button onClick={() => login('user@example.com', 'password')}>Login</button>
      )}
    </div>
  )
}
```

### Protected Routes

Use the ProtectedRoute component to restrict access to authenticated users:

```tsx
import { ProtectedRoute } from '../lib/supabase/protected-route'

function MyPage() {
  return (
    <ProtectedRoute fallback={<LoginRedirect />}>
      <MySensitiveComponent />
    </ProtectedRoute>
  )
}
```

### Auth Components

Ready-to-use authentication components:

- `<AuthPage />`: Combined login and signup interface
- `<LoginForm />`: Email/password login with social login options
- `<SignupForm />`: Registration form
- `<Profile />`: Display user profile information

## Architecture

- `client.ts`: Supabase client configuration
- `auth-hooks.ts`: React hooks for authentication operations
- `auth-context.tsx`: Context provider for global authentication state
- `types.ts`: TypeScript types for authentication objects

## Notes

- The AuthProvider should be placed at the root of your application to make authentication state available everywhere
- Social login requires proper configuration in your Supabase dashboard
- Password reset requires configuring email templates in Supabase
