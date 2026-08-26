import {
  ALL_ROUTE,
  NEW_CHAT_ROUTE,
  SETTINGS_ROUTE,
  getContentRoute,
  getTimeBlockRoute,
  type TimeBlockSource,
} from '~/services/navigation/routes';

// Rewrites incoming iOS deep links before Expo Router processes them.
export function redirectSystemPath({
  path,
  initial: _initial,
}: {
  path: string;
  initial: boolean;
}): string {
  // Strip leading slash for matching
  const normalized = path.startsWith('/') ? path.slice(1) : path;

  // App Intent / Siri: note/add -> All
  if (normalized === 'note/add') {
    return ALL_ROUTE;
  }

  // OTP verification link: verify?token=xxx -> /(auth)/verify?token=xxx
  if (normalized.startsWith('verify')) {
    return `/(auth)/${normalized}`;
  }

  const timeBlockMatch = normalized.match(/^time\/(task|event)\/([^?]+)/);
  if (timeBlockMatch) {
    return getTimeBlockRoute(timeBlockMatch[1] as TimeBlockSource, timeBlockMatch[2]);
  }

  // Chat with specific ID: chat/<id>
  const chatIdMatch = normalized.match(/^chat\/([^?]+)/);
  if (chatIdMatch) {
    return getContentRoute('chat', chatIdMatch[1]);
  }

  // Chat with seed (start new): chat?seed=<text> -> New Chat with seed
  if (normalized.startsWith('chat')) {
    const seedParam = normalized.replace(/^chat\??/, '');
    return `${NEW_CHAT_ROUTE}${seedParam ? `?${seedParam}` : ''}`;
  }

  // Notes with specific ID
  const notesIdMatch = normalized.match(/^notes\/(.+)/);
  if (notesIdMatch) {
    return getContentRoute('note', notesIdMatch[1]);
  }

  // Notes list -> inbox
  if (normalized === 'notes') {
    return ALL_ROUTE;
  }

  // Focus with specific ID -> note detail
  const focusIdMatch = normalized.match(/^focus\/(.+)/);
  if (focusIdMatch) {
    return getContentRoute('note', focusIdMatch[1]);
  }

  // Focus list -> inbox
  if (normalized === 'focus') {
    return ALL_ROUTE;
  }

  // Account/settings screen
  if (normalized.startsWith('account')) {
    return SETTINGS_ROUTE;
  }

  return path;
}
