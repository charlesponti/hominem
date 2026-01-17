import type { Note, NoteInsert, Priority, TaskMetadata } from '@hominem/services/types'
import { Button } from '@hominem/ui/button'
import { DatePicker } from '@hominem/ui/components/date-picker'
import { Textarea } from '@hominem/ui/components/ui/textarea'
import { Input } from '@hominem/ui/input'
import { FileText, ListChecks, RefreshCw, Send, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { PrioritySelect } from '~/components/priority-select'
import { useCreateNote, useUpdateNote } from '~/hooks/use-notes'
import { cn } from '~/lib/utils'

type InputMode = 'note' | 'task'

interface InlineCreateFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  defaultInputMode?: InputMode
  itemToEdit?: Note | null
  mode?: 'create' | 'edit'
  isVisible?: boolean
}

const extractHashtags = (content: string): { value: string }[] => {
  const hashtagRegex = /#(\w+)/g
  const matches = content.match(hashtagRegex)
  if (!matches) return []

  return [...new Set(matches.map((tag) => tag.substring(1)))].map((tag) => ({ value: tag }))
}

export function InlineCreateForm({
  onSuccess,
  onCancel,
  defaultInputMode = 'note',
  itemToEdit = null,
  mode = 'create',
  isVisible = false,
}: InlineCreateFormProps) {
  const createItem = useCreateNote()
  const updateItem = useUpdateNote()
  const [error, setError] = useState<Error | null>(null)
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

  const resetForm = useCallback(() => {
    setInputMode(defaultInputMode)
    setInputValue('')
    setInputTitle('')
    setTaskPriority('medium')
    setTaskDueDate(undefined)
    setError(null)
  }, [defaultInputMode])

  const hydrateFromItem = useCallback((item: Note) => {
    setInputMode(item.type as InputMode)
    setInputValue(item.content)
    setInputTitle(item.title || '')
    if (item.type === 'task' && item.taskMetadata) {
      setTaskPriority(item.taskMetadata.priority || 'medium')
      setTaskDueDate(item.taskMetadata.dueDate ? new Date(item.taskMetadata.dueDate) : undefined)
    } else {
      setTaskPriority('medium')
      setTaskDueDate(undefined)
    }
  }, [])

  useEffect(() => {
    if (!isVisible) {
      resetForm()
      return
    }

    if (itemToEdit) {
      hydrateFromItem(itemToEdit)
      return
    }

    resetForm()
  }, [itemToEdit, isVisible, hydrateFromItem, resetForm])

  const isEditMode = mode === 'edit' && itemToEdit
  const isNoteMode = inputMode === 'note'
  const isTaskMode = inputMode === 'task'
  const trimmedTitle = inputTitle.trim()
  const trimmedContent = inputValue.trim()
  const titleToSave = trimmedTitle
  const contentToSave = trimmedContent
  const isSaving = isEditMode ? updateItem.isPending : createItem.isPending
  const isSaveDisabled =
    isSaving || (!(trimmedContent || trimmedTitle)) || (isNoteMode && !trimmedContent)

  const handleSave = () => {
    setError(null)

    if (isNoteMode && !contentToSave) return
    if (isTaskMode && !titleToSave && !contentToSave) return

    const additionalData: Partial<NoteInsert> = {}

    const itemType: Note['type'] = isTaskMode ? 'task' : 'note'
    if (isTaskMode) {
      const existingTaskMetadata = itemToEdit?.taskMetadata ?? {}
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
      additionalData.tags = extractHashtags(contentToSave)
    }

    if (isEditMode) {
      updateItem.mutate(
        {
          id: itemToEdit.id,
          type: itemToEdit.type,
          title: titleToSave,
          content: contentToSave,
          tags: additionalData.tags,
          taskMetadata: additionalData.taskMetadata,
          analysis: additionalData.analysis,
        },
        {
          onSuccess: () => {
            if (onSuccess) onSuccess()
            resetForm()
          },
          onError: (err) => {
            setError(err instanceof Error ? err : new Error('An unknown error occurred'))
          },
        }
      )
    } else {
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
            resetForm()
          },
          onError: (err) => {
            setError(err instanceof Error ? err : new Error('An unknown error occurred'))
          },
        }
      )
    }
  }

  const handleCancel = () => {
    resetForm()
    if (onCancel) onCancel()
  }

  if (!isVisible) return null

  // Simplified view for always-visible mode
  const isAlwaysVisible = isVisible && !itemToEdit && mode === 'create'

  if (isAlwaysVisible) {
    return (
      <div className="w-full">
        <div className="space-y-3">
          <Textarea
            placeholder="What's on your mind? Use #tag to add tags..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            rows={3}
            className="text-base bg-white dark:bg-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all resize-none"
          />

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="h-9 px-6 bg-blue-500 hover:bg-blue-600 text-white transition-all disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
            >
              {isSaving ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                'Post'
              )}
            </Button>
          </div>

          {error && (
            <div className="text-red-500 text-sm p-3 text-center bg-red-100 dark:bg-red-900/30 rounded-md border border-red-200 dark:border-red-800/50">
              {error.message}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto mb-6 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-xl border border-slate-200/70 dark:border-slate-700/70 shadow-lg transition-all duration-200">
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
            {isEditMode
              ? `Edit ${inputMode === 'note' ? 'Note' : 'Task'}`
              : `Create New ${inputMode === 'note' ? 'Note' : 'Task'}`}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="size-8 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <Input
            placeholder={
              inputMode === 'note'
                ? 'Note title (optional)'
                : 'Task title (required if no description)'
            }
            value={inputTitle}
            onChange={(e) => setInputTitle(e.target.value)}
            className="text-sm bg-white/90 dark:bg-slate-700/90 dark:text-slate-100 border-slate-200/70 dark:border-slate-600/70 placeholder-slate-400 dark:placeholder-slate-500 backdrop-blur-sm focus:border-blue-300/80 dark:focus:border-blue-500/80 focus:ring-2 focus:ring-blue-300/30 dark:focus:ring-blue-500/30 transition-all"
          />

          <Textarea
            placeholder={
              inputMode === 'note'
                ? 'Type your note... Use #tag to add tags'
                : 'Type task description (optional if title exists)...'
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            rows={4}
            className="text-sm bg-white/90 dark:bg-slate-700/90 dark:text-slate-100 border-slate-200/70 dark:border-slate-600/70 placeholder-slate-400 dark:placeholder-slate-500 backdrop-blur-sm focus:border-blue-300/80 dark:focus:border-blue-500/80 focus:ring-2 focus:ring-blue-300/30 dark:focus:ring-blue-500/30 transition-all resize-none"
          />

          {inputMode === 'task' && (
            <div className="flex flex-wrap gap-4">
              <PrioritySelect
                value={taskPriority}
                onValueChange={setTaskPriority}
                id="task-priority"
                className="w-full h-10"
              />
              <DatePicker
                value={taskDueDate}
                onSelect={setTaskDueDate}
                id="task-due-date"
                label="Due Date"
              />
            </div>
          )}

          {/* Action buttons row */}
          <div className="flex justify-between items-center">
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={inputMode === 'note' ? 'default' : 'outline'}
                onClick={() => setInputMode('note')}
                className={cn(
                  'size-8 p-0 transition-all hover:shadow-md',
                  inputMode === 'note'
                    ? 'bg-blue-500/90 hover:bg-blue-600/90 text-white backdrop-blur-sm'
                    : 'bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm hover:bg-white/90 dark:hover:bg-slate-700/90'
                )}
                disabled={!!isEditMode}
                title="Note"
              >
                <FileText className="size-4" />
              </Button>
              <Button
                size="sm"
                variant={inputMode === 'task' ? 'default' : 'outline'}
                onClick={() => setInputMode('task')}
                className={cn(
                  'size-8 p-0 transition-all hover:shadow-md',
                  inputMode === 'task'
                    ? 'bg-green-500/90 hover:bg-green-600/90 text-white backdrop-blur-sm'
                    : 'bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm hover:bg-white/90 dark:hover:bg-slate-700/90'
                )}
                disabled={!!isEditMode}
                title="Task"
              >
                <ListChecks className="size-4" />
              </Button>
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="h-8 px-3 bg-indigo-500/90 hover:bg-indigo-600/90 text-white backdrop-blur-sm transition-all hover:shadow-md disabled:bg-slate-300/70 disabled:text-slate-500/90 dark:disabled:bg-slate-700/70 dark:disabled:text-slate-500/90"
              title={isEditMode ? 'Save changes' : `Add ${inputMode}`}
            >
              {isSaving ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-red-500 text-sm p-3 text-center bg-red-100 dark:bg-red-900/30 rounded-md border border-red-200 dark:border-red-800/50">
              {error.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
