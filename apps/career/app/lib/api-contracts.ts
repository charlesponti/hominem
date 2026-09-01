import { z } from 'zod';

import type { JobPosting } from '~/lib/services/job-scraping.service';
import type { ConvertedResumeData, ResumeConvertStage } from '~/types/resume';

export type UploadResumeApiResponse = {
  message?: string;
  data?: ConvertedResumeData;
  saved?: boolean;
  portfolio_id?: string;
  portfolioSlug?: string;
  portfolioUrl?: string;
  fileUrl?: string;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
  error?: string;
  stage?: ResumeConvertStage;
  retryable?: boolean;
};

export type JobScrapeApiRequest = {
  url: string;
};

export type JobScrapeApiResponse = {
  job_posting?: JobPosting;
  error?: string;
};

export const jobAnalysisSchema = z.object({
  requiredSkills: z.array(z.string()).describe('Top 5 required skills from the job posting'),
  qualifications: z.array(z.string()).describe('Top 3 most important qualifications'),
  cultureKeywords: z.array(z.string()).describe('Company culture keywords from the posting'),
  recommendedKeywords: z
    .array(z.string())
    .describe('Keywords to include in the resume for ATS optimization'),
});

export type JobAnalysis = z.infer<typeof jobAnalysisSchema>;

export type CustomizeResumeApiRequest = {
  job_posting?: string;
  jobPostingData?: JobPosting;
  resumeFormat?: 'professional' | 'modern' | 'technical' | 'executive';
  focusAreas?: string[];
  targetLength?: 'concise' | 'standard' | 'detailed';
};

export type CustomizeResumeApiResponse = {
  customizedResume: string;
  jobAnalysis: JobAnalysis | null;
  metadata: {
    format: string;
    targetLength: string;
    focusAreas: string[];
    generatedAt: string;
    portfolio_id: string;
    job_posting_word_count: number;
    jobPostingMetadata: {
      job_title?: string;
      companyName?: string;
      requirements?: string[];
      skills?: string[];
    };
  };
  error?: string;
};
