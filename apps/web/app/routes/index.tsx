import { useCallback, useState } from 'react';
import { data, useNavigate } from 'react-router';
import ErrorBoundary from '~/components/ErrorBoundary';
import Lists from '~/components/lists/lists';
import PlacesAutocomplete from '~/components/places/places-autocomplete';
import PlacesNearby from '~/components/places/places-nearby';
import type { GooglePlacePrediction } from '~/hooks/useGooglePlacesAutocomplete';
import { getAuthState } from '~/lib/auth.server';
import type { Route } from './+types/index';
import AboutPage from './about';

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { isAuthenticated, headers } = await getAuthState(request);
  return data({ isAuthenticated }, { headers });
};

export default function Index({ loaderData }: Route.ComponentProps) {
  const { isAuthenticated } = loaderData;
  const navigate = useNavigate();
  const [, setSelectedPlace] = useState<GooglePlacePrediction | null>(null);

  const handlePlaceSelected = useCallback(
    (place: GooglePlacePrediction) => {
      setSelectedPlace(place);
      // Navigate to the place page
      navigate(`/places/${place.place_id}`);
    },
    [navigate],
  );

  if (!isAuthenticated) {
    return <AboutPage />;
  }

  return (
    <div className="flex flex-col gap-8 min-w-full max-w-6xl mx-auto pb-8" data-testid="home-scene">
      <PlacesAutocomplete setSelected={handlePlaceSelected} />

      <PlacesNearby />

      <Lists />
    </div>
  );
}

export { ErrorBoundary };
