import type { Note } from '@hominem/hono-rpc/types/notes.types';
import { Inline } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import { Textarea } from '@hominem/ui/components/ui/textarea';
import { TextField } from '@hominem/ui/text-field';
import { Sparkles, Save, Trash2, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import { useDeleteNote, useUpdateNote } from '~/hooks/use-notes';
import { useSendMessage } from '~/lib/hooks/use-send-message';

interface NoteEditorProps {
  note: Note;
  chatId?: string;
  onAIAction?: (action: string, message: string) => void;
}

const AI_PROMPTS: Record<string, string> = {
  expand: 'Expand the following note with more detail and elaboration:',
  outline: 'Convert the following note into a structured outline with bullet points:',
  rewrite: 'Rewrite the following note in a different style or tone:',
  summarize: 'Summarize the following note into a concise summary:',
  translate: 'Translate the following note to Spanish:',
};

export function NoteEditor({ note, chatId, onAIAction }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isAIAction, setIsAIAction] = useState(false);

  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const sendMessage = useSendMessage({ chatId: chatId || '' });

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setHasChanges(true);
  }, []);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateNote.mutateAsync({
        id: note.id,
        title: title || null,
        content,
      });
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  }, [note.id, title, content, updateNote]);

  const handleDelete = useCallback(async () => {
    if (confirm('Are you sure you want to delete this note?')) {
      await deleteNote.mutateAsync({ id: note.id });
    }
  }, [note.id, deleteNote]);

  const handleAIAction = useCallback(
    async (action: string) => {
      if (!chatId || !content.trim()) return;

      const prompt = AI_PROMPTS[action] || `Process the following note:`;
      const message = `${prompt}\n\n---\n${content}`;

      setIsAIAction(true);

      try {
        await sendMessage.mutateAsync({
          message,
          chatId,
        });
        onAIAction?.(action, message);
      } catch (error) {
        console.error('AI action failed:', error);
      } finally {
        setIsAIAction(false);
      }
    },
    [chatId, content, sendMessage, onAIAction],
  );

  const aiActions = [
    { id: 'expand', label: 'Expand' },
    { id: 'outline', label: 'Outline' },
    { id: 'rewrite', label: 'Rewrite' },
    { id: 'summarize', label: 'Summarize' },
  ];

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <Inline justify="between" className="mb-4">
        <TextField
          value={title}
          onChange={handleTitleChange}
          placeholder="Note title..."
          aria-label="Note title"
          className="text-xl font-semibold bg-transparent border-none void-focus flex-1"
        />
        <Inline gap="sm">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            <Save className="size-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            <Trash2 className="size-4" />
          </Button>
        </Inline>
      </Inline>

      {/* AI Actions Toolbar */}
      <Inline gap="sm" className="mb-4 py-2 border-y">
        <Sparkles className="size-4 text-muted-foreground mr-2" />
        {aiActions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={() => handleAIAction(action.id)}
            disabled={!chatId || !content.trim() || isAIAction}
            className="text-xs"
          >
            {isAIAction ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
            {action.label}
          </Button>
        ))}
      </Inline>

      {/* Content */}
      <Textarea
        value={content}
        onChange={handleContentChange}
        placeholder="Start writing your note..."
        className="flex-1 resize-none"
      />

      {/* Metadata */}
      <div className="mt-4 text-xs text-muted-foreground">
        <p>Created: {new Date(note.createdAt).toLocaleString()}</p>
        <p>Updated: {new Date(note.updatedAt).toLocaleString()}</p>
        {note.versionNumber > 1 && <p>Version: {note.versionNumber}</p>}
      </div>
    </div>
  );
}
