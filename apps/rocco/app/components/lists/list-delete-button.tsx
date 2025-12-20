import { Trash } from 'lucide-react'
import { useDeleteList } from '~/lib/lists'

const ListDeleteButton = ({ listId, onDelete }: { listId: string; onDelete: () => void }) => {
  const { mutateAsync } = useDeleteList({
    onSuccess: () => {
      onDelete()
    },
  })

  const onDeleteClick = async (e: React.MouseEvent) => {
    if (e.button !== 0) {
      return
    }

    await mutateAsync({ id: listId })
  }

  const onDeleteKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      await mutateAsync({ id: listId })
    }
  }

  return (
    <button
      type="button"
      data-testid="delete-list-button"
      className="flex items-center px-4 rounded-md hover:cursor-pointer hover:bg-red-50 focus:bg-red-50 transition-colors"
      onClick={onDeleteClick}
      onKeyDown={onDeleteKeyDown}
    >
      <Trash width={24} height={24} className="text-red-500" />
    </button>
  )
}

export default ListDeleteButton
