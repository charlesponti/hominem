import {
  CareerRepository,
  ProjectRepository,
  runInTransaction,
  SkillRepository,
  SocialLinksRepository,
  sql,
  type DbHandle,
} from '@hominem/db';

import type { ConvertedResumeData } from '../../types/resume';
import { normalizePortfolioSlug } from '../../types/resume';

interface SaveResumeResult {
  profileId: string;
  profileSlug: string;
}

interface SaveResumeOptions {
  replaceProfileId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeJsonColumn(value: unknown): any {
  return JSON.stringify(value);
}

export async function saveResumeToDatabase(
  ownerUserid: string,
  data: ConvertedResumeData,
  options: SaveResumeOptions = {},
): Promise<SaveResumeResult> {
  return runInTransaction(async (tx) => {
    const profileToReplaceId =
      options.replaceProfileId ?? (await CareerRepository.getProfile(tx, ownerUserid))?.id;

    if (profileToReplaceId) {
      await CareerRepository.deleteProfile(tx, ownerUserid);
    }

    const slug = await generateUniqueSlug(tx, data.portfolio.slug, data.portfolio.name);

    const name = data.portfolio.name;
    const [firstName, ...rest] = name.split(' ');
    const lastName = rest.join(' ') || null;

    const createdProfile = await CareerRepository.saveProfile(tx, ownerUserid, {
      slug,
      title: data.portfolio.title,
      firstName,
      lastName,
      headline: data.portfolio.job_title,
      summary: data.portfolio.bio,
      tagline: data.portfolio.tagline,
      location: data.portfolio.current_location,
      email: data.portfolio.email,
      phone: data.portfolio.phone ?? null,
      initials: data.portfolio.initials ?? null,
      isPublic: data.portfolio.is_public,
      isActive: data.portfolio.is_active,
      availabilityStatus: data.portfolio.availability_status,
      openToRemote: data.portfolio.open_to_remote ?? false,
    });

    const profileId = createdProfile.id;

    if (data.social_links) {
      const existingSocialLinks = await SocialLinksRepository.get(tx, ownerUserid);
      await SocialLinksRepository.save(tx, ownerUserid, {
        github: data.social_links.github ?? existingSocialLinks?.github ?? null,
        linkedin: data.social_links.linkedin ?? existingSocialLinks?.linkedin ?? null,
        twitter: data.social_links.twitter ?? existingSocialLinks?.twitter ?? null,
        website: data.social_links.website ?? existingSocialLinks?.website ?? null,
      });
    }

    for (const workExperience of data.workExperience) {
      await CareerRepository.createPosition(tx, ownerUserid, {
        company: workExperience.company,
        title: workExperience.role,
        description: workExperience.description,
        startDate: workExperience.start_date ?? null,
        endDate: workExperience.end_date ?? null,
      });
    }

    for (const skill of data.skills) {
      await SkillRepository.create(tx, ownerUserid, {
        name: skill.name,
        level: skill.level,
        category: skill.category ?? null,
        description: skill.description ?? null,
        yearsOfExperience: skill.years_of_experience ?? null,
        sortOrder: 0,
      });
    }

    for (const project of data.projects) {
      await ProjectRepository.create(tx, ownerUserid, {
        title: project.title,
        description: project.description,
        shortDescription: project.short_description ?? null,
        liveUrl: project.live_url ?? null,
        githubUrl: project.github_url ?? null,
        technologies: serializeJsonColumn(project.technologies),
        status: project.status,
        isVisible: true,
        isFeatured: false,
        sortOrder: 0,
      });
    }

    return { profileId, profileSlug: slug };
  });
}

function truncateSlugBase(slug: string, suffix = ''): string {
  const maxBaseLength = 50 - suffix.length;
  return slug.slice(0, maxBaseLength).replace(/-$/g, '') || 'portfolio';
}

export async function generateUniqueSlug(
  handle: DbHandle,
  base: string,
  fallbackBase = 'portfolio',
): Promise<string> {
  const normalizedBase =
    normalizePortfolioSlug(base) || normalizePortfolioSlug(fallbackBase) || 'portfolio';
  const root = truncateSlugBase(normalizedBase);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
    const candidate = `${truncateSlugBase(root, suffix)}${suffix}`;
    const existing = await handle
      .selectFrom('app.careerProfile')
      .select('id')
      .where(sql`lower(slug)`, '=', candidate.toLowerCase())
      .executeTakeFirst();

    if (!existing) return candidate;
  }

  throw new Error('Could not generate a unique profile slug.');
}
