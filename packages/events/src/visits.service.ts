import {
  createEvent,
  deleteEvent,
  type EventWithTagsAndPeople,
  type UpdateEventInput,
  updateEvent,
} from './event-core.service';

export interface VisitFilters {
  placeId?: string;
  startDate?: Date;
  endDate?: Date;
}

export type VisitWithPlaceAndTags = {
  id: string;
  placeId: string | null;
  date: string | null;
  visitRating: number | null;
  tags: Array<{ id: string; name: string; color: string | null; description: string | null }>;
  people: Array<{ id: string; firstName: string; lastName: string | null }>;
  place: { id: string; name: string | null } | null;
};

export async function getVisitsByUser(
  userId: string,
  filters?: VisitFilters,
): Promise<VisitWithPlaceAndTags[]> {
  void userId;
  void filters;
  return [];
}

export async function getVisitsByPlace(
  placeId: string,
  userId?: string,
): Promise<VisitWithPlaceAndTags[]> {
  void placeId;
  void userId;
  return [];
}

export interface VisitStats {
  visitCount: number;
  lastVisitDate: Date | null;
  averageRating: number | null;
}

export async function getVisitStatsByPlace(placeId: string, userId: string): Promise<VisitStats> {
  void placeId;
  void userId;
  return {
    visitCount: 0,
    lastVisitDate: null,
    averageRating: null,
  };
}

export async function createVisit(
  event: Parameters<typeof createEvent>[0],
): Promise<EventWithTagsAndPeople> {
  return createEvent(event);
}

export async function updateVisit(
  visitId: string,
  updates: UpdateEventInput,
): Promise<EventWithTagsAndPeople | null> {
  return updateEvent(visitId, updates);
}

export async function deleteVisit(visitId: string): Promise<boolean> {
  return deleteEvent(visitId);
}
