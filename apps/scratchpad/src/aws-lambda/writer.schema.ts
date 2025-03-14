import { z } from 'zod'

const creditTypeEnum = z.enum(['tv', 'movie', 'novel', 'magazine', 'podcast'])
const linkTypeEnum = z.enum(['IMDB', 'Twitter', 'Instagram', 'Facebook', 'LinkedIn', 'Other'])

export const SubmissionAttachmentSchema = z.object({
  candidateName: z.string(),
  summary: z.string(),
  storage_key: z.string(),
  title: z.string(),
  page_count: z.number(),
})
export type SubmissionAttachment = z.infer<typeof SubmissionAttachmentSchema>

const CreditSchema = z.object({
  role: z
    .string()
    .nullable()
    .describe(
      "The candidate's role on the project (e.g., writer, producer, director). Must be in lowercase."
    ),
  type: creditTypeEnum
    .nullable()
    .describe(
      "The type of project. Must be one of: 'tv', 'movie', 'novel', 'magazine', 'podcast'. Use lowercase."
    ),
  production: z
    .string()
    .describe(
      'The name of the production or project. If this value is not defined, do not include a credit record.'
    ),
  network: z
    .string()
    .nullable()
    .describe('The network or company that created the project, if applicable.'),
})

const OrganizationSchema = z.object({
  name: z.string().describe('The name of the organization.'),
  type: z
    .string()
    .describe('The type of organization (e.g., production company, agency, studio, network).'),
})

const AssociateSchema = z.object({
  name: z.string().describe('The name of the associate.'),
  production: z
    .string()
    .nullable()
    .describe('The production the associate worked on with the candidate, if mentioned.'),
})

const LinkSchema = z.object({
  url: z.string().describe('The full URL of the link.'),
  type: linkTypeEnum
    .nullable()
    .describe(
      "The type of link. Must be one of: 'IMDB', 'Twitter', 'Instagram', 'Facebook', 'LinkedIn', or 'Other'."
    ),
})

const RepresentativeSchema = z.object({
  name: z.string().describe('The full name of the representative.'),
  title: z
    .string()
    .nullable()
    .describe(
      "The representative's job title (e.g., assistant, manager, agent, publicist). Must be in lowercase."
    ),
  organization: z
    .string()
    .nullable()
    .describe('The company or organization the representative is associated with.'),
  email: z.string().nullable().describe('The email address of the representative, if provided.'),
  phone_number: z
    .string()
    .nullable()
    .describe('The phone number of the representative, if provided, in XXX-XXX-XXXX format.'),
})

const CandidateSchema = z.object({
  name: z.string().describe('The full name of the candidate.'),
  bio: z
    .string()
    .describe(
      'A comprehensive summary of all the information about the candidate in paragraph form. This should include their background, notable achievements, and any other relevant details mentioned in the email.'
    ),
  email: z.string().nullable().describe("The candidate's email address, if provided."),
  phone_number: z
    .string()
    .nullable()
    .describe("The candidate's phone number, if provided, in XXX-XXX-XXXX format."),
  position: z
    .string()
    .nullable()
    .describe("The candidate's primary job title (e.g., writer, producer, director)."),
  tags: z
    .array(z.string())
    .nullable()
    .describe(
      "4-5 tags that describe the candidate's bio and their work. These should be concise and relevant to their industry and expertise."
    ),
  credits: z
    .array(CreditSchema)
    .nullable()
    .describe(
      "A list of credits mentioned in the candidate's bio, with role, type, production, and network properties."
    ),
  organizations: z
    .array(OrganizationSchema)
    .nullable()
    .describe("A list of all the organizations mentioned in the candidate's bio."),
  associates: z
    .array(AssociateSchema)
    .nullable()
    .describe(
      "A list of all the people's names mentioned in the candidate's bio who have worked with the candidate."
    ),
  links: z
    .array(LinkSchema)
    .nullable()
    .describe('A list of URLs to any links provided for the candidate.'),
  representatives: z
    .array(RepresentativeSchema)
    .nullable()
    .describe(
      'A list of agents, managers, and publicists who submitted or are associated with the candidate.'
    ),
})

export const CandidatesSchema = z.object({
  candidates: z.array(CandidateSchema),
})
export type Candidates = z.infer<typeof CandidatesSchema>
