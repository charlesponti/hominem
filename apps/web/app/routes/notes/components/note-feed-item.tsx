import type { Note } from '@hominem/hono-rpc/types/notes.types';
import { Inline } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import { Badge } from '@hominem/ui/components/ui/badge';
import { Edit, Trash2, X, Maximize2, List, RefreshCw } from 'lucide-react';
import { type ReactNode, useCallback, useMemo, type MouseEvent } from 'react';
import { Link } from 'react-router';

import { cn } from '~/lib/utils';

interface NoteFeedItemProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onRemoveTag: (noteId: string, tagValue: string) => void;
  onExpand?: (note: Note) => void;
  onOutline?: (note: Note) => void;
  onRewrite?: (note: Note) => void;
  className?: string;
}

export function NoteFeedItem({
  note,
  onEdit,
  onDelete,
  onRemoveTag,
  onExpand,
  onOutline,
  onRewrite,
  className = '',
}: NoteFeedItemProps) {
  // Extract hashtags from content
  const extractHashtags = useMemo(() => {
    const regex = /#(\w+)/g;
    const matches = note.content.match(regex);
    if (!matches) {
      return [];
    }

    // Remove the # prefix and return unique tags
    return [...new Set(matches.map((tag: string) => tag.substring(1)))];
  }, [note.content]);

  // Combine existing tags with content hashtags
  const allTags = useMemo(() => {
    const existingTags = note.tags?.map((tag: { value: string }) => tag.value) || [];
    const allTagValues = [...new Set([...existingTags, ...extractHashtags])];
    return allTagValues.map((value) => ({ value }));
  }, [note.tags, extractHashtags]);

  // Function to format content with highlighted hashtags
  const formattedContent = useMemo<ReactNode>(() => {
    const parts = note.content.split(/(#\w+)/g);

    return (
      <>
        {parts.map((part: string, i: number) => {
          if (part.startsWith('#')) {
            return (
              <span
                key={`hashtag-${i}-${part.replace('#', '')}`}
                className="text-foreground font-medium"
              >
                {part}
              </span>
            );
          }
          return <span key={`text-${i}-${part.length}`}>{part}</span>;
        })}
      </>
    );
  }, [note.content]);

  // Check if note has versions (parentNoteId exists means it's a version of something)
  const versionLabel =
    note.versionNumber > 1 ? `v${note.versionNumber}` : note.parentNoteId ? 'v2+' : null;

  const handleRemoveTag = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const tagValue = event.currentTarget.dataset.tagValue;
      if (tagValue) {
        onRemoveTag(note.id, tagValue);
      }
    },
    [note.id, onRemoveTag],
  );

  const handleExpand = useCallback(() => onExpand?.(note), [note, onExpand]);
  const handleOutline = useCallback(() => onOutline?.(note), [note, onOutline]);
  const handleRewrite = useCallback(() => onRewrite?.(note), [note, onRewrite]);
  const handleEdit = useCallback(() => onEdit(note), [note, onEdit]);
  const handleDelete = useCallback(() => onDelete(note.id), [note.id, onDelete]);

  return (
    <div className={cn('group px-5 py-5', className)}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/notes/${note.id}`}
                className="heading-4 truncate text-foreground hover:underline"
              >
                {note.title || 'Untitled note'}
              </Link>
              {versionLabel ? (
                <Badge
                  variant="secondary"
                  className="rounded-full border border-border/60 bg-bg-surface px-2.5 py-0.5 body-4 text-text-secondary"
                >
                  {versionLabel}
                </Badge>
              ) : null}
            </div>

            <p className="body-2 whitespace-pre-wrap text-text-secondary">{formattedContent}</p>
          </div>

          <div className="body-4 shrink-0 text-text-tertiary">
            {new Date(note.updatedAt).toLocaleDateString()}
          </div>
        </div>

        {allTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag: { value: string }) => (
              <Badge
                key={tag.value}
                variant="secondary"
                className="flex items-center gap-1 rounded-full border border-border/60 bg-bg-surface px-2.5 py-1 body-4 text-text-secondary"
              >
                #{tag.value}
                {!extractHashtags.includes(tag.value) ? (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleRemoveTag}
                    data-tag-value={tag.value}
                    className="ml-0.5 rounded-full text-muted-foreground hover:text-foreground"
                    title={`Remove ${tag.value}`}
                    aria-label={`Remove tag ${tag.value}`}
                  >
                    <X className="size-3" />
                  </Button>
                ) : null}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 border-t border-border/50 pt-3">
          <div className="body-4 text-text-tertiary">
            Created {new Date(note.createdAt).toLocaleDateString()}
          </div>

          <Inline gap="xs">
            {onExpand ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExpand}
                className="rounded-full px-3 text-text-secondary"
                title="Expand"
              >
                <Maximize2 className="mr-1 size-3.5" />
                Expand
              </Button>
            ) : null}
            {onOutline ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOutline}
                className="rounded-full px-3 text-text-secondary"
                title="Outline"
              >
                <List className="mr-1 size-3.5" />
                Outline
              </Button>
            ) : null}
            {onRewrite ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRewrite}
                className="rounded-full px-3 text-text-secondary"
                title="Rewrite"
              >
                <RefreshCw className="mr-1 size-3.5" />
                Rewrite
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="rounded-full px-3 text-text-secondary"
              title="Edit note"
            >
              <Edit className="mr-1 size-3.5" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="rounded-full px-3 text-text-secondary"
              title="Delete note"
            >
              <Trash2 className="mr-1 size-3.5" />
              Delete
            </Button>
          </Inline>
        </div>
      </div>
    </div>
  );
}
