import * as z from 'zod';

export const careerApplicationStatusSchema = z.enum([
  'WISHLIST',
  'APPLIED',
  'SCREENING',
  'OFFER',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
]);

export const careerOfferDecisionSchema = z.enum(['PENDING', 'NEGOTIATING', 'ACCEPTED', 'DECLINED']);

export const careerProjectStatusSchema = z.enum(['BACKLOG', 'IN_PROGRESS', 'DONE', 'CANCELED']);

export const careerProfileSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  headline: z.string().nullable(),
  summary: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  industry: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  websites: z.string().nullable(),
  twitterHandles: z.string().nullable(),
});

export const careerEngagementsQuerySchema = z.object({
  type: z.enum(['all', 'employment']).optional().default('all'),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const careerEngagementsSchema = z.object({
  engagements: z.array(
    z.object({
      id: z.string().uuid(),
      company: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      location: z.string().nullable(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
      isCurrent: z.boolean(),
      salaryLow: z.number().nullable(),
      salaryHigh: z.number().nullable(),
      currency: z.string().nullable(),
      kind: z.enum(['EMPLOYMENT', 'CONTRACT', 'FREELANCE', 'VOLUNTEER', 'OTHER']),
      url: z.string().nullable(),
    }),
  ),
});

export const careerApplicationsQuerySchema = z.object({
  status: careerApplicationStatusSchema.optional(),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

export const careerApplicationsSchema = z.object({
  applications: z.array(
    z.object({
      id: z.string().uuid(),
      company: z.string(),
      title: z.string(),
      location: z.string().nullable(),
      source: z.string().nullable(),
      appliedAt: z.string().nullable(),
      currentStage: z.string().nullable(),
      status: careerApplicationStatusSchema,
      jobPostingUrl: z.string().nullable(),
      salaryExpectation: z.number().nullable(),
      notes: z.string().nullable(),
      stageCount: z.number(),
      hasOffer: z.boolean(),
    }),
  ),
});

export const careerWishlistCompanySchema = z.object({
  id: z.string().uuid(),
  company: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const careerWishlistCompaniesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const careerWishlistCompaniesSchema = z.object({
  companies: z.array(careerWishlistCompanySchema),
});

export const careerWishlistCompanyCreateSchema = z.object({
  company: z.string().trim().min(1).max(200),
});

export const careerWishlistCompanyUpdateSchema = careerWishlistCompanyCreateSchema.extend({
  id: z.string().uuid(),
});

export const careerWishlistCompanyDeleteSchema = z.object({ id: z.string().uuid() });

export const careerApplicationDetailSchema = z.object({
  application: z
    .object({
      id: z.string().uuid(),
      company: z.string(),
      title: z.string(),
      location: z.string().nullable(),
      source: z.string().nullable(),
      referredBy: z.string().nullable(),
      appliedAt: z.string().nullable(),
      currentStage: z.string().nullable(),
      status: careerApplicationStatusSchema.nullable(),
      resumeUrl: z.string().nullable(),
      coverLetterUrl: z.string().nullable(),
      jobPostingUrl: z.string().nullable(),
      salaryExpectation: z.number().nullable(),
      notes: z.string().nullable(),
      stages: z.array(
        z.object({
          id: z.string().uuid(),
          stage: z.string(),
          stageKind: z.enum(['APPLICATION', 'SCREEN', 'OFFER', 'OUTCOME']),
          stageOrder: z.number(),
          enteredAt: z.string().nullable(),
          exitedAt: z.string().nullable(),
          notes: z.string().nullable(),
        }),
      ),
      offers: z.array(
        z.object({
          id: z.string().uuid(),
          stageId: z.string().uuid(),
          baseSalary: z.number().nullable(),
          equity: z.string().nullable(),
          bonus: z.number().nullable(),
          signingBonus: z.number().nullable(),
          totalComp: z.number().nullable(),
          currency: z.string().nullable(),
          decision: careerOfferDecisionSchema,
          decisionAt: z.string().nullable(),
          notes: z.string().nullable(),
        }),
      ),
    })
    .nullable(),
});

export const careerEducationSchema = z.object({
  education: z.array(
    z.object({
      id: z.string().uuid(),
      school: z.string(),
      degree: z.string().nullable(),
      fieldOfStudy: z.string().nullable(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
      activities: z.string().nullable(),
      notes: z.string().nullable(),
    }),
  ),
});

// -- Skills --

export const careerSkillSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.string().nullable(),
  level: z.number().nullable(),
  yearsOfExperience: z.number().nullable(),
  description: z.string().nullable(),
  proof: z.string().nullable(),
  aiDerived: z.boolean(),
  isVisible: z.boolean(),
  sortOrder: z.number(),
});

export const careerSkillsSchema = z.object({ skills: z.array(careerSkillSchema) });

export const careerSkillCreateSchema = z.object({
  name: z.string().min(1),
  category: z.string().nullable().optional(),
  level: z.number().int().nullable().optional(),
  yearsOfExperience: z.number().int().nullable().optional(),
  description: z.string().nullable().optional(),
  proof: z.string().nullable().optional(),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const careerSkillUpdateSchema = z.object({
  id: z.string().uuid(),
  data: careerSkillCreateSchema.partial(),
});

export const careerSkillDeleteSchema = z.object({ id: z.string().uuid() });

// -- Projects --

export const careerProjectSchema = z.object({
  id: z.string().uuid(),
  organization: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  shortDescription: z.string().nullable(),
  liveUrl: z.string().nullable(),
  githubUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  videoUrl: z.string().nullable(),
  technologies: z.array(z.string()),
  status: careerProjectStatusSchema.nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  isFeatured: z.boolean(),
  isVisible: z.boolean(),
  sortOrder: z.number(),
  engagements: z.array(
    z.object({
      id: z.string().uuid(),
      company: z.string(),
      title: z.string(),
      kind: z.enum(['EMPLOYMENT', 'CONTRACT', 'FREELANCE', 'VOLUNTEER', 'OTHER']),
    }),
  ),
});

export const careerProjectsSchema = z.object({ projects: z.array(careerProjectSchema) });

export const careerProjectCreateSchema = z.object({
  organization: z.string().trim().nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  shortDescription: z.string().nullable().optional(),
  liveUrl: z.string().nullable().optional(),
  githubUrl: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  technologies: z.array(z.string()).optional(),
  status: careerProjectStatusSchema.nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  isFeatured: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  engagementIds: z.array(z.string().uuid()).optional(),
});

export const careerProjectUpdateSchema = z.object({
  id: z.string().uuid(),
  data: careerProjectCreateSchema.partial(),
});

export const careerProjectDeleteSchema = z.object({ id: z.string().uuid() });

// -- Testimonials --

export const careerTestimonialSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  title: z.string().nullable(),
  company: z.string().nullable(),
  content: z.string(),
  avatarUrl: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  rating: z.number().nullable(),
  isVerified: z.boolean(),
  isVisible: z.boolean(),
  sortOrder: z.number(),
});

export const careerTestimonialsSchema = z.object({
  testimonials: z.array(careerTestimonialSchema),
});

export const careerTestimonialCreateSchema = z.object({
  name: z.string().min(1),
  title: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  content: z.string().min(1),
  avatarUrl: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  rating: z.number().int().nullable().optional(),
  isVerified: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const careerTestimonialUpdateSchema = z.object({
  id: z.string().uuid(),
  data: careerTestimonialCreateSchema.partial(),
});

export const careerTestimonialDeleteSchema = z.object({ id: z.string().uuid() });

// -- Certifications --

export const careerCertificationSchema = z.object({
  id: z.string().uuid(),
  positionId: z.string().uuid().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  issuingOrganization: z.string(),
  issueDate: z.string().nullable(),
  expirationDate: z.string().nullable(),
  status: z.string().nullable(),
  category: z.string().nullable(),
  isVisible: z.boolean(),
  sortOrder: z.number(),
});

export const careerCertificationsSchema = z.object({
  certifications: z.array(careerCertificationSchema),
});

export const careerCertificationCreateSchema = z.object({
  positionId: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  issuingOrganization: z.string().min(1),
  issueDate: z.string().nullable().optional(),
  expirationDate: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const careerCertificationUpdateSchema = z.object({
  id: z.string().uuid(),
  data: careerCertificationCreateSchema.partial(),
});

export const careerCertificationDeleteSchema = z.object({ id: z.string().uuid() });

// -- Social links --

export const careerSocialLinksSchema = z.object({
  socialLinks: z
    .object({
      github: z.string().nullable(),
      linkedin: z.string().nullable(),
      twitter: z.string().nullable(),
      website: z.string().nullable(),
    })
    .nullable(),
});

export const careerSocialLinksSaveSchema = z.object({
  github: z.string().nullable().optional(),
  linkedin: z.string().nullable().optional(),
  twitter: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
});

// -- Application notes --

export const careerApplicationNoteSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  createdAt: z.string(),
});

export const careerApplicationNotesSchema = z.object({
  notes: z.array(careerApplicationNoteSchema),
});

export const careerApplicationNoteCreateSchema = z.object({
  content: z.string().min(1),
});

export const careerApplicationNoteDeleteSchema = z.object({ id: z.string().uuid() });

// -- Application files --

export const careerApplicationFileSchema = z.object({
  id: z.string().uuid(),
  fileName: z.string(),
  fileUrl: z.string(),
  fileType: z.string().nullable(),
  createdAt: z.string(),
});

export const careerApplicationFilesSchema = z.object({
  files: z.array(careerApplicationFileSchema),
});

export const careerApplicationFileCreateSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
  fileType: z.string().nullable().optional(),
});

export const careerApplicationFileDeleteSchema = z.object({ id: z.string().uuid() });
