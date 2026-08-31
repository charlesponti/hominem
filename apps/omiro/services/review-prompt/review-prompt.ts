// Tracks active days and asks for a store review via Expo's StoreReview API
// once the user hits the threshold.
import * as StoreReview from 'expo-store-review';

import { E2E_TESTING } from '~/constants';

import { storage } from '../storage/mmkv';

const ACTIVE_DAYS_KEY = 'review_active_days';
const PROMPTED_KEY = 'review_prompted';
const THRESHOLD = 7;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function recordActiveDay() {
  if (E2E_TESTING) return;

  const alreadyPrompted = storage.getBoolean(PROMPTED_KEY) ?? false;
  if (alreadyPrompted) return;

  const isAvailable = await StoreReview.isAvailableAsync();
  if (!isAvailable) return;

  const raw = storage.getString(ACTIVE_DAYS_KEY) ?? '[]';
  const days: string[] = JSON.parse(raw);
  const today = todayKey();

  if (!days.includes(today)) {
    days.push(today);
    storage.set(ACTIVE_DAYS_KEY, JSON.stringify(days));
  }

  if (days.length >= THRESHOLD) {
    storage.set(PROMPTED_KEY, true);
    await StoreReview.requestReview();
  }
}
