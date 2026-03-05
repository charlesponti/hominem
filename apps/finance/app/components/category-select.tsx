import { Label } from '@hominem/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hominem/ui/components/ui/select';
import { useId } from 'react';

interface TagOption {
  id: string;
  name: string;
}

interface TagSelectProps {
  selectedTag: string;
  onTagChange: (value: string) => void;
  tags: TagOption[];
  isLoading?: boolean;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function TagSelect({
  selectedTag,
  onTagChange,
  tags,
  isLoading = false,
  placeholder = 'All tags',
  label = 'Tag',
  className,
}: TagSelectProps) {
  const id = useId();
  const safeTags = tags || [];

  return (
    <div className={`space-y-2 ${className || ''}`}>
      <Label htmlFor={id}>{label}</Label>
      <Select name="tag" value={selectedTag} onValueChange={onTagChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All tags</SelectItem>
          {isLoading ? (
            <SelectItem value="loading" disabled>
              Loading tags...
            </SelectItem>
          ) : safeTags.length === 0 ? (
            <SelectItem value="no-tags" disabled>
              No tags available
            </SelectItem>
          ) : (
            safeTags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
