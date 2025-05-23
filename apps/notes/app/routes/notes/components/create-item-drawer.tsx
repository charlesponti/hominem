import type { Content, ContentType, Priority, TaskMetadata } from '@hominem/utils/types'
import { format } from 'date-fns'
import { CalendarIcon, FileText, ListChecks, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Calendar } from '~/components/ui/calendar'
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer'
import { Input } from '~/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import { useCreateContent } from '~/lib/content/use-create-content'
import { useUpdateContent } from '~/lib/content/use-update-content'
import { cn } from '~/lib/utils'

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
  const [taskPriority, setTaskPriority] = useState<Priority>(
    itemToEdit?.taskMetadata?.priority || 'medium'
  )
  const [taskDueDate, setTaskDueDate] = useState<Date | undefined>(
    itemToEdit?.taskMetadata?.dueDate ? new Date(itemToEdit.taskMetadata.dueDate) : undefined
  )
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (itemToEdit) {
      setInputMode(itemToEdit.type as InputMode)
      setInputValue(itemToEdit.content)
      setInputTitle(itemToEdit.title || '')
      if (itemToEdit.type === 'task' && itemToEdit.taskMetadata) {
        setTaskPriority(itemToEdit.taskMetadata.priority || 'medium')
        setTaskDueDate(
          itemToEdit.taskMetadata.dueDate ? new Date(itemToEdit.taskMetadata.dueDate) : undefined
        )
      } else {
        setTaskPriority('medium')
        setTaskDueDate(undefined)
      }
    } else {
      setInputMode(defaultInputMode)
      setInputValue('')
      setInputTitle('')
      setTaskPriority('medium')
      setTaskDueDate(undefined)
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
      const existingTaskMetadata =
        isEditMode && itemToEdit?.taskMetadata ? itemToEdit.taskMetadata : {}
      additionalData.taskMetadata = {
        ...existingTaskMetadata,
        status: itemToEdit?.taskMetadata?.status || 'todo',
        priority: taskPriority,
        dueDate: taskDueDate ? taskDueDate.toISOString() : null,
        startTime: itemToEdit?.taskMetadata?.startTime,
        endTime: itemToEdit?.taskMetadata?.endTime,
        duration: itemToEdit?.taskMetadata?.duration || 0,
      } as TaskMetadata
      additionalData.tags = itemToEdit?.tags || []
    } else {
      itemType = 'note'
      additionalData.tags = extractHashtags(contentToSave)
    }

    const payload = {
      type: itemType,
      title: titleToSave,
      content: contentToSave,
      ...additionalData,
    }

    if (isEditMode) {
      updateItem.mutate(
        {
          id: itemToEdit.id,
          ...payload,
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
      createItem.mutate(payload, {
        onSuccess: () => {
          if (onSuccess) onSuccess()
          setInputValue('')
          setInputTitle('')
        },
        onError: (err) => {
          setError(err instanceof Error ? err : new Error('An unknown error occurred'))
        },
      })
    }
  }

  return (
    <DrawerContent className="bg-white/90">
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
            {inputMode === 'task' && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label
                    htmlFor="task-priority"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Priority
                  </label>
                  <Select
                    value={taskPriority}
                    onValueChange={(value: string) => setTaskPriority(value as Priority)}
                  >
                    <SelectTrigger id="task-priority" className="bg-white/90 dark:bg-slate-700/90">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label
                    htmlFor="task-due-date"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Due Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full justify-start text-left font-normal bg-white/90 dark:bg-slate-700/90 dark:text-slate-100 border-slate-200/70 dark:border-slate-600/70 placeholder-slate-400 dark:placeholder-slate-500 backdrop-blur-sm focus:border-blue-300/80 dark:focus:border-blue-500/80 focus:ring-2 focus:ring-blue-300/30 dark:focus:ring-blue-500/30 transition-all',
                          !taskDueDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {taskDueDate ? format(taskDueDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white" align="start">
                      <Calendar
                        mode="single"
                        selected={taskDueDate}
                        onSelect={(date) => {
                          setTaskDueDate(date)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
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
                  disabled={!!isEditMode}
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
                  disabled={!!isEditMode}
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
