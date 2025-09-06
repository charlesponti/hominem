import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle, ExternalLink, ListPlus, PlusCircle } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useRouteLoaderData } from 'react-router'
import ListForm from '~/components/lists-components/list-form'
import PlacePhotos from '~/components/places/PlacePhotos'
import { Button } from '~/components/ui/button'
import { Sheet, SheetContent, SheetHeader } from '~/components/ui/sheet'
import { useToast } from '~/components/ui/use-toast'
import { useAddPlaceToList, useRemoveListItem } from '~/lib/places'
import { trpc } from '~/lib/trpc/client'
import type { GooglePlaceData, Place } from '~/lib/types'

interface PlaceDrawerProps {
  place: Place | GooglePlaceData | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  setSelected?: (place: Place | GooglePlaceData | null) => void
}

type NewList = Omit<
  {
    id: string
    name: string
    createdAt: string
    updatedAt: string
  },
  'isInList'
>

/**
 * Drawer component to display place details and list options
 */
const PlaceDrawer = ({ place, isOpen, onOpenChange, setSelected }: PlaceDrawerProps) => {
  const { toast } = useToast()
  const [showCreateListForm, setShowCreateListForm] = useState(false)
  const queryClient = useQueryClient()
  const { isAuthenticated } = useRouteLoaderData('routes/layout') as {
    isAuthenticated: boolean
  }

  // Fetch list options including isInList
  const googleMapsId = place && 'googleMapsId' in place ? (place.googleMapsId ?? '') : ''
  const { data: listOptions = [] } = trpc.lists.getListOptions.useQuery(
    { googleMapsId },
    { enabled: !!googleMapsId }
  )

  // Remove or add mutation hooks
  const { mutate: removeFromList } = useRemoveListItem({
    onSuccess: (_, { listId }) => {
      const listName = listOptions.find((l) => l.id === listId)?.name || 'list'
      toast({
        title: `${place?.name} removed from "${listName}"!`,
        variant: 'destructive',
      })
    },
  })
  const { mutate: addToListMutation } = useAddPlaceToList({
    onSuccess: (_, { listIds }) => {
      const listName = listOptions.find((l) => l.id === listIds[0])?.name || 'list'
      if (place) {
        toast({
          title: `${place.name} added to "${listName}"!`,
          variant: 'default',
        })
      }
    },
  })

  // Mutation to save preview place to database
  const savePreviewPlace = trpc.places.getOrCreateByGoogleMapsId.useMutation({
    onSuccess: (savedPlace) => {
      toast({
        title: `${place?.name} saved to your places!`,
        variant: 'default',
      })
      // Update the place in state to reflect it's now saved
      if (place && setSelected) {
        setSelected({ ...place, isPreview: false, id: savedPlace.id })
      }
    },
    onError: (error) => {
      toast({
        title: 'Failed to save place',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Handler to wrap add mutation
  const handleSaveToList = useCallback(
    (listId: string) => {
      if (!place) return
      // Convert GooglePlaceData to Place if needed
      const placeToSave =
        'userId' in place
          ? { ...place, photos: place.photos || [] }
          : ({
              ...place,
              userId: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              itemId: null,
              location: [place.longitude, place.latitude],
              isPublic: false,
              photos: place.photos || [],
            } as Place)
      addToListMutation({ listIds: [listId], place: placeToSave })
    },
    [addToListMutation, place]
  )

  const handleCreateListClick = () => setShowCreateListForm(true)
  const handleCancelCreateList = () => setShowCreateListForm(false)

  const handleListCreated = useCallback(
    (newList: NewList) => {
      setShowCreateListForm(false)
      queryClient.setQueryData(['lists.getAll'], (old: NewList[] | undefined) => {
        if (!old) return [newList]
        if (old.some((l: NewList) => l.id === newList.id)) return old
        return [newList, ...old]
      })
      if (place) handleSaveToList(newList.id)
    },
    [queryClient, handleSaveToList, place]
  )

  const handleSavePreviewPlace = useCallback(() => {
    if (!place || !place.googleMapsId) return
    savePreviewPlace.mutate({ googleMapsId: place.googleMapsId })
  }, [place, savePreviewPlace])

  if (!place) return null

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="bg-white border-l border-gray-200 text-gray-900 backdrop-blur-md">
        <div className="mb-2">
          <PlacePhotos alt={place.name} photos={place.photos} />
        </div>
        <SheetHeader className="flex flex-col gap-2 px-2">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{place.name}</h2>
            <p className="text-gray-600 text-sm">{place.address}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              target="_blank"
              to={`https://maps.google.com/?q=${place.name}`}
              className="flex items-center gap-1 text-primary text-sm"
            >
              <ExternalLink size={14} /> Open in Maps
            </Link>
            {'isPreview' in place && place.isPreview && (
              <Button
                onClick={handleSavePreviewPlace}
                disabled={savePreviewPlace.isPending}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {savePreviewPlace.isPending ? 'Saving...' : 'Save Place'}
              </Button>
            )}
          </div>
        </SheetHeader>
        <div className="flex flex-col gap-2 px-2">
          {listOptions.length === 0 ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-gray-600">You don't have any lists yet.</p>
              <Button
                onClick={handleCreateListClick}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <PlusCircle size={16} /> Create your first list
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {listOptions.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={`w-full flex items-center justify-between p-3 rounded-md transition-colors text-gray-900 ${
                    l.isInList ? 'bg-green-100 hover:bg-green-200' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  onClick={() => {
                    if (l.isInList && place && 'id' in place) {
                      removeFromList({ listId: l.id, placeId: place.id })
                    } else {
                      handleSaveToList(l.id)
                    }
                  }}
                >
                  <span>{l.name}</span>
                  {l.isInList ? (
                    <CheckCircle size={18} className="text-green-600" />
                  ) : (
                    <ListPlus size={16} className="text-indigo-600" />
                  )}
                </button>
              ))}
            </div>
          )}
          {showCreateListForm && (
            <ListForm
              isAuthenticated={isAuthenticated}
              onRequireAuth={() => toast({ title: 'Please sign in to create a list' })}
              onCancel={handleCancelCreateList}
              onCreate={handleListCreated}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default PlaceDrawer
