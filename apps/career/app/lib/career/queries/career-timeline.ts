import type { CareerTimelineRecord } from '@hominem/db/career';
import { CareerRepository } from '@hominem/db/career';
import { db } from '@hominem/db/core';

export type { CareerTimelineRecord as TimelineEntry };

export type CareerStoryTimeline = CareerTimelineRecord[];

export async function getCareerStoryTimeline(ownerUserid: string): Promise<CareerStoryTimeline> {
  return CareerRepository.getTimeline(db, ownerUserid);
}
