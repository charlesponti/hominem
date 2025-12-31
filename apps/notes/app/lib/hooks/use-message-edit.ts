import { useState, useCallback } from 'react'

interface UseMessageEditOptions {
  initialContent: string
  onSave?: (newContent: string) => void | Promise<void>
}

/**
 * Hook for managing message edit state and validation
 */
export function useMessageEdit({ initialContent, onSave }: UseMessageEditOptions) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(initialContent)

  const startEdit = useCallback(() => {
    setEditContent(initialContent)
    setIsEditing(true)
  }, [initialContent])

  const cancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditContent(initialContent)
  }, [initialContent])

  const saveEdit = useCallback(async () => {
    const trimmedContent = editContent.trim()
    if (trimmedContent && trimmedContent !== initialContent && onSave) {
      await onSave(trimmedContent)
      setIsEditing(false)
    }
  }, [editContent, initialContent, onSave])

  const canSave = editContent.trim() && editContent.trim() !== initialContent

  return {
    isEditing,
    editContent,
    setEditContent,
    startEdit,
    cancelEdit,
    saveEdit,
    canSave,
  }
}


