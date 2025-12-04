import { MapPin, Star } from 'lucide-react'
import { Link } from 'react-router'
import { env } from '~/lib/env'
import { trpc } from '~/lib/trpc/client'
import Loading from '../loading'

type Props = {
  latitude: number
  longitude: number
  radiusKm?: number
  limit?: number
}

const getImageUrl = (photoUrl: string, width = 400, height = 300): string => {
  if (photoUrl.includes('places/') && photoUrl.includes('/photos/')) {
    return `https://places.googleapis.com/v1/${photoUrl}/media?key=${env.VITE_GOOGLE_API_KEY}&maxWidthPx=${width}&maxHeightPx=${height}`
  }

  if (photoUrl.includes('googleusercontent')) {
    return `${photoUrl}=w${width}-h${height}-c`
  }
  return photoUrl
}

const formatDistance = (distanceInMeters: number): string => {
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)}m`
  }
  return `${(distanceInMeters / 1000).toFixed(1)}km`
}

export default function NearbyPlaces({ latitude, longitude, radiusKm = 5, limit = 4 }: Props) {
  const {
    data: places = [],
    isLoading,
    error,
  } = trpc.places.getNearbyFromLists.useQuery({
    latitude,
    longitude,
    radiusKm,
    limit,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Nearby Places</h2>
        <div className="flex items-center justify-center h-40">
          <Loading size="lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Nearby Places</h2>
        <div className="text-center py-8">
          <p className="text-red-600">Error loading nearby places: {error.message}</p>
        </div>
      </div>
    )
  }

  if (places.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Nearby Places</h2>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <MapPin className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600">
            No places from your lists found within {radiusKm}km of this location
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Nearby Places</h2>
        <span className="text-sm text-gray-500">Within {radiusKm}km</span>
      </div>

      <ul className="list-none divide-y divide-gray-200 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {places.map((place) => {
          const photoUrl = place.photos?.[0]
          const imageUrl = photoUrl ? getImageUrl(photoUrl) : null
          return (
            <li key={place.id}>
              <Link
                to={`/places/${place.id}`}
                className="flex items-center gap-4 p-3 group hover:bg-gray-50 transition-colors"
              >
                {/* Image */}
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={place.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Star className="text-indigo-400" size={28} />
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 truncate text-base">{place.name}</h3>
                    <div className="flex items-center text-sm text-indigo-600">
                      <MapPin size={14} className="mr-1" />
                      <span>{formatDistance(place.distance)}</span>
                    </div>
                  </div>
                  {/* Lists */}
                  {place.lists.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-gray-500">
                        {place.lists.length === 1
                          ? place.lists[0].name
                          : `${place.lists.length} lists`}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
