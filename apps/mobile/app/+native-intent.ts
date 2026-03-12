/**
 * +native-intent.ts
 *
 * Rewrites incoming deep links before Expo Router processes them.
 * Called for every incoming URL on native (iOS/Android).
 *
 * Supported deep link patterns:
 *   hakumi://verify?token=<otp>        → /(auth)/verify?token=<otp>
 *   hakumi://sherpa?seed=<text>        → /(protected)/(tabs)/sherpa?seed=<text>
 *   hakumi://focus                     → /(protected)/(tabs)/focus
 *   hakumi://focus/<id>                → /(protected)/(tabs)/focus/<id>
 *   hakumi://account                   → /(protected)/(tabs)/account
 */
export function redirectSystemPath({
  path,
  initial: _initial,
}: {
  path: string;
  initial: boolean;
}): string {
  // Strip leading slash for matching
  const normalized = path.startsWith('/') ? path.slice(1) : path;

  // OTP verification link: verify?token=xxx → /(auth)/verify?token=xxx
  if (normalized.startsWith('verify')) {
    return `/(auth)/${normalized}`;
  }

  // Sherpa / chat intent
  if (normalized.startsWith('sherpa')) {
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
