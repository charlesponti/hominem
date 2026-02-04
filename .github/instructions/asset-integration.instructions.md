---
applyTo: 'apps/**, packages/data/**, packages/utils/**, services/api/**'
---

# Asset & Integration Security

Rules
- Proxy third-party assets through a server endpoint with strict allowlists.
- Validate all external URLs with `new URL()` and enforce size limits.
- Cache proxied assets with explicit `Cache-Control` headers.
- Store third-party assets internally when possible and update DB references.
- Keep unrestricted API keys server-side; expose only scoped browser-safe keys.
- Add retries, backoff, and rate limiting for external calls.
