import { Button } from '@hominem/ui/button';
import { Badge } from '@hominem/ui/components/ui/badge';
import { Edit, Trash2, X, Maximize2, List, RefreshCw } from 'lucide-react';
import { type ReactNode, useMemo } from 'react';

import type { Note } from '~/lib/rpc/notes-types';

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
                className="text-blue-600 dark:text-blue-400 font-medium"
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

  return (
    <div
      className={cn(
        'border-b border-slate-200 dark:border-slate-700 py-4 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150 group',
        className,
      )}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {note.title && (
              <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                {note.title}
              </h3>
            )}
            {versionLabel && (
              <Badge
                variant="secondary"
                className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-0"
              >
                {versionLabel}
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div>
          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
            {formattedContent}
          </p>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag: { value: string }) => (
              <Badge
                key={tag.value}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border-0 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {tag.value}
                {!extractHashtags.includes(tag.value) && (
                  <button
                    type="button"
                    onClick={() => onRemoveTag(note.id, tag.value)}
                    className="ml-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {new Date(note.createdAt).toLocaleDateString()}
          </p>
          <div className="flex items-center gap-1">
            {/* Development actions - subtle buttons */}
            {onExpand && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onExpand(note)}
                className="size-7 p-0 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:text-slate-500 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                title="Expand"
              >
                <Maximize2 className="size-3.5" />
              </Button>
            )}
            {onOutline && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOutline(note)}
                className="size-7 p-0 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:text-slate-500 dark:hover:text-green-400 dark:hover:bg-green-900/20 transition-colors"
                title="Outline"
              >
                <List className="size-3.5" />
              </Button>
            )}
            {onRewrite && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRewrite(note)}
                className="size-7 p-0 text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:text-slate-500 dark:hover:text-purple-400 dark:hover:bg-purple-900/20 transition-colors"
                title="Rewrite"
              >
                <RefreshCw className="size-3.5" />
              </Button>
            )}

            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(note)}
              className="size-8 p-0 text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Edit note"
            >
              <Edit className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(note.id)}
              className="size-8 p-0 text-slate-600 hover:text-red-500 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors"
              title="Delete note"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
