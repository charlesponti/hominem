import type { User } from '@hominem/auth';
import { z } from 'zod';

import { SettingsSchema, MediaSchema } from '../validation/schemas';
import type { Media, Settings } from '../validation/schemas';
import { createSQLiteStore } from './sqlite';

let store: Awaited<ReturnType<typeof createSQLiteStore>> | null = null;
let initializationPromise: Promise<boolean> | null = null;

async function getStore() {
  if (store) return store;

  if (!initializationPromise) {
    initializationPromise = initializeStore();
  }

  await initializationPromise;
  return store!;
}

async function initializeStore(): Promise<boolean> {
  if (store) return true;

  store = await createSQLiteStore();
  return true;
}

const normalizeNull = <T>(value: T | null): T | null => {
  if (
    value &&
    typeof value === 'object' &&
    'constructor' in value &&
    typeof value.constructor === 'function' &&
    value.constructor.name === 'NSNull'
  ) {
    return null;
  }
  return value;
};

function validateOrNull<T>(schema: z.ZodType<T>, data: unknown): T | null {
  try {
    return schema.parse(data);
  } catch (error) {
    console.warn('[LocalStore] Validation failed:', error);
    return null;
  }
}

function validateOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

export const LocalStore = {
  initialize: async (): Promise<boolean> => {
    return initializeStore();
  },

  getUserProfile: async (): Promise<User | null> => {
    const s = await getStore();
    return s.getUserProfile();
  },

  upsertUserProfile: async (profile: User): Promise<User> => {
    const s = await getStore();
    return s.upsertUserProfile(profile);
  },

  upsertSettings: async (settings: Settings): Promise<Settings> => {
    const s = await getStore();
    const result = await s.upsertSettings(settings);
    return validateOrThrow(SettingsSchema, result);
  },

  getSettings: async (): Promise<Settings | null> => {
    const s = await getStore();
    const result = normalizeNull<Settings>(await s.getSettings());
    return result ? validateOrNull(SettingsSchema, result) : null;
  },

  upsertMedia: async (media: Media): Promise<Media> => {
    const s = await getStore();
    const result = await s.upsertMedia(media);
    return validateOrThrow(MediaSchema, result);
  },

  listMedia: async (): Promise<Media[]> => {
    const s = await getStore();
    const results = await s.listMedia();
    return results
      .map((media) => validateOrNull(MediaSchema, media))
      .filter((media): media is NonNullable<typeof media> => media !== null) as Media[];
  },

  clearAllData: async (): Promise<boolean> => {
    const s = await getStore();
    return s.clearAllData();
  },
};
