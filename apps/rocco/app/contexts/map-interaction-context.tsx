import { createContext, type ReactNode, useContext, useMemo, useState } from 'react'

interface MapInteractionContextType {
  hoveredPlaceId: string | null
  setHoveredPlaceId: (id: string | null) => void
}

const MapInteractionContext = createContext<MapInteractionContextType | undefined>(undefined)

export function MapInteractionProvider({ children }: { children: ReactNode }) {
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null)

  const value = useMemo(() => ({ hoveredPlaceId, setHoveredPlaceId }), [hoveredPlaceId])

  return <MapInteractionContext.Provider value={value}>{children}</MapInteractionContext.Provider>
}

export function useMapInteraction() {
  const context = useContext(MapInteractionContext)
  if (context === undefined) {
    throw new Error('useMapInteraction must be used within a MapInteractionProvider')
  }
  return context
}
