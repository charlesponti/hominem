import { useId } from 'react';

import { cn } from '../../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface FilterSelectOption<T extends string> {
  value: T;
  label: string;
}

interface FilterSelectProps<T extends string> {
  label: string;
  value: T | '';
  options: Array<FilterSelectOption<T>>;
  onChange: (value: T | '') => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

const ALL_VALUE = '__all__' as const;

export function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'All',
  className,
  id,
}: FilterSelectProps<T>) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  // Convert empty string to special value for Radix UI Select
  const selectValue = value === '' ? ALL_VALUE : value;

  const handleValueChange = (val: string) => {
    // Convert special value back to empty string
    onChange((val === ALL_VALUE ? '' : val) as T | '');
  };

  return (
    <div className={cn('flex-1', className)}>
      <label
        htmlFor={selectId}
        className="block text-xs font-medium mb-1.5 uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      <Select value={selectValue} onValueChange={handleValueChange}>
        <SelectTrigger id={selectId} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
