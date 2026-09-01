import { storage } from '~/services/storage/mmkv';

const TEST_MODE_KEY = '__e2e_test_mode__';

export const MOCK_AI_RESPONSE = `Chloë Sevigny surprised fans when she confirmed that she is expecting her first child with boyfriend Sinisa Mackovic.

But the father is somewhat of a mystery to many.

Unlike 45-year-old Sevigny, Mackovic, 33, is not a Hollywood actor. Instead, he is part of the art world and serves as the director of Karma Art Gallery in New York City. He has held that position since 2011, according to his LinkedIn.`;

export function isTestMode(): boolean {
  try {
    return storage.getBoolean(TEST_MODE_KEY) === true;
  } catch {
    return false;
  }
}

export function enableTestMode(): void {
  try {
    storage.set(TEST_MODE_KEY, true);
  } catch {
    // MMKV unavailable — no-op
  }
}

// Markers a Maestro flow embeds in the sent message text to steer the
// test-mode mock stream in use-send-message.ts. These never affect real
// production messages since they're only ever recognized when isTestMode()
// is true.
export const MAESTRO_TRIGGERS = {
  slowStream: '__MAESTRO_SLOW_STREAM__',
  longResponse: '__MAESTRO_LONG_RESPONSE__',
  failOnce: '__MAESTRO_FAIL_ONCE__',
} as const;

// Per-message attempt counts for __MAESTRO_FAIL_ONCE__. Keyed by the exact
// message string (not one shared flag) so unrelated flows each get their
// own one-time failure regardless of run order -- an app relaunch via
// `launchApp` isn't guaranteed to be a fresh JS process (Fast Refresh/Metro
// can carry module state across it), so a single shared counter would let
// an earlier flow's use silently defeat a later one.
const failOnceAttempts = new Map<string, number>();

// mobileQueryDefaultOptions (services/query-client-config.ts) sets
// `mutations: { retry: 1 }`, so react-query silently retries a failed
// mutation once on its own before ever calling onError. Failing just the
// first attempt would get absorbed by that internal retry and never reach
// the UI's failed-banner path -- so fail both the original attempt and
// react-query's automatic retry; only the user's own manual "Tap to retry"
// (the 3rd occurrence of this exact message) succeeds.
const ATTEMPTS_TO_FAIL = 2;

export function shouldFailOnce(message: string): boolean {
  if (!message.includes(MAESTRO_TRIGGERS.failOnce)) return false;
  const attempts = (failOnceAttempts.get(message) ?? 0) + 1;
  failOnceAttempts.set(message, attempts);
  return attempts <= ATTEMPTS_TO_FAIL;
}
