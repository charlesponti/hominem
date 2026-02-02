import { Button } from '@hominem/ui/button';
import { Textarea } from '@hominem/ui/components/ui/textarea';
import { Input } from '@hominem/ui/input';
import { RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { Note, NotesCreateInput, NotesUpdateInput } from '~/lib/trpc/notes-types';

import { useCreateNote, useUpdateNote } from '~/hooks/use-notes';

interface InlineCreateFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  itemToEdit?: Note | null;
  mode?: 'create' | 'edit';
  isVisible?: boolean;
}

const extractHashtags = (content: string): { value: string }[] => {
  const hashtagRegex = /#(\w+)/g;
  const matches = content.match(hashtagRegex);
  if (!matches) return [];

  return [...new Set(matches.map((tag) => tag.substring(1)))].map((tag) => ({ value: tag }));
};

export function InlineCreateForm({
  onSuccess,
  onCancel,
  itemToEdit = null,
  mode = 'create',
  isVisible = false,
}: InlineCreateFormProps) {
  const createItem = useCreateNote();
  const updateItem = useUpdateNote();
  const [error, setError] = useState<Error | null>(null);

  const [inputValue, setInputValue] = useState(itemToEdit?.content || '');
  const [inputTitle, setInputTitle] = useState(itemToEdit?.title || '');

  const resetForm = useCallback(() => {
    setInputValue('');
    setInputTitle('');
    setError(null);
  }, []);

  const hydrateFromItem = useCallback((item: Note) => {
    setInputValue(item.content);
    setInputTitle(item.title || '');
  }, []);

  useEffect(() => {
    if (!isVisible) {
      resetForm();
      return;
    }

    if (itemToEdit) {
      hydrateFromItem(itemToEdit);
      return;
    }

    resetForm();
  }, [itemToEdit, isVisible, hydrateFromItem, resetForm]);

  const isEditMode = mode === 'edit' && !!itemToEdit;
  const trimmedTitle = inputTitle.trim();
  const trimmedContent = inputValue.trim();
  const isSaving = isEditMode ? updateItem.isPending : createItem.isPending;
  const isSaveDisabled = isSaving || !trimmedContent;

  const handleSave = () => {
    setError(null);

    if (!trimmedContent) return;

    const tags = extractHashtags(trimmedContent);

    if (isEditMode && itemToEdit) {
      updateItem.mutate(
        {
          id: itemToEdit.id,
          title: trimmedTitle || null,
          content: trimmedContent,
          tags,
        },
        {
          onSuccess: () => {
            if (onSuccess) onSuccess();
            resetForm();
          },
          onError: (err) => {
            setError(err instanceof Error ? err : new Error('An unknown error occurred'));
          },
        },
      );
    } else {
      const data: NotesCreateInput = {
        type: 'note',
        content: trimmedContent,
        ...(trimmedTitle && { title: trimmedTitle }),
        ...(tags.length > 0 && { tags }),
      };

      createItem.mutate(data, {
        onSuccess: () => {
          if (onSuccess) onSuccess();
          resetForm();
        },
        onError: (err) => {
          setError(err instanceof Error ? err : new Error('An unknown error occurred'));
        },
      });
    }
  };

  const handleCancel = () => {
    resetForm();
    if (onCancel) onCancel();
  };

  if (!isVisible) return null;

  // Edit mode - show full form in a modal-like container
  if (isEditMode) {
    return (
      <div className="w-full max-w-4xl mx-auto mb-6 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-xl border border-slate-200/70 dark:border-slate-700/70 shadow-lg transition-all duration-200">
        <div className="p-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Edit Note</h3>
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
              placeholder="Note title (optional)"
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              className="text-sm bg-white/90 dark:bg-slate-700/90 dark:text-slate-100 border-slate-200/70 dark:border-slate-600/70 placeholder-slate-400 dark:placeholder-slate-500 backdrop-blur-sm focus:border-blue-300/80 dark:focus:border-blue-500/80 focus:ring-2 focus:ring-blue-300/30 dark:focus:ring-blue-500/30 transition-all"
            />

            <Textarea
              placeholder="Type your note... Use #tag to add tags"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              rows={4}
              className="text-sm bg-white/90 dark:bg-slate-700/90 dark:text-slate-100 border-slate-200/70 dark:border-slate-600/70 placeholder-slate-400 dark:placeholder-slate-500 backdrop-blur-sm focus:border-blue-300/80 dark:focus:border-blue-500/80 focus:ring-2 focus:ring-blue-300/30 dark:focus:ring-blue-500/30 transition-all resize-none"
            />

            {/* Action buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel} className="h-8 px-4">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaveDisabled}
                className="h-8 px-4 bg-blue-500 hover:bg-blue-600 text-white transition-all disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
              >
                {isSaving ? <RefreshCw className="size-4 animate-spin" /> : 'Save'}
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
    );
  }

  // Create mode - simple always-visible form
  return (
    <div className="w-full">
      <div className="space-y-3">
        <Input
          placeholder="Title (optional)"
          value={inputTitle}
          onChange={(e) => setInputTitle(e.target.value)}
          className="text-sm bg-white dark:bg-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
        />

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
            {isSaving ? <RefreshCw className="size-4 animate-spin" /> : 'Save'}
          </Button>
        </div>

        {error && (
          <div className="text-red-500 text-sm p-3 text-center bg-red-100 dark:bg-red-900/30 rounded-md border border-red-200 dark:border-red-800/50">
            {error.message}
          </div>
        )}
      </div>
    </div>
  );
}
