import { db } from '@hominem/db';
import { artists } from '@hominem/db/schema/music';
import type { ArtistOutput } from '@hominem/db/types/music';
import { sql } from 'drizzle-orm';

export async function upsertArtists(records: ArtistOutput[]) {
  if (records.length === 0) {
    return [];
  }

  const result = await db
    .insert(artists)
    .values(records)
    .onConflictDoUpdate({
      target: artists.spotifyId,
      set: {
        name: sql`EXCLUDED.name`,
        genres: sql`EXCLUDED.genres`,
        spotifyUrl: sql`EXCLUDED.spotify_url`,
        spotifyFollowers: sql`EXCLUDED.spotify_followers`,
        spotifyData: sql`EXCLUDED.spotify_data`,
        imageUrl: sql`EXCLUDED.image_url`,
        updatedAt: new Date(),
      },
    })
    .returning();

  return result;
}
