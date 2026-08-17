import type { ConvertedResumeData } from '@hominem/career-services/resume';
import {
  CareerRepository,
  ProjectRepository,
  runInTransaction,
  SkillRepository,
  SocialLinksRepository,
  type CareerProfileRecord,
  type CareerSocialLinksRecord,
  type TransactionHandle,
} from '@hominem/db';
import {
  getJobStatus,
  removeJobFromQueue,
  type ResumeAnalysisJob,
  type ResumeListItemChange,
} from '@hominem/queues';

import { logger } from '~/lib/logger';

import type { AccountActionResult, AccountPageUser } from './types';

function mapWorkExperiencePayload(payload: ConvertedResumeData['workExperience'][number]) {
  return {
    company: payload.company,
    title: payload.role,
    description: payload.description,
    startDate: payload.start_date ?? null,
    endDate: payload.end_date ?? null,
  };
}

function mapSkillPayload(payload: ConvertedResumeData['skills'][number]) {
  return {
    name: payload.name,
    level: payload.level,
    category: payload.category ?? null,
    description: payload.description ?? null,
    yearsOfExperience: payload.years_of_experience ?? null,
    sortOrder: 0,
  };
}

function mapProjectPayload(payload: ConvertedResumeData['projects'][number]) {
  return {
    title: payload.title,
    description: payload.description,
    shortDescription: payload.short_description ?? null,
    liveUrl: payload.live_url ?? null,
    githubUrl: payload.github_url ?? null,
    technologies: payload.technologies,
    status:
      payload.status === 'in-progress'
        ? ('IN_PROGRESS' as const)
        : payload.status === 'completed'
          ? ('DONE' as const)
          : ('CANCELED' as const),
    isVisible: true,
    isFeatured: false,
    sortOrder: 0,
  };
}

async function applySelectedListItems(
  tx: TransactionHandle,
  ownerUserId: string,
  items: ResumeListItemChange[],
) {
  for (const item of items) {
    if (item.group === 'workExperience') {
      await CareerRepository.createEngagement(
        tx,
        ownerUserId,
        mapWorkExperiencePayload(item.payload as ConvertedResumeData['workExperience'][number]),
      );
    } else if (item.group === 'skills') {
      await SkillRepository.create(
        tx,
        ownerUserId,
        mapSkillPayload(item.payload as ConvertedResumeData['skills'][number]),
      );
    } else {
      await ProjectRepository.create(
        tx,
        ownerUserId,
        mapProjectPayload(item.payload as ConvertedResumeData['projects'][number]),
      );
    }
  }
}

/**
 * Applies only the resume-import changes the user explicitly selected. Never
 * trusts client-submitted diff content — only which keys were checked; the
 * actual field values always come from the job record computed by the worker.
 */
export async function handleApplyResumeImportAction({
  formData,
  user,
}: {
  formData: FormData;
  user: AccountPageUser;
}): Promise<AccountActionResult<{ profileId: string }>> {
  const jobId = formData.get('jobId');
  if (typeof jobId !== 'string' || !jobId) {
    return { success: false, error: 'Missing resume analysis job.' };
  }

  const selectedScalarKeys = new Set(formData.getAll('scalarField').map(String));
  const selectedListKeys = new Set(formData.getAll('listKey').map(String));

  const job = await getJobStatus<ResumeAnalysisJob>(jobId);
  if (!job || job.userId !== user.id) {
    return { success: false, error: 'Resume analysis job not found.' };
  }
  if (job.status !== 'done' || !job.diff) {
    return { success: false, error: 'Resume analysis is not complete yet.' };
  }

  const scalarToApply = job.diff.scalarChanges.filter((change) =>
    selectedScalarKeys.has(`${change.group}.${change.field}`),
  );
  const listToApply = job.diff.listChanges.filter((item) => selectedListKeys.has(item.key));

  if (scalarToApply.length === 0 && listToApply.length === 0) {
    return { success: false, error: 'Select at least one change to apply.' };
  }

  try {
    const profileId = await runInTransaction(async (tx) => {
      const basicsPatch = Object.fromEntries(
        scalarToApply
          .filter((change) => change.group === 'basics')
          .map((change) => [change.field, change.proposed]),
      ) as Partial<CareerProfileRecord>;
      if (Object.keys(basicsPatch).length > 0) {
        await CareerRepository.saveProfile(tx, user.id, basicsPatch);
      }

      const socialPatch = Object.fromEntries(
        scalarToApply
          .filter((change) => change.group === 'social')
          .map((change) => [change.field, change.proposed]),
      ) as Partial<CareerSocialLinksRecord>;
      if (Object.keys(socialPatch).length > 0) {
        const existingSocial = await SocialLinksRepository.get(tx, user.id);
        await SocialLinksRepository.save(tx, user.id, {
          github: existingSocial?.github ?? null,
          linkedin: existingSocial?.linkedin ?? null,
          twitter: existingSocial?.twitter ?? null,
          website: existingSocial?.website ?? null,
          ...socialPatch,
        });
      }

      await applySelectedListItems(tx, user.id, listToApply);

      const profile = await CareerRepository.getProfile(tx, user.id);
      if (!profile) throw new Error('Profile not found after applying resume changes.');
      return profile.id;
    });

    await removeJobFromQueue(jobId, user.id);

    return {
      success: true,
      message: 'Resume changes applied.',
      data: { profileId },
    };
  } catch (error) {
    logger.error('Failed to apply resume import', error, { owner_userid: user.id, jobId });
    return { success: false, error: "We couldn't apply those changes. Try again." };
  }
}
