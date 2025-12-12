import { MapPin } from 'lucide-react'
import { trpc } from '~/lib/trpc/client'
import Loading from '../loading'
import PlaceRow from './place-row'
import { href } from 'react-router'

type Props = {
  latitude: number
  longitude: number
  radiusKm?: number
  limit?: number
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

  const title = <h2 className="text-2xl tracking-tight font-light text-gray-900">Nearby</h2>
  if (isLoading) {
    return (
      <div className="space-y-4">
        {title}
        <div className="flex items-center justify-center h-40">
          <Loading size="lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        {title}
        <div className="text-center py-8">
          <p className="text-red-600">Error loading nearby places: {error.message}</p>
        </div>
      </div>
    )
  }

  if (places.length === 0) {
    return (
      <div className="space-y-4">
        {title}
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
        {title}
        {/* <span className="text-sm font-light font-serif text-gray-500">Within {radiusKm}km</span> */}
      </div>

      <ul className="list-none divide-y divide-gray-100 bg-white/30 rounded-xl shadow-sm border border-white/20 overflow-hidden">
        {places.map((place) => {
          return (
            <li key={place.id}>
              <PlaceRow
                name={place.name}
                href={href('/places/:id', { id: place.id })}
                photoUrl={place.photos?.[0] ?? null}
                imageUrl={place.imageUrl}
                meta={
                  <div className="flex items-center text-sm text-gray-400">
                    <MapPin size={14} className="mr-1" />
                    <span>{formatDistance(place.distance)}</span>
                  </div>
                }
                subtitle={
                  place.lists.length > 0
                    ? place.lists.length === 1
                      ? place.lists[0]!.name
                      : `${place.lists.length} lists`
                    : null
                }
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
