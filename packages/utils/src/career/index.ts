export * from './company.service'
export * from './job.service'
export * from './job-application.service'

export enum JobApplicationStatus {
  APPLIED = 'Applied',
  HIRED = 'Hired',
  WITHDREW = 'Withdrew',
  REJECTED = 'Rejected',
  OFFER = 'Offer',
}

export enum JobApplicationStage {
  APPLICATION = 'Application',
  PHONE_SCREEN = 'Phone Screen',
  TECHNICAL_SCREEN_CALL = 'Technical Screen (Call)',
  TECHNICAL_SCREEN_EXERCISE = 'Technical Screen (Exercise)',
  INTERVIEW = 'Interview',
  IN_PERSON = 'In Person',
  OFFER = 'Offer',
}
