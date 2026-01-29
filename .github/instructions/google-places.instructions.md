---
applyTo: 'apps/rocco/**, packages/*/src/**'
---

---
applyTo: 'apps/rocco/**, packages/*/src/**'
---

# Google Places Integration (thin)

Short integration guide for Google Places. Canonical asset and API key handling rules live in `asset-integration.instructions.md`.

Key points:
- Keep `GOOGLE_API_KEY` server-only; do not expose in client bundles.
- Proxy external media through server endpoints and store critical assets in internal storage when needed (see `asset-integration.instructions.md`).
- For Maps JS SDK in the client, use a restricted `VITE_GOOGLE_API_KEY` with referrer limits.

Shared helper API (examples):
- `searchPlaces(options)`, `getPlaceDetails(options)`, `getPlacePhotos(options)`, `buildPhotoMediaUrl({ photoName, maxWidthPx })`.

Verification (quick):
- Ensure `process.env.GOOGLE_API_KEY` is set in server environments
- `rg "VITE_GOOGLE_API_KEY|GOOGLE_API_KEY" -n || true`
