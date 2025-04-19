import { MoreVertical } from 'lucide-react'
import { type MouseEvent, useState } from 'react'
import { generatePath, useNavigate } from 'react-router-dom'

import PlaceTypes from 'src/components/places/PlaceTypes'
import { Button } from 'src/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'src/components/ui/dropdown-menu'
import { Sheet, SheetContent } from 'src/components/ui/sheet'
import { useRemoveListItem } from 'src/lib/api/places'
import { PLACE } from 'src/lib/routes'
import type { ListPlace } from 'src/lib/types'

const ListItem = ({
  listId,
  place,
  onError,
  onDelete,
}: {
  listId: string
  onError: () => void
  onDelete: () => void
  place: ListPlace
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const navigate = useNavigate()
  const { mutateAsync } = useRemoveListItem({
    onSuccess: onDelete,
    onError,
  })
  const onPlaceNameClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    navigator.vibrate?.(10)
    navigate(generatePath(PLACE, { id: place.googleMapsId }))
  }

  const onDeleteMenuItemClick = async (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    setIsDeleteModalOpen(true)
  }

  const onDeleteClick = async (e: MouseEvent<HTMLButtonElement>) => {
    await mutateAsync({ listId, placeId: place.googleMapsId })
    setIsDeleteModalOpen(false)
  }

  return (
    <>
      <button
        type="button"
        data-testid="place-item"
        className="flex card rounded-lg w-full h-fit"
        onClick={onPlaceNameClick}
      >
        <div className="rounded-lg p-[2px] border border-slate-200 w-full h-[200px]">
          <img
            src={place.imageUrl}
            alt={place.name}
            className="rounded-[5px] object-cover w-full h-full"
          />
        </div>
        <div className="flex w-full max-w-full pt-2">
          <div className="flex flex-col flex-1 pl-1 h-full justify-between text-wrap break-words">
            <p className="mb-1 font-semibold text-start underline-offset-4 focus-visible:underline focus-visible:outline-none">
              {place.name}
            </p>
            <PlaceTypes limit={1} types={place.types} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
              data-testid="place-dropdownmenu-trigger"
              className="h-fit mt-0.5"
            >
              <MoreVertical size={20} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem data-testid="place-delete-button" onClick={onDeleteMenuItemClick}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </button>
      <Sheet open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <SheetContent data-testid="place-delete-modal">
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold">Delete place</h2>
            <p className="text-md">Are you sure you want to delete this place from your list?</p>
            <div className="mt-4 flex gap-4 justify-end">
              <Button
                type="button"
                data-testid="place-delete-confirm-button"
                onClick={onDeleteClick}
                className="bg-black"
              >
                Delete
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export default ListItem
