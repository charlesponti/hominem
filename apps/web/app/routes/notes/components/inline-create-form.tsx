import type { Note, NotesCreateInput } from '@hominem/hono-rpc/types/notes.types';
import { Button } from '@hominem/ui/button';
import { Textarea } from '@hominem/ui/components/ui/textarea';
import { Input } from '@hominem/ui/input';
import { RefreshCw, X } from 'lucide-react';
import { useCallback, useState } from 'react';

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

  const [prevItemToEdit, setPrevItemToEdit] = useState(itemToEdit);
  const [prevIsVisible, setPrevIsVisible] = useState(isVisible);
  const [inputValue, setInputValue] = useState(itemToEdit?.content || '');
  const [inputTitle, setInputTitle] = useState(itemToEdit?.title || '');

  const resetForm = useCallback(() => {
    setInputValue('');
    setInputTitle('');
    setError(null);
  }, []);

  // Sync form state with prop changes during render (avoids double-render from useEffect)
  if (isVisible !== prevIsVisible) {
    setPrevIsVisible(isVisible);
    if (!isVisible) {
      resetForm();
    } else if (itemToEdit) {
      setInputValue(itemToEdit.content);
      setInputTitle(itemToEdit.title || '');
    } else {
      resetForm();
    }
  } else if (itemToEdit !== prevItemToEdit) {
    setPrevItemToEdit(itemToEdit);
    if (itemToEdit) {
      setInputValue(itemToEdit.content);
      setInputTitle(itemToEdit.title || '');
    } else {
      resetForm();
    }
  }

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

  if (isEditMode) {
    return (
      <div className="w-full rounded-3xl border border-border/60 bg-bg-surface px-4 py-4 void-anim-breezy sm:px-5">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div>
            <div className="body-4 uppercase tracking-[0.12em] text-text-tertiary">Editing</div>
            <h3 className="heading-4 text-foreground">Refine note</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="size-8 rounded-full p-0 text-muted-foreground hover:text-foreground"
            aria-label="Close edit form"
            title="Close edit form"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          <Input
            placeholder="Title"
            value={inputTitle}
            onChange={(e) => setInputTitle(e.target.value)}
            className="body-2 h-11 border-border/60 bg-background text-foreground placeholder:text-text-tertiary"
          />

          <Textarea
            placeholder="Rewrite the note without breaking the thread of thought"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            rows={6}
            className="body-1 min-h-44 resize-none border-border/60 bg-background text-foreground placeholder:text-text-tertiary"
          />

          <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3">
            <div className="body-4 text-text-tertiary">Changes stay lightweight until you save.</div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel} className="rounded-full px-4" title="Cancel edit">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaveDisabled} className="rounded-full px-4">
                {isSaving ? <RefreshCw className="size-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="body-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive">
              {error.message}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="body-4 uppercase tracking-[0.12em] text-text-tertiary">New note</div>
          <Textarea
            placeholder="Write the thought before you organize it"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            rows={4}
            className="body-1 min-h-32 resize-none border-0 bg-transparent px-0 py-0 text-foreground placeholder:text-text-tertiary focus-visible:ring-0"
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3">
          <Input
            placeholder="Title optional"
            value={inputTitle}
            onChange={(e) => setInputTitle(e.target.value)}
            className="body-3 h-10 max-w-56 border-0 bg-transparent px-0 text-text-secondary placeholder:text-text-tertiary focus-visible:ring-0"
          />

          <div className="flex items-center gap-2">
            <div className="body-4 text-text-tertiary">Supports #tags inline</div>
            <Button
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="rounded-full px-5"
            >
              {isSaving ? <RefreshCw className="size-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="body-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive">
            {error.message}
          </div>
        )}
      </div>
    </div>
  );
}
