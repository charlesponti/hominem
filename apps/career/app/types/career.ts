export enum JobApplicationStatus {
  WISHLIST = 'WISHLIST',
  APPLIED = 'APPLIED',
  SCREENING = 'SCREENING',
  OFFER = 'OFFER',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export const JOB_APPLICATION_STATUSES = Object.values(JobApplicationStatus);

export function isJobApplicationStatus(value: string): value is JobApplicationStatus {
  return JOB_APPLICATION_STATUSES.includes(value as JobApplicationStatus);
}

export enum JobApplicationStage {
  APPLICATION = 'APPLICATION',
  SCREEN = 'SCREEN',
  OFFER = 'OFFER',
  OUTCOME = 'OUTCOME',
}
