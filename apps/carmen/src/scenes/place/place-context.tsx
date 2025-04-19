import { type PropsWithChildren, createContext, useCallback, useContext, useState } from 'react'
import type { Place } from 'src/lib/types'

const PlaceContext = createContext<{
  place: Place | null
  setPlace: (place: Place) => void
  isSaveSheetOpen: boolean
  openSaveSheet: () => void
  closeSaveSheet: () => void
  setIsSaveSheetOpen: (isOpen: boolean) => void
}>({
  place: null,
  setPlace: () => {},
  isSaveSheetOpen: false,
  openSaveSheet: () => {},
  closeSaveSheet: () => {},
  setIsSaveSheetOpen: () => {},
})

export const usePlaceContext = () => useContext(PlaceContext)

export const PlaceProvider = ({ children }: PropsWithChildren) => {
  const [place, setPlace] = useState<Place | null>(null)
  const [isSaveSheetOpen, setIsSaveSheetOpen] = useState(false)

  const openSaveSheet = useCallback(() => setIsSaveSheetOpen(true), [])
  const closeSaveSheet = useCallback(() => setIsSaveSheetOpen(false), [])

  return (
    <PlaceContext.Provider
      value={{
        place,
        setPlace,
        isSaveSheetOpen,
        setIsSaveSheetOpen,
        openSaveSheet,
        closeSaveSheet,
      }}
    >
      {children}
    </PlaceContext.Provider>
  )
}
