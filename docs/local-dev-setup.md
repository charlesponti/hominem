# Local Development Environment Setup

This document explains the issues and solutions for running the hominem monorepo development environment.

## Overview

The goal is to run multiple web apps and services locally with proper HTTPS, authentication, and cross-app communication.

## Architecture

```
                    ┌─────────────┐
                    │   Caddy     │
                    │ Reverse     │
                    │ Proxy       │
                    │ :443 (HTTPS)│
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Notes       │  │   Finance     │  │    Rocco      │
│   localhost   │  │   localhost   │  │   localhost   │
│   :4445       │  │   :4444       │  │   :4446       │
└───────────────┘  └───────────────┘  └───────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
                  ┌───────────────┐
                  │     API       │
                  │   localhost   │
                  │   :4040       │
                  └───────────────┘
                           │
                           ▼ (via Cloudflare Tunnel)
                  ┌───────────────┐
                  │ auth.ponti.io │
                  │  (Apple Auth) │
                  └───────────────┘
```

## URLs

| Service  | Local URL              | Production URL    |
|----------|------------------------|-------------------|
| Notes    | https://notes.hominem.test | - |
| Finance  | https://finance.hominem.test | - |
| Rocco    | https://rocco.hominem.test | - |
| API      | https://api.hominem.test | https://auth.ponti.io |
| Auth     | via tunnel | https://auth.ponti.io |

## Issues & Solutions

### Issue 1: DNS Resolution for `.local` Domains

**Problem:** macOS reserves `.local` for mDNS (Bonjour). When you try to resolve `notes.hominem.local`, macOS first queries mDNS which times out (~5 seconds) before falling back to DNS.

**Symptoms:** 
- Initial connection takes ~5 seconds
- `nslookup notes.hominem.local` returns NXDOMAIN despite `/etc/hosts` entry

**Solution:** Use `.test` TLD instead of `.local`

Changes made:
- Updated `/etc/hosts` to use `.test` domains
- Updated `Caddyfile` to use `.test` domains
- Updated app `.env` files to use `.test` domains

```bash
# In /etc/hosts (replace .local with .test)
127.0.0.1 hominem.test api.hominem.test rocco.hominem.test finance.hominem.test notes.hominem.test
```

### Issue 2: Privileged Ports (80/443)

**Problem:** Ports below 1024 are "privileged" on Unix - only root can bind to them. Caddy needs port 443 for HTTPS.

**Solution A (Recommended):** Run Caddy with sudo (one-time setup)

```bash
# First time: give Caddy capability to bind to privileged ports (doesn't work on macOS)
# Instead, just run with sudo:
sudo caddy start

# Check status
sudo caddy list-certificates

# View logs
sudo tail -f ~/.local/share/caddy/logs/access.log
```

**Solution B:** Use high ports (no sudo required)

```json
// In Caddyfile
{
  http_port 8080
  https_port 8443
}
```

Then access via `https://notes.hominem.test:8443`

### Issue 3: CORS with Auth

**Problem:** The notes app was calling `auth.ponti.io` directly, which is the Cloudflare tunnel URL. For local development, the apps should use the local API proxy (`https://api.hominem.test`) instead.

**Solution:** Updated `VITE_PUBLIC_API_URL` in app `.env` files:

```bash
# In apps/notes/.env
VITE_PUBLIC_API_URL=https://api.hominem.test

# In services/api/.env (trusted origins)
FINANCE_URL="https://finance.hominem.test"
NOTES_URL="https://notes.hominem.test"
ROCCO_URL="https://rocco.hominem.test"
```

### Issue 4: Turbo Dev Not Working in Interactive Terminal

**Problem:** When running `bun run dev` in an interactive terminal, the services appear to start (turbo shows them running) but they're not actually accessible. However, `bun run dev | tee /tmp/dev.log` works.

**Root Cause:** TTY-related issue with how turbo and the dev servers handle terminal output in interactive mode vs piped mode.

**Symptoms:**
- `bun run dev` shows all services starting but ports not accessible
- `bun run dev | tee /tmp/dev.log` works perfectly
- Running individual app `bun run dev` from app directory works

**Solution:** Set `TERM=dumb` when running:

```bash
TERM=dumb bun run dev
```

Or add an alias to your shell profile (`.zshrc`):

```bash
alias dev="TERM=dumb bun run dev"
```

### Issue 5: Vite strictPort

**Problem:** `strictPort: true` in Vite config causes silent failures if there's a port conflict.

**Solution:** Removed `strictPort: true` from all Vite configs:

```typescript
// Before
server: {
  port: 4445,
  strictPort: true,  // Remove this
  host: '0.0.0.0',
}

// After
server: {
  port: 4445,
  host: '0.0.0.0',
}
```

Files changed:
- `apps/notes/vite.config.ts`
- `apps/finance/vite.config.ts`
- `apps/rocco/vite.config.ts`

## What Doesn't Work

1. **Using `.local` TLD** - Too slow due to mDNS resolution
2. **`setcap` on macOS** - Linux-only, doesn't work on macOS
3. **Running `bun run dev` without `TERM=dumb`** - TTY issues
4. **`strictPort: true`** - Causes silent failures

## Startup Checklist

1. **Start Cloudflare Tunnel** (for Apple Auth):
   ```bash
   cloudflared tunnel run ponti-auth
   ```

2. **Start Caddy** (requires sudo):
   ```bash
   sudo caddy start
   ```

3. **Start Dev Servers**:
   ```bash
   TERM=dumb bun run dev
   ```

4. **Verify**:
   ```bash
   curl -s https://notes.hominem.test | head -1
   curl -s https://api.hominem.test/api/auth/session
   ```

## Troubleshooting

### Services not accessible after starting

```bash
# Check if ports are listening
lsof -i :4445 -i :4444 -i :4446 -i :4040

# Check if Caddy is running
sudo caddy list-certificates

# Check Caddy logs
sudo tail -50 ~/.local/share/caddy/logs/access.log
```

### Apple Auth not working

Verify Cloudflare tunnel is running:
```bash
curl -s https://auth.ponti.io/api/auth/session
# Should return: {"isAuthenticated":false,"user":null,...}
```

### CORS errors

Ensure the API server has the correct trusted origins:
```bash
curl -s https://api.hominem.test/api/auth/session
```

If still failing, check the API server's trusted origins configuration in `services/api/src/auth/better-auth.ts`.

## Files Modified

- `/etc/hosts` - Added `.test` domain entries
- `Caddyfile` - Reverse proxy configuration
- `apps/notes/.env` - API URL
- `apps/notes/vite.config.ts` - Removed strictPort
- `apps/finance/vite.config.ts` - Removed strictPort
- `apps/rocco/vite.config.ts` - Removed strictPort
- `services/api/.env` - Trusted origin URLs
