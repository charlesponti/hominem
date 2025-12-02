import { Check, Pencil, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useToast } from '~/components/ui/use-toast'
import { trpc } from '~/lib/trpc/client'

interface ListTitleProps {
  list: {
    id: string
    name: string
  }
  isOwner: boolean
}

export default function ListTitle({ list, isOwner }: ListTitleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(list.name)
  const { toast } = useToast()
  const utils = trpc.useUtils()

  const updateList = trpc.lists.update.useMutation({
    onSuccess: () => {
      setIsEditing(false)
      utils.lists.getById.invalidate({ id: list.id })
      toast({
        title: 'Success',
        description: 'List name updated successfully.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update list name.',
        variant: 'destructive',
      })
    },
  })

  const handleSave = async () => {
    if (!editedName.trim()) {
      toast({
        title: 'Error',
        description: 'List name cannot be empty.',
        variant: 'destructive',
      })
      return
    }

    if (editedName.trim() === list.name) {
      setIsEditing(false)
      return
    }

    updateList.mutate({
      id: list.id,
      name: editedName.trim(),
    })
  }

  const handleCancel = () => {
    setEditedName(list.name)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 w-full max-w-xl">
        <Input
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-2xl md:text-3xl lg:text-4xl font-bold h-auto py-2 px-3"
          autoFocus
        />
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSave}
            disabled={updateList.isPending}
            className="h-10 w-10 text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <Check size={20} />
            <span className="sr-only">Save</span>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleCancel}
            disabled={updateList.isPending}
            className="h-10 w-10 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <X size={20} />
            <span className="sr-only">Cancel</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 group">
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 wrap-break-word">
        {list.name}
      </h1>
      {isOwner && (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            setEditedName(list.name)
            setIsEditing(true)
          }}
          className="h-8 w-8 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-indigo-600 hover:bg-indigo-50 mt-1"
        >
          <Pencil size={16} />
          <span className="sr-only">Edit name</span>
        </Button>
      )}
    </div>
  )
}
