import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface DatePickerProps {
  value: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  disabled?: boolean | undefined;
  className?: string | undefined;
  id?: string | undefined;
  placeholder?: string | undefined;
  label?: string | undefined;
  dateFormat?: string | undefined;
  showLabel?: boolean | undefined;
  containerClassName?: string | undefined;
  popoverAlign?: 'start' | 'center' | 'end' | undefined;
  variant?: 'outline' | 'default' | 'destructive' | 'secondary' | 'ghost' | 'link' | undefined;
}

export function DatePicker({
  value,
  onSelect,
  disabled = false,
  className = 'w-full justify-start text-left font-normal bg-muted border-border placeholder:text-muted-foreground backdrop-blur-sm focus:border-ring focus:ring-2 focus:ring-ring/30 transition-all',
  id = 'date-picker',
  placeholder = 'Pick a date',
  label,
  dateFormat = 'MMM d, yyyy',
  showLabel = true,
  containerClassName = 'flex-1 min-w-[180px]',
  popoverAlign = 'start',
  variant = 'outline',
}: DatePickerProps) {
  return (
    <div className={containerClassName}>
      {showLabel && label && (
        <label htmlFor={id} className="block text-sm font-medium text-foreground mb-2">
          {label}
        </label>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={variant}
            disabled={disabled}
            className={cn(className, !value && 'text-muted-foreground')}
            id={id}
          >
            <CalendarIcon className="mr-2 size-4" />
            {value ? format(value, dateFormat) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-background" align={popoverAlign}>
          <Calendar mode="single" selected={value} onSelect={onSelect} initialFocus />
        </PopoverContent>
      </Popover>
    </div>
  );
}
