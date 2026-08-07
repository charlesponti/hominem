import type { CareerApplicationRecord } from '@hominem/db';
import { CareerRepository, db } from '@hominem/db';

export type JobApplicationCard = {
  id: string;
  company: string;
  title: string;
  location: string | null;
  source: string | null;
  appliedAt: string | null;
  currentStage: string | null;
  status: string | null;
  jobPostingUrl: string | null;
  salaryExpectation: number | null;
  notes: string | null;
  stageCount: number;
  hasOffer: boolean;
};

export type JobApplicationFilter = {
  status?: string;
};

export type PaginationOptions = {
  limit?: number;
};

export function filterJobApplications(
  applications: JobApplicationCard[],
  filter?: JobApplicationFilter,
): JobApplicationCard[] {
  if (!filter?.status) return applications;
  return applications.filter((a) => a.status === filter.status);
}

export function sortAndPaginateJobApplications(
  applications: JobApplicationCard[],
  options?: PaginationOptions,
): JobApplicationCard[] {
  const sorted = [...applications].sort((a, b) => {
    const dateA = a.appliedAt ?? '';
    const dateB = b.appliedAt ?? '';
    return dateB.localeCompare(dateA);
  });

  if (options?.limit && options.limit > 0) {
    return sorted.slice(0, options.limit);
  }
  return sorted;
}

function toApplicationCard(
  app: CareerApplicationRecord,
  stageCount: number,
  hasOffer: boolean,
): JobApplicationCard {
  return {
    id: app.id,
    company: app.company,
    title: app.title,
    location: app.location ?? null,
    source: app.source ?? null,
    appliedAt: app.appliedAt ?? null,
    currentStage: app.currentStage ?? null,
    status: app.status ?? null,
    jobPostingUrl: app.jobPostingUrl ?? null,
    salaryExpectation: app.salaryExpectation ?? null,
    notes: app.notes ?? null,
    stageCount,
    hasOffer,
  };
}

export async function getApplicationCards(ownerUserId: string): Promise<JobApplicationCard[]> {
  const applications = await CareerRepository.listApplications(db, ownerUserId);
  const stats = await CareerRepository.getApplicationCardStats(
    db,
    applications.map((app) => app.id),
  );

  return applications.map((app) => {
    const stat = stats.get(app.id);
    return toApplicationCard(app, stat?.stageCount ?? 0, stat?.hasOffer ?? false);
  });
}
