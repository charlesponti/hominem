import type { Artist } from "../data/schema";
import { bulkSaveArtists } from "../data/services/artists.service";
import { waitForRateLimit } from "../rate-limit";
import { CACHE_TTL, redis } from "../redis";
import {
  type SpotifyArtist,
  getSpotifyArtistsByIds,
  getSpotifyPlaylistItems,
  getSpotifyPlaylists,
  getUniqueArtistIdsFromTracks,
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
    averageTicketPrice: 0,
    averagePerformanceAttendance: 0,

    // Merchandise
    sellsMerchandise: false,
    averageMerchandisePrice: 0,

    // Spotify
    spotifyId: artist.id,
    spotifyFollowers: artist.followers?.total || 0,
    spotifyUrl: artist.external_urls?.spotify || null,
    spotifyData: JSON.stringify(artist),
  };
}

export async function getGenreArtists(
  genres: string[],
  accessToken: string,
  { force = false } = {}
): Promise<SpotifyArtist[]> {
  const cacheKey = `genre-artists:${genres.sort().join("-")}`;
  const cached = (await redis.get(cacheKey)) as string | null;

  if (!force && cached) {
    const cachedArtists = JSON.parse(cached);
    return cachedArtists.map((artist: SpotifyArtist) =>
      convertSpotifyArtistToArtist(artist)
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
    accessToken
  );

  // Get tracks from playlists with rate limiting
  const tracks = [];
  for (const playlist of playlists) {
    await waitForRateLimit(tracksRateKey);
    const playlistTracks = await getSpotifyPlaylistItems(
      playlist.id,
      accessToken
    );
    tracks.push(...playlistTracks);
  }

  // Extract unique artist IDs
  const artistIds = getUniqueArtistIdsFromTracks(tracks);

  // Get artist details with rate limiting
  const artists: SpotifyArtist[] = [];
  const chunks = artistIds.reduce((acc, _, i) => {
    if (i % 50 === 0) acc.push(artistIds.slice(i, i + 50));
    return acc;
  }, [] as string[][]);

  for (const chunk of chunks) {
    await waitForRateLimit(artistsRateKey);
    const chunkArtists = await getSpotifyArtistsByIds(chunk, accessToken);
    artists.push(...chunkArtists);
  }

  // Cache results
  await redis.set(cacheKey, JSON.stringify(artists), {
    // Expires in 1 week
    exat: new Date().getTime() + CACHE_TTL,
  });

  await bulkSaveArtists(artists.map(convertSpotifyArtistToArtist));

  return artists;
}
