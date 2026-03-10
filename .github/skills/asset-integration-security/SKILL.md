---
name: asset-integration-security
description: Use when integrating third-party assets or external APIs from apps, shared packages, or the API service.
---

# Asset And Integration Security

## Rules

- Proxy third-party assets through a server endpoint with strict allowlists.
- Validate all external URLs with `new URL()`.
- Enforce payload and size limits.
- Cache proxied assets with explicit `Cache-Control` headers.
- Prefer storing third-party assets internally and updating DB references over hotlinking.
- Keep unrestricted API keys server-side.
- Expose only scoped browser-safe keys.
- Add retries, backoff, and rate limiting around external calls.
