import * as StoreReview from 'expo-store-review';

import { storage } from './storage';

const ACTIVE_DAYS_KEY = 'review_active_days';
const PROMPTED_KEY = 'review_prompted';
const THRESHOLD = 7;

function todayKey() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

export async function recordActiveDay() {
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
