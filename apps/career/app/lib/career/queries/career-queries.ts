import { CareerRepository, db, type CareerEngagementRecord } from '@hominem/db';

export type TimelineEntry = {
  id: string;
  type: 'position' | 'education';
  title: string;
  subtitle: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  order: number;
};

export async function getCareerTimeline(ownerUserId: string): Promise<TimelineEntry[]> {
  const [positions, education] = await Promise.all([
    CareerRepository.listEngagements(db, ownerUserId),
    CareerRepository.listEducation(db, ownerUserId, 50),
  ]);

  const entries: TimelineEntry[] = [];

  positions.forEach((p, i) => {
    entries.push({
      id: p.id,
      type: 'position',
      title: p.title,
      subtitle: p.company,
      startDate: p.startDate ?? null,
      endDate: p.endDate ?? null,
      isCurrent: p.isCurrent ?? false,
      order: i,
    });
  });

  education.forEach((e, i) => {
    entries.push({
      id: e.id,
      type: 'education',
      title: e.degree ?? e.school,
      subtitle: e.school,
      startDate: e.startDate ?? null,
      endDate: e.endDate ?? null,
      isCurrent: false,
      order: positions.length + i,
    });
  });

  return entries.sort((a, b) => {
    const dateA = a.startDate ?? '0000';
    const dateB = b.startDate ?? '0000';
    return dateB.localeCompare(dateA);
  });
}

export async function getUserEngagements(ownerUserId: string): Promise<CareerEngagementRecord[]> {
  return CareerRepository.listEngagements(db, ownerUserId);
}

export async function getUserEngagementById(
  ownerUserId: string,
  id: string,
): Promise<CareerEngagementRecord | null> {
  const positions = await CareerRepository.listEngagements(db, ownerUserId);
  return positions.find((p) => p.id === id) ?? null;
}
