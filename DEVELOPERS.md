# Developer Guide - Authentication Debugging

This guide provides debugging tips and common issues for working with the authentication system in Hominem.

## Mock Authentication in Local Development

### Checking Mock Auth is Enabled

```bash
# Check your .env.local
cat .env.local

# Should show:
# VITE_USE_MOCK_AUTH=true
# VITE_APPLE_AUTH_ENABLED=false
```

### Common Mock Auth Issues

#### Sign-in not working

1. **Check if mock auth endpoint exists:**
   ```bash
   curl http://localhost:4040/api/auth/mock/signin -X POST \
     -H "Content-Type: application/json"
   ```

2. **Check environment variables in API:**
   ```bash
   # In your API logs, you should see:
   # Mock auth is enabled (in development)
   ```

3. **Verify the AuthProvider is wrapping your app:**
   - Open DevTools in your browser
   - Check if there are any React errors about context
   - Look for "useAuth must be used within an AuthProvider" errors

#### Session not persisting

1. **Check localStorage:**
   ```javascript
   // In browser console
   localStorage.getItem('hominem_auth_session')
   ```

2. **Verify localStorage is enabled:**
   - Some browsers disable localStorage in private mode
   - Try in a normal (non-private) window

3. **Check for CORS issues:**
   ```bash
   # Look at browser console for CORS errors
   # Check your API server allows localhost origins
   ```

### Testing Mock Auth Flow

1. **Sign in with mock auth:**
   ```bash
   # Manual API test
   curl http://localhost:4040/api/auth/mock/signin \
     -X POST \
     -H "Content-Type: application/json" | jq .
   ```

2. **Verify session persists:**
   ```bash
   # Open the browser console and run:
   const session = localStorage.getItem('hominem_auth_session')
   JSON.parse(session) // Should show user and session
   ```

3. **Test sign-out:**
   ```bash
   # In browser console:
   fetch('/api/auth/mock/signout', { method: 'POST' })
     .then(r => r.json())
     .then(console.log)
   ```

## Real Apple Authentication (Staging Only)

### Testing Real Auth on Staging

1. **Access staging server:** https://dev.ponti.io
2. **Use real Apple credentials** (configured on server)
3. **All team members use the same staging environment**

### Common Real Auth Issues

#### Apple Sign-in button not appearing

1. **Check Apple credentials are configured:**
   ```bash
   # SSH to staging server
   env | grep APPLE
   # Should show APPLE_TEAM_ID, APPLE_CLIENT_ID, APPLE_KEY_ID
   ```

2. **Verify Apple Developer account setup:**
   - Sign-in with Apple enabled in Apple Developer Console
   - Service ID registered
   - Return URLs match deployment domain

#### "Invalid client" error

1. **Check client ID matches:**
   - Verify APPLE_CLIENT_ID in .env matches Apple Developer Console
   - Service ID might be different from Bundle ID

2. **Check return URLs:**
   - Apple callback URL must be registered in Apple Developer Console
   - Format: `https://api.yourdomain.com/api/auth/callback/apple`

#### Token validation failing

1. **Check API can communicate with Apple servers:**
   ```bash
   # SSH to API server
   curl https://appleid.apple.com/.well-known/openid_configuration
   ```

2. **Verify signing key is up to date:**
   - Apple signing keys expire every 6 months
   - Regenerate in Apple Developer Console
   - Update server environment variable

## Development Workflow

### Adding Authentication to a New Component

```typescript
import { useAuth } from '@hominem/auth'

export function MyComponent() {
  const { user, isAuthenticated, signIn, signOut, isLoading } = useAuth()

  if (isLoading) return <div>Loading...</div>

  if (!isAuthenticated) {
    return <button onClick={signIn}>Sign In</button>
  }

  return (
    <div>
      <p>Welcome, {user?.name}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

### Creating a Protected Route

```typescript
import { useAuth } from '@hominem/auth'
import { Navigate } from 'react-router'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <div>Loading...</div>
  if (!isAuthenticated) return <Navigate to="/sign-in" />

  return children
}
```

### Testing Auth-Dependent Code

1. **In local development:**
   - Mock auth is always on
   - Sign in/out in the app UI
   - Mock tokens are simple identifiers

2. **Automated tests:**
   ```typescript
   // Mock the auth provider
   import { MockAuthProvider } from '@hominem/auth'

   const provider = new MockAuthProvider()
   const { user, session } = await provider.signIn()
   // Now test with real user/session data
   ```

## Debugging Tools

### Browser DevTools

1. **Application → Cookies/Storage:**
   - Check `hominem_auth_session` in localStorage
   - Verify token is present after sign-in

2. **Network tab:**
   - Check `/api/auth/mock/signin` requests
   - Verify response has `user` and `session`
   - Look for CORS errors

3. **React DevTools:**
   - Find `AuthProvider` in component tree
   - Check `AuthContext` state

### API Server Logs

```bash
# If running locally:
# Run in separate terminal
cd services/api
bun run dev

# Look for logs like:
# Mock auth is enabled
# POST /api/auth/mock/signin
```

### Environment Variables

Check all the right places for env vars:

1. **Local development:**
   ```bash
   cat .env.local        # Git-ignored, your local config
   cat .env              # Base config (committed)
   ```

2. **Staging server:**
   ```bash
   # SSH to staging and run
   env | grep APPLE
   env | grep VITE
   ```

## Performance & Optimization

### Session Token Size

Mock tokens are small: `mock_BASE64(userId:timestamp)`

Real Apple tokens are larger but still reasonable.

If token size is a concern:
- Use JWTs and verify signature instead of storing full token
- Implement token refresh logic
- Clear old sessions periodically

### localStorage Limits

Most browsers have ~5-10MB localStorage limit.

For auth, we only store:
- User object (~500 bytes)
- Session token (~200 bytes)
- Total: < 1KB

Not a concern for auth. More of a concern if storing lots of cached data.

## Integration with CI/CD

### Automated Testing

```bash
# Run tests locally before pushing
bun run test

# Tests should use MockAuthProvider
# No real Apple credentials needed
```

### Staging Deployment

```bash
# On push to main:
# 1. Tests run (with mock auth)
# 2. Build completes
# 3. Deploy to staging
# 4. Team tests real auth on dev.ponti.io
```

## Security Checklist

- [ ] Mock tokens never used in production
- [ ] Mock auth provider only in development builds
- [ ] Real credentials not in .env or code
- [ ] Real credentials only in server environment variables
- [ ] Token validation works on both local and staging
- [ ] Logout clears localStorage
- [ ] HTTPS enforced in production

## Getting Help

1. **Check logs:**
   - Browser console for client errors
   - API server logs for backend errors

2. **Review authentication code:**
   - `packages/auth/` - Auth implementation
   - `services/api/src/routes/auth.ts` - API endpoints
   - App-specific auth setup in each app's `app/lib/auth.server.ts`

3. **Test manually:**
   - Use curl to test API endpoints
   - Use browser DevTools to inspect state
   - Check localStorage for persisted session

4. **Ask the team:**
   - Most issues are environment-related
   - Team can quickly verify staging auth works
