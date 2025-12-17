import { useCallback, useState } from 'react'
import { useLoaderData, useNavigate } from 'react-router'
import Lists from '~/components/lists/lists'
import PlacesAutocomplete from '~/components/places/places-autocomplete'
import PlacesNearby from '~/components/places/places-nearby'
import type { GooglePlacePrediction } from '~/hooks/useGooglePlacesAutocomplete'
import { getAuthState } from '~/lib/services/auth-loader.service'
import type { Route } from './+types'
import AboutPage from './about'

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { isAuthenticated } = await getAuthState(request)
  return { isAuthenticated }
}

export default function Index() {
  const { isAuthenticated } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const [, setSelectedPlace] = useState<GooglePlacePrediction | null>(null)

  const handlePlaceSelected = useCallback(
    (place: GooglePlacePrediction) => {
      setSelectedPlace(place)
      // Navigate to the place page
      navigate(`/places/${place.place_id}`)
    },
    [navigate]
  )

  if (!isAuthenticated) {
    return <AboutPage />
  }

  return (
    <div className="flex flex-col gap-8 min-w-full max-w-6xl mx-auto pb-8" data-testid="home-scene">
      <PlacesAutocomplete setSelected={handlePlaceSelected} />

      <PlacesNearby />

      <Lists />
    </div>
  )
}
