# @hominem/jobs-services

Background job queue management and processing using BullMQ and Redis.

## Installation

```bash
bun add @hominem/jobs-services
```

## Usage

```typescript
import {
  JobsService,
  JobStatus,
  BaseJob,
  ImportTransactionsJob,
  ImportTransactionsQueuePayload
} from '@hominem/jobs-services'

// Create and manage jobs
const jobsService = new JobsService()

// Add job to queue
await jobsService.addJob('import-transactions', {
  userId: 'user-123',
  fileId: 'file-456',
  accountId: 'account-789'
})

// Track job status
const status = await jobsService.getJobStatus('job-id')
```

## Types

### Job Status
- `queued` - Job is waiting to be processed
- `uploading` - File is being uploaded
- `processing` - Job is currently being processed
- `done` - Job completed successfully
- `error` - Job failed with an error

### Job Types
- **BaseJob** - Base job information shared by all jobs
- **ImportTransactionsJob** - Finance transaction import job
- **JobStats** - Progress tracking statistics
- **FileStatus** - UI file upload status

## Services

- **JobsService** - Main job queue service for creating, tracking, and managing jobs
