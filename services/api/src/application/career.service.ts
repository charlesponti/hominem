import {
  ApplicationFilesRepository,
  ApplicationNotesRepository,
  CareerRepository,
  CertificationRepository,
  ProjectRepository,
  SkillRepository,
  SocialLinksRepository,
  TestimonialRepository,
  db,
  type CareerApplicationRecord,
  type CareerCertificationInput,
  type CareerEngagementRecord,
  type CareerProjectInput,
  type CareerProjectRecord,
  type CareerSkillInput,
  type CareerSocialLinksInput,
  type CareerTestimonialInput,
} from '@hominem/db';
import { z } from 'zod';

import {
  careerEngagementSchema,
  careerEngagementUpdateDataSchema,
  careerProfileSchema,
  careerProjectSchema,
  careerProjectStatusSchema,
  careerProjectsSchema,
  careerWishlistCompanySchema,
} from '../schemas/career.schema';

export async function getCareerProfile(ownerUserId: string) {
  const profile = await CareerRepository.getProfile(db, ownerUserId);
  if (!profile) return null;

  return careerProfileSchema.parse({
    id: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    headline: profile.headline,
    summary: profile.summary,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    industry: profile.industry,
    linkedinUrl: profile.linkedinUrl,
    websites: profile.websites,
    twitterHandles: profile.twitterHandles,
  });
}

export async function listCareerEngagements(
  ownerUserId: string,
  opts?: { type?: 'all' | 'employment'; limit?: number },
) {
  const engagements = await CareerRepository.listEngagements(db, ownerUserId, opts);

  return {
    engagements: engagements.map(toEngagementDto),
  };
}

export async function updateCareerEngagement(
  ownerUserId: string,
  id: string,
  data: z.infer<typeof careerEngagementUpdateDataSchema>,
) {
  const updated = await CareerRepository.updateEngagementIfExists(db, {
    ...data,
    id,
    ownerUserid: ownerUserId,
  });
  return updated ? toEngagementDto(updated) : null;
}

export async function removeCareerEngagement(ownerUserId: string, id: string) {
  return CareerRepository.deleteEngagement(db, ownerUserId, id);
}

export async function listCareerApplications(
  ownerUserId: string,
  opts?: { status?: string; limit?: number },
) {
  const applications = await CareerRepository.listApplications(db, ownerUserId, opts);

  const enriched = await Promise.all(
    applications.map(async (a) => {
      const detail = await CareerRepository.getApplicationWithRelations(db, ownerUserId, a.id);
      return {
        id: a.id,
        company: a.company,
        title: a.title,
        location: a.location,
        source: a.source,
        appliedAt: a.appliedAt,
        currentStage: a.currentStage,
        status: a.status,
        jobPostingUrl: a.jobPostingUrl,
        salaryExpectation: a.salaryExpectation,
        notes: a.notes,
        stageCount: detail?.stages.length ?? 0,
        hasOffer: (detail?.offers.length ?? 0) > 0,
      };
    }),
  );

  return { applications: enriched };
}

function toWishlistCompany(application: CareerApplicationRecord) {
  return careerWishlistCompanySchema.parse({
    id: application.id,
    company: application.company,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  });
}

export async function listCareerWishlistCompanies(ownerUserId: string, limit?: number) {
  const applications = await CareerRepository.listApplications(db, ownerUserId, {
    status: 'WISHLIST',
    limit,
  });
  return { companies: applications.map(toWishlistCompany) };
}

export async function addCareerWishlistCompany(ownerUserId: string, company: string) {
  const existing = await CareerRepository.listApplications(db, ownerUserId, {
    status: 'WISHLIST',
    limit: 100,
  });
  const normalizedCompany = company.toLowerCase();
  const duplicate = existing.find(
    (application) => application.company.toLowerCase() === normalizedCompany,
  );
  if (duplicate) return toWishlistCompany(duplicate);

  return toWishlistCompany(
    await CareerRepository.createApplication(db, ownerUserId, {
      company,
      title: company,
      status: 'WISHLIST',
    }),
  );
}

export async function updateCareerWishlistCompany(
  ownerUserId: string,
  id: string,
  company: string,
) {
  const updated = await CareerRepository.updateWishlistApplication(db, ownerUserId, id, company);
  return updated ? toWishlistCompany(updated) : null;
}

export async function removeCareerWishlistCompany(ownerUserId: string, id: string) {
  return CareerRepository.deleteWishlistApplication(db, ownerUserId, id);
}

export async function getCareerApplicationDetail(ownerUserId: string, id: string) {
  const detail = await CareerRepository.getApplicationWithRelations(db, ownerUserId, id);
  if (!detail) return { application: null };

  return {
    application: {
      id: detail.id,
      company: detail.company,
      title: detail.title,
      location: detail.location,
      source: detail.source,
      referredBy: detail.referredBy,
      appliedAt: detail.appliedAt,
      currentStage: detail.currentStage,
      status: detail.status,
      resumeUrl: detail.resumeUrl,
      coverLetterUrl: detail.coverLetterUrl,
      jobPostingUrl: detail.jobPostingUrl,
      salaryExpectation: detail.salaryExpectation,
      notes: detail.notes,
      stages: detail.stages.map((s) => ({
        id: s.id,
        stage: s.stage,
        stageKind: s.stageKind,
        stageOrder: s.stageOrder,
        enteredAt: s.enteredAt,
        exitedAt: s.exitedAt,
        notes: s.notes,
      })),
      offers: detail.offers.map((offer) => ({
        id: offer.id,
        stageId: offer.stageId,
        baseSalary: offer.baseSalary,
        equity: offer.equity,
        bonus: offer.bonus,
        signingBonus: offer.signingBonus,
        totalComp: offer.totalComp,
        currency: offer.currency,
        decision: offer.decision,
        decisionAt: offer.decisionAt,
        notes: offer.notes,
      })),
    },
  };
}

export async function listCareerEducation(ownerUserId: string, limit?: number) {
  const education = await CareerRepository.listEducation(db, ownerUserId, limit);

  return {
    education: education.map((e) => ({
      id: e.id,
      school: e.school,
      degree: e.degree,
      fieldOfStudy: e.fieldOfStudy,
      startDate: e.startDate,
      endDate: e.endDate,
      activities: e.activities,
      notes: e.notes,
    })),
  };
}

// -- Skills --

export async function listCareerSkills(ownerUserId: string) {
  const skills = await SkillRepository.list(db, ownerUserId);
  return { skills: skills.map(toSkillDto) };
}

export async function createCareerSkill(ownerUserId: string, input: CareerSkillInput) {
  return toSkillDto(await SkillRepository.create(db, ownerUserId, input));
}

export async function updateCareerSkill(
  ownerUserId: string,
  id: string,
  data: Partial<CareerSkillInput>,
) {
  const updated = await SkillRepository.update(db, ownerUserId, id, data);
  return updated ? toSkillDto(updated) : null;
}

export async function removeCareerSkill(ownerUserId: string, id: string) {
  await SkillRepository.remove(db, ownerUserId, id);
}

// -- Projects --

export async function listCareerProjects(ownerUserId: string) {
  const projects = await ProjectRepository.list(db, ownerUserId);
  return careerProjectsSchema.parse({ projects: projects.map(toProjectDto) });
}

export async function createCareerProject(ownerUserId: string, input: CareerProjectInput) {
  return toProjectDto(await ProjectRepository.create(db, ownerUserId, input));
}

export async function updateCareerProject(
  ownerUserId: string,
  id: string,
  data: Partial<CareerProjectInput>,
) {
  const updated = await ProjectRepository.update(db, ownerUserId, id, data);
  return updated ? toProjectDto(updated) : null;
}

export async function removeCareerProject(ownerUserId: string, id: string) {
  return ProjectRepository.remove(db, ownerUserId, id);
}

// -- Testimonials --

export async function listCareerTestimonials(ownerUserId: string) {
  const testimonials = await TestimonialRepository.list(db, ownerUserId);
  return { testimonials: testimonials.map(toTestimonialDto) };
}

export async function createCareerTestimonial(ownerUserId: string, input: CareerTestimonialInput) {
  return toTestimonialDto(await TestimonialRepository.create(db, ownerUserId, input));
}

export async function updateCareerTestimonial(
  ownerUserId: string,
  id: string,
  data: Partial<CareerTestimonialInput>,
) {
  const updated = await TestimonialRepository.update(db, ownerUserId, id, data);
  return updated ? toTestimonialDto(updated) : null;
}

export async function removeCareerTestimonial(ownerUserId: string, id: string) {
  await TestimonialRepository.remove(db, ownerUserId, id);
}

// -- Certifications --

export async function listCareerCertifications(ownerUserId: string) {
  const certifications = await CertificationRepository.list(db, ownerUserId);
  return { certifications: certifications.map(toCertificationDto) };
}

export async function createCareerCertification(
  ownerUserId: string,
  input: CareerCertificationInput,
) {
  return toCertificationDto(await CertificationRepository.create(db, ownerUserId, input));
}

export async function updateCareerCertification(
  ownerUserId: string,
  id: string,
  data: Partial<CareerCertificationInput>,
) {
  const updated = await CertificationRepository.update(db, ownerUserId, id, data);
  return updated ? toCertificationDto(updated) : null;
}

export async function removeCareerCertification(ownerUserId: string, id: string) {
  await CertificationRepository.remove(db, ownerUserId, id);
}

// -- Social links --

export async function getCareerSocialLinks(ownerUserId: string) {
  const links = await SocialLinksRepository.get(db, ownerUserId);
  return {
    socialLinks: links
      ? {
          github: links.github,
          linkedin: links.linkedin,
          twitter: links.twitter,
          website: links.website,
        }
      : null,
  };
}

export async function saveCareerSocialLinks(ownerUserId: string, input: CareerSocialLinksInput) {
  const links = await SocialLinksRepository.save(db, ownerUserId, input);
  return {
    github: links.github,
    linkedin: links.linkedin,
    twitter: links.twitter,
    website: links.website,
  };
}

// -- Application notes --

export async function listCareerApplicationNotes(ownerUserId: string, applicationId: string) {
  if (!(await CareerRepository.applicationBelongsToOwner(db, ownerUserId, applicationId))) {
    return null;
  }
  const notes = await ApplicationNotesRepository.list(db, applicationId);
  return {
    notes: notes.map((n) => ({ id: n.id, content: n.content, createdAt: String(n.createdAt) })),
  };
}

export async function addCareerApplicationNote(
  ownerUserId: string,
  applicationId: string,
  content: string,
) {
  if (!(await CareerRepository.applicationBelongsToOwner(db, ownerUserId, applicationId))) {
    return null;
  }
  const note = await ApplicationNotesRepository.create(db, applicationId, content);
  return { id: note.id, content: note.content, createdAt: String(note.createdAt) };
}

export async function removeCareerApplicationNote(
  ownerUserId: string,
  applicationId: string,
  id: string,
) {
  if (!(await CareerRepository.applicationBelongsToOwner(db, ownerUserId, applicationId))) {
    return false;
  }
  await ApplicationNotesRepository.remove(db, applicationId, id);
  return true;
}

// -- Application files --

export async function listCareerApplicationFiles(ownerUserId: string, applicationId: string) {
  if (!(await CareerRepository.applicationBelongsToOwner(db, ownerUserId, applicationId))) {
    return null;
  }
  const files = await ApplicationFilesRepository.list(db, applicationId);
  return { files: files.map(toApplicationFileDto) };
}

export async function addCareerApplicationFile(
  ownerUserId: string,
  applicationId: string,
  input: { fileName: string; fileUrl: string; fileType?: string | null },
) {
  if (!(await CareerRepository.applicationBelongsToOwner(db, ownerUserId, applicationId))) {
    return null;
  }
  const file = await ApplicationFilesRepository.create(db, applicationId, input);
  return toApplicationFileDto(file);
}

export async function removeCareerApplicationFile(
  ownerUserId: string,
  applicationId: string,
  id: string,
) {
  if (!(await CareerRepository.applicationBelongsToOwner(db, ownerUserId, applicationId))) {
    return false;
  }
  await ApplicationFilesRepository.remove(db, applicationId, id);
  return true;
}

function toSkillDto(skill: {
  id: string;
  name: string;
  category: string | null;
  level: number | null;
  yearsOfExperience: number | null;
  description: string | null;
  proof: string | null;
  aiDerived: boolean;
  isVisible: boolean;
  sortOrder: number;
}) {
  return {
    id: skill.id,
    name: skill.name,
    category: skill.category,
    level: skill.level,
    yearsOfExperience: skill.yearsOfExperience,
    description: skill.description,
    proof: skill.proof,
    aiDerived: skill.aiDerived,
    isVisible: skill.isVisible,
    sortOrder: skill.sortOrder,
  };
}

function toEngagementDto(
  engagement: CareerEngagementRecord,
): z.infer<typeof careerEngagementSchema> {
  return careerEngagementSchema.parse({
    id: engagement.id,
    company: engagement.company,
    title: engagement.title,
    description: engagement.description,
    location: engagement.location,
    address: engagement.address,
    url: engagement.url,
    startDate: engagement.startDate,
    endDate: engagement.endDate,
    isCurrent: engagement.isCurrent ?? false,
    salaryLow: engagement.salaryLow,
    salaryHigh: engagement.salaryHigh,
    currency: engagement.currency,
    contactName: engagement.contactName,
    contactPhone: engagement.contactPhone,
    source: engagement.source,
    kind: engagement.kind,
    reasonForLeaving: engagement.reasonForLeaving,
  });
}

function toProjectDto(project: CareerProjectRecord): z.infer<typeof careerProjectSchema> {
  return careerProjectSchema.parse({
    id: project.id,
    organization: project.organization,
    title: project.title,
    description: project.description,
    shortDescription: project.shortDescription,
    liveUrl: project.liveUrl,
    githubUrl: project.githubUrl,
    imageUrl: project.imageUrl,
    videoUrl: project.videoUrl,
    technologies: Array.isArray(project.technologies) ? project.technologies : [],
    status: project.status === null ? null : careerProjectStatusSchema.parse(project.status),
    startDate: project.startDate,
    endDate: project.endDate,
    isFeatured: project.isFeatured,
    isVisible: project.isVisible,
    sortOrder: project.sortOrder,
    engagements: project.engagements,
  });
}

function toTestimonialDto(testimonial: {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  content: string;
  avatarUrl: string | null;
  linkedinUrl: string | null;
  rating: number | null;
  isVerified: boolean;
  isVisible: boolean;
  sortOrder: number;
}) {
  return {
    id: testimonial.id,
    name: testimonial.name,
    title: testimonial.title,
    company: testimonial.company,
    content: testimonial.content,
    avatarUrl: testimonial.avatarUrl,
    linkedinUrl: testimonial.linkedinUrl,
    rating: testimonial.rating,
    isVerified: testimonial.isVerified,
    isVisible: testimonial.isVisible,
    sortOrder: testimonial.sortOrder,
  };
}

function toCertificationDto(certification: {
  id: string;
  positionId: string | null;
  name: string;
  description: string | null;
  issuingOrganization: string;
  issueDate: string | null;
  expirationDate: string | null;
  status: string | null;
  category: string | null;
  isVisible: boolean;
  sortOrder: number;
}) {
  return {
    id: certification.id,
    positionId: certification.positionId,
    name: certification.name,
    description: certification.description,
    issuingOrganization: certification.issuingOrganization,
    issueDate: certification.issueDate,
    expirationDate: certification.expirationDate,
    status: certification.status,
    category: certification.category,
    isVisible: certification.isVisible,
    sortOrder: certification.sortOrder,
  };
}

function toApplicationFileDto(file: {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string | null;
  createdAt: string;
}) {
  return {
    id: file.id,
    fileName: file.fileName,
    fileUrl: file.fileUrl,
    fileType: file.fileType,
    createdAt: String(file.createdAt),
  };
}
