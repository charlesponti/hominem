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
