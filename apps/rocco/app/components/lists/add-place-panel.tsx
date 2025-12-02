import { createPlaceFromPrediction } from '~/components/map-layout/utils'
import PlacesAutocomplete from '~/components/places/places-autocomplete'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
import { useToast } from '~/components/ui/use-toast'
import type { GooglePlacePrediction } from '~/hooks/useGooglePlacesAutocomplete'
import { useAddPlaceToList } from '~/lib/places'

interface AddPlacePanelProps {
  isOpen: boolean
  onClose: () => void
  listId: string
  listName: string
}

export default function AddPlacePanel({ isOpen, onClose, listId, listName }: AddPlacePanelProps) {
  const { toast } = useToast()

  const addPlaceToList = useAddPlaceToList({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Place added to your list!',
      })
      onClose()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add place to list.',
        variant: 'destructive',
      })
    },
  })

  const handlePlaceSelect = async (prediction: GooglePlacePrediction) => {
    try {
      const place = await createPlaceFromPrediction(prediction)
      addPlaceToList.mutate({
        listIds: [listId],
        place,
      })
    } catch (error) {
      console.error('Failed to process place selection:', error)
      toast({
        title: 'Error',
        description: 'Failed to process place selection.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[400px] md:w-[500px] sm:max-w-none">
        <SheetHeader>
          <SheetTitle>Add Place</SheetTitle>
          <SheetDescription className="flex items-center gap-1.5">
            <span>to</span>
            <span className="font-medium text-indigo-700 truncate">{listName}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4">
          <PlacesAutocomplete setSelected={handlePlaceSelect} />

          {addPlaceToList.isPending ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              <span className="ml-3 text-sm text-gray-600">Adding place...</span>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
