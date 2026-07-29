import type { User } from '@ponti-studios/auth/types';
import { createMMKV } from 'react-native-mmkv';

import type { Media, Settings } from '../../validation/schemas';

type UserProfile = User;

const storage = createMMKV({ id: 'local-store' });

const KEYS = {
  media: 'media',
  settings: 'settings',
  userProfile: 'user-profile',
} as const;

const toISO = (value: string | Date | null | undefined) =>
  value instanceof Date ? value.toISOString() : (value ?? new Date().toISOString());

function parseJSON<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    storage.remove(key);
    return null;
  }
}

function writeJSON<T>(key: string, value: T) {
  storage.set(key, JSON.stringify(value));
}

const normalizeProfile = (profile: UserProfile): UserProfile => ({
  ...profile,
  name: profile.name ?? '',
  email: profile.email ?? '',
  emailVerified: Boolean(profile.emailVerified),
  image: profile.image ?? null,
  createdAt: new Date(profile.createdAt).toISOString(),
  updatedAt: new Date(profile.updatedAt).toISOString(),
});

const normalizeSettings = (settings: Settings): Settings => ({
  id: settings.id,
  theme: settings.theme ?? null,
  preferencesJson: settings.preferencesJson ?? null,
});

const normalizeMedia = (media: Media): Media => ({
  id: media.id,
  type: media.type,
  localURL: media.localURL,
  createdAt: toISO(media.createdAt),
});

export const createMMKVStore = async () => {
  return {
    initialize: async () => true,
    getUserProfile: async () => {
      const profile = parseJSON<UserProfile>(KEYS.userProfile);
      return profile ? normalizeProfile(profile) : null;
    },
    upsertUserProfile: async (profile: UserProfile) => {
      const nextProfile = normalizeProfile(profile);
      writeJSON(KEYS.userProfile, {
        ...nextProfile,
        createdAt: toISO(nextProfile.createdAt),
        updatedAt: toISO(nextProfile.updatedAt),
      });
      return nextProfile;
    },
    upsertSettings: async (nextSettings: Settings) => {
      const settings = normalizeSettings(nextSettings);
      writeJSON(KEYS.settings, settings);
      return settings;
    },
    getSettings: async () => {
      const settings = parseJSON<Settings>(KEYS.settings);
      return settings ? normalizeSettings(settings) : null;
    },
    upsertMedia: async (media: Media) => {
      const nextMedia = normalizeMedia(media);
      const mediaItems = parseJSON<Media[]>(KEYS.media) ?? [];
      writeJSON(KEYS.media, [
        nextMedia,
        ...mediaItems.filter((item) => item.id !== nextMedia.id).map(normalizeMedia),
      ]);
      return nextMedia;
    },
    listMedia: async () => {
      const mediaItems = parseJSON<Media[]>(KEYS.media) ?? [];
      return mediaItems.map(normalizeMedia).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    clearAllData: async () => {
      storage.remove(KEYS.userProfile);
      storage.remove(KEYS.settings);
      storage.remove(KEYS.media);
      return true;
    },
  };
};
