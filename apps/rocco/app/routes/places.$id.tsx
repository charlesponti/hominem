import { ListPlus, Phone } from 'lucide-react'
import { useCallback } from 'react'
import AddPlaceToList from '~/components/places/AddPlaceToList'
import PlaceAddress from '~/components/places/PlaceAddress'
import PlaceMap from '~/components/places/PlaceMap'
import PlacePhotos from '~/components/places/PlacePhotos'
import PlaceRating from '~/components/places/PlaceRating'
import PlaceTypes from '~/components/places/PlaceTypes'
import PlaceWebsite from '~/components/places/PlaceWebsite'
import SocialProofSection from '~/components/places/SocialProofSection'
import { Button } from '~/components/ui/button'
import { useSaveSheet } from '~/hooks/useSaveSheet'
import { trpc } from '~/lib/trpc/client'
import { createCaller } from '~/lib/trpc/server'
import type { Route } from './+types/places.$id'

export async function loader({ params, request }: Route.LoaderArgs) {
  const { id } = params
  if (!id) {
    throw new Error('Place ID is required')
  }

  const trpcServer = createCaller(request)

  const data = await trpcServer.places.getDetails({ id })

  if (!data) {
    throw new Error('Place not found')
  }

  return { place: data }
}

export default function PlacePage({ loaderData }: Route.ComponentProps) {
  const { place: initialPlace } = loaderData
  const { isOpen, open, close } = useSaveSheet()

  const { data: place } = trpc.places.getDetails.useQuery(
    { id: initialPlace.id },
    { initialData: initialPlace }
  )

  const lists = place.associatedLists || []

  const onSaveClick = useCallback(() => {
    open()
  }, [open])

  return (
    <>
      <div data-testid="place-page" className="h-full max-w-full flex flex-col items-start gap-4">
        {/* Hero Photo Gallery - Full Width */}
        <div className="max-w-full animate-in fade-in slide-in-from-bottom-2 duration-700">
          <PlacePhotos alt={place.name} photos={place.photos} />
        </div>

        <div className="w-full space-y-6">
          <div className="flex flex-col animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold leading-tight">{place.name}</h1>
              <Button
                onClick={onSaveClick}
                className="flex items-center gap-2 px-4 py-2 sm:py-3 rounded bg-linear-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <ListPlus size={20} />
                <span>Save</span>
              </Button>
            </div>
            <PlaceTypes types={place.types || []} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="space-y-2">
              {place.address && (
                <PlaceAddress
                  address={place.address}
                  name={place.name}
                  place_id={place.googleMapsId || ''}
                />
              )}

              {place.websiteUri && <PlaceWebsite website={place.websiteUri} />}

              {place.phoneNumber && (
                <div className="flex items-start gap-3 py-2">
                  <Phone size={18} className="text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <a
                      href={`tel:${place.phoneNumber}`}
                      className="text-gray-700 hover:text-indigo-600 font-medium transition-colors"
                    >
                      {place.phoneNumber}
                    </a>
                  </div>
                </div>
              )}

              {place.rating && <PlaceRating rating={place.rating} />}
            </div>

            {/* Right Column - Map */}
            {place.latitude !== null && place.longitude !== null && (
              <div className="animate-in fade-in slide-in-from-right duration-700 delay-300">
                <PlaceMap
                  latitude={place.latitude}
                  longitude={place.longitude}
                  name={place.name}
                  googleMapsId={place.googleMapsId || undefined}
                />
              </div>
            )}
          </div>

          {/* Social Proof Section */}
          {lists.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 delay-400">
              <SocialProofSection lists={lists} />
            </div>
          )}
        </div>
      </div>

      <AddPlaceToList place={place} isOpen={isOpen} onOpenChange={close} />
    </>
  )
}
