import {
  NEW_CHAT_ROUTE,
  SETTINGS_ROUTE,
  STREAM_ROUTE,
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
  const normalized = path.startsWith('/') ? path.slice(1) : path;

  // Siri / App Intent shortcut for adding a note -> All tab
  if (normalized === 'note/add') {
    return STREAM_ROUTE;
  }

  // OTP link: verify?token=xxx -> the auth verify screen
  if (normalized.startsWith('verify')) {
    return `/(auth)/${normalized}`;
  }

  const timeBlockMatch = normalized.match(/^time\/(task|event)\/([^?]+)/);
  if (timeBlockMatch) {
    return getTimeBlockRoute(timeBlockMatch[1] as TimeBlockSource, timeBlockMatch[2]);
  }

  // chat/<id> -> that chat
  const chatIdMatch = normalized.match(/^chat\/([^?]+)/);
  if (chatIdMatch) {
    return getContentRoute('chat', chatIdMatch[1]);
  }

  // chat?seed=<text> -> start a new chat with that seed
  if (normalized.startsWith('chat')) {
    const seedParam = normalized.replace(/^chat\??/, '');
    return `${NEW_CHAT_ROUTE}${seedParam ? `?${seedParam}` : ''}`;
  }

  // notes/<id> -> that note
  const notesIdMatch = normalized.match(/^notes\/(.+)/);
  if (notesIdMatch) {
    return getContentRoute('note', notesIdMatch[1]);
  }

  // notes list -> All tab
  if (normalized === 'notes') {
    return STREAM_ROUTE;
  }

  // focus/<id> -> note detail (focus and notes share a detail view)
  const focusIdMatch = normalized.match(/^focus\/(.+)/);
  if (focusIdMatch) {
    return getContentRoute('note', focusIdMatch[1]);
  }

  // focus list -> All tab
  if (normalized === 'focus') {
    return STREAM_ROUTE;
  }

  // account -> settings screen
  if (normalized.startsWith('account')) {
    return SETTINGS_ROUTE;
  }

  return path;
}
