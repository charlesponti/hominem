import * as z from 'zod';

// Side Project schema
const SideProjectSchema = z.object({
  title: z.string().describe('The title of the side project.'),
  url: z.string().url().describe('The URL of the side project.'),
  description: z.string().describe('A description of the side project.'),
  media_url: z
    .string()
    .url()
    .optional()
    .describe('The URL of an associated media file (e.g., video).'),
  status: z.enum(['Ongoing', 'Completed', 'Planned']).describe('The status of the side project.'),
});

// Work Experience schema
const WorkExperienceSchema = z.object({
  company: z.string().describe('The name of the company.'),
  url: z.string().url().optional().describe("The URL of the company's website."),
  start_year: z.number().int().describe('The year the person started working at the company.'),
  end_year: z
    .union([z.number().int(), z.string(), z.null()])
    .optional()
    .describe("The year the person stopped working at the company, or 'Now' if still employed."),
  description: z.string().describe("A description of the person's role at the company."),
  colleagues: z
    .array(z.string().url())
    .optional()
    .describe("An array of URLs of colleagues' profiles."),
});

// Award schema
const AwardSchema = z.object({
  title: z.string().describe('The title of the award.'),
  awarded_by: z.string().optional().describe('The organization or person that awarded the prize.'),
  year: z.number().int().describe('The year the award was received.'),
  description: z.string().optional().describe('Description of the award'),
  url: z.string().url().optional().describe('URL relating to award, or the awarder.'),
});

// Education schema
const EducationSchema = z.object({
  institution: z.string().describe('The name of the educational institution.'),
  location: z.string().describe('The location of the institution.'),
  start_year: z.number().int().describe('The year the person started attending the institution.'),
  end_year: z
    .union([z.number().int(), z.null()])
    .optional()
    .describe('The year the person stopped attending the institution, can be null.'),
  description: z
    .string()
    .optional()
    .describe("A description of the person's experience at the institution."),
});

// Team schema
const TeamSchema = z.object({
  name: z.string().describe('The name of the team.'),
  profile_url: z.string().url().describe("The URL of the team's profile."),
  logo_url: z.string().url().describe("The URL of the team's logo."),
});

// ContactOutput schema
const ContactSchema = z.object({
  email: z.array(z.email()).describe('An array of email addresses.'),
});

// Main Profile schema
export const ReadCVProfileSchema = z.object({
  name: z.string().describe('The name of the person.'),
  pronouns: z
    .string()
    .default('they/them')
    .describe('The pronouns used by the person (e.g., she/her).'),
  location: z.string().default('offline').describe('The location of the person.'),
  website: z.string().url().describe("The URL of the person's website."),
  profile_image_url: z.string().url().describe("The URL of the person's profile image."),
  about: z.string().describe('A brief description of the person.'),
  side_projects: z
    .array(SideProjectSchema)
    .optional()
    .describe("An array of the person's side projects."),
  work_experience: z
    .array(WorkExperienceSchema)
    .optional()
    .describe("An array of the person's work experiences."),
  awards: z.array(AwardSchema).optional().describe('An array of awards the person has received.'),
  education: z.array(EducationSchema).optional().describe("An array of the person's education."),
  teams: z.array(TeamSchema).optional().describe('An array of teams the person is a member of.'),
  contact: ContactSchema.optional().describe('ContactOutput information for the person.'),
});

export type ReadCVProfile = z.infer<typeof ReadCVProfileSchema>;
