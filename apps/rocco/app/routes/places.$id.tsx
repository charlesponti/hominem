import { Globe, ListPlus, MapPin, Phone, Star } from 'lucide-react'
import { useCallback, useState } from 'react'
import AddPlaceToList from '~/components/places/AddPlaceToList'
import PlaceAddress from '~/components/places/PlaceAddress'
import PlaceMap from '~/components/places/PlaceMap'
import PlacePhotos from '~/components/places/PlacePhotos'
import PlaceTypes from '~/components/places/PlaceTypes'
import PlaceWebsite from '~/components/places/PlaceWebsite'
import SocialProofSection from '~/components/places/SocialProofSection'
import { Button } from '~/components/ui/button'
import { useToast } from '~/components/ui/use-toast'
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
  const { toast } = useToast()
  const { isOpen, open, close } = useSaveSheet()
  const [showMobileActions, setShowMobileActions] = useState(true)

  const { data: place } = trpc.places.getDetails.useQuery(
    { id: initialPlace.id },
    { initialData: initialPlace }
  )

  const lists = place.associatedLists || []

  const onAddToListSuccess = useCallback(() => {
    toast({
      title: `${place.name} added to list!`,
      variant: 'default',
    })
  }, [toast, place])

  const onSaveClick = useCallback(() => {
    open()
  }, [open])

  const handleGetDirections = () => {
    const url = place.googleMapsId
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.googleMapsId}`
      : `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <div
        data-testid="place-page"
        className="h-full overflow-y-auto pb-24 lg:pb-6"
        onScroll={(e) => {
          const target = e.currentTarget
          setShowMobileActions(target.scrollTop < 100)
        }}
      >
        {/* Hero Photo Gallery - Full Width */}
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
          <PlacePhotos alt={place.name} photos={place.photos} />
        </div>

        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
          {/* Header with Gradient */}
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight mb-3">
                  {place.name}
                </h1>
                <PlaceTypes types={place.types || []} />
              </div>

              {/* Desktop Save Button */}
              <Button
                onClick={onSaveClick}
                className="hidden lg:flex items-center gap-2 px-6 py-3 rounded-full bg-linear-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <ListPlus size={20} />
                Save to list
              </Button>
            </div>
          </div>

          {/* Two Column Layout: Info + Map */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            {/* Left Column - Minimal Info Rows */}
            <div className="space-y-2">
              {place.address && (
                <div className="flex items-start gap-3 py-2">
                  <MapPin size={18} className="text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <PlaceAddress
                      address={place.address}
                      name={place.name}
                      place_id={place.googleMapsId || ''}
                    />
                  </div>
                </div>
              )}

              {place.websiteUri && (
                <div className="flex items-start gap-3 py-2">
                  <Globe size={18} className="text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <PlaceWebsite website={place.websiteUri} />
                  </div>
                </div>
              )}

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

              {place.rating && (
                <div className="flex items-start gap-3 py-2">
                  <Star size={18} className="text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-gray-900">{place.rating}</span>
                      <span className="text-sm text-gray-500">/ 5</span>
                    </div>
                  </div>
                </div>
              )}
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
              <SocialProofSection lists={lists} placeName={place.name} />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Action Bar */}
      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${
          showMobileActions ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-linear-to-r from-indigo-600 to-purple-600 backdrop-blur-lg border-t border-white/20 px-4 py-3 shadow-2xl">
          <div className="flex gap-2 max-w-2xl mx-auto">
            <Button
              onClick={handleGetDirections}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold transition-all hover:scale-105 border border-white/30"
            >
              <MapPin size={18} />
              <span className="text-sm">Directions</span>
            </Button>
            <Button
              onClick={onSaveClick}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-indigo-600 font-semibold shadow-lg transition-all hover:scale-105"
            >
              <ListPlus size={18} />
              <span className="text-sm">Save to list</span>
            </Button>
          </div>
        </div>
      </div>

      <AddPlaceToList
        place={place}
        isOpen={isOpen}
        onOpenChange={close}
        onSuccess={onAddToListSuccess}
      />
    </>
  )
}
