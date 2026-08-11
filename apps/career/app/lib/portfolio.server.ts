import { CareerRepository, ProjectRepository, SkillRepository, db } from '@hominem/db';

import { fetchCareerProfile } from './api.server';
import { jsonArray } from './db-json';

export interface ResumePortfolio {
  name: string;
  jobTitle: string;
  currentLocation: string;
  email: string;
  phone: string | null;
  bio: string;
  workExperiences: Array<{
    role: string;
    company: string;
    startDate: string | null;
    endDate: string | null;
    description: string | null;
  }>;
  skills: Array<{
    name: string;
    level: number | null;
    category: string | null;
    yearsOfExperience: number | null;
    description: string | null;
  }>;
  projects: Array<{
    title: string;
    status: string | null;
    description: string | null;
    technologies: string[];
    liveUrl: string | null;
    githubUrl: string | null;
  }>;
}

/**
 * Every signed-in career user has one career profile.
 * If none exists, return null (profile is created via data migration, not on-the-fly like the old portfolio).
 */
export async function ensureUserHasProfile(request: Request): Promise<boolean> {
  const profile = await fetchCareerProfile(request);
  return profile !== null;
}

/**
 * Full profile context — profile + positions + education — for AI prompts and public display.
 */
export async function getFullCareerContext(ownerUserId: string) {
  const [profile, positions, education] = await Promise.all([
    CareerRepository.getProfile(db, ownerUserId),
    CareerRepository.listEngagements(db, ownerUserId),
    CareerRepository.listEducation(db, ownerUserId, 50),
  ]);

  return {
    profile,
    positions,
    education,
  };
}

/**
 * Public career profile for sharing.
 */
export async function getPublicCareerProfile(ownerUserId: string) {
  const [profile, positions] = await Promise.all([
    CareerRepository.getProfile(db, ownerUserId),
    CareerRepository.listEngagements(db, ownerUserId, { type: 'employment' }),
  ]);

  return { profile, positions };
}

/**
 * Resume portfolio context for AI prompts — profile + positions + skills + projects.
 */
export async function getResumePortfolioContext(
  ownerUserId: string,
): Promise<ResumePortfolio | null> {
  const [profile, positions, skills, projects] = await Promise.all([
    CareerRepository.getProfile(db, ownerUserId),
    CareerRepository.listEngagements(db, ownerUserId),
    SkillRepository.list(db, ownerUserId),
    ProjectRepository.list(db, ownerUserId),
  ]);

  if (!profile) return null;

  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ');

  return {
    name,
    jobTitle: profile.headline ?? '',
    currentLocation: profile.location ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? null,
    bio: profile.summary ?? '',
    workExperiences: positions.map((p) => ({
      role: p.title,
      company: p.company,
      startDate: p.startDate,
      endDate: p.endDate,
      description: p.description,
    })),
    skills: skills.map((s) => ({
      name: s.name,
      level: s.level,
      category: s.category,
      yearsOfExperience: s.yearsOfExperience,
      description: s.description,
    })),
    projects: projects.map((p) => ({
      title: p.title,
      status: p.status,
      description: p.description,
      technologies: jsonArray<string>(p.technologies),
      liveUrl: p.liveUrl,
      githubUrl: p.githubUrl,
    })),
  };
}
