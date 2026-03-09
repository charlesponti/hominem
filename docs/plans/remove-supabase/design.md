# Design: Remove Supabase and Migrate to Cloudflare R2

## Overview

Replace Supabase Storage with Cloudflare R2 using the S3-compatible API. The design maintains API compatibility with existing code while switching the underlying storage provider.

## Architecture

### Current Architecture (Supabase)

```
┌─────────────────────────────────────────────────────────┐
│                        Apps                              │
│  (notes, finance, rocco)                                │
└──────────────────────┬──────────────────────────────────┘
                       │ imports
                       ▼
┌─────────────────────────────────────────────────────────┐
│              @hominem/utils/supabase                     │
│  ┌─────────────────────────────────────────────────┐    │
│  │  SupabaseStorageService                         │    │
│  │  - uploadCsvFile()                              │    │
│  │  - storeFile()                                  │    │
│  │  - downloadCsvFile()                            │    │
│  │  - getFile()                                    │    │
│  │  - deleteFile()                                 │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │ uses
                       ▼
┌─────────────────────────────────────────────────────────┐
│              @supabase/supabase-js                       │
│              @supabase/storage-js                        │
└─────────────────────────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Supabase Storage│
              └────────────────┘
```

### New Architecture (Cloudflare R2)

```
┌─────────────────────────────────────────────────────────┐
│                        Apps                              │
│  (notes, finance, rocco)                                │
└──────────────────────┬──────────────────────────────────┘
                       │ imports
                       ▼
┌─────────────────────────────────────────────────────────┐
│              @hominem/utils/storage                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │  R2StorageService                               │    │
│  │  - uploadCsvFile()  [compatible]               │    │
│  │  - storeFile()      [compatible]               │    │
│  │  - downloadCsvFile()[compatible]               │    │
│  │  - getFile()        [compatible]               │    │
│  │  - deleteFile()     [compatible]               │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │ uses
                       ▼
┌─────────────────────────────────────────────────────────┐
│              @aws-sdk/client-s3                         │
│  (using R2's S3-compatible API)                        │
└─────────────────────────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Cloudflare R2  │
              └────────────────┘
```

## Implementation Details

### 1. New Package Structure

Rename/supplant:
- `packages/utils/src/supabase/` → `packages/utils/src/storage/`

New exports from `@hominem/utils/storage`:
```typescript
// Main service class
export class R2StorageService {
  constructor(bucketName: string, options?: StorageOptions)
  async uploadCsvFile(fileName: string, fileContent: Buffer | string, userId: string): Promise<string>
  async storeFile(buffer: Buffer, mimetype: string, userId: string, options?): Promise<StoredFile>
  async downloadCsvFile(filePath: string): Promise<string>
  async downloadCsvFileAsBuffer(filePath: string): Promise<Buffer>
  async getFile(fileId: string, userId: string): Promise<ArrayBuffer | null>
  async deleteFile(fileId: string, userId: string): Promise<boolean>
  async getFileUrl(fileId: string, userId: string): Promise<string | null>
  async getSignedUrl(filePath: string, expiresIn?: number): Promise<string>
  async listUserFiles(userId: string): Promise<FileObject[]>
}

// Singleton instances (same as before)
export const csvStorageService: R2StorageService
export const fileStorageService: R2StorageService
export const placeImagesStorageService: R2StorageService

// Types
export interface StoredFile { ... }
export interface StorageOptions { maxFileSize?: number; isPublic?: boolean; }
```

### 2. R2 Service Implementation

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

class R2StorageService {
  private client: S3Client;
  private bucketName: string;
  
  constructor(bucketName: string, options?: StorageOptions) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    this.bucketName = bucketName;
  }
  
  // ... implement all methods using S3 commands
}
```

### 3. Environment Variables

Remove:
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Add:
```
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<key>
R2_SECRET_ACCESS_KEY=<secret>
R2_BUCKET_NAME=<bucket>
```

### 4. Code Changes by Location

| File | Change |
|------|--------|
| `packages/utils/package.json` | Remove `@supabase/*`, add `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |
| `packages/utils/src/supabase/*` | Rename to `src/storage/*`, rewrite using S3 SDK |
| `packages/utils/src/index.ts` | Add `/storage` export, remove `/supabase` export |
| `services/api/src/routes/finance/finance.import.ts` | Update import path |
| `services/workers/src/transaction-import-worker.ts` | Update import path |
| `services/workers/src/index.ts` | Remove `initSupabaseAdmin` call |
| `apps/notes/app/routes/api.speech.ts` | Update import path |
| `apps/notes/app/routes/api.upload.ts` | Update import path |
| `packages/hono-rpc/src/routes/vector.ts` | Update import path |
| `packages/hono-rpc/src/routes/files.ts` | Update import path |
| `packages/places/src/place-images.service.ts` | Update import path |
| `apps/*/lib/env.ts` | Remove Supabase env vars |
| `services/api/src/env.ts` | Remove Supabase env vars |
| `.github/workflows/*` | Remove Supabase test vars |

### 5. Database Schema

The `users.supabaseId` field appears to already be deprecated per documentation found (`docs/plans/2026-02-24-1207-better-auth.md`). It should be removed in a separate migration. For this change, we'll:

- Keep the field in schema (it's already nullable)
- No migration needed - field can remain until explicitly dropped
- Remove any code that references `users.supabaseId`

### 6. Testing Strategy

Update existing tests:
- `packages/utils/src/supabase/storage.test.ts` → `packages/utils/src/storage/storage.test.ts`
- `packages/places/src/place-images.service.test.ts`
- `services/workers/src/smart-input/smart-input.worker.test.ts`

Mock R2 client in tests using `@aws-sdk/client-s3` mocks.

### 7. Backward Compatibility

Maintain export alias for smooth migration:
```typescript
// packages/utils/src/index.ts
// Keep old path working during transition
import * as SupabaseStorage from './supabase';
export { SupabaseStorage };
```

Or create deprecation warning.

## Security Considerations

1. **Credential management**: R2 credentials should be rotated periodically
2. **Bucket policies**: Configure appropriate CORS and access policies
3. **Presigned URLs**: Use short expiration times (default: 1 hour)
4. **File validation**: Continue validating file types and sizes on upload

## Performance Considerations

1. **R2 latency**: R2 has no egress fees and low latency
2. **Caching**: Consider adding Cloudflare Cache for frequently accessed files
3. **Multipart uploads**: Implement for large files (>5MB)
