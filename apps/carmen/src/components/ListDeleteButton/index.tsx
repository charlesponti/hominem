import { useMutation } from '@tanstack/react-query'
import { Trash } from 'lucide-react'

import api from 'src/lib/api'
import { baseURL } from 'src/lib/api/base'

const ListDeleteButton = ({
  listId,
  onDelete,
}: {
  listId: string
  onDelete: () => void
}) => {
  const { mutateAsync } = useMutation({
    mutationKey: ['deleteList', listId],
    mutationFn: async () => {
      await api.delete(`${baseURL}/lists/${listId}`)
    },
    onSuccess: () => {
      onDelete()
    },
  })

  const onDeleteClick = async (e: React.MouseEvent) => {
    if (e.button !== 0) {
      return
    }

    await mutateAsync()
  }

  const onDeleteKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      await mutateAsync()
    }
  }

  return (
    <button
      type="button"
      data-testid="delete-list-button"
      className="flex items-center px-4 rounded-md hover:cursor-pointer hover:bg-neutral-content hover:bg-opacity-10 focus:bg-neutral-content focus:bg-opacity-10 transition-colors"
      onClick={onDeleteClick}
      onKeyDown={onDeleteKeyDown}
    >
      <Trash width={24} height={24} className="text-red-500" />
    </button>
  )
}

export default ListDeleteButton
