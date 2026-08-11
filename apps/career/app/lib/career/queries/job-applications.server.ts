import { CareerRepository, db } from '@hominem/db';

import {
  buildSourceOptions,
  buildStatusOptions,
  NO_SOURCE_FILTER,
  NO_STATUS_FILTER,
  type FilterOption,
  type JobApplicationCard,
  type SortDirection,
} from './job-applications';

type ApplicationRow = Awaited<ReturnType<typeof CareerRepository.listApplications>>[number];

function toCard(
  app: ApplicationRow,
  stat?: { stageCount: number; hasOffer: boolean },
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
    stageCount: stat?.stageCount ?? 0,
    hasOffer: stat?.hasOffer ?? false,
  };
}

export async function getApplicationCards(ownerUserId: string): Promise<JobApplicationCard[]> {
  const applications = await CareerRepository.listApplications(db, ownerUserId);
  const stats = await CareerRepository.getApplicationCardStats(
    db,
    applications.map((app) => app.id),
  );

  return applications.map((app) => toCard(app, stats.get(app.id)));
}

export type ApplicationPageData = {
  applications: JobApplicationCard[];
  total: number;
  hasApplications: boolean;
  statusOptions: FilterOption[];
  sourceOptions: FilterOption[];
};

export async function getApplicationPage(
  ownerUserId: string,
  opts: {
    page: number;
    pageSize: number;
    status?: string;
    source?: string;
    query?: string;
    sort?: SortDirection;
  },
): Promise<ApplicationPageData> {
  const { items, total } = await CareerRepository.listApplicationsPage(db, ownerUserId, {
    page: opts.page,
    pageSize: opts.pageSize,
    status: opts.status === NO_STATUS_FILTER ? null : opts.status || undefined,
    source: opts.source === NO_SOURCE_FILTER ? null : opts.source || undefined,
    query: opts.query,
    sort: opts.sort ?? 'desc',
  });

  const [stats, counts] = await Promise.all([
    CareerRepository.getApplicationCardStats(
      db,
      items.map((app) => app.id),
    ),
    CareerRepository.getApplicationFilterCounts(db, ownerUserId),
  ]);

  return {
    applications: items.map((app) => toCard(app, stats.get(app.id))),
    total,
    hasApplications: counts.statusCounts.reduce((sum, count) => sum + count.count, 0) > 0,
    statusOptions: buildStatusOptions(counts.statusCounts),
    sourceOptions: buildSourceOptions(counts.sourceCounts),
  };
}
