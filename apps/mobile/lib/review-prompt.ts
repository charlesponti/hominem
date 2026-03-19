import * as StoreReview from 'expo-store-review';
import { storage } from './storage';

const SIGNAL_COUNT_KEY = 'review_signal_count';
const PROMPTED_KEY = 'review_prompted';
const THRESHOLD = 5;

export async function recordPositiveSignal() {
  const alreadyPrompted = storage.getBoolean(PROMPTED_KEY) ?? false;
  if (alreadyPrompted) return;

  const isAvailable = await StoreReview.isAvailableAsync();
  if (!isAvailable) return;

  const count = (storage.getNumber(SIGNAL_COUNT_KEY) ?? 0) + 1;
  storage.set(SIGNAL_COUNT_KEY, count);

  if (count >= THRESHOLD) {
    storage.set(PROMPTED_KEY, true);
    await StoreReview.requestReview();
  }
}
