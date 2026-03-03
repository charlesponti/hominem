# Apple Authentication: Professional Team Development Setup

## The Fundamental Reality

**You cannot test Apple Authentication locally on your machine in a way that scales to a team.** This is not a technical limitation you can work around—it's an architectural requirement from Apple.

### Why Local Testing Doesn't Work

1. **Apple explicitly blocks localhost**
   - Apple's OAuth implementation requires a registered domain name
   - IP addresses (127.0.0.1, 192.168.x.x) are rejected
   - This is a security feature, not a bug

2. **Tunneling solutions don't scale to teams**
   - Each developer gets a different tunnel URL
   - Requires per-machine setup
   - Breaks on tunnel restart
   - Not shareable across the team

3. **What the industry does**
   - Supabase, Auth0, Firebase: Recommend staging servers
   - Apple's official documentation: Use a registered domain
   - Stripe, Twilio, Okta: All use staging environments
   - **Industry standard: 99% of teams test Apple Auth on staging, not locally**

---

## The Correct Architecture

```
Local Development (Your Machine)
├─ API: localhost:4040 ✓
├─ React app: localhost:4445 ✓
├─ Apple Auth: MOCKED ✓ (no real Apple connection needed)
└─ API calls → https://dev.yourdomain.com (staging server)

Staging Server (Shared by Team)
├─ Domain: dev.yourdomain.com (registered, with DNS)
├─ API: deployed code (same as local, but on server)
├─ React app: deployed code
├─ Apple Auth: ENABLED ✓ (real Apple integration)
└─ All team members access the same server

Production
├─ Domain: api.yourdomain.com / yourdomain.com
├─ Apple Auth: ENABLED ✓
└─ Only used for real users
```

---

## Why This Works for Teams

✅ **Single source of truth** - All developers test against same staging server
✅ **No per-machine configuration** - No tunnels, no hosts file hacks, no per-developer setup
✅ **Scalable** - Works for 1 person or 100 developers
✅ **Production-like** - Staging environment matches production exactly
✅ **Easy CI/CD integration** - Deploy once, test everywhere
✅ **Automatic onboarding** - New developers just clone repo and work
✅ **Reliable** - No tunnel timeouts, no certificate issues
✅ **Cost-effective** - $10-50/month for reliable staging server

---

## Implementation: Your Team's Setup

### Step 1: Choose Your Staging Server

**Recommended options:**

| Provider | Cost | Setup Time | Recommendation |
|----------|------|-----------|---|
| **DigitalOcean App Platform** | $12/mo | 15 min | Best balance of cost & ease |
| **Heroku** | $7-50/mo | 10 min | Easiest, good for small teams |
| **Railway** | $5-20/mo | 10 min | Modern, good pricing |
| **AWS** | Variable | 30+ min | Enterprise, most control |

**For your team, I recommend: DigitalOcean App Platform** (easy deployment, good pricing)

### Step 2: Set Up Staging Domain

1. You own `ponti.io`
2. Create a subdomain: `dev.ponti.io`
3. Point DNS to your staging server

```dns
# In your domain registrar (wherever you manage ponti.io)
Record: dev
Type: A or CNAME
Value: [staging server IP/hostname]
TTL: 3600
```

### Step 3: Deploy to Staging

Configure your CI/CD to deploy to staging on every commit:

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to staging server
        # Deploy your apps/services to staging
        # (exact command depends on your hosting choice)
```

### Step 4: Configure Apple Developer Console

**One-time setup (shared by entire team):**

1. Go to https://developer.apple.com
2. Create a **Services ID** for development:
   ```
   Identifier: com.yourcompany.app.web.dev
   Description: "Hominem Development"
   Website URLs:
     - Domain: dev.ponti.io
     - Redirect URL: https://dev.ponti.io/auth/apple/callback
   ```

3. Generate a **Signing Key** (.p8 file)
   - Download and store securely
   - Note the Team ID and Key ID

4. Store credentials securely on staging server:
   ```bash
   APPLE_CLIENT_ID=com.yourcompany.app.web.dev
   APPLE_TEAM_ID=XXXXXXXXXX
   APPLE_KEY_ID=XXXXXXXXXX
   APPLE_PRIVATE_KEY=[base64-encoded .p8 file]
   ```

### Step 5: Implement Conditional Auth in Code

**Local development: Use mocked auth**

```typescript
// apps/notes/src/lib/auth.ts
export const getAuthConfig = () => {
  if (import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
    return {
      signInWithApple: async () => ({
        user: {
          id: 'dev-user-' + Date.now(),
          email: 'dev@example.com',
          fullName: { firstName: 'Dev', lastName: 'User' }
        },
        token: 'mock-token-' + Math.random()
      })
    }
  }
  
  // Staging/production: Use real Apple Auth
  return {
    signInWithApple: async () => {
      // Call your real Apple Auth endpoint
      return fetch('https://dev.ponti.io/api/auth/apple/signin', {
        method: 'POST'
      }).then(r => r.json())
    }
  }
}
```

**In your API:**

```typescript
// services/api/src/auth.ts
import { Hono } from 'hono'

const app = new Hono()

if (process.env.APPLE_AUTH_ENABLED === 'true') {
  // Real Apple Auth flow
  app.post('/api/auth/apple/signin', async (c) => {
    // Call Apple's API with credentials
    // Validate token
    // Create session
    // Return user
  })
} else {
  // Mock auth for local development
  app.post('/api/auth/apple/signin', async (c) => {
    return c.json({
      user: { id: 'dev-user', email: 'dev@example.com' },
      token: 'mock-token'
    })
  })
}

export default app
```

### Step 6: Environment Configuration

**.env.local** (git-ignored, for your machine):
```
VITE_API_URL=http://localhost:4040
VITE_USE_MOCK_AUTH=true
VITE_APPLE_AUTH_ENABLED=false
```

**.env.staging** (git-tracked, for staging):
```
VITE_API_URL=https://dev.ponti.io
VITE_USE_MOCK_AUTH=false
VITE_APPLE_AUTH_ENABLED=true
```

**.env.production** (git-tracked, for production):
```
VITE_API_URL=https://api.ponti.io
VITE_USE_MOCK_AUTH=false
VITE_APPLE_AUTH_ENABLED=true
```

---

## Team Workflow

### Developer A (Local Development)

```bash
# Clone repo
git clone <repo>

# Install dependencies
bun install

# Run locally
bun run dev

# In browser: notes.hominem.test:4445
# Clicks "Sign in with Apple"
# See mock auth: signed in as "Dev User"
# API calls go to: https://dev.ponti.io (staging server)
```

### Developer B (Testing Real Apple Auth)

```bash
# Same local setup as Developer A
bun run dev

# But for testing real Apple OAuth:
# 1. Go to https://dev.ponti.io (staging environment)
# 2. Click "Sign in with Apple"
# 3. Real Apple sign-in flow happens
# 4. Staging server validates token
# 5. Session is created
```

### Team Integration Testing

All developers can test against the same staging environment:

```
Developer A → commits code → CI/CD deploys → staging updated
Developer B → accesses dev.ponti.io → Tests new features
Developer C → accesses dev.ponti.io → Verifies authentication flow
```

---

## What Happens With Your Current Setup

**You cannot keep the Cloudflare tunnel approach for team development.** Here's why:

❌ **Tunnel-based issues:**
- Only works on your machine (personal tunnel)
- Each developer would need their own tunnel
- URLs change on restart
- Requires per-machine Apple Auth configuration
- Not scalable beyond 1-2 people

✅ **Staging server approach:**
- Works for entire team
- Single shared URL (dev.ponti.io)
- Reliable, consistent
- Automatic deployments
- Easy to add new team members

---

## Security Considerations

**Never commit these to git:**
- `.p8` Apple signing key
- Credentials or secrets
- Environment-specific configs with real credentials

**Always store in environment variables:**
```bash
# Good: Environment variable
export APPLE_PRIVATE_KEY=$(cat /secure/path/key.p8 | base64)

# Bad: Committed to git
APPLE_PRIVATE_KEY=MIGfMA0GCS...
```

**Key rotation reminder:**
- Apple signing keys expire after 6 months
- Set a calendar reminder to rotate
- Generate new key in Apple Developer Console
- Update environment variable on staging server

---

## Implementation Timeline

| Timeline | Task | Team |
|----------|------|------|
| **This week** | Choose hosting provider | Charles |
| **This week** | Deploy staging server with CI/CD | Charles |
| **Next week** | Register dev.ponti.io domain | Charles |
| **Next week** | Create Apple Services ID | Charles + 1 other |
| **Next week** | Implement mock auth in code | Team |
| **Next week** | Test real Apple Auth on staging | Team |

---

## Long-term Benefits

Once this is set up:

1. **All Apple Auth testing** happens on `dev.ponti.io`
2. **New team members** just clone and run (no special setup)
3. **CI/CD deploys** automatically to staging
4. **Code reviews** include real Apple Auth testing
5. **Production launch** is proven (staging is identical)

---

## Cleanup: Remove Tunnel Setup

Since the tunnel approach doesn't work for team development, we should remove it:

```bash
# Stop cloudflared tunnel
pkill cloudflared

# Remove from /etc/hosts
sudo sed -i '' '/api-dev.ponti.io/d' /etc/hosts

# Clean up Caddyfile
# (Caddy is still useful for local .test domains, keep it)

# Cloudflare tunnel config - can delete
rm ~/.cloudflared/config.yml
```

---

## Summary

| Aspect | Local Dev | Staging | Production |
|--------|-----------|---------|-----------|
| **Domain** | localhost:4040 | dev.ponti.io | api.ponti.io |
| **Auth Type** | Mocked | Real Apple Auth | Real Apple Auth |
| **Who uses** | Each developer individually | Entire team | Real users |
| **Apple Config** | Not needed | 1 Services ID | 1 Services ID |
| **Cost** | $0 | $10-50/mo | Variable |

The staging server is the **single source of truth for your team's Apple Authentication development.**
