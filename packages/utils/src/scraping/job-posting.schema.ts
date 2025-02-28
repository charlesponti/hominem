import { z } from 'zod'

export const JobPostingSchema = z.object({
  benefits: z.array(z.string()).nullable(),
  companyDescription: z.string().nullable(),
  companyName: z.string(),
  companyWebsite: z.string().nullable(),
  compensationRangeEnd: z.number().nullable(),
  compensationRangeStart: z.number().nullable(),
  employmentType: z.string().nullable(),
  industry: z.string().nullable(),
  location: z.string().nullable(),
  requiredSkills: z.array(z.string()).nullable(),
  jobTitle: z.string(),
  roleDescription: z.string().nullable(),
  roleIdealCandidate: z.string().nullable(),
  roleResponsibilities: z.string().nullable(),
})
