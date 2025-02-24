import { z } from 'zod'

export const JobPostingSchema = z.object({
  roleDescription: z.string().nullable(),
  roleResponsibilities: z.string().nullable(),
  roleIdealCandidate: z.string().nullable(),
  companyDescription: z.string().nullable(),
  industry: z.string().nullable(),
  location: z.string().nullable(),
  benefits: z.array(z.string()).nullable(),
  employmentType: z.string().nullable(),
  compensationRangeStart: z.number().nullable(),
  compensationRangeEnd: z.number().nullable(),
  requiredSkills: z.array(z.string()).nullable(),
  companyWebsite: z.string().nullable(),
})
