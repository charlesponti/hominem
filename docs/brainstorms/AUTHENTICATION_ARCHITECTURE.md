# Hominem Authentication Architecture

## Executive Summary

This document chronicles the journey to implement Apple Sign-In for the Hominem team—including the problems faced, solutions attempted, and the architecture we settled on. This guide covers both local development with mocked authentication and staging deployment with real Apple authentication.

**The key insight:** Apple Sign-In requires a real registered domain with valid HTTPS certificates. While Cloudflare tunnels initially seemed like a solution, they don't scale to team development. The professional approach used by leading platforms (Supabase, Auth0, Firebase, Stripe) is: **mock authentication locally, real authentication on a shared staging server.**

---

## The Problem

### Initial Challenge: Apple's Authentication Requirements

Apple Sign-In has strict requirements:

1. **Real, registered domain** - Not localhost, not IP addresses
2. **Valid HTTPS certificates** - Self-signed certs are rejected
3. **Explicit registration** - Callback URLs must be pre-registered in Apple Developer Console
4. **Team coordination** - Authentication must work for the entire development team

These requirements made initial local development difficult. It seemed like each developer would need their own tunnel or domain, which doesn't scale.

### What We Tried: Cloudflare Tunnel Approach

**Initial Architecture:**
```
Developer's Machine
  ├─ Local API (localhost:4040)
  ├─ Cloudflare tunnel (daemon)
  └─ Tunnel exposes as: api-dev.ponti.io

Browser
  └─ fetch('https://api-dev.ponti.io/...')
      → Routes through Cloudflare Edge
      → Tunnel connects back to localhost:4040
```

This seemed promising because:
- ✅ Provides HTTPS with valid certificates
- ✅ Uses a real domain
- ✅ Works for local development

**But it had critical limitations:**
1. **Personal to each machine** - Each developer's tunnel creates a different URL
2. **Not shareable** - Team members can't access the same URL
3. **Configuration per-machine** - Every developer needs their own tunnel setup
4. **Fragile** - Breaks when tunnel restarts or closes
5. **DNS issues** - Required /etc/hosts entry or complex DNS configuration

### The DNS Problem

When we tried using the Cloudflare tunnel approach, we discovered a critical issue:

```bash
$ curl https://api-dev.ponti.io/api/auth/session
* Could not resolve host: api-dev.ponti.io
```

Real DNS records weren't configured. We explored two options:

**Option 1: /etc/hosts Entry** (Temporary workaround)
```
# Add to /etc/hosts on each machine
127.0.0.1 api-dev.ponti.io
```

This works because:
- Resolves `api-dev.ponti.io` to `127.0.0.1` (your machine)
- The Cloudflare tunnel daemon intercepts the request
- Tunnel routes it back through Cloudflare Edge with valid HTTPS cert
- Finally reaches `http://localhost:4040`

**But it only works on that one machine.** Team members would each need their own /etc/hosts entry.

**Option 2: Real DNS Configuration**
```
# In DNS provider (GoDaddy, Route53, etc.)
api-dev.ponti.io CNAME <tunnel-cname>.cfargotunnel.com
```

This would work globally but:
- Requires DNS provider access
- Propagation takes hours
- Still doesn't solve the per-machine tunnel problem
- Only one developer can use the URL at a time

### Why This Approach Doesn't Scale

The fundamental issue: **Cloudflare tunnels are personal and ephemeral.**

```
Developer A's Machine          Developer B's Machine
  ├─ Tunnel A                     ├─ Tunnel B
  └─ api-dev.ponti.io             └─ api-dev.ponti.io
      → localhost:4040                → localhost:4040
```

Both tunnels have the same URL, but they route to different machines. Team collaboration becomes impossible.

---

## Root Cause Analysis

### Why the Tunnel Approach Failed

The tunnel approach conflated two separate concerns:

1. **Local development** - Developers need to iterate quickly with a fast feedback loop
2. **Team coordination** - The team needs a shared environment for testing

These are fundamentally different requirements.

Apple's authentication requirements make this worse:

- **Apple won't accept** `localhost`, `127.0.0.1`, or dynamic URLs
- **Apple requires** explicit registration of all callback URLs
- **Apple blocks** changing URLs on the fly

This means:
- ❌ Each developer can't have their own Apple registration
- ❌ Each developer can't use a unique tunnel URL
- ❌ The team can't sync Apple credentials across machines

### The Architectural Mismatch

The core issue: **trying to solve local development and team testing with the same environment.**

What we actually needed:

```
Local Development (per-machine)
  └─ Fast iteration, no Apple involved
  └─ Mock authentication

Staging Server (shared by team)
  └─ Real domain, real HTTPS
  └─ Real Apple authentication
  └─ Production-like testing
```

The mistake was thinking these needed to be the same thing.

---

## The Final Solution

### Industry Standard Approach

Every major authentication platform (Supabase, Auth0, Firebase, Okta, Stripe) recommends this pattern:

```
┌─────────────────────────────────────────────────────────────┐
│ Local Development (Each Developer)                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  • Domain: localhost:4040                                   │
│  • Authentication: Mocked (no Apple servers)                │
│  • Setup: Git clone + bun install                           │
│  • Testing: Mock tokens in localStorage                     │
│  • Speed: Instant auth, no network latency                  │
│                                                             │
│  React Apps    API Server     Mock Auth                     │
│       ↓             ↓              ↓                        │
│   .hominem.test   localhost      Fast tokens               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Staging Server (Shared by Entire Team)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  • Domain: dev.ponti.io                                     │
│  • Authentication: Real Apple Sign-In                       │
│  • Setup: CI/CD automatic deployment                        │
│  • Testing: Real Apple tokens, production-like              │
│  • Access: All team members use same instance               │
│                                                             │
│  React Apps    API Server     Real Auth                     │
│       ↓             ↓              ↓                        │
│   dev.ponti.io   dev.ponti.io   Apple servers              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Production (For Real Users)                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  • Domain: api.ponti.io                                     │
│  • Authentication: Real Apple Sign-In                       │
│  • Setup: Manual or CD deployment                           │
│  • Access: Public users                                     │
│                                                             │
│  React Apps    API Server     Real Auth                     │
│       ↓             ↓              ↓                        │
│   ponti.io       ponti.io       Apple servers              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Why This Works

✅ **Single source of truth** - One staging environment for entire team
✅ **No per-machine configuration** - Works anywhere with `git clone && bun install`
✅ **Scales to any team size** - New developers onboard in minutes
✅ **Production-like testing** - Real auth, real domain, real HTTPS
✅ **Easy onboarding** - No tunnel setup, no DNS hacks
✅ **Works with CI/CD** - Automatic deployment on every commit
✅ **Security best practice** - Real credentials only on servers
✅ **Cost-effective** - Staging costs $10-50/month

### What Doesn't Work for Teams

| Approach | Local Dev | Team Use | Why Not |
|----------|-----------|----------|---------|
| **Cloudflare Tunnel** | ✅ Works | ❌ Fails | Personal per-machine, breaks on restart |
| **Ngrok** | ✅ Works | ❌ Fails | URL changes on tunnel restart |
| **Self-signed certs** | ✅ Works | ❌ Fails | Apple rejects them |
| **Localhost + domain** | ✅ Works | ❌ Fails | Apple blocks localhost explicitly |
| **Per-dev Apple account** | ✅ Works | ❌ Fails | Not scalable, hard to manage |
| **Mock auth local + staging** | ✅ Works | ✅ Works | Professional standard |

---

## Architecture

### Environment Breakdown

#### Local Development

```
Your Machine
├─ Caddy (reverse proxy)
│  └─ Handles .hominem.test domains
│  └─ Provides HTTPS with local certificates
│
├─ API Server
│  └─ Port: 4040
│  └─ Authentication: Mocked
│  └─ No Apple servers involved
│
└─ React Apps
   ├─ notes.hominem.test:4445
   ├─ rocco.hominem.test:4446
   └─ finance.hominem.test:4444
```

**Key characteristics:**
- All components run locally
- Caddy provides HTTPS (self-signed, intentional)
- Mock authentication (instant, no network)
- Fast feedback loop for development
- No credentials needed

#### Staging Server (Shared by Team)

```
Hosting Provider (DigitalOcean, Heroku, Railway, etc.)
├─ Real domain: dev.ponti.io
│  └─ Real HTTPS certificates
│  └─ DNS points here
│
├─ API Server
│  └─ Real Apple authentication enabled
│  └─ Real Apple credentials (server env vars)
│  └─ Production-like setup
│
└─ React Apps
   └─ Same as local, but running on server
```

**Key characteristics:**
- Real domain with valid DNS
- Real HTTPS certificates (from Let's Encrypt or similar)
- Real Apple Sign-In integration
- Automatic deployment via CI/CD
- Shared by entire team
- Production-like testing environment

#### Production

```
Production Server
├─ Real domain: api.ponti.io
├─ Real HTTPS certificates
├─ Real Apple authentication
├─ Real credentials (carefully managed)
└─ For real users only
```

### Code Structure

The authentication code is **environment-aware**:

```typescript
// In app code
import { getAuthConfig } from '@/lib/auth'

const auth = getAuthConfig()

// Behavior depends on environment:
// - Local: Uses mock auth provider
// - Staging: Uses real Apple auth
// - Production: Uses real Apple auth
```

**Mock Auth (Local):**
```typescript
const config = {
  provider: 'mock',
  endpoints: {
    signin: 'http://localhost:4040/api/auth/mock/signin',
    signout: 'http://localhost:4040/api/auth/mock/signout',
    session: 'http://localhost:4040/api/auth/session'
  }
}
```

**Real Auth (Staging/Prod):**
```typescript
const config = {
  provider: 'apple',
  endpoints: {
    signin: 'https://dev.ponti.io/api/auth/signin',
    callback: 'https://dev.ponti.io/api/auth/callback/apple',
    session: 'https://dev.ponti.io/api/auth/session'
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID,
    teamId: process.env.APPLE_TEAM_ID,
    keyId: process.env.APPLE_KEY_ID,
    // Signing key loaded from server environment
  }
}
```

---

## Implementation Guide

### Local Development Setup

#### 1. Install Dependencies

```bash
# In the monorepo root
bun install
```

#### 2. Configure Local Environment

Create `.env.local` in the root (git-ignored):

```env
# API Configuration
VITE_API_URL=http://localhost:4040

# Authentication (local development)
VITE_USE_MOCK_AUTH=true
VITE_APPLE_AUTH_ENABLED=false

# Other local configs
NODE_ENV=development
```

#### 3. Start All Services

```bash
# Starts API, apps, and Caddy reverse proxy
bun run dev
```

This starts:
- API server on `http://localhost:4040`
- Caddy reverse proxy for `.hominem.test` domains
- React apps with hot reload

#### 4. Access Applications

- **React App (Notes):** https://notes.hominem.test:4445
- **Rocco Service:** https://rocco.hominem.test:4446
- **Finance Service:** https://finance.hominem.test:4444
- **API (direct):** http://localhost:4040

### Staging Server Setup

#### 1. Choose Hosting Provider

**Recommended: DigitalOcean App Platform**
- Cost: ~$12/month for basic app
- Setup time: 15 minutes
- Includes free SSL certificates

**Alternatives:**
- Heroku - $7-25/month
- Railway - $5-20/month
- AWS - Variable, more complex

#### 2. Register Domain

1. Go to your DNS provider
2. Add A record pointing to your staging server
3. Add domain to your hosting provider
4. SSL certificate is automatically provisioned

#### 3. Configure Apple Developer Console

1. Log in to Apple Developer Console
2. Create a Services ID for development
3. Enable "Sign in with Apple"
4. Register these URLs:
   ```
   https://dev.ponti.io/api/auth/callback/apple
   ```
5. Download the signing key
6. Note your Team ID, Client ID, and Key ID

#### 4. Set Server Environment Variables

On your staging server, set:

```bash
export APPLE_TEAM_ID="ABC123DEFG"
export APPLE_CLIENT_ID="com.yourorganization.signin"
export APPLE_KEY_ID="XYZ789"
export APPLE_SIGNING_KEY="-----BEGIN PRIVATE KEY-----..."
```

#### 5. Deploy Application

```bash
# Option A: Automatic via CI/CD
# Just push to main branch, CI/CD deploys to staging

# Option B: Manual deployment
# Use your hosting provider's deployment interface or CLI
```

#### 6. Test Real Authentication

1. Navigate to https://dev.ponti.io
2. Click "Sign in with Apple"
3. Use real Apple credentials
4. Verify session is created
5. Share with team for testing

### Adding Authentication to Components

#### Using Authentication Hook

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

#### Creating Protected Route

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

---

## Development Workflow

### Daily Development Cycle

#### 1. Start Local Development

```bash
# Terminal 1: Run all services
bun run dev

# Gives you:
# - API on http://localhost:4040
# - Apps on .hominem.test domains
# - Mock authentication enabled
```

#### 2. Develop and Test Locally

```bash
# Make code changes
# Mock auth works immediately
# Test with browser console:
const session = localStorage.getItem('hominem_auth_session')
console.log(JSON.parse(session))
```

#### 3. Run Tests

```bash
# Tests use MockAuthProvider
bun run test

# Tests don't contact Apple servers
# No credentials needed
```

#### 4. Commit and Push

```bash
git add .
git commit -m "feat: add new feature"
git push
```

#### 5. CI/CD Deploys to Staging

- Tests run (with mock auth)
- Build completes
- Deploy to staging automatically
- Real Apple auth available on staging

#### 6. Team Tests on Staging

1. Tell team: "Changes live on dev.ponti.io"
2. Team accesses https://dev.ponti.io
3. Team tests with real Apple auth
4. Feedback returned to you

### Testing Mock Authentication

#### Test Sign-in Endpoint

```bash
curl http://localhost:4040/api/auth/mock/signin \
  -X POST \
  -H "Content-Type: application/json" | jq .
```

#### Verify Session in Browser

```javascript
// In browser console
const session = localStorage.getItem('hominem_auth_session')
JSON.parse(session) // Should show user and session
```

#### Test Sign-out

```javascript
// In browser console
fetch('http://localhost:4040/api/auth/mock/signout', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

### Testing Real Authentication on Staging

1. **Navigate to staging URL**
   ```
   https://dev.ponti.io
   ```

2. **Click "Sign in with Apple"**
   - This uses real Apple servers
   - You'll see Apple's sign-in iframe

3. **Sign in with real Apple account**
   - Team credentials (shared with team)
   - Or your personal Apple ID

4. **Verify session created**
   ```javascript
   // In browser console
   const session = localStorage.getItem('hominem_auth_session')
   JSON.parse(session) // Should show real Apple user data
   ```

5. **Test specific features**
   - Verify tokens are valid
   - Test authorization flows
   - Check token expiration handling

---

## Debugging & Troubleshooting

### Common Local Development Issues

#### Mock Auth Not Working

**Symptom:** Sign-in button doesn't work or shows error

**Debug steps:**

```bash
# 1. Check if API is running
curl http://localhost:4040/api/auth/session

# 2. Check environment variables
cat .env.local
# Should have VITE_USE_MOCK_AUTH=true

# 3. Check API logs
# In API terminal, look for "Mock auth is enabled"

# 4. Check browser console
# Look for CORS errors or network failures
```

#### Session Not Persisting

**Symptom:** Sign in works, but session disappears on refresh

**Debug steps:**

```javascript
// In browser console
// Check if localStorage is enabled
console.log(localStorage.getItem('hominem_auth_session'))

// Check if in private/incognito mode
// (Private mode disables localStorage)

// Check for CORS issues
// Network tab should show successful POST to /api/auth/mock/signin
```

#### Caddy Certificate Errors

**Symptom:** Browser warns about self-signed certificate

**This is intentional for local development.** The certificate errors are expected because:
- We're using local self-signed certificates
- This tests HTTPS behavior without real certificates
- Browsers warn about it, but requests still work

**To silence warnings:**
```bash
# Add Caddy's local root cert to system trust store (macOS)
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  ~/.local/share/caddy/pki/authorities/local/root.crt
```

#### Can't Access .hominem.test Domain

**Symptom:** Browser says "Cannot resolve notes.hominem.test"

**Debug steps:**

```bash
# 1. Check if Caddy is running
ps aux | grep caddy

# 2. If not running, start it
caddy run --config Caddyfile

# 3. If permission denied
sudo caddy run --config Caddyfile

# 4. Test resolution
ping notes.hominem.test

# 5. Check Caddy logs for errors
# Look for "listening on" messages
```

#### Port Already in Use

**Symptom:** "Port 4040 already in use"

```bash
# Find process using port
lsof -i :4040

# Kill it
kill -9 <PID>

# Or if running in background
pkill -f "bun run dev"
```

### Common Staging Issues

#### Apple Sign-in Button Missing

**Symptom:** No Apple button on staging, but works locally

**Debug steps:**

```bash
# 1. SSH to staging server
ssh user@dev.ponti.io

# 2. Check Apple credentials are set
env | grep APPLE
# Should show APPLE_TEAM_ID, APPLE_CLIENT_ID, APPLE_KEY_ID

# 3. Check API logs
# Look for "Apple auth is enabled"

# 4. Verify credentials in Apple Developer Console
# Make sure Service ID matches APPLE_CLIENT_ID
```

#### "Invalid client" Error

**Symptom:** Click Apple button, get "Invalid client" error

This occurs when:
- `APPLE_CLIENT_ID` doesn't match Apple Developer Console
- Redirect URL not registered in Apple Console
- Credentials are for wrong Apple account

**Fix:**

```bash
# 1. Verify Apple Developer Console
# Sign in with Apple → Services ID
# Check that Service ID matches APPLE_CLIENT_ID

# 2. Verify redirect URL is registered
# Format: https://dev.ponti.io/api/auth/callback/apple
# Add this URL in Service ID configuration

# 3. Update server credentials if needed
export APPLE_CLIENT_ID="com.yourorg.signin"
```

#### Token Validation Failing

**Symptom:** Sign-in succeeds, but session creation fails

This occurs when:
- Apple signing key is outdated
- Apple servers are unreachable
- Token format is invalid

**Debug:**

```bash
# 1. Check Apple servers are reachable
curl https://appleid.apple.com/.well-known/openid_configuration

# 2. Check signing key is recent
# Apple keys expire every 6 months
# Regenerate in Apple Developer Console if needed

# 3. Check API logs for validation errors
# SSH to server and tail logs

# 4. Verify key is loaded correctly
# APPLE_SIGNING_KEY should be full private key (multi-line)
```

### Debugging Tools

#### Browser DevTools

1. **Application → Storage:**
   - Check `hominem_auth_session` in localStorage
   - Verify token after sign-in

2. **Network tab:**
   - Monitor `/api/auth/signin` requests
   - Check response format
   - Look for 401/403/500 errors

3. **React DevTools:**
   - Find `AuthProvider` component
   - Check `AuthContext` state
   - Verify `isAuthenticated`, `user`, etc.

#### API Server Logs

```bash
# Local development
cd services/api
bun run dev

# Look for:
# - "Mock auth is enabled"
# - "POST /api/auth/mock/signin"
# - "POST /api/auth/callback/apple"
```

#### Manual API Testing

```bash
# Test mock auth endpoint
curl http://localhost:4040/api/auth/mock/signin \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{}' | jq .

# Test session endpoint
curl http://localhost:4040/api/auth/session | jq .

# Test with authentication
curl -H "Authorization: Bearer <token>" \
  http://localhost:4040/api/auth/session | jq .
```

---

## Security & Best Practices

### Authentication Flow Security

#### Session Storage

**Mock tokens (local):**
```javascript
// Small identifiers, stored in localStorage
// Format: mock_BASE64(userId:timestamp)
// Size: ~100 bytes
```

**Real tokens (staging/production):**
```javascript
// JWT or opaque tokens, stored securely
// Size: ~200-500 bytes
// Secure: httpOnly flag for server cookies
// Expiry: 1 hour to 1 week (configurable)
```

#### Token Refresh

```typescript
// Implement refresh logic for long sessions
async function refreshSession() {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  
  if (response.ok) {
    const { session } = await response.json()
    localStorage.setItem('hominem_auth_session', JSON.stringify(session))
  }
}

// Call periodically or on 401 response
```

### Environment Variables

#### Local Development (.env.local)

```env
# Git-ignored file, never committed
# Can be different for each developer

VITE_API_URL=http://localhost:4040
VITE_USE_MOCK_AUTH=true
VITE_APPLE_AUTH_ENABLED=false
```

#### Staging Server

```bash
# Environment variable on server, never in code
# Managed by hosting provider admin panel or deployment config

export APPLE_TEAM_ID="ABC123DEFG"
export APPLE_CLIENT_ID="com.yourorg.signin"
export APPLE_KEY_ID="XYZ789"
export APPLE_SIGNING_KEY="-----BEGIN PRIVATE KEY-----..."
```

#### Production

```bash
# Most sensitive - managed by IT/DevOps
# Consider using secret management system (AWS Secrets, HashiCorp Vault, etc.)

# Environment variables only, never in code
# Rotate credentials regularly
# Use separate Apple Services ID for production
```

### Credential Management

#### Do ✅

- Store real credentials **only in server environment variables**
- Rotate Apple signing keys **every 6 months** (Apple requirement)
- Use separate Apple Services IDs for **staging** and **production**
- Keep `.env.local` in `.gitignore`
- Track credential rotation in calendar
- Document credential location and rotation process

#### Don't ❌

- Store credentials in `.env` or code
- Commit Apple keys or tokens to git
- Use mock credentials on production
- Share credentials via email or Slack
- Use same Apple Services ID across environments
- Forget credential rotation date

### Testing with Credentials

#### Automated Testing (No Credentials Needed)

```bash
# Tests use MockAuthProvider
bun run test

# No real Apple servers contacted
# No credentials needed
# Fast, reliable, repeatable
```

#### Manual Testing with Real Auth

```bash
# Only on staging environment
# Only when you need to test real Apple flow
# Use staging domain: dev.ponti.io

# Never test real Apple auth on localhost
# Apple explicitly blocks localhost
```

### CI/CD Security

```bash
# Ensure tests run with mock auth
# CI environment:
export VITE_USE_MOCK_AUTH=true
export VITE_APPLE_AUTH_ENABLED=false

# Build succeeds with mock auth only
# Real credentials never needed in CI

# On deployment:
# Hosting provider injects real credentials
# CI doesn't have access to secrets
```

### Apple Authentication Best Practices

#### Key Rotation

Apple signing keys expire every 6 months. Set a calendar reminder:

```bash
# 1. Go to Apple Developer Console
# 2. Keys section
# 3. Generate new key (keep old one temporarily)
# 4. Download new key
# 5. Update APPLE_SIGNING_KEY on servers
# 6. Delete old key after verification
# 7. Set next rotation reminder (6 months)
```

#### Redirect URI Registration

All callback URLs must be registered:

```
Staging:     https://dev.ponti.io/api/auth/callback/apple
Production:  https://api.ponti.io/api/auth/callback/apple
```

**Never:**
- Use localhost as callback
- Dynamically change callback URLs
- Register URLs unnecessarily

#### Token Validation

Always validate tokens before trusting them:

```typescript
// In API server
import { verifyAppleToken } from '@hominem/auth'

async function validateAppleToken(token: string) {
  try {
    const claims = await verifyAppleToken(token, {
      audience: process.env.APPLE_CLIENT_ID,
      issuer: 'https://appleid.apple.com'
    })
    
    // Token is valid, use claims
    return claims
  } catch (error) {
    // Token is invalid or expired
    throw new UnauthorizedError('Invalid token')
  }
}
```

---

## Migration Path & Timeline

### Phase 1: Immediate (This Week)

- ✅ **Local development works with mock auth**
  ```bash
  bun run dev
  ```
- ✅ **Developers can sign in/out locally**
- ✅ **No Apple credentials needed locally**
- ✅ **Fast development feedback loop**

### Phase 2: Short Term (1-2 Weeks)

1. **Choose hosting provider** for staging
   - Recommended: DigitalOcean ($12/mo)

2. **Register staging domain** (dev.ponti.io)
   - Add DNS record
   - Configure on hosting provider

3. **Set up CI/CD deployment**
   - Automatic deployment on every commit to main
   - Tests run before deployment

### Phase 3: Medium Term (2-4 Weeks)

1. **Create Apple Services ID**
   - In Apple Developer Console
   - For staging environment

2. **Configure staging with real auth**
   - Set Apple credentials on staging server
   - Test real Apple flow

3. **Document for team**
   - Team signup guide
   - Real auth testing instructions

### Phase 4: Long Term (1-3 Months)

1. **Create production Apple Services ID**
   - Separate from staging
   - Production-ready configuration

2. **Set up production deployment**
   - More restricted deployment process
   - Better secret management

3. **Monitor and maintain**
   - Credential rotation (every 6 months)
   - Security updates
   - Performance monitoring

---

## FAQ

### Q: Do I need real Apple credentials to develop locally?

**A:** No. Mock authentication is enabled by default in local development. You can develop, test, and debug without any Apple credentials.

### Q: Can I test real Apple auth locally?

**A:** Not practically. Apple's security requirements prevent localhost authentication. This is intentional—Apple wants real auth to only happen on registered production domains.

**Instead:** Push changes to staging and test real auth there. All team members can access the same staging environment.

### Q: What if my team is distributed across time zones?

**A:** The staging approach is perfect for distributed teams. Each developer:
1. Works locally with mock auth (fast, no coordination needed)
2. Pushes changes to GitHub
3. CI/CD automatically deploys to staging
4. Any team member can test on staging URL anytime
5. No per-machine setup needed

### Q: How much does staging cost?

**A:** $10-50/month depending on provider:
- **DigitalOcean:** ~$12/month (basic app)
- **Heroku:** $7-25/month
- **Railway:** $5-20/month
- **AWS:** Highly variable

### Q: What if my staging domain changes?

**A:** You'd need to:
1. Update DNS to point to new server
2. Register new domain in Apple Developer Console
3. Update environment variables on staging server
4. Keep old domain working briefly or migrate gracefully

**To avoid this:** Choose a domain you'll own long-term.

### Q: Can I share my staging credentials with the team?

**A:** Yes! Since it's team staging, everyone uses:

```
URL: https://dev.ponti.io
Apple Account: team-staging@company.com
```

Never share production credentials. Production uses a different Apple Services ID with restricted access.

### Q: How do I handle Apple key rotation?

**A:** Apple requires new keys every 6 months:

1. Set calendar reminder (March & September)
2. Log in to Apple Developer Console
3. Generate new signing key
4. Download the key
5. Update `APPLE_SIGNING_KEY` on servers
6. Test signing-in on staging
7. Delete old key from Apple Console

### Q: What if someone leaves the team?

**A:** Mock auth doesn't require credentials—just remove their git access.

For staging/production:
- No per-person credentials (all use team credentials)
- Rotate keys if you're concerned about old access
- Update Appleaccount password if needed

---

## Resources

### Documentation Files

- **LOCAL_DEVELOPMENT.md** - Detailed local setup guide
- **DEVELOPERS.md** - Debugging tips and common issues
- **AGENTS.md** - Repository-wide development guidelines

### Key Code Locations

- `packages/auth/` - Authentication implementation
- `services/api/src/routes/auth.ts` - API authentication endpoints
- `apps/*/app/lib/auth.server.ts` - App-specific auth setup

### External Resources

- [Apple Sign-In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform/)
- [Caddy Server Documentation](https://caddyserver.com/docs/)
- [Bun Package Manager](https://bun.sh/docs)

---

## Conclusion

The path to sustainable authentication for Hominem has been:

1. **Identify the problem** - Apple auth requires real domains
2. **Attempt a solution** - Cloudflare tunnels (failed to scale)
3. **Discover the real issue** - Tunnels are personal, not team-friendly
4. **Learn the right approach** - This is how industry leaders do it
5. **Implement the professional solution** - Mock + staging

This architecture is:
- ✅ Simple for developers (mock auth locally)
- ✅ Scalable for teams (shared staging)
- ✅ Secure (real credentials only on servers)
- ✅ Cost-effective ($10-50/month staging)
- ✅ Professional standard (used by Supabase, Auth0, Firebase, Stripe)

You have the right architecture now. Implement staging at your own pace, and you'll have a production-ready authentication system that scales with your team.
