# Local Development Setup for Hominem

## Overview

This is the recommended development setup for the Hominem monorepo with Apple Authentication support.

## Architecture

```
Local Development Machine:
├─ React Apps (Caddy-hosted on .hominem.test domains)
│  ├─ notes.hominem.test:4445 (Rooco app)
│  ├─ rocco.hominem.test:4446 (Rocco service)
│  └─ finance.hominem.test:4444 (Finance service)
│
├─ API Server (localhost:4040)
│  └─ Hono server in services/api
│  └─ Mock authentication enabled
│
└─ Caddy Reverse Proxy
   └─ Provides HTTPS for local .test domains
   └─ Routes requests to appropriate services

Staging Environment (Shared):
├─ Domain: dev.ponti.io
├─ Real Apple Authentication enabled
├─ All team members use this for real auth testing
└─ Deployed via CI/CD on every commit
```

## Getting Started

### 1. Install Dependencies

```bash
bun install
```

### 2. Run All Services

```bash
bun run dev
```

This starts:
- All local services (API, apps)
- Caddy reverse proxy (handles .hominem.test domains)

### 3. Access Applications Locally

- **React App (Notes):** https://notes.hominem.test:4445
- **Other apps:** https://rocco.hominem.test:4446, https://finance.hominem.test:4444
- **API:** http://localhost:4040 (direct access, no HTTPS needed)

## Authentication

### Local Development

When running locally, all authentication is **mocked**. You don't need real Apple authentication.

```typescript
// In your app code
import { getAuthConfig } from '@/lib/auth'

const auth = getAuthConfig()
// In dev: returns mock auth that always succeeds
// On staging: returns real Apple Auth integration
```

**Mock auth behavior:**
- Always returns a successful sign-in
- Creates a temporary dev user session
- No real Apple servers involved

### Testing Real Apple Authentication

To test the actual Apple sign-in flow:

1. **Deploy to staging environment** (`dev.ponti.io`)
2. **Access the staging URL** in your browser
3. **Real Apple auth flow** is enabled there
4. **All team members share the same staging environment**

See `APPLE_AUTH_TEAM_SETUP.md` for staging setup details.

## Caddy Configuration

The `Caddyfile` provides:

- **HTTPS for local development** - `.hominem.test` domains use Caddy's generated local certificates
- **Reverse proxying** - Routes requests to the correct services
- **Security headers** - Standard security headers for development

The Caddy server is started automatically with `bun run dev`.

**Manual start:**
```bash
caddy run --config Caddyfile
```

## Environment Configuration

Create `.env.local` in the root (git-ignored):

```env
# API Configuration
VITE_API_URL=http://localhost:4040

# Authentication
VITE_USE_MOCK_AUTH=true
VITE_APPLE_AUTH_ENABLED=false

# Other local configs
NODE_ENV=development
```

## Common Development Tasks

### Run Only the API

```bash
cd services/api
bun run dev
```

### Run Only the React Apps

```bash
cd apps/notes
bun run dev
```

### Stop All Services

```bash
# If using `bun run dev`, press Ctrl+C
# If services are backgrounded:
pkill -f "bun run dev"
pkill caddy
```

### Clear Build Cache

```bash
bun run clean
rm -rf .turbo dist build node_modules/.cache
```

## Debugging

### Check if services are running

```bash
# Check if API is responding
curl http://localhost:4040/api/auth/session

# Check if Caddy is running
ps aux | grep caddy

# Check if apps are running
curl -k https://notes.hominem.test:4445 2>/dev/null || echo "Not running"
```

### API not responding?

```bash
# Make sure you're in the right directory
cd services/api
bun run dev

# Or run from root with filter
bun run dev --filter api
```

### Caddy certificate errors?

```bash
# Caddy generates local certificates automatically
# If you get certificate warnings, it's normal for local development
# The browser should warn you it's a self-signed cert (expected)
# This is intentional - it tests HTTPS behavior locally
```

### Can't access notes.hominem.test?

```bash
# Make sure Caddy is running
ps aux | grep caddy

# If not running, start it:
caddy run --config Caddyfile

# If it says permission denied on certificate:
# This is a macOS sandboxing issue
# Try: sudo caddy run --config Caddyfile
```

## Testing

### Run All Tests

```bash
bun run test
```

### Run Tests for Specific Package

```bash
bun run test --filter api
bun run test --filter notes
```

### Type Checking

```bash
bun run typecheck
```

### Linting

```bash
bun run lint
```

## Useful Commands

```bash
# Run development environment
bun run dev

# Build for production
bun run build

# Type check all packages
bun run typecheck

# Run tests
bun run test

# Format code
bun run format

# Lint code
bun run lint

# Full validation (lint, typecheck, test, build)
bun run check
```

## Team Collaboration

### Sharing Code

1. Make changes locally with mocked auth
2. Test with `bun run test`
3. Commit and push
4. CI/CD automatically deploys to staging
5. Team tests real auth on staging (dev.ponti.io)

### Testing Real Auth

Never test real Apple authentication locally. Instead:

1. Push your changes to a branch
2. Deploy to staging: `dev.ponti.io`
3. Test there with real Apple auth
4. All team members can access the same staging environment

### Onboarding New Team Members

1. Clone the repo
2. `bun install`
3. `bun run dev`
4. Access apps at `https://notes.hominem.test:4445` etc.
5. Mock auth is enabled automatically - no extra config needed

## Security Notes

**In .env.local (git-ignored):**
- Can store any local development configuration
- Can be different for each developer
- Never committed to git

**In environment variables on servers:**
- Real Apple credentials are stored as environment variables
- Never committed to git
- Only on staging/production servers

**Apple Signing Key Rotation:**
- Apple keys expire every 6 months
- Set a calendar reminder
- Regenerate key in Apple Developer Console
- Update server environment variables

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Port 4040 already in use" | `lsof -i :4040` to find process, then `kill -9 <PID>` |
| "Permission denied" on Caddy logs | Normal on macOS - use stdout logging instead |
| HTTPS certificate warnings | Normal for local dev - self-signed certs are expected |
| "Cannot resolve notes.hominem.test" | Make sure Caddy is running |
| API calls failing | Check API is running: `curl http://localhost:4040/api/auth/session` |
| Mock auth not working | Check `VITE_USE_MOCK_AUTH=true` in `.env.local` |

## Next Steps

1. **Set up staging server** - See `APPLE_AUTH_TEAM_SETUP.md`
2. **Configure Apple Developer account** - For staging environment
3. **Implement mock auth in code** - So local development works without Apple
4. **Test on staging** - Real Apple auth happens there

## Resources

- **Local Development:** This file (LOCAL_DEVELOPMENT.md)
- **Apple Auth Team Setup:** `APPLE_AUTH_TEAM_SETUP.md`
- **Architecture Overview:** `APPLE_AUTH_DEV_ENVIRONMENT.md`
- **Caddy Documentation:** https://caddyserver.com/docs
- **Bun Documentation:** https://bun.sh/docs
