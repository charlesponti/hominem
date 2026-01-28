---
applyTo: 'apps/**, packages/data/**, packages/utils/**, services/api/**'
---

# Asset & Integration Security

Securely handle, store, and serve external assets and sensitive third-party integrations.

### 1. Asset Proxying & CORB Prevention
- **Tactical Goal:** Bypass browser security restrictions (CORB/CORS) without compromising security.
- **Action:** Route all third-party assets (e.g., Google Profile Images) through a server-side proxy (`/api/images/proxy`).
- **Safeguards:** Implement strict domain whitelisting, URL validation using `new URL()`, and response size limits. Set appropriate `Cache-Control` headers (e.g., 24h) to reduce external load.

### 2. Third-Party Data Hosting
- **Tactical Goal:** Reduce dependency on expensive or rate-limited external APIs.
- **Action:** Automatically download and host external assets (e.g., Place Photos) in internal storage (Supabase).
- **Pattern:** Use server-side services to fetch, hash, and store assets. Update the database to point to internal CDN URLs rather than raw external links.

### 3. API Key Isolation
- **Tactical Goal:** Prevent exposure of sensitive credentials.
- **Action:** Keep unrestricted API keys (e.g., Google Places server key) strictly server-side.
- **Client Access:** Expose only scoped, browser-safe keys (e.g., Maps JS SDK) to the client. Proxy all other authenticated external requests through internal API endpoints.

### 4. Resilient External Flows
- **Tactical Goal:** Graceful handling of external service failures and rate limits.
- **Action:** Implement idempotent migration scripts and batch processing for data synchronization task. Use exponential back-off and rate-limiting to honor third-party API constraints.
