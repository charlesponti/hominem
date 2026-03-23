import { useState, useCallback, useMemo } from 'react';

interface UseMessageEditOptions {
  initialContent: string;
  onSave?: (newContent: string) => void | Promise<void>;
}

export function useMessageEdit({ initialContent, onSave }: UseMessageEditOptions) {
  const [editContent, setEditContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);

  const startEdit = useCallback(() => {
    setEditContent(initialContent);
    setIsEditing(true);
  }, [initialContent]);

  const cancelEdit = useCallback(() => {
    setEditContent(initialContent);
    setIsEditing(false);
  }, [initialContent]);

  const saveEdit = useCallback(async () => {
    if (editContent.trim() === initialContent.trim()) {
      setIsEditing(false);
      return;
    }

    try {
      await onSave?.(editContent);
      setIsEditing(false);
    } catch {
      // Error handling is the responsibility of the caller via onSave
    }
  }, [editContent, initialContent, onSave]);

  const canSave = useMemo(
    () => editContent.trim() !== initialContent.trim(),
    [editContent, initialContent],
  );

  return {
    isEditing,
    editContent,
    setEditContent,
    startEdit,
    cancelEdit,
    saveEdit,
    canSave,
  };
}