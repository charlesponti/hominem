# Tasks: Remove Supabase and Migrate to Cloudflare R2

## Phase 1: Update Package Dependencies

### Task 1.1: Update packages/utils/package.json
- [ ] Remove `@supabase/supabase-js: 2.88.0` from dependencies
- [ ] Remove `@supabase/storage-js: ^2.7.3` from dependencies
- [ ] Add `@aws-sdk/client-s3: ^3.529.0` to dependencies
- [ ] Add `@aws-sdk/s3-request-presigner: ^3.529.0` to dependencies
- [ ] Run `bun install` to update lockfile

### Task 1.2: Create packages/utils/src/storage/ directory
- [ ] Create `packages/utils/src/storage/index.ts`
- [ ] Create `packages/utils/src/storage/r2-storage.ts`
- [ ] Create `packages/utils/src/storage/types.ts`

## Phase 2: Implement R2 Storage Service

### Task 2.1: Implement R2StorageService class
- [ ] Create `R2StorageService` class with S3-compatible API
- [ ] Implement `constructor(bucketName, options)` - initialize S3Client
- [ ] Implement `uploadCsvFile(fileName, fileContent, userId)` - returns file path
- [ ] Implement `storeFile(buffer, mimetype, userId, options)` - returns StoredFile
- [ ] Implement `downloadCsvFile(filePath)` - returns file content as string
- [ ] Implement `downloadCsvFileAsBuffer(filePath)` - returns Buffer
- [ ] Implement `getFile(fileId, userId)` - returns ArrayBuffer or null
- [ ] Implement `deleteFile(fileId, userId)` - returns boolean
- [ ] Implement `getFileUrl(fileId, userId)` - returns public URL or null
- [ ] Implement `getSignedUrl(filePath, expiresIn)` - returns signed URL
- [ ] Implement `listUserFiles(userId)` - returns file list

### Task 2.2: Create singleton instances
- [ ] Create `csvStorageService` for 'csv-imports' bucket
- [ ] Create `fileStorageService` for 'chat-files' bucket
- [ ] Create `placeImagesStorageService` for 'place-images' bucket

### Task 2.3: Update exports
- [ ] Export all services and types from `packages/utils/src/storage/index.ts`
- [ ] Update `packages/utils/src/index.ts` to add `/storage` export
- [ ] Keep `/supabase` export pointing to `/storage` for backward compatibility

## Phase 3: Update Consuming Code

### Task 3.1: Update service imports
- [ ] Update `services/api/src/routes/finance/finance.import.ts` - change import to `@hominem/utils/storage`
- [ ] Update `services/workers/src/transaction-import-worker.ts` - change import to `@hominem/utils/storage`
- [ ] Update `apps/notes/app/routes/api.speech.ts` - change import to `@hominem/utils/storage`
- [ ] Update `apps/notes/app/routes/api.upload.ts` - change import to `@hominem/utils/storage`
- [ ] Update `packages/hono-rpc/src/routes/vector.ts` - change import to `@hominem/utils/storage`
- [ ] Update `packages/hono-rpc/src/routes/files.ts` - change import to `@hominem/utils/storage`
- [ ] Update `packages/places/src/place-images.service.ts` - change import to `@hominem/utils/storage`

### Task 3.2: Remove Supabase admin initialization
- [ ] Update `services/workers/src/index.ts` - remove `initSupabaseAdmin()` call

### Task 3.3: Update test mocks
- [ ] Update `packages/places/src/place-images.service.test.ts` - mock R2 instead of Supabase
- [ ] Update `services/workers/src/smart-input/smart-input.worker.test.ts` - update mocks

## Phase 4: Update Environment Configuration

### Task 4.1: Remove Supabase environment variables
- [ ] Update `services/api/src/env.ts` - remove SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
- [ ] Update `apps/finance/app/lib/env.ts` - remove VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- [ ] Update `apps/notes/app/lib/env.ts` - remove VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- [ ] Update `apps/rocco/app/lib/env.ts` - remove VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- [ ] Update `services/api/.env.example` - replace with R2 example
- [ ] Update `turbo.json` - remove Supabase env vars from passThroughEnv
- [ ] Update `.github/workflows/*.yml` - remove Supabase test vars

### Task 4.2: Add R2 environment variables
- [ ] Add R2 env vars to `services/api/src/env.ts`
- [ ] Add R2 env vars to apps `lib/env.ts` files
- [ ] Update `.env.example` with R2 placeholder values
- [ ] Update `.env.local` with actual R2 credentials (or create new file)

## Phase 5: Remove Supabase Module

### Task 5.1: Remove old supabase module
- [ ] Delete `packages/utils/src/supabase/admin.ts`
- [ ] Delete `packages/utils/src/supabase/storage.ts`
- [ ] Delete `packages/utils/src/supabase/storage.test.ts`
- [ ] Delete `packages/utils/src/supabase/index.ts`
- [ ] Remove `"./supabase"` export from `packages/utils/package.json`
- [ ] Remove `"./supabase"` export from `packages/utils/src/index.ts`

## Phase 6: Testing and Verification

### Task 6.1: Run tests
- [ ] Run `bun run test --filter @hominem/utils` - verify storage tests pass
- [ ] Run `bun run test --filter @hominem/places` - verify place images tests pass
- [ ] Run `bun run test` - run full test suite

### Task 6.2: Run typecheck and lint
- [ ] Run `bun run typecheck` - verify no type errors
- [ ] Run `bun run lint --parallel` - verify lint passes

### Task 6.3: Manual verification
- [ ] Test CSV import via finance app
- [ ] Test file upload via notes app
- [ ] Test place image download

## Phase 7: Cleanup

### Task 7.1: Final cleanup
- [ ] Search for any remaining "supabase" references in code (not tests/migrations)
- [ ] Address any remaining issues
- [ ] Update documentation if needed

## Dependencies

- Task 1.1 must complete before any code changes
- Task 2.1 must complete before Task 2.2
- Task 2.3 must complete before Phase 3
- Phase 3 and Phase 4 can be done in parallel
- Phase 5 must complete after all consumers are updated
- Phase 6 must complete before Phase 7
