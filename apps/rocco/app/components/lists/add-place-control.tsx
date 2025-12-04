import { PlusCircle, XCircle } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import PlacesAutocomplete from '~/components/places/places-autocomplete'
import Loading from '~/components/loading'
import { Button } from '~/components/ui/button'
import { useToast } from '~/components/ui/use-toast'
import { createPlaceFromPrediction, useAddPlaceToList } from '~/lib/places'
import type { GooglePlacePrediction } from '~/hooks/useGooglePlacesAutocomplete'

interface AddPlaceControlProps {
  listId: string
  listName: string
  canAdd?: boolean
  children?: (controls: { isOpen: boolean; open: () => void; close: () => void }) => ReactNode
}

type AddStatus = 'idle' | 'selecting' | 'submitting' | 'success'

export default function AddPlaceControl({
  listId,
  listName,
  canAdd = true,
  children,
}: AddPlaceControlProps) {
  const { toast } = useToast()
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
      toast({
        title: 'Added!',
        description: `Place added to ${listName}.`,
      })

      successTimerRef.current = setTimeout(() => {
        setStatus('idle')
        setIsOpen(false)
      }, 2000)
    },
    onError: (error) => {
      setStatus('selecting')
      toast({
        title: 'Error',
        description: error.message || 'Failed to add place to list.',
        variant: 'destructive',
      })
    },
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
      toast({
        title: 'Error',
        description: 'Failed to process place selection.',
        variant: 'destructive',
      })
    }
  }

  const isOverlayVisible = status === 'submitting' || status === 'success'
  const showAutocomplete = isOpen

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-end">
        <div className="flex justify-end">
          <Button
            type="button"
            data-testid="add-to-list-button"
            onClick={isOpen ? close : open}
            disabled={!canAdd || status === 'submitting'}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-700 disabled:bg-indigo-200 text-white rounded-md transition-colors"
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
      </div>

      {children ? children({ isOpen, open, close }) : null}
    </div>
  )
}
