/**
 * +native-intent.ts
 *
 * Rewrites incoming deep links before Expo Router processes them.
 * Called for every incoming URL on native (iOS/Android).
 *
 * Supported deep link patterns:
 *   hakumi://verify?token=<otp>        → /(auth)/verify?token=<otp>
 *   hakumi://chat?seed=<text>          → /(protected)/(tabs)/chat?seed=<text>
 *   hakumi://focus                     → /(protected)/(tabs)/focus
 *   hakumi://focus/<id>                → /(protected)/(tabs)/focus/<id>
 *   hakumi://account                   → /(protected)/(tabs)/account
 *   hakumi://note/add                  → /(protected)/(tabs)/focus?action=new
 */

const ALLOWED_ROUTES = new Set(['verify', 'chat', 'focus', 'account', 'note']);

export function redirectSystemPath({
  path,
  initial: _initial,
}: {
  path: string;
  initial: boolean;
}): string {
  // Strip leading slash for matching
  const normalized = path.startsWith('/') ? path.slice(1) : path;

  // Block path traversal attempts
  if (normalized.includes('..') || normalized.includes('//')) {
    return '/';
  }

  // Extract root segment (before first / or ?)
  const rootSegment = normalized.split(/[/?]/)[0];

  // Reject unknown routes that could be malicious
  if (rootSegment && !ALLOWED_ROUTES.has(rootSegment)) {
    return '/';
  }

  // App Intent / Siri: note/add → focus tab with new-note action
  if (normalized === 'note/add') {
    return '/(protected)/(tabs)/focus?action=new';
  }

  // OTP verification link: verify?token=xxx → /(auth)/verify?token=xxx
  if (normalized.startsWith('verify')) {
    return `/(auth)/${normalized}`;
  }

  // Chat intent
  if (normalized.startsWith('chat')) {
    return `/(protected)/(tabs)/${normalized}`;
  }

  // Focus screen or focus item
  if (normalized.startsWith('focus')) {
    return `/(protected)/(tabs)/${normalized}`;
  }

  // Account screen
  if (normalized.startsWith('account')) {
    return `/(protected)/(tabs)/account`;
  }
  return path;
}
