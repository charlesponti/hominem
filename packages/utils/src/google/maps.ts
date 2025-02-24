interface GetLatLngParams {
  address: string
  key: string
}
type GetLatLngReturn = { lat: number; lng: number } | null
export async function getLatLng({ address, key }: GetLatLngParams): Promise<GetLatLngReturn> {
  try {
    const mapsQueryParams = new URLSearchParams({
      address,
      key,
    })
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${mapsQueryParams.toString()}`
    )
    const geoData = await response.json()

    if (geoData.results?.[0]?.geometry?.location) {
      const { lat, lng } = geoData.results[0].geometry.location
      return { lat, lng }
    }

    throw new Error('No lat/lng found in geo data')
  } catch (error) {
    console.error('Error fetching city lat/lng:', error)
    return null
  }
}
