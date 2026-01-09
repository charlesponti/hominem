# Place Images Migration to Supabase Storage

This implementation automatically downloads Google Photos images for places and stores them in Supabase Storage, eliminating the need to rely on the expensive Google Photos API for serving images.

## Architecture

### Components

1. **Image Download Service** (`packages/data/src/services/place-images.service.ts`)
   - Downloads images from Google Photos API
   - Generates consistent filenames based on Google Maps ID and photo URL hash
   - Determines file extensions from content types
   - Identifies Google Photos URLs vs. already hosted URLs

2. **Supabase Storage** (`packages/utils/src/supabase/storage.ts`)
   - New `placeImagesStorageService` bucket for place images
   - Public bucket with 10MB file size limit
   - Stores images under `places/{googleMapsId}/` directory structure

3. **Updated Place Service** (`packages/data/src/services/places.service.ts`)
   - `upsertPlace` now accepts optional `buildPhotoMediaUrl` function
   - Automatically downloads and replaces Google Photos URLs with Supabase URLs
   - Works for both single place creation and batch operations
   - Falls back to original URL if download fails

4. **Migration Script** (`apps/rocco/scripts/migrate-place-images.ts`)
   - Migrates existing places with Google Photos URLs
   - Processes photos in batches with rate limiting
   - Provides detailed progress output
   - Handles errors gracefully

5. **Updated Components**
   - `buildPlacePhotoUrl` in `photo-utils.ts` now handles Supabase URLs
   - `PlacePhotoLightbox` component updated to support both URL types
   - Automatically detects and passes through Supabase Storage URLs

## Usage

### Automatic Download on Place Creation

When creating or updating places through the tRPC API, images are automatically downloaded:

```typescript
// In places router
const buildPhotoUrl = (photoRef: string) => {
  return buildPhotoMediaUrl({ photoName: photoRef })
}

const { place: createdPlace } = await addPlaceToLists(
  ctx.user.id,
  listIds ?? [],
  placeData,
  buildPhotoUrl // Pass the function to enable automatic downloads
)
```

### Migrating Existing Places

Run the migration script to update existing places:

```bash
bun run -C apps/rocco apps/rocco/scripts/migrate-place-images.ts
```

The script will:
1. Find all places with photos
2. Check for Google Photos URLs
3. Download and store images in Supabase
4. Update place records with new URLs
5. Provide detailed progress and statistics

### Storage Structure

Images are stored in Supabase with this structure:
```
place-images/
  places/
    {googleMapsId}/
      {googleMapsId}-{hash}.jpg
      {googleMapsId}-{hash}.jpg
```

## Benefits

1. **Cost Savings**: No longer need to pay for Google Photos API calls on every image view
2. **Performance**: Images served directly from Supabase CDN
3. **Reliability**: No dependency on Google Photos API availability
4. **Control**: Full control over image storage and delivery
5. **Backwards Compatible**: Existing Google Photos URLs still work during migration

## Configuration

Ensure these environment variables are set:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for storage operations
- `GOOGLE_API_KEY` / `VITE_GOOGLE_API_KEY`: For downloading images from Google Photos API

## Supabase Storage Bucket Setup

The `place-images` bucket is automatically created with these settings:
- **Public**: Yes (images need to be publicly accessible)
- **File size limit**: 10MB
- **Allowed MIME types**: All image types
- **Path**: `places/{googleMapsId}/{filename}`

## Error Handling

- If image download fails, the original Google Photos URL is retained
- Failed migrations are logged but don't stop the process
- Rate limiting prevents overwhelming the Google Photos API
- Detailed error messages for troubleshooting

## Future Enhancements

1. Image optimization (resize, compress) before storing
2. Support for multiple image sizes
3. Automatic cleanup of unused images
4. Image CDN integration for better performance
5. Background job queue for migration instead of script
