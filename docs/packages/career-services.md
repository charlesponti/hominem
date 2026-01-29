# @hominem/career-services (moved README)

Consolidated README for `packages/career`.

---

# @hominem/career-services

Job application and career management services for tracking job applications, companies, and job postings.

## Installation

```bash
bun add @hominem/career-services
```

## Usage

```typescript
import {
  CompanyService,
  JobService,
  JobApplicationService,
  JobApplicationStatus,
  JobApplicationStage
} from '@hominem/career-services'

// Manage companies
const companyService = new CompanyService()
const company = await companyService.create({
  name: 'Acme Corp',
  website: 'https://acme.com'
})

// Track job applications
const jobAppService = new JobApplicationService()
const application = await jobAppService.create({
  jobId: job.id,
  status: JobApplicationStatus.APPLIED,
  stage: JobApplicationStage.APPLICATION
})
```

## AI Tools

Career management AI tools are available for LLM agent integrations:

```typescript
import { career_tools } from '@hominem/career-services/tools'
```

## Services

- **CompanyService** - Manage company records
- **JobService** - Track job postings
- **JobApplicationService** - Manage job applications and stages

## Types

- `JobApplicationStatus` - Application status enum (APPLIED, HIRED, WITHDREW, REJECTED, OFFER)
- `JobApplicationStage` - Application stage enum (APPLICATION, PHONE_SCREEN, INTERVIEW, etc.)
