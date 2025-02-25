import { z } from 'zod'

const CreditSchema = z.object({
  role: z.string().describe('The role the candidate had in the production'),
  production: z.string().describe('The name of the production'),
  network: z
    .string()
    .nullable()
    .describe('The network associated with the production, if applicable'),
  type: z.enum(['tv', 'movie']).describe('The type of production'),
})

const LinkSchema = z.object({
  url: z.string().url().describe("The URL to the candidate's profile or relevant link"),
  type: z.string().describe('The type of link, e.g., IMDB, Twitter, etc.'),
})

const OrganizationSchema = z.object({
  name: z.string().describe('The name of the organization'),
  type: z
    .string()
    .describe('The type of organization, e.g., production company, streaming service'),
})

const AssociateSchema = z.object({
  name: z.string().describe('The name of the associate'),
  production: z.string().describe('The production associated with the associate'),
})

const RepresentativeSchema = z.object({
  name: z.string().describe('The name of the representative'),
  title: z.string().optional().describe('The title or position of the representative'),
  organization: z.string().describe('The organization the representative is associated with'),
  email: z.string().email().optional().describe("The representative's email address"),
  phone_number: z.string().optional().describe("The representative's phone number"),
})

const CandidateSchema = z.object({
  name: z.string().describe('The full name of the candidate'),
  bio: z.string().describe('A short biography of the candidate'),
  email: z.string().email().describe("The candidate's email address"),
  phone_number: z.string().describe("The candidate's phone number"),
  tags: z
    .array(z.string())
    .describe("Tags describing the candidate's areas of expertise or genres"),
  credits: z.array(CreditSchema).describe("A list of credits for the candidate's work history"),
  links: z.array(LinkSchema).describe('A list of links relevant to the candidate'),
  organizations: z
    .array(OrganizationSchema)
    .describe('A list of organizations the candidate is associated with'),
  associates: z.array(AssociateSchema).describe('A list of associates linked to the candidate'),
  representatives: z
    .array(RepresentativeSchema)
    .describe('A list of representatives for the candidate'),
})

const CandidatesSchema = z.object({
  candidates: z.array(CandidateSchema).describe('A list of candidates'),
})

export { CandidatesSchema }
