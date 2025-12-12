import { MoreVertical } from 'lucide-react'
import React, { type PropsWithChildren } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@hominem/ui/components/ui/dropdown-menu'
import { useModal } from '~/hooks/useModal'
import type { List } from '~/lib/types'
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
  const { setIsEditSheetOpen } = useListMenu()

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
        </DropdownMenuContent>
      </DropdownMenu>
      <ListEditSheet list={list} />
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
