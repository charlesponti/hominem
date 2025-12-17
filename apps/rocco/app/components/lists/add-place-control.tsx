import { Button } from '@hominem/ui/button'
import { PlusCircle, XCircle } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import Loading from '~/components/loading'
import PlacesAutocomplete from '~/components/places/places-autocomplete'
import type { GooglePlacePrediction } from '~/hooks/useGooglePlacesAutocomplete'
import { createPlaceFromPrediction, useAddPlaceToList } from '~/lib/places'

interface AddPlaceControlProps {
  listId: string
  canAdd?: boolean
  children?: (controls: { isOpen: boolean; open: () => void; close: () => void }) => ReactNode
}

type AddStatus = 'idle' | 'selecting' | 'submitting' | 'success'

export default function AddPlaceControl({ listId, canAdd = true, children }: AddPlaceControlProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<AddStatus>('idle')
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearSuccessTimer = () => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current)
      successTimerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current)
      }
    }
  }, [])

  const addPlaceToList = useAddPlaceToList({
    onSuccess: () => {
      clearSuccessTimer()
      setStatus('success')

      successTimerRef.current = setTimeout(() => {
        setStatus('idle')
        setIsOpen(false)
      }, 2000)
    },
    onError: () => setStatus('selecting'),
  })

  const open = () => {
    if (!canAdd) return
    clearSuccessTimer()
    setIsOpen(true)
    setStatus('selecting')
  }

  const close = () => {
    clearSuccessTimer()
    setIsOpen(false)
    setStatus('idle')
  }

  const handlePlaceSelect = async (prediction: GooglePlacePrediction) => {
    setStatus('submitting')
    try {
      const place = await createPlaceFromPrediction(prediction)
      addPlaceToList.mutate({
        listIds: [listId],
        place,
      })
    } catch (error) {
      console.error('Failed to process place selection:', error)
      setStatus('selecting')
    }
  }

  const isOverlayVisible = status === 'submitting' || status === 'success'
  const showAutocomplete = isOpen

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {showAutocomplete ? (
          <div className="relative w-full sm:max-w-md">
            <div
              className={`transition-opacity duration-200 ${
                isOverlayVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              <PlacesAutocomplete setSelected={handlePlaceSelect} />
            </div>

            {status === 'submitting' ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                <Loading size="sm" />
                <span className="mt-2 text-sm text-gray-600">Adding place...</span>
              </div>
            ) : null}

            {status === 'success' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded-lg">
                <span className="text-sm font-semibold text-green-700">Added!</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-1 justify-end">
          <Button
            type="button"
            data-testid="add-to-list-button"
            onClick={isOpen ? close : open}
            disabled={!canAdd || status === 'submitting'}
            className="flex items-center gap-2 disabled:bg-indigo-200"
          >
            {!isOpen ? (
              <>
                <PlusCircle size={18} />
                <span>Add</span>
              </>
            ) : (
              <XCircle size={18} />
            )}
          </Button>
        </div>
      </div>

      {children ? children({ isOpen, open, close }) : null}
    </div>
  )
}
