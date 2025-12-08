import { DatePicker } from '@hominem/ui/components/date-picker'

interface DueDatePickerProps {
  value: Date | undefined
  onSelect: (date: Date | undefined) => void
  disabled?: boolean
  className?: string
  id?: string
  placeholder?: string
}

export function DueDatePicker({
  value,
  onSelect,
  disabled = false,
  className,
  id = 'due-date-picker',
  placeholder = 'Pick a date',
}: DueDatePickerProps) {
  return (
    <DatePicker
      value={value}
      onSelect={onSelect}
      disabled={disabled}
      className={className}
      id={id}
      placeholder={placeholder}
      label="Due Date"
    />
  )
}
