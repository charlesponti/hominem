# Critical Issue Found: DNS Resolution

## The Problem

Your system cannot resolve `api-dev.ponti.io` because:

1. The domain `ponti.io` doesn't have DNS records pointing to Cloudflare's nameservers
2. Your system's local DNS resolver doesn't know how to reach `api-dev.ponti.io`
3. Without DNS resolution, your browser can't connect to the tunnel at all

**This is why you're getting: `net::ERR_CERT_AUTHORITY_INVALID`**

The error message is misleading - it's not really a certificate error, it's a connection failure because DNS resolution failed.

## Test Proof

From your machine:
```bash
$ curl https://api-dev.ponti.io/api/auth/session
* Could not resolve host: api-dev.ponti.io
```

## Solution

You have two options:

### Option 1: Add to /etc/hosts (Quick - For Local Testing Only)

Run this command:
```bash
sudo /tmp/setup-apple-auth-dns.sh
```

Or manually edit /etc/hosts:
```bash
sudo nano /etc/hosts
```

Add this line:
```
127.0.0.1 api-dev.ponti.io
```

Then test:
```bash
curl https://api-dev.ponti.io/api/auth/session
```

**Why this works:**
- `127.0.0.1` = your machine (localhost)
- `api-dev.ponti.io` = the domain name
- Your machine's cloudflared tunnel is listening, ready to receive requests to this domain
- When resolved locally to 127.0.0.1, requests go to your machine → cloudflared tunnel

**Why this won't work on other machines:**
- Only works on YOUR machine because of the /etc/hosts entry
- Team members would need their own /etc/hosts entry
- Won't work on real iOS devices (they use real DNS)

### Option 2: Configure Real DNS (For Team/Production)

1. Go to your DNS provider (wherever ponti.io is registered - GoDaddy, Namecheap, Route53, etc.)
2. Add a CNAME record:
   ```
   api-dev.ponti.io CNAME <your-tunnel-cname>.cfargotunnel.com
   ```
3. Get your tunnel's CNAME from Cloudflare Dashboard
4. Wait for DNS to propagate (5 minutes to 48 hours)
5. Then it will work everywhere

For now, **use Option 1** (hosts file) to get development working.

## Next Steps

1. Run the setup script:
   ```bash
   sudo /tmp/setup-apple-auth-dns.sh
   ```

2. Flush DNS cache (macOS):
   ```bash
   sudo dscacheutil -flushcache
   sudo killall -HUP mDNSResponder
   ```

3. Test:
   ```bash
   # Should work now
   curl https://api-dev.ponti.io/api/auth/session
   ```

4. Open your React app in browser:
   - Go to: `notes.hominem.test:4445`
   - Open DevTools (F12)
   - Run in console:
     ```javascript
     fetch('https://api-dev.ponti.io/api/auth/session')
       .then(r => r.json())
       .then(d => console.log(d))
     ```

5. Should now see: **200 OK** response (no more certificate error)

## Important Notes

**What we've configured:**
- ✅ API running on localhost:4040
- ✅ Cloudflare tunnel connected (running)
- ✅ Tunnel configured to route api-dev.ponti.io → http://localhost:4040
- ✅ Caddyfile simplified (removed unnecessary proxy)
- ⚠️ **DNS was never set up** (this was the missing piece)

**What the architecture is now:**
```
Browser (notes.hominem.test:4445)
    ↓ fetch('https://api-dev.ponti.io/...')
    ↓
Resolve DNS: 127.0.0.1 (from /etc/hosts)
    ↓
Connect to 127.0.0.1 (your machine)
    ↓
cloudflared daemon intercepts
    ↓
Cloudflare Edge provides HTTPS cert
    ↓
http://localhost:4040 (API)
```

## For Apple Authentication

Once the DNS issue is fixed:

1. In Apple Developer Console, register this redirect URI:
   ```
   https://api-dev.ponti.io/auth/apple/callback
   ```

2. Your app should now be able to:
   - Initiate Apple Sign-In
   - Redirect to `https://api-dev.ponti.io/auth/apple/callback`
   - Exchange token for session
   - Work with Apple's requirements

## Cleanup Note

The `/etc/hosts` entry is **development only**. When moving to staging/production:
1. Remove from /etc/hosts
2. Configure real DNS for your domain
3. Point `api.ponti.io` (production) to Cloudflare
4. No need for hosts file on production servers

---

## TL;DR - What to do right now:

```bash
# 1. Add to /etc/hosts
sudo /tmp/setup-apple-auth-dns.sh

# 2. Flush DNS cache
sudo dscacheutil -flushcache

# 3. Test
curl https://api-dev.ponti.io/api/auth/session

# 4. Should return JSON (not error)
```

Then your React app at notes.hominem.test:4445 will be able to reach the API without certificate errors.
