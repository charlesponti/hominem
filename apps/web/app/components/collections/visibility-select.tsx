import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';

function isVisibility(value: string): value is 'private' | 'shared' {
  return value === 'private' || value === 'shared';
}

export function VisibilitySelect({
  value,
  onChange,
}: {
  value: 'private' | 'shared';
  onChange: (value: 'private' | 'shared') => void;
}) {
  return (
    <Select
      onValueChange={(next) => {
        if (isVisibility(next)) onChange(next);
      }}
      value={value}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="private">Private</SelectItem>
        <SelectItem value="shared">Shared</SelectItem>
      </SelectContent>
    </Select>
  );
}
