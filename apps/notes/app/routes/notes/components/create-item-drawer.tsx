import type { Content, ContentType, TaskMetadata } from '@hominem/utils/types'
import { FileText, ListChecks, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '~/components/ui/button'
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { useCreateContent } from '~/lib/content/use-create-content'
import { useUpdateContent } from '~/lib/content/use-update-content'
import { cn } from '~/lib/utils'

// Define InputMode type locally or import from a shared location if available
type InputMode = 'note' | 'task'

interface CreateItemDrawerProps {
  onSuccess?: () => void
  defaultInputMode?: InputMode
  itemToEdit?: Content | null
  mode?: 'create' | 'edit'
}

const extractHashtags = (content: string): { value: string }[] => {
  const hashtagRegex = /#(\w+)/g
  const matches = content.match(hashtagRegex)
  if (!matches) return []

  return [...new Set(matches.map((tag) => tag.substring(1)))].map((tag) => ({ value: tag }))
}

export function CreateItemDrawer({
  onSuccess,
  defaultInputMode = 'note',
  itemToEdit = null,
  mode = 'create',
}: CreateItemDrawerProps) {
  const createItem = useCreateContent()
  const { updateItem } = useUpdateContent()
  const [inputMode, setInputMode] = useState<InputMode>(
    itemToEdit ? (itemToEdit.type as InputMode) : defaultInputMode
  )
  const [inputValue, setInputValue] = useState(itemToEdit?.content || '')
  const [inputTitle, setInputTitle] = useState(itemToEdit?.title || '')
  const [error, setError] = useState<Error | null>(null)

  // Update form when itemToEdit changes
  useEffect(() => {
    if (itemToEdit) {
      setInputMode(itemToEdit.type as InputMode)
      setInputValue(itemToEdit.content)
      setInputTitle(itemToEdit.title || '')
    } else {
      setInputMode(defaultInputMode)
      setInputValue('')
      setInputTitle('')
    }
  }, [itemToEdit, defaultInputMode])

  const isEditMode = mode === 'edit' && itemToEdit

  const handleSave = () => {
    setError(null)
    const titleToSave = inputTitle.trim()
    const contentToSave = inputValue.trim()

    if (inputMode === 'note' && !contentToSave) return
    if (inputMode === 'task' && !titleToSave && !contentToSave) return
    if (!titleToSave && !contentToSave) return

    let itemType: ContentType = 'note'
    const additionalData: Partial<Pick<Content, 'taskMetadata' | 'tags'>> = {}

    if (inputMode === 'task') {
      itemType = 'task'
      additionalData.taskMetadata = {
        isActive: false,
        status: 'todo',
        priority: 'medium',
        dueDate: null,
        completed: false,
      } as TaskMetadata
      additionalData.tags = []
    } else {
      itemType = 'note'
      additionalData.tags = extractHashtags(contentToSave)
    }

    if (isEditMode) {
      // Update existing item
      updateItem.mutate(
        {
          id: itemToEdit.id,
          type: itemType,
          title: titleToSave,
          content: contentToSave,
          ...additionalData,
        },
        {
          onSuccess: () => {
            if (onSuccess) onSuccess()
            setInputValue('')
            setInputTitle('')
          },
          onError: (err) => {
            setError(err instanceof Error ? err : new Error('An unknown error occurred'))
          },
        }
      )
    } else {
      // Create new item
      createItem.mutate(
        {
          type: itemType,
          title: titleToSave,
          content: contentToSave,
          ...additionalData,
        },
        {
          onSuccess: () => {
            if (onSuccess) onSuccess()
            setInputValue('')
            setInputTitle('')
          },
          onError: (err) => {
            setError(err instanceof Error ? err : new Error('An unknown error occurred'))
          },
        }
      )
    }
  }

  return (
    <DrawerContent>
      <div className="mx-auto w-full max-w-3xl">
        <DrawerHeader>
          <DrawerTitle>
            {isEditMode
              ? `Edit ${inputMode === 'note' ? 'Note' : 'Task'}`
              : `Create New ${inputMode === 'note' ? 'Note' : 'Task'}`}
          </DrawerTitle>
          <DrawerDescription>
            {isEditMode
              ? `Update your ${inputMode} details below.`
              : `Fill in the details below to add a new ${inputMode}.`}
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4 pb-0">
          <div>
            <Input
              placeholder={
                inputMode === 'note'
                  ? 'Note title (optional)'
                  : 'Task title (required if no description)'
              }
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              className="relative z-10 mb-2 text-sm bg-white/90 dark:bg-slate-700/90 dark:text-slate-100 border-slate-200/70 dark:border-slate-600/70 placeholder-slate-400 dark:placeholder-slate-500 backdrop-blur-sm focus:border-blue-300/80 dark:focus:border-blue-500/80 focus:ring-2 focus:ring-blue-300/30 dark:focus:ring-blue-500/30 transition-all"
            />
            <Textarea
              placeholder={
                inputMode === 'note'
                  ? 'Type your note... Use #tag to add tags'
                  : 'Type task description (optional if title exists)...'
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              rows={5}
              className="relative z-10 text-sm bg-white/90 dark:bg-slate-700/90 dark:text-slate-100 border-slate-200/70 dark:border-slate-600/70 placeholder-slate-400 dark:placeholder-slate-500 backdrop-blur-sm focus:border-blue-300/80 dark:focus:border-blue-500/80 focus:ring-2 focus:ring-blue-300/30 dark:focus:ring-blue-500/30 transition-all"
            />
            <div className="flex justify-between items-center mt-3 relative z-10">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={inputMode === 'note' ? 'default' : 'outline'}
                  onClick={() => setInputMode('note')}
                  className={cn(
                    'transition-all hover:shadow-md',
                    inputMode === 'note'
                      ? 'bg-blue-500/90 hover:bg-blue-600/90 text-white backdrop-blur-sm'
                      : 'bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm hover:bg-white/90 dark:hover:bg-slate-700/90'
                  )}
                  disabled={!!isEditMode} // Can't change type in edit mode
                >
                  <FileText className="h-4 w-4 mr-2" /> Note
                </Button>
                <Button
                  size="sm"
                  variant={inputMode === 'task' ? 'default' : 'outline'}
                  onClick={() => setInputMode('task')}
                  className={cn(
                    'transition-all hover:shadow-md',
                    inputMode === 'task'
                      ? 'bg-green-500/90 hover:bg-green-600/90 text-white backdrop-blur-sm'
                      : 'bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm hover:bg-white/90 dark:hover:bg-slate-700/90'
                  )}
                  disabled={!!isEditMode} // Can't change type in edit mode
                >
                  <ListChecks className="h-4 w-4 mr-2" /> Task
                </Button>
              </div>
            </div>
          </div>
        </div>
        <DrawerFooter>
          {error && (
            <div className="text-red-500 text-sm p-2 text-center bg-red-100 dark:bg-red-900/30 rounded-md">
              {error.message}
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={
              (isEditMode ? updateItem.isLoading : createItem.isLoading) ||
              (!inputValue.trim() && !inputTitle.trim()) ||
              (inputMode === 'note' && !inputValue.trim())
            }
            className="w-full bg-indigo-500/90 hover:bg-indigo-600/90 text-white backdrop-blur-sm transition-all hover:shadow-md disabled:bg-slate-300/70 disabled:text-slate-500/90 dark:disabled:bg-slate-700/70 dark:disabled:text-slate-500/90"
          >
            {isEditMode ? (
              updateItem.isLoading ? (
                'Saving...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" /> Save Changes
                </>
              )
            ) : createItem.isLoading ? (
              'Adding...'
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" /> Add {inputMode === 'note' ? 'Note' : 'Task'}
              </>
            )}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </div>
    </DrawerContent>
  )
}
