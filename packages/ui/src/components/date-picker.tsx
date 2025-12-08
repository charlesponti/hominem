import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Calendar } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

interface DatePickerProps {
  value: Date | undefined
  onSelect: (date: Date | undefined) => void
  disabled?: boolean
  className?: string
  id?: string
  placeholder?: string
  label?: string
  dateFormat?: string
  showLabel?: boolean
  containerClassName?: string
  popoverAlign?: 'start' | 'center' | 'end'
  variant?: 'outline' | 'default' | 'destructive' | 'secondary' | 'ghost' | 'link'
}

export function DatePicker({
  value,
  onSelect,
  disabled = false,
  className = 'w-full justify-start text-left font-normal bg-white/90 dark:bg-slate-700/90 dark:text-slate-100 border-slate-200/70 dark:border-slate-600/70 placeholder-slate-400 dark:placeholder-slate-500 backdrop-blur-sm focus:border-blue-300/80 dark:focus:border-blue-500/80 focus:ring-2 focus:ring-blue-300/30 dark:focus:ring-blue-500/30 transition-all',
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
        <label
          htmlFor={id}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
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
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, dateFormat) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white dark:bg-slate-800" align={popoverAlign}>
          <Calendar mode="single" selected={value} onSelect={onSelect} initialFocus />
        </PopoverContent>
      </Popover>
    </div>
  )
}
