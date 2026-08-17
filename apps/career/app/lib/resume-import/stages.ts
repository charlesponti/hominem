import type { ResumeAnalysisStage } from '@hominem/queues';

export const RESUME_STAGE_INFO: Record<ResumeAnalysisStage, { label: string; percent: number }> = {
  queued: { label: 'Waiting to start…', percent: 5 },
  'pdf-extraction': { label: 'Reading your PDF…', percent: 20 },
  'ai-parse': { label: 'Asking the AI to parse it…', percent: 60 },
  'schema-validation': { label: 'Checking the parsed data…', percent: 80 },
  diffing: { label: 'Comparing with your current profile…', percent: 90 },
  done: { label: 'Ready to review', percent: 100 },
  error: { label: 'Something went wrong', percent: 100 },
};
