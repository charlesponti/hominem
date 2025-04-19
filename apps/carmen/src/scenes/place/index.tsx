import Alert from '@hominem/components/Alert'
import { LoadingScreen } from '@hominem/components/Loading'
import type { AxiosError } from 'axios'
import { ListPlus, Loader } from 'lucide-react'
import { useCallback } from 'react'
import { generatePath, useParams } from 'react-router-dom'
import { Button } from 'src/components/ui/button'

import AddPlaceToList from 'src/components/places/AddPlaceToList'
import PlaceAddress from 'src/components/places/PlaceAddress'
import PlacePhotos from 'src/components/places/PlacePhotos'
import PlaceTypes from 'src/components/places/PlaceTypes'
import PlaceWebsite from 'src/components/places/PlaceWebsite'
import { useGetPlace } from 'src/lib/api/places'
import { LIST } from 'src/lib/routes'
import { useToast } from 'src/lib/toast/hooks'
import { withAuth } from 'src/lib/utils'
import { PlaceProvider, usePlaceContext } from './place-context'

function PlaceError({ error }: { error: AxiosError }) {
  if (!error || !error.response) {
    return 'An error occurred while fetching the place. Please try again later.'
  }

  if (error.response.status === 404) {
    return 'Place not found.'
  }

  if (error.response?.status === 403) {
    return 'You do not have permission to view this place.'
  }

  if (error.response?.status === 500) {
    return 'An error occurred while fetching the place. Please try again later.'
  }

  return error.message
}

function PlaceRoute() {
  const { openToast } = useToast()
  const { openSaveSheet, isSaveSheetOpen } = usePlaceContext()
  const params = useParams<{ id: string }>()

  // Handle case when ID is not provided
  const placeId = params.id
  const enabled = !!placeId

  // Pass the ID only if it's defined
  const { data: place, error, isLoading } = useGetPlace(placeId as string)

  const onAddToListSuccess = useCallback(() => {
    if (place) {
      openToast({
        type: 'success',
        text: `${place.name} added to list!`,
      })
    }
  }, [openToast, place])

  const onSaveClick = useCallback(() => {
    openSaveSheet()
  }, [openSaveSheet])

  // Handle case when ID is not provided (needs to be after hooks)
  if (!placeId) {
    return <Alert type="error">Place ID is missing. Please check the URL.</Alert>
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <Alert type="error">
        <PlaceError error={error} />
      </Alert>
    )
  }

  // Handle case when place data is undefined but no loading or error state
  if (!place) {
    return <Alert type="error">Unable to load place details. Please try again later.</Alert>
  }

  return (
    <div className="mt-3 w-full">
      <PlacePhotos alt={place.name} photos={place.photos} />
      <div className="rounded-box bg-slate-100 mt-4 px-4 py-6">
        <div className="mb-4">
          <p className="font-bold text-xl mb-2">{place.name}</p>
          <PlaceTypes types={place.types} />
        </div>
        {place.address && (
          <div className="flex mt-2">
            <PlaceAddress address={place.address} name={place.name} place_id={place.googleMapsId} />
          </div>
        )}
        {place.websiteUri && (
          <div className="flex mt-2">
            <PlaceWebsite website={place.websiteUri} />
          </div>
        )}
        {place.lists && place.lists.length > 0 && (
          <div className="gap-2 mt-4">
            <p className="font-bold text-sm">Saved your lists:</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {place.lists.map((list) => (
                <a
                  className="rounded-lg px-2 py-1 border border-blue-500 text-blue-500 text-sm hover:bg-blue-500 hover:text-white transition-colors duration-200 ease-in-out"
                  key={list.id}
                  href={generatePath(LIST, { id: list.id })}
                >
                  {list.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="modal-action">
        <Button className="flex gap-2" onClick={onSaveClick} disabled={isLoading}>
          {isLoading ? <Loader className="animate-spin" size={16} /> : <ListPlus size={16} />}
          Save to list
        </Button>
      </div>
      {isSaveSheetOpen && <AddPlaceToList place={place} onSuccess={onAddToListSuccess} />}
    </div>
  )
}

export const Component = withAuth(() => {
  return (
    <PlaceProvider>
      <PlaceRoute />
    </PlaceProvider>
  )
})
