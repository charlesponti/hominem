import type { ResumeAnalysisStage, ResumeImportDiff } from '@hominem/queues';

export interface SseResumeEvent {
  jobId: string;
  stage: ResumeAnalysisStage;
  label: string;
  percent: number;
  error?: boolean;
  errorMessage?: string;
  diff?: ResumeImportDiff;
}
