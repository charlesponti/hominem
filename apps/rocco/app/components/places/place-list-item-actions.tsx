import { Button } from '@hominem/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@hominem/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@hominem/ui/dropdown'
import { ExternalLink, MoreVertical, Trash } from 'lucide-react'
import { type MouseEvent, useCallback, useMemo } from 'react'
import { useModal } from '~/hooks/useModal'
import { useRemoveListItem } from '~/lib/places'

interface PlaceListItemActionsProps {
  placeName: string
  placeId: string
  listId: string
  onRemove?: () => void
  onError?: () => void
}

const PlaceListItemActions = ({
  placeName,
  placeId,
  listId,
  onRemove,
  onError,
}: PlaceListItemActionsProps) => {
  const { isOpen: isDeleteModalOpen, open: openDeleteModal, close: closeDeleteModal } = useModal()
  const { mutate: removeListItem } = useRemoveListItem({
    onSuccess: () => {
      closeDeleteModal()
      onRemove?.()
    },
    onError: () => {
      onError?.()
    },
  })

  const onDeleteClick = useCallback(() => {
    removeListItem({ listId, placeId })
  }, [listId, placeId, removeListItem])

  const handleDropdownButtonClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleOpenMaps = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(placeName)}`, '_blank')
    },
    [placeName]
  )

  const handleOpenDeleteModal = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      openDeleteModal()
    },
    [openDeleteModal]
  )

  const dropdown = useMemo(
    () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" onClick={handleDropdownButtonClick} aria-label="More options">
            <MoreVertical size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-white border border-border text-gray-900 shadow-lg">
          <DropdownMenuItem onClick={handleOpenMaps} className="flex items-center gap-2 py-2">
            <ExternalLink size={16} className="text-indigo-600 focus:text-white" />
            Open in Maps
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleOpenDeleteModal}
            className="text-red-600 hover:underline underline-offset-4 hover:bg-red-50 py-2"
          >
            <Trash size={16} className="text-red-600" />
            Remove from list
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    [handleDropdownButtonClick, handleOpenMaps, handleOpenDeleteModal]
  )

  return (
    <>
      {dropdown}
      <Dialog
        open={isDeleteModalOpen}
        onOpenChange={(open) => (open ? openDeleteModal() : closeDeleteModal())}
      >
        <DialogContent
          data-testid="place-delete-modal"
          className="sm:max-w-lg"
          aria-label="Delete place confirmation"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>Delete place</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">{placeName}</span> from your list?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              data-testid="place-delete-confirm-button"
              onClick={onDeleteClick}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default PlaceListItemActions
