import { CareerRepository, db } from '@hominem/db';

import type { JobApplicationCard } from './job-applications';

export async function getApplicationCards(ownerUserId: string): Promise<JobApplicationCard[]> {
  const applications = await CareerRepository.listApplications(db, ownerUserId);
  const stats = await CareerRepository.getApplicationCardStats(
    db,
    applications.map((app) => app.id),
  );

  return applications.map((app) => {
    const stat = stats.get(app.id);
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
  });
}
