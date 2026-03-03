# Apple Authentication Local Development Environment Guide

## Executive Summary

Your current setup is **overengineered** for local Apple Auth development. Professional teams use one of two approaches:

1. **Deploy to staging** (most common, simplest)
2. **Use Cloudflare Tunnel with a real domain** (local development alternative)

Your current setup (Cloudflare Tunnel + Caddy) adds unnecessary complexity. This document outlines the correct approach and fixes.

---

## The Core Problem: Why Apple Auth is Different

Apple requires **HTTPS with valid certificates** for all OAuth redirect URIs. This creates friction in local development because:

1. **Browsers enforce strict HTTPS validation** - Self-signed certificates are rejected by Safari/iOS
2. **Apple doesn't support localhost** - Must use a domain name for web redirect flows
3. **Real devices need real domains** - Can't redirect to `192.168.1.x` or `localhost`

This is fundamentally different from other OAuth providers (Google, GitHub) which have more relaxed requirements.

---

## Professional Approaches: What Teams Actually Do

### Approach 1: Deploy to Staging (Most Common) ⭐⭐⭐⭐⭐

**How professionals actually work:**

```
Local Development:
  ├─ React app runs on localhost:3000
  ├─ API runs on localhost:4040
  ├─ No Apple Auth testing locally
  └─ Use mock authentication for development

Staging Environment:
  ├─ Deploy to cloud (Railway, Render, Heroku, Vercel)
  ├─ API at https://api-dev.mycompany.com
  ├─ App at https://app-dev.mycompany.com
  ├─ Apple Auth redirect to https://api-dev.mycompany.com/auth/apple/callback
  ├─ Test full flow on staging
  └─ Confidence in production

Production:
  ├─ Same setup with production domain
  └─ Go live
```

**Pros:**
- Simplest setup
- Most reliable
- Team can test simultaneously
- Most production-like
- Cost: $5-20/month

**Cons:**
- Not true "local" development
- Deploy cycle (minimal with modern tooling)

**Best for:** Teams doing serious development, any team size

---

### Approach 2: Cloudflare Tunnel + Real Domain

**How to set this up correctly:**

```
Your Machine (localhost):
  ├─ React app: localhost:4445
  ├─ API: localhost:4040
  └─ No Caddy needed (remove it)

Cloudflare Tunnel:
  ├─ Connects: localhost:4040 → cloudflare edge
  ├─ Domain: https://api-dev.yourdomain.io
  ├─ URL is static (doesn't change on restart)
  └─ Handles HTTPS automatically

Apple Developer Console:
  └─ Redirect URI: https://api-dev.yourdomain.io/auth/apple/callback

React App (on localhost:4445):
  ├─ Fetch requests to: https://api-dev.yourdomain.io
  ├─ Goes through tunnel
  ├─ Reaches localhost:4040 API
  └─ Works because it's a real domain with valid cert
```

**Pros:**
- Static URL (doesn't change)
- Real HTTPS certificates
- Works on mobile devices
- No complex local setup
- Free

**Cons:**
- External dependency (Cloudflare)
- Can't test without internet
- Single developer per tunnel (can't easily team share)

**Best for:** Solo developers, testing on real devices

---

### Approach 3: Not Recommended - Self-Signed Certs

**Why this doesn't work for Apple Auth:**
- Apple Safari explicitly rejects self-signed certificates
- iOS apps cannot bypass certificate validation for Apple Auth
- iOS devices won't install self-signed certs for web domains
- **This approach is a dead end**

---

## Your Current Setup: Analysis

### What You Have

```
Browser (notes.hominem.test:4445)
  ↓ fetch('https://api-dev.ponti.io/...')
  ↓
Cloudflare Tunnel
  ↓ (should route to http://localhost:8080)
  ↓
Caddy (:8080)
  ↓ (should reverse proxy to :4040)
  ↓
Hono API (:4040) ✓ Working
```

### What's Broken

1. **Caddy not listening on :8080** - Port 8080 is not in use despite Caddyfile configuration
2. **Unnecessary complexity** - You're using Caddy to proxy :4040 → :8080, then tunnel expects :8080
3. **This adds latency** - Request goes: Browser → Cloudflare → Caddy → API (unnecessary hop)

### Why It's Over-Engineered

- **Caddy is for managing multiple local domains** (rocco.hominem.test, finance.hominem.test, notes.hominem.test)
- **For API tunneling, you don't need Caddy** - The tunnel can connect directly to localhost:4040
- **You're solving two problems with two tools** when one tool (Cloudflare Tunnel) is sufficient

---

## Recommended Solution: Simplified

### Option A: Simple Cloudflare Tunnel (Recommended)

**Configuration:**

Update `~/.cloudflared/config.yml`:
```yaml
tunnel: aacb640e-a165-4b52-92f3-9de70fc2a6cd
credentials-file: /Users/charlesponti/.cloudflared/aacb640e-a165-4b52-92f3-9de70fc2a6cd.json

ingress:
  - hostname: api-dev.ponti.io
    service: http://localhost:4040
  - service: http_status:404
```

**Remove the Caddy :8080 block** entirely. The tunnel connects directly to the API.

**Why this works:**
- No certificate issues (Cloudflare provides valid HTTPS)
- Direct connection to API (lower latency)
- Simple configuration (2 lines)
- Works with Apple Auth
- Works on mobile devices

---

### Option B: Keep Caddy for Local Domains + Separate API Tunnel

**If you want to keep Caddy for managing other local domains:**

Remove the :8080 block from Caddyfile entirely.

Configure the tunnel to point directly to the API:
```yaml
tunnel: aacb640e-a165-4b52-92f3-9de70fc2a6cd
credentials-file: /path/to/credentials.json

ingress:
  - hostname: api-dev.ponti.io
    service: http://localhost:4040
    originRequest:
      originServerName: localhost
  - service: http_status:404
```

**Keep Caddy for:**
- `notes.hominem.test` → localhost:4445 (React app)
- `rocco.hominem.test` → localhost:4446 (Other service)
- `finance.hominem.test` → localhost:4444 (Other service)

**Result:**
- Caddy handles internal local domains (.hominem.test)
- Tunnel handles external domain (api-dev.ponti.io)
- React app can fetch from the tunnel's real domain
- Clean separation of concerns

---

### Option C: Full Staging Deployment (Most Professional)

**If you want to move to staging:**

Deploy to Railway/Render:
```
https://api-dev-ponti.railway.app
https://app-dev-ponti.railway.app
```

Point Apple Auth redirect to staging domain. This is what professional teams do and gives you:
- Zero local configuration
- Team collaboration
- Most production-like
- Minimal cost ($5-20/month)

---

## Implementation Plan: Make It Work Today

### Step 1: Fix Cloudflare Tunnel Config (5 minutes)

**Current issue:** Tunnel points to `http://localhost:8080` but Caddy isn't listening there.

**Fix:** Point tunnel directly to API:

```yaml
ingress:
  - hostname: api-dev.ponti.io
    service: http://localhost:4040
  - service: http_status:404
```

### Step 2: Remove Caddy's :8080 Block (2 minutes)

Remove lines 51-54 from Caddyfile:
```
:8080 {
  import common
  reverse_proxy 127.0.0.1:4040
}
```

### Step 3: Restart Services (2 minutes)

```bash
# Stop Caddy
caddy stop

# Start Caddy (for local domains only)
caddy run --config Caddyfile

# Tunnel should already be running
# Verify tunnel is running:
ps aux | grep cloudflared
```

### Step 4: Verify Chain

```bash
# 1. API responds
curl http://localhost:4040/api/auth/session

# 2. Tunnel is connected
cloudflared tunnel info aacb640e-a165-4b52-92f3-9de70fc2a6cd

# 3. Browser can reach it
# Open notes.hominem.test:4445
# Open DevTools
# Make request: fetch('https://api-dev.ponti.io/api/auth/session')
# Should work now
```

---

## Expected Result

**Before Fix:**
```
Browser → Tunnel → Caddy (not listening) → Error: Certificate invalid
```

**After Fix:**
```
Browser → Tunnel → API (directly) → Success: 200 OK
```

---

## Why This Will Work

1. **No certificate errors** - Cloudflare provides valid HTTPS certificates for api-dev.ponti.io
2. **Direct connection** - No unnecessary proxy hop through Caddy
3. **Real domain** - Apple recognizes api-dev.ponti.io as a real domain
4. **Mobile compatible** - Real devices can reach the tunnel URL
5. **Simple** - Minimal configuration, fewer places for things to break

---

## If You Still Get Certificate Errors

Check these in order:

1. **Is cloudflared running?**
   ```bash
   ps aux | grep cloudflared
   ```
   Should show: `cloudflared tunnel run`

2. **Is the tunnel connected?**
   ```bash
   cloudflared tunnel status
   ```
   Should show: `Ready to accept connections`

3. **Is the local API responding?**
   ```bash
   curl http://localhost:4040/api/auth/session
   ```
   Should return JSON, not an error

4. **Check tunnel logs:**
   ```bash
   cloudflared tunnel run aacb640e-a165-4b52-92f3-9de70fc2a6cd
   ```
   Look for error messages

5. **Verify tunnel config:**
   ```bash
   cat ~/.cloudflared/config.yml
   ```
   Should show: `service: http://localhost:4040`

---

## CORS Considerations

Your API must accept requests from `notes.hominem.test` or allow credentials/origins properly.

**Hono CORS example:**
```typescript
app.use('*', cors({
  origin: (origin) => {
    // Allow local domains in development
    if (origin?.includes('hominem.test')) return origin
    // Allow tunnel in development
    if (origin?.includes('api-dev.ponti.io')) return origin
    // Your production domain
    if (origin?.includes('ponti.io')) return origin
    return false
  },
  credentials: true,
}))
```

---

## Long-Term Recommendation

Once this works reliably:

1. **Test Apple Auth on staging** (deploy the code to a staging environment)
2. **Register both URLs in Apple Developer Console:**
   - Development: `https://api-dev.ponti.io/auth/apple/callback`
   - Production: `https://api.ponti.io/auth/apple/callback` (or wherever your prod is)
3. **For local development:** Use mock authentication (fake tokens) instead of real Apple Auth
4. **For testing Apple Auth flow:** Only test on staging/production

This is what professional teams do. It's simpler, more reliable, and matches how you'll actually use Apple Auth in production.

---

## Summary

| Aspect | Current Setup | Recommended |
|--------|---------------|-------------|
| **Complexity** | High (Caddy + Tunnel) | Low (Tunnel only) |
| **Configuration** | Broken (Caddy not binding) | Simple (3-line config) |
| **Reliability** | Failing | Will work |
| **Latency** | Higher (extra proxy) | Lower (direct) |
| **Maintainability** | Complex | Simple |

**Action:** Remove Caddy's :8080 block, update tunnel config to point to :4040, restart services. Done.
