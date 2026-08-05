import * as z from 'zod';

import { CareerService } from '../../application/career.service';
import {
  careerApplicationDetailSchema,
  careerApplicationsQuerySchema,
  careerApplicationsSchema,
  careerCertificationsSchema,
  careerEducationSchema,
  careerPositionsQuerySchema,
  careerPositionsSchema,
  careerProfileSchema,
  careerProjectsSchema,
  careerSkillsSchema,
  careerSocialLinksSchema,
  careerTestimonialsSchema,
} from '../../schemas/career.schema';
import { logRedaction } from '../evidence';
import { registerTool } from '../tools';

const careerService = new CareerService();

const noInputSchema = z.object({});
const profileResultSchema = z.object({ profile: careerProfileSchema.nullable() });

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
  'career_profile',
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
    const profile = await careerService.getProfile(ownerUserId);
    logRedaction('career_profile', REDACTED_FIELDS, profile ? 1 : 0);
    return { profile };
  },
);

registerTool(
  'career_positions',
  {
    name: 'career_positions',
    title: 'List career positions',
    description: 'Returns work positions (past, current, and target companies) filtered by type.',
    inputSchema: careerPositionsQuerySchema,
    outputSchema: careerPositionsSchema,
    readOnly: true,
    scopes: ['career:read'],
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => {
    const parsed = careerPositionsQuerySchema.parse(input);
    const result = await careerService.listPositions(ownerUserId, parsed);
    logRedaction('career_positions', REDACTED_FIELDS, result.positions.length);
    return result;
  },
);

registerTool(
  'career_applications',
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
    const parsed = careerApplicationsQuerySchema.parse(input);
    const result = await careerService.listApplications(ownerUserId, parsed);
    logRedaction('career_applications', REDACTED_FIELDS, result.applications.length);
    return result;
  },
);

registerTool(
  'career_application_detail',
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
    const { id } = input as { id: string };
    const result = await careerService.getApplicationDetail(ownerUserId, id);
    logRedaction('career_application_detail', REDACTED_FIELDS, result.application ? 1 : 0);
    return result;
  },
);

registerTool(
  'career_education',
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
    const parsed = input as { limit?: number };
    const result = await careerService.listEducation(ownerUserId, parsed.limit);
    logRedaction('career_education', REDACTED_FIELDS, result.education.length);
    return result;
  },
);

registerTool(
  'career_skills',
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
    const result = await careerService.listSkills(ownerUserId);
    logRedaction('career_skills', REDACTED_FIELDS, result.skills.length);
    return result;
  },
);

registerTool(
  'career_projects',
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
    const result = await careerService.listProjects(ownerUserId);
    logRedaction('career_projects', REDACTED_FIELDS, result.projects.length);
    return result;
  },
);

registerTool(
  'career_testimonials',
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
    const result = await careerService.listTestimonials(ownerUserId);
    logRedaction('career_testimonials', REDACTED_FIELDS, result.testimonials.length);
    return result;
  },
);

registerTool(
  'career_certifications',
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
    const result = await careerService.listCertifications(ownerUserId);
    logRedaction('career_certifications', REDACTED_FIELDS, result.certifications.length);
    return result;
  },
);

registerTool(
  'career_social_links',
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
    const result = await careerService.getSocialLinks(ownerUserId);
    logRedaction('career_social_links', REDACTED_FIELDS, result.socialLinks ? 1 : 0);
    return result;
  },
);
