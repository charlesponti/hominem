export const GOOGLE_PLACES_BASE_URL = 'https://places.googleapis.com/v1'

export function isValidGoogleHost(input: string): boolean {
  try {
    const parsed = new URL(input)
    const hostname = parsed.hostname.toLowerCase()
    const allowedBaseDomains = ['googleapis.com', 'googleusercontent.com']

    return allowedBaseDomains.some((base) => {
      return hostname === base || hostname.endsWith(`.${base}`)
    })
  } catch {
    return false
  }
}

export const buildPhotoMediaUrl = ({
  key,
  pathname,
  maxWidthPx = 600,
  maxHeightPx = 400,
}: {
  key: string
  pathname: URL['pathname']
  maxWidthPx?: number
  maxHeightPx?: number
}) => {
  const url = new URL(`${GOOGLE_PLACES_BASE_URL}/${pathname}/media`)
  url.searchParams.set('maxWidthPx', String(maxWidthPx))
  url.searchParams.set('maxHeightPx', String(maxHeightPx))
  url.searchParams.set('key', key)
  return url.toString()
}
