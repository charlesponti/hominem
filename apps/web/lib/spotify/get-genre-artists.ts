import { db } from "@ponti/utils/db";
import { redis, waitForRateLimit } from "@ponti/utils/redis";
import { artists, type Artist } from "@ponti/utils/schema";
import { sql } from "drizzle-orm";
import {
	getSpotifyArtistsByIds,
	getSpotifyPlaylistItems,
	getSpotifyPlaylists,
	getUniqueArtistIdsFromTracks,
	type SpotifyArtist,
	type SpotifyPlaylistItem,
} from "./utils";

export function convertSpotifyArtistToArtist(artist: SpotifyArtist): Artist {
	return {
		id: crypto.randomUUID(),
		name: artist.name,
		hometown: "",
		bandMembers: 1,
		genres: artist.genres,
		imageUrl: artist.images?.[0]?.url || null,

		// Tickets
		averageTicketPrice: "0",
		averagePerformanceAttendance: 0,

		// Merchandise
		sellsMerchandise: false,
		averageMerchandisePrice: "0",

		// Spotify
		spotifyId: artist.id,
		spotifyFollowers: artist.followers?.total || 0,
		spotifyUrl: artist.external_urls?.spotify || null,
		spotifyData: JSON.stringify(artist),
		slug: "",
		country: null,
		websiteUrl: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

export async function getGenreArtists(
	genres: string[],
	accessToken: string,
	{ force = false } = {},
): Promise<SpotifyArtist[]> {
	const cacheKey = `genre-artists:${genres.sort().join("-")}`;
	const cached = (await redis.get(cacheKey)) as string | null;

	if (!force && cached) {
		const cachedArtists = JSON.parse(cached);
		return cachedArtists.map((artist: SpotifyArtist) =>
			convertSpotifyArtistToArtist(artist),
		);
	}

	// Rate limit keys
	const playlistsRateKey = "rate-limit:spotify:playlists";
	const tracksRateKey = "rate-limit:spotify:tracks";
	const artistsRateKey = "rate-limit:spotify:artists";

	// Get playlists with rate limiting
	await waitForRateLimit(playlistsRateKey);
	const playlists = await getSpotifyPlaylists(
		{
			q: genres.join("+"),
		},
		accessToken,
	);

	// Get tracks from playlists with rate limiting
	const tracks: SpotifyPlaylistItem[] = [];
	for (const playlist of playlists) {
		await waitForRateLimit(tracksRateKey);
		const playlistTracks = await getSpotifyPlaylistItems(
			playlist.id,
			accessToken,
		);
		tracks.push(...playlistTracks);
	}

	// Extract unique artist IDs
	const artistIds = getUniqueArtistIdsFromTracks(tracks);

	// Get artist details with rate limiting
	const values: SpotifyArtist[] = [];
	const chunks = artistIds.reduce((acc, _, i) => {
		if (i % 50 === 0) acc.push(artistIds.slice(i, i + 50));
		return acc;
	}, [] as string[][]);

	for (const chunk of chunks) {
		await waitForRateLimit(artistsRateKey);
		const chunkArtists = await getSpotifyArtistsByIds(chunk, accessToken);
		values.push(...chunkArtists);
	}

	// Cache results
	await redis.set(cacheKey, JSON.stringify(artists));

	await db
		.insert(artists)
		.values(values.map(convertSpotifyArtistToArtist))
		.onConflictDoUpdate({
			target: artists.spotifyId,
			set: {
				name: sql`EXCLUDED.name`,
				genres: sql`EXCLUDED.genres`,
				spotifyUrl: sql`EXCLUDED.spotify_url`,
			},
		})
		.returning();

	return values;
}
