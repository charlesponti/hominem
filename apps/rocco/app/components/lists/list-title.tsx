import { Button } from '@hominem/ui/button'
import { useToast } from '@hominem/ui/components/ui/use-toast'
import { Input } from '@hominem/ui/input'
import { Check, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFetcher } from 'react-router'

interface ListTitleFormProps {
  listId: string
  currentName: string
  onSuccess?: () => void
  onCancel: () => void
}

export default function ListTitleForm({
  currentName,
  onSuccess,
  onCancel,
}: Omit<ListTitleFormProps, 'listId'>) {
  const [editedName, setEditedName] = useState(currentName)
  const { toast } = useToast()
  const fetcher = useFetcher()

  const isPending = fetcher.state !== 'idle'

  // Sync editedName when currentName changes
  useEffect(() => {
    setEditedName(currentName)
  }, [currentName])

  // Handle fetcher success/error
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if (fetcher.data.success) {
        toast({
          title: 'Success',
          description: 'List name updated successfully.',
        })
        onSuccess?.()
      } else if (fetcher.data.error) {
        toast({
          title: 'Error',
          description: fetcher.data.error || 'Failed to update list name.',
          variant: 'destructive',
        })
      }
    }
  }, [fetcher.state, fetcher.data, toast, onSuccess])

  const handleSave = () => {
    if (!editedName.trim()) {
      toast({
        title: 'Error',
        description: 'List name cannot be empty.',
        variant: 'destructive',
      })
      return
    }

    if (editedName.trim() === currentName) {
      onCancel()
      return
    }

    fetcher.submit({ intent: 'update-name', name: editedName.trim() }, { method: 'post' })
  }

  const handleCancel = () => {
    setEditedName(currentName)
    onCancel()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  return (
    <div className="flex items-center gap-2 w-full max-w-xl">
      <Input
        value={editedName}
        onChange={(e) => setEditedName(e.target.value)}
        onKeyDown={handleKeyDown}
        className="text-2xl md:text-3xl lg:text-4xl font-bold h-auto py-2 px-3 font-serif italic tracking-tighter"
        autoFocus
      />
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleSave}
          disabled={isPending}
          className="h-10 w-10 text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          <Check size={20} />
          <span className="sr-only">Save</span>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleCancel}
          disabled={isPending}
          className="h-10 w-10 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <X size={20} />
          <span className="sr-only">Cancel</span>
        </Button>
      </div>
    </div>
  )
}
