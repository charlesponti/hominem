import type { RelativePathString } from 'expo-router';

export type ContentKind = 'chat' | 'note';

export interface ResumeTarget {
  kind: ContentKind;
  id: string;
  title: string | null;
  updatedAt: string | null;
}

export const INBOX_ROUTE = '/(protected)';
export const SETTINGS_ROUTE = '/(protected)/settings' as RelativePathString;
export const ARCHIVED_CHATS_ROUTE = '/(protected)/settings/archived-chats';

export type TimeBlockSource = 'task' | 'event';

export function getTimeBlockRoute(source: TimeBlockSource, id: string) {
  return `/(protected)?context=time&timeSource=${source}&timeId=${encodeURIComponent(id)}`;
}

export function getTaskDetailRoute(id: string) {
  return getTimeBlockRoute('task', id);
}

export function getContentRoute(kind: ContentKind, id: string) {
  if (!id) {
    throw new Error('Content route requires an id');
  }

  return `/(protected)/inbox/${kind}/${id}`;
}
