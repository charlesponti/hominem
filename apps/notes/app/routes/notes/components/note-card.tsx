import { Button } from '@hominem/ui/button';
import { Badge } from '@hominem/ui/components/ui/badge';
import { Card, CardContent } from '@hominem/ui/components/ui/card';
import { Edit, Trash2, X } from 'lucide-react';
import { useMemo } from 'react';

import type { Note } from '~/lib/rpc/notes-types';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onRemoveTag: (noteId: string, tagValue: string) => void;
  className?: string;
}

export function NoteCard({ note, onEdit, onDelete, onRemoveTag, className = '' }: NoteCardProps) {
  // Extract hashtags from content
  const extractHashtags = useMemo(() => {
    const regex = /#(\w+)/g;
    const matches = note.content.match(regex);
    if (!matches) return [];

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
  const formatContent = (content: string) => {
    const parts = content.split(/(#\w+)/g);

    return (
      <>
        {parts.map((part, i) => {
          if (part.startsWith('#')) {
            // Create a key that doesn't rely solely on index but has uniqueness
            return (
              <span
                key={`hashtag-${i}-${part.replace('#', '')}`}
                className="text-foreground font-medium"
              >
                {part}
              </span>
            );
          }
          // Create a key that doesn't rely solely on index but has uniqueness
          return <span key={`text-${i}-${part.length}`}>{part}</span>;
        })}
      </>
    );
  };

  return (
    <Card
      metadata={`CHAR_CT: ${note.content.length}`}
      className={`h-full flex flex-col overflow-hidden bg-card border border-border ${className}`}
    >
      <CardContent className="p-5 flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {note.title && (
            <h3 className="font-semibold text-base mb-2 text-foreground">{note.title}</h3>
          )}
          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap mb-4 line-clamp-5 overflow-hidden">
            {formatContent(note.content)}
          </p>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {allTags.map((tag: { value: string }) => (
                <Badge
                  key={tag.value}
                  variant="secondary"
                  className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium border border-foreground text-foreground"
                >
                  {tag.value}
                  {!extractHashtags.includes(tag.value) && (
                    <button
                      type="button"
                      onClick={() => onRemoveTag(note.id, tag.value)}
                      className="ml-1 text-muted-foreground hover:text-foreground "
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-auto pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(note)}
            className="text-secondary-foreground "
          >
            <Edit className="size-4 mr-1" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(note.id)}
            className="text-muted-foreground hover:text-foreground "
          >
            <Trash2 className="size-4 mr-1" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
