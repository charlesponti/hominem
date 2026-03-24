export const MOBILE_WORKSPACE_CONTEXTS = ['inbox', 'note', 'chat', 'search', 'settings'] as const;

export const MOBILE_WORKSPACE_BASE_CONTEXTS = ['inbox', 'search', 'settings'] as const;

export type MobileWorkspaceContext = (typeof MOBILE_WORKSPACE_CONTEXTS)[number];

export const MOBILE_WORKSPACE_LABELS: Record<MobileWorkspaceContext, string> = {
  inbox: 'Inbox',
  note: 'Note',
  chat: 'Chat',
  search: 'Search',
  settings: 'Settings',
};

export const MOBILE_WORKSPACE_ROUTES: Record<MobileWorkspaceContext, Href | null> = {
  inbox: '/(protected)/(tabs)/focus',
  note: null,
  chat: '/(protected)/(tabs)/sherpa',
  search: null,
  settings: '/(protected)/(tabs)/account',
};

export function resolveVisibleWorkspaceContexts(
  activeContext: MobileWorkspaceContext,
): MobileWorkspaceContext[] {
  if (activeContext === 'note') {
    return ['inbox', 'note', 'search', 'settings'];
  }

  if (activeContext === 'chat') {
    return ['inbox', 'chat', 'search', 'settings'];
  }

  return [...MOBILE_WORKSPACE_BASE_CONTEXTS];
}
import type { Href } from 'expo-router';
