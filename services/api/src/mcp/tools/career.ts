import * as z from 'zod';

import {
  addCareerWishlistCompany,
  getCareerApplicationDetail,
  getCareerProfile,
  getCareerSocialLinks,
  listCareerApplications,
  listCareerCertifications,
  listCareerEducation,
  listCareerEngagements,
  listCareerProjects,
  listCareerSkills,
  listCareerTestimonials,
  listCareerWishlistCompanies,
  removeCareerWishlistCompany,
  updateCareerWishlistCompany,
} from '../../application/career.service';
import {
  careerApplicationDetailSchema,
  careerApplicationsQuerySchema,
  careerApplicationsSchema,
  careerCertificationsSchema,
  careerEducationSchema,
  careerEngagementsQuerySchema,
  careerEngagementsSchema,
  careerProfileSchema,
  careerProjectsSchema,
  careerSkillsSchema,
  careerSocialLinksSchema,
  careerTestimonialsSchema,
  careerWishlistCompaniesQuerySchema,
  careerWishlistCompaniesSchema,
  careerWishlistCompanyCreateSchema,
  careerWishlistCompanyDeleteSchema,
  careerWishlistCompanySchema,
  careerWishlistCompanyUpdateSchema,
} from '../../schemas/career.schema';
import { logRedaction } from '../evidence';
import { registerTool } from '../tools';

const noInputSchema = z.object({});
const profileResultSchema = z.object({
  profile: careerProfileSchema.nullable(),
});

const REDACTED_FIELDS = [
  'baseSalary',
  'signingBonus',
  'annualBonus',
  'currency',
  'bonusHistory',
  'salaryAdjustments',
  'salaryRange',
  'benefits',
  'performanceRatings',
  'reasonForLeaving',
  'exitNotes',
  'reportsTo',
  'directReports',
  'teamSize',
];

registerTool(
  {
    name: 'career_profile',
    title: 'Get your career profile',
    description:
      'Returns the authenticated user career profile (name, headline, summary, contact info).',
    inputSchema: noInputSchema,
    outputSchema: profileResultSchema,
    readOnly: true,
    scopes: ['career:read'],
    sensitivity: 'sensitive',
    resultCap: 1,
  },
  async (ownerUserId, _input) => {
    const profile = await getCareerProfile(ownerUserId);
    logRedaction('career_profile', REDACTED_FIELDS, profile ? 1 : 0);
    return { profile };
  },
);

registerTool(
  {
    name: 'career_engagements',
    title: 'List career engagements',
    description: 'Returns authenticated work history engagements filtered by type.',
    inputSchema: careerEngagementsQuerySchema,
    outputSchema: careerEngagementsSchema,
    readOnly: true,
    scopes: ['career:read'],
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => {
    const result = await listCareerEngagements(ownerUserId, input);
    logRedaction('career_engagements', REDACTED_FIELDS, result.engagements.length);
    return result;
  },
);

registerTool(
  {
    name: 'career_wishlist_companies',
    title: 'List career wishlist companies',
    description: 'Lists companies you want to work for that are not active job applications.',
    inputSchema: careerWishlistCompaniesQuerySchema,
    outputSchema: careerWishlistCompaniesSchema,
    readOnly: true,
    scopes: ['career:read'],
    sensitivity: 'sensitive',
    resultCap: 100,
  },
  (ownerUserId, input) => listCareerWishlistCompanies(ownerUserId, input.limit),
);

registerTool(
  {
    name: 'career_wishlist_add',
    title: 'Add a career wishlist company',
    description: 'Adds a company you want to work for to your career wishlist.',
    inputSchema: careerWishlistCompanyCreateSchema,
    outputSchema: z.object({ company: careerWishlistCompanySchema }),
    readOnly: false,
    scopes: ['career:write'],
    sensitivity: 'sensitive',
    resultCap: 1,
  },
  async (ownerUserId, input) => ({
    company: await addCareerWishlistCompany(ownerUserId, input.company),
  }),
);

registerTool(
  {
    name: 'career_wishlist_update',
    title: 'Update a career wishlist company',
    description: 'Renames a company on your career wishlist.',
    inputSchema: careerWishlistCompanyUpdateSchema,
    outputSchema: z.object({ company: careerWishlistCompanySchema.nullable() }),
    readOnly: false,
    scopes: ['career:write'],
    sensitivity: 'sensitive',
    resultCap: 1,
  },
  async (ownerUserId, input) => ({
    company: await updateCareerWishlistCompany(ownerUserId, input.id, input.company),
  }),
);

registerTool(
  {
    name: 'career_wishlist_remove',
    title: 'Remove a career wishlist company',
    description: 'Removes a company from your career wishlist.',
    inputSchema: careerWishlistCompanyDeleteSchema,
    outputSchema: z.object({ removed: z.boolean() }),
    readOnly: false,
    scopes: ['career:write'],
    sensitivity: 'sensitive',
    resultCap: 1,
  },
  async (ownerUserId, input) => ({
    removed: await removeCareerWishlistCompany(ownerUserId, input.id),
  }),
);

registerTool(
  {
    name: 'career_applications',
    title: 'List job applications',
    description:
      'Lists job applications with optional status filter. Includes stage count and offer indicator.',
    inputSchema: careerApplicationsQuerySchema,
    outputSchema: careerApplicationsSchema,
    readOnly: true,
    scopes: ['career:read'],
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => {
    const result = await listCareerApplications(ownerUserId, input);
    logRedaction('career_applications', REDACTED_FIELDS, result.applications.length);
    return result;
  },
);

registerTool(
  {
    name: 'career_application_detail',
    title: 'Get application detail',
    description: 'Returns a single application with all pipeline stages and offer details.',
    inputSchema: z.object({ id: z.string().uuid() }),
    outputSchema: careerApplicationDetailSchema,
    readOnly: true,
    scopes: ['career:read'],
    sensitivity: 'sensitive',
    resultCap: 1,
  },
  async (ownerUserId, input) => {
    const result = await getCareerApplicationDetail(ownerUserId, input.id);
    logRedaction('career_application_detail', REDACTED_FIELDS, result.application ? 1 : 0);
    return result;
  },
);

registerTool(
  {
    name: 'career_education',
    title: 'List education history',
    description: 'Returns education entries (schools, degrees, fields of study, dates).',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(20).optional().default(10),
    }),
    outputSchema: careerEducationSchema,
    readOnly: true,
    scopes: ['career:read'],
    sensitivity: 'sensitive',
    resultCap: 20,
  },
  async (ownerUserId, input) => {
    const result = await listCareerEducation(ownerUserId, input.limit);
    logRedaction('career_education', REDACTED_FIELDS, result.education.length);
    return result;
  },
);

registerTool(
  {
    name: 'career_skills',
    title: 'List career skills',
    description: 'Returns the authenticated user skills with category, level, and proof.',
    inputSchema: noInputSchema,
    outputSchema: careerSkillsSchema,
    readOnly: true,
    scopes: ['career:read'],
    sensitivity: 'sensitive',
    resultCap: 100,
  },
  async (ownerUserId, _input) => {
    const result = await listCareerSkills(ownerUserId);
    logRedaction('career_skills', REDACTED_FIELDS, result.skills.length);
    return result;
  },
);

registerTool(
  {
    name: 'career_projects',
    title: 'List career projects',
    description: 'Returns the authenticated user side/work projects.',
    inputSchema: noInputSchema,
    outputSchema: careerProjectsSchema,
    readOnly: true,
    scopes: ['career:read'],
    sensitivity: 'sensitive',
    resultCap: 100,
  },
  async (ownerUserId, _input) => {
    const result = await listCareerProjects(ownerUserId);
    logRedaction('career_projects', REDACTED_FIELDS, result.projects.length);
    return careerProjectsSchema.parse(result);
  },
);

registerTool(
  {
    name: 'career_testimonials',
    title: 'List career testimonials',
    description: 'Returns testimonials given by colleagues, managers, or clients.',
    inputSchema: noInputSchema,
    outputSchema: careerTestimonialsSchema,
    readOnly: true,
    scopes: ['career:read'],
    sensitivity: 'sensitive',
    resultCap: 100,
  },
  async (ownerUserId, _input) => {
    const result = await listCareerTestimonials(ownerUserId);
    logRedaction('career_testimonials', REDACTED_FIELDS, result.testimonials.length);
    return result;
  },
);

registerTool(
  {
    name: 'career_certifications',
    title: 'List career certifications',
    description: 'Returns professional certifications with issuer and dates.',
    inputSchema: noInputSchema,
    outputSchema: careerCertificationsSchema,
    readOnly: true,
    scopes: ['career:read'],
    sensitivity: 'sensitive',
    resultCap: 100,
  },
  async (ownerUserId, _input) => {
    const result = await listCareerCertifications(ownerUserId);
    logRedaction('career_certifications', REDACTED_FIELDS, result.certifications.length);
    return result;
  },
);

registerTool(
  {
    name: 'career_social_links',
    title: 'Get career social links',
    description: 'Returns the authenticated user public social/profile links.',
    inputSchema: noInputSchema,
    outputSchema: careerSocialLinksSchema,
    readOnly: true,
    scopes: ['career:read'],
    sensitivity: 'sensitive',
    resultCap: 1,
  },
  async (ownerUserId, _input) => {
    const result = await getCareerSocialLinks(ownerUserId);
    logRedaction('career_social_links', REDACTED_FIELDS, result.socialLinks ? 1 : 0);
    return result;
  },
);
