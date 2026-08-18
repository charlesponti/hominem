/**
 * Job processing types used across the monorepo
 *
 * These types define the structure of background jobs that are
 * processed by workers and can be tracked by the UI.
 */

/**
 * Status of a job
 */
export type JobStatus = 'queued' | 'uploading' | 'processing' | 'done' | 'error' | 'cancelled';

/**
 * Statistics for tracking job progress
 * All properties are made optional to allow for partial updates
 */
export interface JobStats {
  progress?: number;
  processingTime?: number;
  total?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  merged?: number;
  invalid?: number;
  errors?: string[];
}

/**
 * Base job information shared by all job types
 */
export interface BaseJob<TStatus extends string = JobStatus> {
  jobId: string;
  userId: string;
  endTime?: number;
  status: TStatus;
  stats?: JobStats;
  type: string;
}

/**
 * Generic file status information for UI
 */
export interface FileStatus {
  jobId?: string;
  file: File;
  status: JobStatus;
  error?: string;
  stats?: JobStats;
}

/**
 * Transaction import job options
 */
export interface ImportTransactionsJob extends BaseJob {
  type: 'import-transactions';
  fileName: string;
  planId: string;
  error?: string;
  stats: JobStats;
  startTime: number;
  endTime?: number;
}

/**
 * Data payload specifically for creating an 'import-transactions' job in BullMQ.
 * This defines the structure of the `data` field when a job is added to the queue.
 */
export interface ImportTransactionsQueuePayload {
  planId: string;
  fileName: string;
  userId: string;
  status: JobStatus; // Should be 'queued' when initially added
  createdAt: number; // Timestamp of when the job data was prepared
  type: 'import-transactions';
}

export interface ImportRequestResponse {
  success: boolean;
  jobId: string;
  fileName: string;
  status: JobStatus;
}

export type PreflightStatus = 'ready' | 'confirmed' | 'dismissed' | 'expired';

export interface ImportPreflight {
  preflightId: string;
  userId: string;
  fileName: string;
  status: PreflightStatus;
  planId: string;
  createdAt: number;
  expiresAt: number;
}

export interface FileProcessingJob {
  jobId: string;
  userId: string;
  fileId: string;
  storageKey: string;
  url: string;
  originalName: string;
  mimetype: string;
  size: number;
}

export interface EmbeddingGenerationJob {
  jobId: string;
  userId: string;
  entityType: 'note' | 'chat';
  entityId: string;
}

/**
 * Resume import: parsing a PDF resume and diffing it against the user's
 * existing career profile so changes can be reviewed before being applied.
 */
export type ResumeAnalysisStage =
  | 'queued'
  | 'pdf-extraction'
  | 'ai-parse'
  | 'schema-validation'
  | 'diffing'
  | 'done'
  | 'error';

export type ResumeImportMode = 'create' | 'replace';

export interface ResumeAnalysisQueuePayload {
  jobId: string;
  userId: string;
  fileId: string;
  mode: ResumeImportMode;
  existingProfileId?: string;
  createdAt: number;
}

/** A changed scalar field on the profile or social-links record. */
export interface ResumeScalarFieldChange {
  field: string;
  group: 'basics' | 'social';
  label: string;
  current: string | boolean | null;
  proposed: string | boolean | null;
}

/** A new list-type record (work experience, skill, or project) parsed from the resume. */
export interface ResumeListItemChange {
  key: string;
  group: 'workExperience' | 'skills' | 'projects';
  summary: string;
  payload: unknown;
}

export interface ResumeImportDiff {
  scalarChanges: ResumeScalarFieldChange[];
  listChanges: ResumeListItemChange[];
  portfolioSlugProposed: string;
}

export interface ResumeAnalysisJob extends BaseJob {
  type: 'resume-analysis';
  stage: ResumeAnalysisStage;
  fileId: string;
  mode: ResumeImportMode;
  error?: string;
  diff?: ResumeImportDiff;
  startTime: number;
  endTime?: number;
}

export type CareerImportStage =
  | 'queued'
  | 'validating-url'
  | 'fetching-posting'
  | 'extracting-fields'
  | 'validating-result'
  | 'draft-ready';

export type CareerImportStatus =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'dismissed'
  | 'resolved';

export interface CareerImportDraft {
  jobTitle: string;
  companyName: string;
  companyDescription: string;
  jobDescription: string;
  location: string;
  salaryRange: string;
  salaryDetails: string;
  employmentType: string;
  experienceLevel: string;
  education: string;
  requirements: string[];
  skills: string[];
  benefits: string[];
  responsibilities: string[];
  industry: string;
  postedDate: string;
  applicationDeadline: string;
  department: string;
  hiringManager: string;
  companySize: string;
  fundingStage: string;
  technologyStack: string[];
  cultureAspects: string[];
  fullText: string;
  url: string;
  scrapedAt: string;
  wordCount: number;
}

export interface CareerImportJob extends BaseJob<CareerImportStatus> {
  type: 'career-job-import';
  status: CareerImportStatus;
  stage: CareerImportStage;
  sourceUrl: string;
  draft?: CareerImportDraft;
  errorCode?: string;
  error?: string;
  progress: number;
  attempt: number;
  startTime: number;
  endTime?: number;
}

export interface CareerImportQueuePayload {
  jobId: string;
  userId: string;
  sourceUrl: string;
  createdAt: number;
}
