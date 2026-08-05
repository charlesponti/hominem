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
  type CareerCertificationInput,
  type CareerProjectInput,
  type CareerSkillInput,
  type CareerSocialLinksInput,
  type CareerTestimonialInput,
} from '@hominem/db';

import { careerProfileSchema } from '../schemas/career.schema';

export class CareerService {
  async getProfile(ownerUserId: string) {
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

  async listPositions(
    ownerUserId: string,
    opts?: { type?: 'all' | 'employment' | 'target'; limit?: number },
  ) {
    const positions = await CareerRepository.listPositions(db, ownerUserId, opts);

    return {
      positions: positions.map((p) => ({
        id: p.id,
        company: p.company,
        title: p.title,
        description: p.description,
        location: p.location,
        startDate: p.startDate,
        endDate: p.endDate,
        isCurrent: p.isCurrent ?? false,
        isTarget: p.isTarget ?? false,
        salaryLow: p.salaryLow,
        salaryHigh: p.salaryHigh,
        currency: p.currency,
        recordType: p.recordType,
        url: p.url,
      })),
    };
  }

  async listApplications(ownerUserId: string, opts?: { status?: string; limit?: number }) {
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
          hasOffer: detail?.offer !== null,
        };
      }),
    );

    return { applications: enriched };
  }

  async getApplicationDetail(ownerUserId: string, id: string) {
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
          enteredAt: s.enteredAt,
          exitedAt: s.exitedAt,
          notes: s.notes,
        })),
        offer: detail.offer
          ? {
              id: detail.offer.id,
              baseSalary: detail.offer.baseSalary,
              equity: detail.offer.equity,
              bonus: detail.offer.bonus,
              signingBonus: detail.offer.signingBonus,
              totalComp: detail.offer.totalComp,
              currency: detail.offer.currency,
              decision: detail.offer.decision,
              decisionAt: detail.offer.decisionAt,
              notes: detail.offer.notes,
            }
          : null,
      },
    };
  }

  async listEducation(ownerUserId: string, limit?: number) {
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

  async listSkills(ownerUserId: string) {
    const skills = await SkillRepository.list(db, ownerUserId);
    return { skills: skills.map(toSkillDto) };
  }

  async createSkill(ownerUserId: string, input: CareerSkillInput) {
    return toSkillDto(await SkillRepository.create(db, ownerUserId, input));
  }

  async updateSkill(ownerUserId: string, id: string, data: Partial<CareerSkillInput>) {
    const updated = await SkillRepository.update(db, ownerUserId, id, data);
    return updated ? toSkillDto(updated) : null;
  }

  async removeSkill(ownerUserId: string, id: string) {
    await SkillRepository.remove(db, ownerUserId, id);
  }

  // -- Projects --

  async listProjects(ownerUserId: string) {
    const projects = await ProjectRepository.list(db, ownerUserId);
    return { projects: projects.map(toProjectDto) };
  }

  async createProject(ownerUserId: string, input: CareerProjectInput) {
    return toProjectDto(await ProjectRepository.create(db, ownerUserId, input));
  }

  async updateProject(ownerUserId: string, id: string, data: Partial<CareerProjectInput>) {
    const updated = await ProjectRepository.update(db, ownerUserId, id, data);
    return updated ? toProjectDto(updated) : null;
  }

  async removeProject(ownerUserId: string, id: string) {
    await ProjectRepository.remove(db, ownerUserId, id);
  }

  // -- Testimonials --

  async listTestimonials(ownerUserId: string) {
    const testimonials = await TestimonialRepository.list(db, ownerUserId);
    return { testimonials: testimonials.map(toTestimonialDto) };
  }

  async createTestimonial(ownerUserId: string, input: CareerTestimonialInput) {
    return toTestimonialDto(await TestimonialRepository.create(db, ownerUserId, input));
  }

  async updateTestimonial(ownerUserId: string, id: string, data: Partial<CareerTestimonialInput>) {
    const updated = await TestimonialRepository.update(db, ownerUserId, id, data);
    return updated ? toTestimonialDto(updated) : null;
  }

  async removeTestimonial(ownerUserId: string, id: string) {
    await TestimonialRepository.remove(db, ownerUserId, id);
  }

  // -- Certifications --

  async listCertifications(ownerUserId: string) {
    const certifications = await CertificationRepository.list(db, ownerUserId);
    return { certifications: certifications.map(toCertificationDto) };
  }

  async createCertification(ownerUserId: string, input: CareerCertificationInput) {
    return toCertificationDto(await CertificationRepository.create(db, ownerUserId, input));
  }

  async updateCertification(
    ownerUserId: string,
    id: string,
    data: Partial<CareerCertificationInput>,
  ) {
    const updated = await CertificationRepository.update(db, ownerUserId, id, data);
    return updated ? toCertificationDto(updated) : null;
  }

  async removeCertification(ownerUserId: string, id: string) {
    await CertificationRepository.remove(db, ownerUserId, id);
  }

  // -- Social links --

  async getSocialLinks(ownerUserId: string) {
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

  async saveSocialLinks(ownerUserId: string, input: CareerSocialLinksInput) {
    const links = await SocialLinksRepository.save(db, ownerUserId, input);
    return {
      github: links.github,
      linkedin: links.linkedin,
      twitter: links.twitter,
      website: links.website,
    };
  }

  // -- Application notes --

  async listApplicationNotes(ownerUserId: string, applicationId: string) {
    if (!(await CareerRepository.applicationBelongsToOwner(db, ownerUserId, applicationId))) {
      return null;
    }
    const notes = await ApplicationNotesRepository.list(db, applicationId);
    return {
      notes: notes.map((n) => ({ id: n.id, content: n.content, createdAt: String(n.createdAt) })),
    };
  }

  async addApplicationNote(ownerUserId: string, applicationId: string, content: string) {
    if (!(await CareerRepository.applicationBelongsToOwner(db, ownerUserId, applicationId))) {
      return null;
    }
    const note = await ApplicationNotesRepository.create(db, applicationId, content);
    return { id: note.id, content: note.content, createdAt: String(note.createdAt) };
  }

  async removeApplicationNote(ownerUserId: string, applicationId: string, id: string) {
    if (!(await CareerRepository.applicationBelongsToOwner(db, ownerUserId, applicationId))) {
      return false;
    }
    await ApplicationNotesRepository.remove(db, applicationId, id);
    return true;
  }

  // -- Application files --

  async listApplicationFiles(ownerUserId: string, applicationId: string) {
    if (!(await CareerRepository.applicationBelongsToOwner(db, ownerUserId, applicationId))) {
      return null;
    }
    const files = await ApplicationFilesRepository.list(db, applicationId);
    return { files: files.map(toApplicationFileDto) };
  }

  async addApplicationFile(
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

  async removeApplicationFile(ownerUserId: string, applicationId: string, id: string) {
    if (!(await CareerRepository.applicationBelongsToOwner(db, ownerUserId, applicationId))) {
      return false;
    }
    await ApplicationFilesRepository.remove(db, applicationId, id);
    return true;
  }
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

function toProjectDto(project: {
  id: string;
  positionId: string | null;
  title: string;
  description: string | null;
  shortDescription: string | null;
  liveUrl: string | null;
  githubUrl: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  technologies: unknown;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  isFeatured: boolean;
  isVisible: boolean;
  sortOrder: number;
}) {
  return {
    id: project.id,
    positionId: project.positionId,
    title: project.title,
    description: project.description,
    shortDescription: project.shortDescription,
    liveUrl: project.liveUrl,
    githubUrl: project.githubUrl,
    imageUrl: project.imageUrl,
    videoUrl: project.videoUrl,
    technologies: Array.isArray(project.technologies) ? project.technologies : [],
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
    isFeatured: project.isFeatured,
    isVisible: project.isVisible,
    sortOrder: project.sortOrder,
  };
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
