import { Calendar } from 'lucide-react'
import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hominem/ui/components/ui/select'

interface MonthOption {
  value: string
  label: string
}

interface DateMonthSelectProps {
  selectedMonthYear: string
  onMonthChange: (value: string) => void
  monthsBack?: number
  className?: string
  placeholder?: string
}

export function DateMonthSelect({
  selectedMonthYear,
  onMonthChange,
  monthsBack = 12,
  className = 'w-[200px]',
  placeholder = 'Select month',
}: DateMonthSelectProps) {
  const monthOptions = useMemo<MonthOption[]>(() => {
    const options: MonthOption[] = []
    const today = new Date()
    for (let i = 0; i < monthsBack; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      options.push({
        value: `${year}-${month}`,
        label: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
      })
    }
    return options
  }, [monthsBack])

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4" />
      <Select value={selectedMonthYear} onValueChange={onMonthChange}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// Utility function to get current month-year in YYYY-MM format
export const getCurrentMonthYear = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  return `${year}-${month}`
}

// Export the MonthOption type for use in other components
export type { MonthOption }
