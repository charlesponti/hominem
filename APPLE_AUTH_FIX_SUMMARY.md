# Changes Made: Apple Authentication Local Development Fix

## Summary

Your setup has been **simplified and fixed** for Apple Authentication local development. The Caddy :8080 proxy hop has been removed, and the Cloudflare tunnel now connects directly to your API.

## What Changed

### 1. Cloudflare Tunnel Config (`~/.cloudflared/config.yml`)
**Before:**
```yaml
service: http://localhost:8080  # ❌ Pointed to Caddy (which wasn't listening)
```

**After:**
```yaml
service: http://localhost:4040  # ✅ Points directly to your Hono API
```

### 2. Caddyfile
**Before:**
```caddy
:8080 {
  import common
  reverse_proxy 127.0.0.1:4040
}

rocco.hominem.test { ... }
finance.hominem.test { ... }
notes.hominem.test { ... }
```

**After:**
```caddy
# :8080 block REMOVED - No longer needed

rocco.hominem.test { ... }
finance.hominem.test { ... }
notes.hominem.test { ... }
```

### 3. Caddyfile Logging
Changed from file-based logging (which had permission issues) to stdout logging.

## Why This Works

```
Browser (notes.hominem.test:4445)
  ↓ fetch('https://api-dev.ponti.io/api/auth/session')
  ↓
Cloudflare Tunnel
  ↓ (encrypted tunnel from cloudflared daemon)
  ↓
Your Hono API (localhost:4040) ✅
  ↓
Response back through tunnel
  ↓
Browser receives valid HTTPS response
```

No longer:
```
Browser → Tunnel → Caddy (not listening) → Error ❌
```

## What to Do Now

### 1. Stop the running Caddy process

Find and kill any stuck Caddy process:
```bash
killall caddy 2>/dev/null || true
```

### 2. Restart services in this order

**Terminal 1 - Start Caddy:**
```bash
cd /Users/charlesponti/Developer/hominem
caddy run --config Caddyfile
```

You should see:
```
{"level":"info","msg":"server running","name":"srv0"}
```

**Terminal 2 - Verify tunnel is running:**
```bash
ps aux | grep cloudflared | grep -v grep
```

Should show: `cloudflared tunnel run aacb640e-a165-4b52-92f3-9de70fc2a6cd`

### 3. Verify your API is running

```bash
# Should return JSON, not an error
curl http://localhost:4040/api/auth/session
```

Expected response:
```json
{"isAuthenticated":false,"user":null,"auth":null,"accessToken":null,"expiresIn":null}
```

### 4. Test the full chain

Open your browser and navigate to `notes.hominem.test:4445`

Open DevTools (F12) → Network tab

In the console, run:
```javascript
fetch('https://api-dev.ponti.io/api/auth/session').then(r => r.json()).then(d => console.log(d))
```

You should see:
- ✅ Status: 200 OK (not a certificate error)
- ✅ Response: The JSON data from your API

## If It Still Doesn't Work

### Error: `net::ERR_CERT_AUTHORITY_INVALID` still appears

**Check these things in order:**

1. **Is cloudflared tunnel running and connected?**
   ```bash
   ps aux | grep cloudflared
   ```
   Should show a process. If not, restart it in a terminal.

2. **Is your API actually listening on :4040?**
   ```bash
   curl http://localhost:4040/api/auth/session
   ```
   Should return JSON. If connection refused, your API isn't running.

3. **Is Caddy running?**
   ```bash
   ps aux | grep caddy
   ```
   Should show a Caddy process. If not, it exited. Check why.

4. **Can you reach the tunnel from localhost?**
   ```bash
   curl -v http://localhost:4040/api/auth/session
   ```
   Should work. If not, the API isn't responding.

### Error: Certificate validation fails even though HTTP works

This usually means:
- Cloudflare tunnel isn't connected
- Tunnel is pointing to the wrong port
- Your machine's connection to Cloudflare is down

Check tunnel status:
```bash
cloudflared tunnel status aacb640e-a165-4b52-92f3-9de70fc2a6cd
```

### CORS errors

If you see CORS errors in the browser console, your API needs to allow requests from the origin.

**Update your Hono API's CORS configuration:**

```typescript
import { cors } from 'hono/cors'

app.use('*', cors({
  origin: (origin) => {
    // Allow local development domains
    if (!origin) return false
    if (origin.includes('hominem.test')) return true
    if (origin.includes('api-dev.ponti.io')) return true
    if (origin.includes('ponti.io')) return true
    return false
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))
```

## Architecture Overview

After these changes, your local development environment for Apple Auth looks like:

```
┌──────────────────────────────────────┐
│  React App                           │
│  notes.hominem.test:4445             │
│  (runs on localhost:4445 via Caddy)  │
└──────────────┬───────────────────────┘
               │
               │ fetch('https://api-dev.ponti.io/...')
               │
               ▼
    ┌─────────────────────────────────┐
    │ Cloudflare Edge (global CDN)    │
    │ Provides valid HTTPS cert       │
    │ for api-dev.ponti.io            │
    └──────────────┬──────────────────┘
                   │
                   │ Encrypted tunnel
                   │ (via cloudflared)
                   │
                   ▼
    ┌──────────────────────────────┐
    │ cloudflared daemon           │
    │ (running on your machine)    │
    └──────────────┬───────────────┘
                   │
                   │ http://localhost:4040
                   │
                   ▼
    ┌──────────────────────────────┐
    │ Hono API                     │
    │ localhost:4040               │
    │ Apple Auth endpoints         │
    └──────────────────────────────┘
```

All local domains (.hominem.test) are handled by Caddy.
The real domain (api-dev.ponti.io) is handled by Cloudflare Tunnel.

## Next Steps

Once this is working:

1. **Test Apple Authentication** flow with the redirect URI: `https://api-dev.ponti.io/auth/apple/callback`
2. **Register this URL** in Apple Developer Console under your app's configuration
3. **For production:** Use `https://api.ponti.io` (or your production domain)

## Useful Commands

```bash
# Check if API is running
curl http://localhost:4040/api/auth/session

# Check if tunnel is connected
cloudflared tunnel info aacb640e-a165-4b52-92f3-9de70fc2a6cd

# View tunnel status
cloudflared tunnel status aacb640e-a165-4b52-92f3-9de70fc2a6cd

# View tunnel logs
cloudflared tunnel run aacb640e-a165-4b52-92f3-9de70fc2a6cd --loglevel debug

# Test DNS resolution (if tunnel is working)
curl -v https://api-dev.ponti.io/api/auth/session

# Kill Caddy if stuck
killall caddy

# Restart Caddy
cd /Users/charlesponti/Developer/hominem
caddy run --config Caddyfile
```

## Documentation

See `APPLE_AUTH_DEV_ENVIRONMENT.md` in the same directory for deep dive on professional approaches and why this architecture works.
