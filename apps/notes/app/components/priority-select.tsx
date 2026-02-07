import type { Priority } from '@hominem/hono-rpc/types';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hominem/ui/components/ui/select';

interface PrioritySelectProps {
  value: Priority;
  onValueChange: (value: Priority) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function PrioritySelect({
  value,
  onValueChange,
  disabled = false,
  className = 'bg-muted',
  id = 'priority-select',
}: PrioritySelectProps) {
  return (
    <div className="flex-1">
      <label htmlFor={id} className="block text-sm font-medium text-foreground mb-2">
        Priority
      </label>
      <Select
        value={value}
        onValueChange={(newValue: string) => onValueChange(newValue as Priority)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className={className}>
          <SelectValue placeholder="Select priority" />
        </SelectTrigger>
        <SelectContent className="w-full">
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
