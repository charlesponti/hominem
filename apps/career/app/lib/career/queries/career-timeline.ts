import type { CareerTimelineRecord } from '@hominem/db';
import { CareerRepository, db } from '@hominem/db';

export type { CareerTimelineRecord as TimelineEntry };

export type CareerStoryTimeline = CareerTimelineRecord[];

export async function getCareerStoryTimeline(ownerUserid: string): Promise<CareerStoryTimeline> {
  return CareerRepository.getTimeline(db, ownerUserid);
}
