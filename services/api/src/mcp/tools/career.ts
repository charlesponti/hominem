import * as z from 'zod';

import {
  addCareerWishlistCompany,
  addCareerApplicationFile,
  addCareerApplicationNote,
  createCareerApplication,
  createCareerCertification,
  createCareerEducation,
  createCareerEngagement,
  createCareerProject,
  createCareerSkill,
  createCareerTestimonial,
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
  removeCareerApplication,
  removeCareerApplicationFile,
  removeCareerApplicationNote,
  removeCareerCertification,
  removeCareerEducation,
  removeCareerSkill,
  removeCareerTestimonial,
  removeCareerEngagement,
  removeCareerProject,
  removeCareerWishlistCompany,
  updateCareerEngagement,
  updateCareerProject,
  updateCareerWishlistCompany,
  updateCareerApplication,
  updateCareerCertification,
  updateCareerEducation,
  updateCareerSkill,
  updateCareerTestimonial,
  saveCareerSocialLinks,
} from '../../application/career.service';
import {
  careerApplicationDetailSchema,
  careerApplicationCreateSchema,
  careerApplicationDeleteSchema,
  careerApplicationFileAddSchema,
  careerApplicationFileRemoveSchema,
  careerApplicationNoteAddSchema,
  careerApplicationNoteRemoveSchema,
  careerApplicationUpdateSchema,
  careerApplicationsQuerySchema,
  careerApplicationsSchema,
  careerCertificationsSchema,
  careerEducationSchema,
  careerEducationCreateSchema,
  careerEducationDeleteSchema,
  careerEducationUpdateSchema,
  careerEngagementCreateSchema,
  careerEngagementDeleteSchema,
  careerEngagementSchema,
  careerEngagementUpdateSchema,
  careerEngagementsQuerySchema,
  careerEngagementsSchema,
  careerProfileSchema,
  careerProjectDeleteSchema,
  careerProjectSchema,
  careerProjectUpdateSchema,
  careerProjectCreateSchema,
  careerProjectsSchema,
  careerSkillsSchema,
  careerSkillCreateSchema,
  careerSkillDeleteSchema,
  careerSkillSchema,
  careerSkillUpdateSchema,
  careerSocialLinksSchema,
  careerSocialLinksSaveSchema,
  careerTestimonialsSchema,
  careerTestimonialCreateSchema,
  careerTestimonialDeleteSchema,
  careerTestimonialSchema,
  careerTestimonialUpdateSchema,
  careerCertificationCreateSchema,
  careerCertificationDeleteSchema,
  careerCertificationSchema,
  careerCertificationUpdateSchema,
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

const writeTool = {
  readOnly: false as const,
  scopes: ['career:write'] as ['career:write'],
  sensitivity: 'sensitive' as const,
  resultCap: 1,
};

registerTool(
  {
    ...writeTool,
    name: 'career_engagement_create',
    title: 'Create a career engagement',
    description: 'Creates a work history engagement.',
    inputSchema: careerEngagementCreateSchema,
    outputSchema: z.object({ engagement: careerEngagementSchema }),
  },
  async (ownerUserId, input) => ({ engagement: await createCareerEngagement(ownerUserId, input) }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_application_create',
    title: 'Create a career application',
    description: 'Creates a job application.',
    inputSchema: careerApplicationCreateSchema,
    outputSchema: z.object({ application: careerApplicationsSchema.shape.applications.element }),
  },
  async (ownerUserId, input) => ({
    application: await createCareerApplication(ownerUserId, input),
  }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_application_update',
    title: 'Update a career application',
    description: 'Updates a job application.',
    inputSchema: careerApplicationUpdateSchema,
    outputSchema: z.object({
      application: careerApplicationsSchema.shape.applications.element.nullable(),
    }),
  },
  async (ownerUserId, input) => ({
    application: await updateCareerApplication(ownerUserId, input.id, input.data),
  }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_application_delete',
    title: 'Delete a career application',
    description: 'Deletes a job application.',
    inputSchema: careerApplicationDeleteSchema,
    outputSchema: z.object({ removed: z.boolean() }),
  },
  async (ownerUserId, input) => ({ removed: await removeCareerApplication(ownerUserId, input.id) }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_application_note_add',
    title: 'Add an application note',
    description: 'Adds a note to a job application.',
    inputSchema: careerApplicationNoteAddSchema,
    outputSchema: z.object({
      note: z
        .object({ id: z.string().uuid(), content: z.string(), createdAt: z.string() })
        .nullable(),
    }),
  },
  async (ownerUserId, input) => ({
    note: await addCareerApplicationNote(ownerUserId, input.applicationId, input.content),
  }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_application_note_remove',
    title: 'Remove an application note',
    description: 'Removes an application note.',
    inputSchema: careerApplicationNoteRemoveSchema,
    outputSchema: z.object({ removed: z.boolean() }),
  },
  async (ownerUserId, input) => ({
    removed: await removeCareerApplicationNote(ownerUserId, input.applicationId, input.id),
  }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_application_file_add',
    title: 'Add an application file',
    description: 'Adds a file reference to a job application.',
    inputSchema: careerApplicationFileAddSchema,
    outputSchema: z.object({
      file: z
        .object({
          id: z.string().uuid(),
          fileName: z.string(),
          fileUrl: z.string(),
          fileType: z.string().nullable(),
          createdAt: z.string(),
        })
        .nullable(),
    }),
  },
  async (ownerUserId, input) => ({
    file: await addCareerApplicationFile(ownerUserId, input.applicationId, input),
  }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_application_file_remove',
    title: 'Remove an application file',
    description: 'Removes an application file.',
    inputSchema: careerApplicationFileRemoveSchema,
    outputSchema: z.object({ removed: z.boolean() }),
  },
  async (ownerUserId, input) => ({
    removed: await removeCareerApplicationFile(ownerUserId, input.applicationId, input.id),
  }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_education_create',
    title: 'Create education',
    description: 'Creates an education entry.',
    inputSchema: careerEducationCreateSchema,
    outputSchema: z.object({ education: careerEducationSchema.shape.education.element }),
  },
  async (ownerUserId, input) => ({ education: await createCareerEducation(ownerUserId, input) }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_education_update',
    title: 'Update education',
    description: 'Updates an education entry.',
    inputSchema: careerEducationUpdateSchema,
    outputSchema: z.object({ education: careerEducationSchema.shape.education.element.nullable() }),
  },
  async (ownerUserId, input) => ({
    education: await updateCareerEducation(ownerUserId, input.id, input.data),
  }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_education_delete',
    title: 'Delete education',
    description: 'Deletes an education entry.',
    inputSchema: careerEducationDeleteSchema,
    outputSchema: z.object({ removed: z.boolean() }),
  },
  async (ownerUserId, input) => ({ removed: await removeCareerEducation(ownerUserId, input.id) }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_skill_create',
    title: 'Create a skill',
    description: 'Creates a career skill.',
    inputSchema: careerSkillCreateSchema,
    outputSchema: z.object({ skill: careerSkillSchema }),
  },
  async (ownerUserId, input) => ({ skill: await createCareerSkill(ownerUserId, input) }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_skill_update',
    title: 'Update a skill',
    description: 'Updates a career skill.',
    inputSchema: careerSkillUpdateSchema,
    outputSchema: z.object({ skill: careerSkillSchema.nullable() }),
  },
  async (ownerUserId, input) => ({
    skill: await updateCareerSkill(ownerUserId, input.id, input.data),
  }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_skill_delete',
    title: 'Delete a skill',
    description: 'Deletes a career skill.',
    inputSchema: careerSkillDeleteSchema,
    outputSchema: z.object({ removed: z.boolean() }),
  },
  async (ownerUserId, input) => ({ removed: await removeCareerSkill(ownerUserId, input.id) }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_project_create',
    title: 'Create a project',
    description: 'Creates a career project.',
    inputSchema: careerProjectCreateSchema,
    outputSchema: z.object({ project: careerProjectSchema }),
  },
  async (ownerUserId, input) => ({ project: await createCareerProject(ownerUserId, input) }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_testimonial_create',
    title: 'Create a testimonial',
    description: 'Creates a career testimonial.',
    inputSchema: careerTestimonialCreateSchema,
    outputSchema: z.object({ testimonial: careerTestimonialSchema }),
  },
  async (ownerUserId, input) => ({
    testimonial: await createCareerTestimonial(ownerUserId, input),
  }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_testimonial_update',
    title: 'Update a testimonial',
    description: 'Updates a career testimonial.',
    inputSchema: careerTestimonialUpdateSchema,
    outputSchema: z.object({ testimonial: careerTestimonialSchema.nullable() }),
  },
  async (ownerUserId, input) => ({
    testimonial: await updateCareerTestimonial(ownerUserId, input.id, input.data),
  }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_testimonial_delete',
    title: 'Delete a testimonial',
    description: 'Deletes a career testimonial.',
    inputSchema: careerTestimonialDeleteSchema,
    outputSchema: z.object({ removed: z.boolean() }),
  },
  async (ownerUserId, input) => ({ removed: await removeCareerTestimonial(ownerUserId, input.id) }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_certification_create',
    title: 'Create a certification',
    description: 'Creates a career certification.',
    inputSchema: careerCertificationCreateSchema,
    outputSchema: z.object({ certification: careerCertificationSchema }),
  },
  async (ownerUserId, input) => ({
    certification: await createCareerCertification(ownerUserId, input),
  }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_certification_update',
    title: 'Update a certification',
    description: 'Updates a career certification.',
    inputSchema: careerCertificationUpdateSchema,
    outputSchema: z.object({ certification: careerCertificationSchema.nullable() }),
  },
  async (ownerUserId, input) => ({
    certification: await updateCareerCertification(ownerUserId, input.id, input.data),
  }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_certification_delete',
    title: 'Delete a certification',
    description: 'Deletes a career certification.',
    inputSchema: careerCertificationDeleteSchema,
    outputSchema: z.object({ removed: z.boolean() }),
  },
  async (ownerUserId, input) => ({
    removed: await removeCareerCertification(ownerUserId, input.id),
  }),
);
registerTool(
  {
    ...writeTool,
    name: 'career_social_links_save',
    title: 'Save career social links',
    description: 'Saves public career profile links.',
    inputSchema: careerSocialLinksSaveSchema,
    outputSchema: z.object({ socialLinks: careerSocialLinksSchema.shape.socialLinks.unwrap() }),
  },
  async (ownerUserId, input) => ({ socialLinks: await saveCareerSocialLinks(ownerUserId, input) }),
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
    name: 'career_engagement_update',
    title: 'Update a career engagement',
    description:
      'Updates a work history engagement (company, title, location, dates, salary in cents, contact, source, kind, description, reason for leaving). Returns the updated engagement.',
    inputSchema: careerEngagementUpdateSchema,
    outputSchema: z.object({ engagement: careerEngagementSchema.nullable() }),
    readOnly: false,
    scopes: ['career:write'],
    sensitivity: 'sensitive',
    resultCap: 1,
  },
  async (ownerUserId, input) => ({
    engagement: await updateCareerEngagement(ownerUserId, input.id, input.data),
  }),
);

registerTool(
  {
    name: 'career_engagement_delete',
    title: 'Delete a career engagement',
    description: 'Deletes a work history engagement.',
    inputSchema: careerEngagementDeleteSchema,
    outputSchema: z.object({ removed: z.boolean() }),
    readOnly: false,
    scopes: ['career:write'],
    sensitivity: 'sensitive',
    resultCap: 1,
  },
  async (ownerUserId, input) => ({
    removed: await removeCareerEngagement(ownerUserId, input.id),
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
    name: 'career_project_update',
    title: 'Update a career project',
    description:
      'Updates a project (title, organization, descriptions, URLs, dates, status, technologies, linked engagement ids). Returns the updated project.',
    inputSchema: careerProjectUpdateSchema,
    outputSchema: z.object({ project: careerProjectSchema.nullable() }),
    readOnly: false,
    scopes: ['career:write'],
    sensitivity: 'sensitive',
    resultCap: 1,
  },
  async (ownerUserId, input) => ({
    project: await updateCareerProject(ownerUserId, input.id, input.data),
  }),
);

registerTool(
  {
    name: 'career_project_delete',
    title: 'Delete a career project',
    description: 'Deletes a project.',
    inputSchema: careerProjectDeleteSchema,
    outputSchema: z.object({ removed: z.boolean() }),
    readOnly: false,
    scopes: ['career:write'],
    sensitivity: 'sensitive',
    resultCap: 1,
  },
  async (ownerUserId, input) => ({
    removed: await removeCareerProject(ownerUserId, input.id),
  }),
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
