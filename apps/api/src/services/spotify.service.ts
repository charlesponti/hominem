import crypto from 'node:crypto'
import { db } from '@hominem/data'
import { artists } from '@hominem/data/schema'
import { redis, waitForRateLimit } from '@hominem/utils/redis'
import type { Artist } from '@hominem/data/schema'
import axios from 'axios'
import { sql } from 'drizzle-orm'

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env
const authToken = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')

export async function getSpotifyAccessToken(): Promise<string | null> {
  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${authToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    return response.data.access_token
  } catch (err: unknown) {
    console.error('Could not retrieve Spotify token', err)
    return null
  }
}

interface ExternalUrls {
  spotify: string
}

interface Image {
  height: number | null
  url: string
  width: number | null
}

interface Followers {
  href: string | null
  total: number
}

export interface SpotifyArtist {
  external_urls?: ExternalUrls
  followers: Followers
  genres: string[]
  href: string
  id: string
  images?: Image[]
  name: string
  popularity: number
  type: string
  uri: string
}

interface SpotifyArtistSimplified {
  external_urls: ExternalUrls
  href: string
  id: string
  name: string
  type: string
  uri: string
}

export type SpotifyPlaylist = {
  collaborative: boolean
  description: string
  external_urls: ExternalUrls
  href: string
  id: string
  images: Image[]
  name: string
  owner: {
    display_name: string
    external_urls: ExternalUrls
    href: string
    id: string
    type: string
    uri: string
  }
  primary_color: string | null
  public: boolean
  snapshot_id: string
  tracks: {
    href: string
    total: number
  }
  type: string
  uri: string
}

export type SpotifyPlaylistItem = {
  added_at: string
  added_by: {
    external_urls: ExternalUrls
    followers: Followers
    href: string
    id: string
    type: string
    uri: string
  }
  is_local: boolean
  track: SpotifyTrack
}

export type SpotifyTrack = {
  album: {
    album_type: string
    total_tracks: number
    available_markets: string[]
    external_urls: ExternalUrls
    href: string
    id: string
    images: Image[]
    name: string
    release_date: string
    release_date_precision: string
    restrictions: {
      reason: string
    }
    type: string
    uri: string
    artists: SpotifyArtistSimplified[]
  }
  artists: SpotifyArtistSimplified[]
  available_markets: string[]
  disc_number: number
  duration_ms: number
  explicit: boolean
  external_ids: {
    isrc: string
    ean: string
    upc: string
  }
  external_urls: ExternalUrls
  href: string
  id: string
  is_playable: boolean
  linked_from: Record<string, never>
  restrictions: {
    reason: string
  }
  name: string
  popularity: number
  preview_url: string
  track_number: number
  type: string
  uri: string
  is_local: boolean
}

export type SearchSpotifyPlaylistResponse = {
  playlists: {
    href: string
    limit: number
    next: string | null
    offset: number
    previous: string | null
    total: number
    items: SpotifyPlaylist[]
  }
}

export async function getSpotifyPlaylists({ q }: { q: string }, accessToken: string) {
  const playlistSearchParams = new URLSearchParams({
    q,
    type: 'playlist',
    limit: '5',
  })
  const playlistResponse = await fetch(
    `https://api.spotify.com/v1/search?q=${playlistSearchParams.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  const { playlists } = (await playlistResponse.json()) as SearchSpotifyPlaylistResponse

  return playlists.items.filter((playlist: SpotifyPlaylist) => !!playlist) as SpotifyPlaylist[]
}

type SpotifyPlaylistItemsResponse = {
  items: (SpotifyPlaylistItem | null)[]
}
export async function getSpotifyPlaylistItems(
  playlistId: string,
  accessToken: string
): Promise<SpotifyPlaylistItem[]> {
  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const { items } = (await response.json()) as SpotifyPlaylistItemsResponse

  return items.filter((item) => !!item) as SpotifyPlaylistItem[]
}

export function getUniqueArtistIdsFromTracks(playlistItems: SpotifyPlaylistItem[]) {
  const artistIds = new Set<string>()

  for (const playlistItem of playlistItems) {
    const artists = playlistItem?.track?.artists
    if (artists) {
      for (const artist of artists) {
        artistIds.add(artist.id)
      }
    }
  }

  return Array.from(artistIds)
}

export async function getSpotifyArtistsByIds(artistIds: string[], accessToken: string) {
  const chunks: string[][] = []
  for (let i = 0; i < artistIds.length; i += 50) {
    chunks.push(artistIds.slice(i, i + 50))
  }

  const artistsPromises = chunks.map(async (chunk) => {
    const response = await fetch(`https://api.spotify.com/v1/artists?ids=${chunk.join(',')}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = (await response.json()) as { artists: SpotifyArtist[] }
    return data.artists
  })

  const artistChunks = await Promise.all(artistsPromises)
  return artistChunks.flat()
}

export async function updateSpotifyData({ genres }: { genres: string[] }) {
  const accessToken = await getSpotifyAccessToken()
  if (!accessToken) {
    throw new Error('Could not generate Spotify access token.')
  }

  const genreArtists = await getGenreArtists(genres, accessToken)
  return genreArtists
}

export function convertSpotifyArtistToArtist(artist: SpotifyArtist): Artist {
  return {
    id: crypto.randomUUID(),
    name: artist.name,
    hometown: '',
    bandMembers: 1,
    genres: artist.genres,
    imageUrl: artist.images?.[0]?.url || null,

    // Tickets
    averageTicketPrice: '0',
    averagePerformanceAttendance: 0,

    // Merchandise
    sellsMerchandise: false,
    averageMerchandisePrice: '0',

    // Spotify
    spotifyId: artist.id,
    spotifyFollowers: artist.followers?.total || 0,
    spotifyUrl: artist.external_urls?.spotify || null,
    spotifyData: JSON.stringify(artist),
    slug: '',
    country: null,
    websiteUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export async function getGenreArtists(
  genres: string[],
  accessToken: string,
  { force = false } = {}
): Promise<SpotifyArtist[]> {
  const cacheKey = `genre-artists:${genres.sort().join('-')}`
  const cached = (await redis.get(cacheKey)) as string | null

  if (!force && cached) {
    const cachedArtists = JSON.parse(cached) as SpotifyArtist[]
    // return cachedArtists.map((artist: SpotifyArtist) => convertSpotifyArtistToArtist(artist))
    return cachedArtists
  }

  // Rate limit keys
  const playlistsRateKey = 'rate-limit:spotify:playlists'
  const tracksRateKey = 'rate-limit:spotify:tracks'
  const artistsRateKey = 'rate-limit:spotify:artists'

  // Get playlists with rate limiting
  await waitForRateLimit(playlistsRateKey)
  const playlists = await getSpotifyPlaylists(
    {
      q: genres.join('+'),
    },
    accessToken
  )

  // Get tracks from playlists with rate limiting
  const tracks: SpotifyPlaylistItem[] = []
  for (const playlist of playlists) {
    await waitForRateLimit(tracksRateKey)
    const playlistTracks = await getSpotifyPlaylistItems(playlist.id, accessToken)
    tracks.push(...playlistTracks)
  }

  // Extract unique artist IDs
  const artistIds = getUniqueArtistIdsFromTracks(tracks)

  // Get artist details with rate limiting
  const values: SpotifyArtist[] = []
  const chunks = artistIds.reduce((acc, _, i) => {
    if (i % 50 === 0) acc.push(artistIds.slice(i, i + 50))
    return acc
  }, [] as string[][])

  for (const chunk of chunks) {
    await waitForRateLimit(artistsRateKey)
    const chunkArtists = await getSpotifyArtistsByIds(chunk, accessToken)
    values.push(...chunkArtists)
  }

  // Cache results
  await redis.set(cacheKey, JSON.stringify(artists))

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
    .returning()

  return values
}
