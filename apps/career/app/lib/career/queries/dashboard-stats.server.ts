import { CareerRepository, db } from '@hominem/db';

import { computeDashboardStats, type DashboardStats } from './dashboard-stats';
import { getApplicationCards } from './job-applications.server';

export async function getDashboardStats(ownerUserId: string): Promise<DashboardStats> {
  const [applications, positions, offers] = await Promise.all([
    getApplicationCards(ownerUserId),
    CareerRepository.listPositions(db, ownerUserId),
    CareerRepository.listOffers(db, ownerUserId),
  ]);

  return computeDashboardStats(applications, positions, offers);
}
