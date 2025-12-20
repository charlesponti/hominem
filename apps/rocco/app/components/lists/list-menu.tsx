import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@hominem/ui/components/ui/dropdown-menu.js'
import { MoreVertical, Trash2 } from 'lucide-react'
import React, { type PropsWithChildren } from 'react'
import { useModal } from '~/hooks/useModal'
import type { List } from '~/lib/types'
import ListDeleteDialog from './list-delete-dialog'
import ListEditSheet from './list-edit-sheet'

const ListMenuContext = React.createContext<{
  isEditSheetOpen: boolean
  setIsEditSheetOpen: (value: boolean) => void
  isDeleteSheetOpen: boolean
  setIsDeleteSheetOpen: (value: boolean) => void
}>({
  isEditSheetOpen: false,
  setIsEditSheetOpen: () => {},
  isDeleteSheetOpen: false,
  setIsDeleteSheetOpen: () => {},
})

const ListMenuProvider = ({ children }: PropsWithChildren) => {
  const editModal = useModal()
  const deleteModal = useModal()

  return (
    <ListMenuContext.Provider
      value={{
        isEditSheetOpen: editModal.isOpen,
        setIsEditSheetOpen: (value: boolean) => (value ? editModal.open() : editModal.close()),
        isDeleteSheetOpen: deleteModal.isOpen,
        setIsDeleteSheetOpen: (value: boolean) =>
          value ? deleteModal.open() : deleteModal.close(),
      }}
    >
      {children}
    </ListMenuContext.Provider>
  )
}

export function useListMenu() {
  return React.useContext(ListMenuContext)
}

type ListMenuProps = {
  list: List
  isOwnList: boolean
}
export function ListMenu({ list, isOwnList }: ListMenuProps) {
  const { setIsEditSheetOpen, isDeleteSheetOpen, setIsDeleteSheetOpen } = useListMenu()

  if (!isOwnList) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger data-testid="list-dropdownmenu-trigger">
          <MoreVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem className="p-2" onClick={() => setIsEditSheetOpen(true)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="p-2 text-destructive focus:text-destructive"
            onClick={() => setIsDeleteSheetOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ListEditSheet list={list} />
      <ListDeleteDialog
        listId={list.id}
        listName={list.name}
        isOpen={isDeleteSheetOpen}
        onOpenChange={setIsDeleteSheetOpen}
      />
    </>
  )
}

export default function ListMenuWithProvider(props: ListMenuProps) {
  return (
    <ListMenuProvider>
      <ListMenu {...props} />
    </ListMenuProvider>
  )
}
