import type { RelativePathString } from 'expo-router';

export type ContentKind = 'chat' | 'note';

export interface ResumeTarget {
  kind: ContentKind;
  id: string;
  title: string | null;
  updatedAt: string | null;
}

export const HOME_ROUTE = '/(protected)' as RelativePathString;
export const ALL_ROUTE = HOME_ROUTE;
// Compatibility alias for callers that still describe the All stream as Inbox.
export const INBOX_ROUTE = ALL_ROUTE;
export const TIME_ROUTE = '/(protected)/time' as RelativePathString;
export const UNSCHEDULED_ROUTE = '/(protected)/time/unscheduled' as RelativePathString;
export const SETTINGS_ROUTE = '/(protected)/settings' as RelativePathString;
export const ARCHIVED_CHATS_ROUTE = '/(protected)/settings/archived-chats';

export type TimeBlockSource = 'task' | 'event';

export function getTimeBlockRoute(source: TimeBlockSource, id: string) {
  return `/(protected)/time/${source}/${encodeURIComponent(id)}`;
}

export function getTaskDetailRoute(id: string) {
  return getTimeBlockRoute('task', id);
}

export function getTaskScheduleRoute(id: string) {
  return `${getTimeBlockRoute('task', id)}?mode=schedule`;
}

export function getContentRoute(kind: ContentKind, id: string) {
  if (!id) {
    throw new Error('Content route requires an id');
  }

  return `/(protected)/inbox/${kind}/${id}`;
}

export const getThreadRoute = getContentRoute;
