import { tool } from 'ai';
import * as z from 'zod';

export const create_job_application = tool({
  description: 'Create a new job application',
  parameters: z.object({
    position: z.string().describe('Job position title'),
    company: z.string().describe('Company name'),
    location: z.string().describe('Job location'),
    link: z.string().optional().describe('Link to job posting'),
    salary_quoted: z.string().optional().describe('Quoted salary information'),
    resume: z.string().optional().describe('Resume information'),
    cover_letter: z.string().optional().describe('Cover letter information'),
  }),
  async execute(args) {
    return {
      message: `Created job application for ${args.position} at ${args.company}`,
    };
  },
});

export const update_job_application = tool({
  description: 'Update a job application',
  parameters: z.object({
    applicationId: z.string().describe('ID of the job application'),
    status: z
      .enum(['Applied', 'Hired', 'Withdrew', 'Rejected', 'Offer'])
      .optional()
      .describe('Application status'),
    stage: z
      .enum([
        'Application',
        'Phone Screen',
        'Technical Screen (Call)',
        'Technical Screen (Exercise)',
        'Interview',
        'In Person',
        'Offer',
      ])
      .optional()
      .describe('Current application stage'),
    salary_accepted: z.string().optional().describe('Accepted salary'),
    notes: z.string().optional().describe('Additional notes'),
  }),
  async execute(args) {
    return {
      message: `Updated job application ${args.applicationId}`,
    };
  },
});

export const get_job_applications = tool({
  description: 'Get job applications',
  parameters: z.object({
    status: z
      .enum(['Applied', 'Hired', 'Withdrew', 'Rejected', 'Offer'])
      .optional()
      .describe('Filter by application status'),
    company: z.string().optional().describe('Filter by company name'),
  }),
  async execute(args) {
    return {
      message: `Retrieved job applications${args.status ? ` with status ${args.status}` : ''}${
        args.company ? ` at ${args.company}` : ''
      }`,
    };
  },
});

export const delete_job_application = tool({
  description: 'Delete a job application',
  parameters: z.object({
    applicationId: z.string().describe('ID of the job application to delete'),
  }),
  async execute(args) {
    return {
      message: `Deleted job application ${args.applicationId}`,
    };
  },
});
