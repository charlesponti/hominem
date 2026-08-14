import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ponti-studios/ui/forms';

import type { FilterOption } from '~/lib/career/queries/job-applications';

export interface JobApplicationStatusSelectProps {
  options: FilterOption[];
  value: string;
  onValueChange: (value: string) => void;
}

export function JobApplicationStatusSelect({
  options,
  value,
  onValueChange,
}: JobApplicationStatusSelectProps) {
  return (
    <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue ?? '')}>
      <SelectTrigger id="application-status-filter" size="sm" aria-label="Filter by status">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">All statuses</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
