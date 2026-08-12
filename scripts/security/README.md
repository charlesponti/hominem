# Security audit scripts

Run the repeatable checks with services already running:

```bash
pnpm security:audit
```

The default run performs the structured-findings check, tracked-file secret scan, dependency audit, API tests, AI tests, and unauthenticated live probes.

For the authenticated ownership checks, explicitly opt in because they create temporary local E2E users and records and then clean them up:

```bash
pnpm security:audit -- --authenticated
```

Useful variants:

```bash
pnpm security:audit -- --static-only
pnpm security:audit -- --live-only --authenticated
pnpm security:audit -- --live-only --deployment
pnpm security:audit -- --strict-dependencies
pnpm security:audit -- --skip-tests
```

The deployment probe targets `https://api.ponti.io` by default. Override it with `SECURITY_AUDIT_DEPLOYMENT_URL` when verifying another deployed API. The script reads `services/api/.env` for the local API URL and E2E secret without printing secret values. It does not start or stop services.
