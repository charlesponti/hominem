import { Loading } from '@hominem/ui/loading'
import { lazy, Suspense } from 'react'

const PlaceMapLazy = lazy(() => import('./place-map').then((m) => ({ default: m.PlaceMap })))

const MapPlaceholder = () => (
  <div className="flex flex-1 relative overflow-hidden size-full border border-border h-[300px]">
    <div className="flex items-center justify-center max-w-[300px] mx-auto min-h-full">
      <Loading size="xl" />
    </div>
  </div>
)

interface PlaceMapLazyProps {
  latitude: number
  longitude: number
  name: string
  googleMapsId?: string
  googleApiKey?: string
}

export function LazyPlaceMap(props: PlaceMapLazyProps) {
  return (
    <Suspense fallback={<MapPlaceholder />}>
      <PlaceMapLazy {...props} />
    </Suspense>
  )
}
