import * as SQLite from 'expo-sqlite';

import type { Media, Settings, UserProfile } from './types';

type QueryResult = {
  rows: Array<Record<string, unknown>>;
};

const DB_NAME = 'msc_cloud_store.db';

const toISO = (value: string | null | undefined) => value ?? new Date().toISOString();

const normalizeProfile = (row: Record<string, unknown>): UserProfile => ({
  id: String(row.id),
  name: typeof row.name === 'string' ? row.name : null,
  email: typeof row.email === 'string' ? row.email : null,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

const normalizeSettings = (row: Record<string, unknown>): Settings => ({
  id: String(row.id),
  theme: typeof row.theme === 'string' ? row.theme : null,
  preferencesJson: typeof row.preferences_json === 'string' ? row.preferences_json : null,
});

const normalizeMedia = (row: Record<string, unknown>): Media => ({
  id: String(row.id),
  type: String(row.type),
  localURL: String(row.local_url),
  createdAt: String(row.created_at),
});

const execute = async (
  db: SQLite.SQLiteDatabase,
  sql: string,
  args: Array<string | number | null> = [],
) => {
  await db.runAsync(sql, args);
};

const getAll = async (
  db: SQLite.SQLiteDatabase,
  sql: string,
  args: Array<string | number | null> = [],
) => {
  const result = await db.getAllAsync<QueryResult>(sql, args);
  return result;
};

const getFirst = async (
  db: SQLite.SQLiteDatabase,
  sql: string,
  args: Array<string | number | null> = [],
) => {
  const rows = await getAll(db, sql, args);
  return rows[0] ?? null;
};

export const createSQLiteStore = async () => {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  await execute(
    db,
    'CREATE TABLE IF NOT EXISTS user_profile (id TEXT PRIMARY KEY, name TEXT, email TEXT, created_at TEXT, updated_at TEXT)',
  );
  await execute(
    db,
    'CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, theme TEXT, preferences_json TEXT)',
  );
  await execute(
    db,
    'CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, type TEXT, local_url TEXT, created_at TEXT)',
  );

  return {
    initialize: async () => true,
    getUserProfile: async () => {
      const row = await getFirst(db, 'SELECT * FROM user_profile LIMIT 1');
      return row ? normalizeProfile(row) : null;
    },
    upsertUserProfile: async (profile: UserProfile) => {
      const createdAt = toISO(profile.createdAt);
      const updatedAt = toISO(profile.updatedAt);
      await execute(
        db,
        'INSERT INTO user_profile (id, name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, email=excluded.email, created_at=excluded.created_at, updated_at=excluded.updated_at',
        [profile.id, profile.name ?? null, profile.email ?? null, createdAt, updatedAt],
      );
      return { ...profile, createdAt, updatedAt };
    },
    upsertSettings: async (nextSettings: Settings) => {
      await execute(
        db,
        'INSERT OR REPLACE INTO settings (id, theme, preferences_json) VALUES (?, ?, ?)',
        [nextSettings.id, nextSettings.theme ?? null, nextSettings.preferencesJson ?? null],
      );
      return nextSettings;
    },
    getSettings: async () => {
      const row = await getFirst(db, 'SELECT * FROM settings LIMIT 1');
      return row ? normalizeSettings(row) : null;
    },
    upsertMedia: async (media: Media) => {
      const createdAt = toISO(media.createdAt);
      await execute(
        db,
        'INSERT OR REPLACE INTO media (id, type, local_url, created_at) VALUES (?, ?, ?, ?)',
        [media.id, media.type, media.localURL, createdAt],
      );
      return { ...media, createdAt };
    },
    listMedia: async () => {
      const rows = await getAll(db, 'SELECT * FROM media ORDER BY created_at DESC');
      return rows.map(normalizeMedia);
    },
    clearAllData: async () => {
      await execute(db, 'DELETE FROM user_profile');
      await execute(db, 'DELETE FROM settings');
      await execute(db, 'DELETE FROM media');
      return true;
    },
  };
};

export const migrateInMemoryToSQLite = async (
  store: Awaited<ReturnType<typeof createSQLiteStore>>,
  snapshot: {
    userProfile: UserProfile | null;
    settings: Settings | null;
    mediaItems: Media[];
  },
) => {
  if (snapshot.userProfile) {
    await store.upsertUserProfile(snapshot.userProfile);
  }
  if (snapshot.settings) {
    await store.upsertSettings(snapshot.settings);
  }
  for (const item of snapshot.mediaItems) {
    await store.upsertMedia(item);
  }
};
