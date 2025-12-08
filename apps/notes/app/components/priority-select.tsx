import type { Priority } from '@hominem/data/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hominem/ui/components/ui/select'

interface PrioritySelectProps {
  value: Priority
  onValueChange: (value: Priority) => void
  disabled?: boolean
  className?: string
  id?: string
}

export function PrioritySelect({
  value,
  onValueChange,
  disabled = false,
  className = 'bg-white/90 dark:bg-slate-700/90',
  id = 'priority-select',
}: PrioritySelectProps) {
  return (
    <div className="flex-1">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
      >
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
        <SelectContent className="bg-white dark:bg-slate-800 w-full">
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
