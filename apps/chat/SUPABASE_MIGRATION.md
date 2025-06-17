# Migration Guide: From Local File Storage to Supabase Storage

This guide documents the migration from local file system storage to Supabase Storage for the chat application.

## What Changed

### File Storage Service (`app/lib/services/file-storage.server.ts`)

**Before:**
- Files were stored locally in an `uploads/` directory
- Used Node.js `fs` module for file operations
- Files were accessed via local file paths
- Required persistent storage volumes in Docker

**After:**
- Files are stored in Supabase Storage
- Uses Supabase Storage API for all operations
- Files are accessed via public URLs
- No local storage dependencies

### Key Interface Changes

#### `StoredFile` Interface
```typescript
// Before
interface StoredFile {
  // ... other fields
  path: string
  // ...
}

// After
interface StoredFile {
  // ... other fields
  url: string  // Public URL instead of local path
  // ...
}
```

#### Function Return Types
```typescript
// getFile() now returns ArrayBuffer instead of Buffer
// Before: Promise<Buffer | null>
// After: Promise<ArrayBuffer | null>
```

### Environment Variables

#### New Variables Required
```bash
# Server-side
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Client-side (for Vite)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Configure storage bucket name
STORAGE_BUCKET=chat-files
```

#### Variables No Longer Needed
```bash
UPLOAD_DIR=./uploads  # No longer used
```

### Docker Configuration

#### Removed
- `uploads_data` volume
- `UPLOAD_DIR` environment variable
- Volume mount for uploads directory

#### Added
- Supabase environment variables for both server and client
- `STORAGE_BUCKET` configuration

## Setup Instructions

### 1. Supabase Project Setup

1. Create a Supabase project if you don't have one
2. Get your project URL and keys from the Supabase dashboard
3. Add them to your environment variables

### 2. Storage Bucket

The application automatically creates a storage bucket named `chat-files` with the following configuration:

- **Public access**: Enabled for easy file sharing
- **File size limit**: 10MB
- **Allowed MIME types**: Images, PDFs, documents, audio, and video files

If you prefer to create the bucket manually:
1. Go to your Supabase dashboard
2. Navigate to Storage
3. Create a new bucket named `chat-files` (or your custom name)
4. Set it as public
5. Configure MIME types and size limits as needed

### 3. Environment Configuration

Update your `.env` file with the new variables:

```bash
# Copy from .env.example and fill in your values
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
STORAGE_BUCKET=chat-files
MAX_FILE_SIZE=10485760
```

### 4. Update Docker Configuration

The `docker-compose.yml` has been updated to:
- Remove the uploads volume
- Add Supabase environment variables
- Update file size limits

### 5. Clean Up

You can safely remove:
- The local `uploads/` directory
- Any backup or migration scripts that were using local file paths

## Benefits of This Migration

1. **Scalability**: Supabase Storage scales automatically
2. **Reliability**: Built-in redundancy and backups
3. **Performance**: CDN distribution for faster file access
4. **Security**: Fine-grained access control and policies
5. **Maintenance**: No need to manage local storage or backup strategies
6. **Development**: Easier local development without managing file uploads

## Troubleshooting

### Common Issues

1. **Files not uploading**: Check that your Supabase credentials are correct
2. **Public access issues**: Ensure the storage bucket is configured as public
3. **File size limits**: Verify that both application and Supabase limits are aligned
4. **CORS issues**: Check that your domain is allowlisted in Supabase settings

### Testing the Migration

1. Try uploading a file through the application
2. Verify the file appears in your Supabase Storage dashboard
3. Check that file URLs are accessible
4. Test file deletion functionality

## Rollback Plan

If you need to rollback to local storage:

1. Restore the previous version of `file-storage.server.ts`
2. Add back the uploads directory and Docker volume
3. Update environment variables
4. Migrate any files from Supabase back to local storage

Note: This migration is designed to be one-way. Plan accordingly and test thoroughly before deploying to production.
