---
title: Place Images Migration to Supabase Storage
date: 2026-01-29
status: planned
category: migration
priority: medium
estimated_effort: 1d
---

Executive summary
- Download Google Places photos and store them in Supabase Storage to reduce runtime Google API usage and serve images from Supabase CDN.

Tasks
- Implement `place-images.service.ts` to download and normalize images
- Create `place-images` Supabase bucket and set public access
- Update `places.service` to replace Google image URLs with Supabase URLs on upsert
- Add migration script: `apps/rocco/scripts/migrate-place-images.ts`

Commands
```bash
# Run migration for rocco
bun run -C apps/rocco apps/rocco/scripts/migrate-place-images.ts

# Verify updated rows
psql $DATABASE_URL -c "SELECT count(*) FROM places WHERE photos LIKE '%supabase%'"
```

Verification
- [ ] Migration script completes without unhandled errors
- [ ] Percentage of places with Supabase-hosted photos meets target (configurable)
- [ ] UI components render Supabase URLs successfully
