'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerProps {
  date?: Date
  setDate(date: Date | undefined): void
  placeholder?: string
  value?: Date
  onDateSelect?(date: Date | undefined): void
}
export function DatePicker({
  date,
  setDate,
  placeholder = 'Pick a date',
  value,
  onDateSelect,
}: DatePickerProps) {
  // For backward compatibility
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(value)

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (onDateSelect) {
      setInternalDate(selectedDate)
      onDateSelect(selectedDate)
    } else {
      setDate(selectedDate)
    }
  }

  // Determine which date to use
  const displayDate = date !== undefined ? date : internalDate

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal gap-2',
            !displayDate && 'text-muted-foreground'
          )}
        >
          <CalendarIcon />
          {displayDate ? format(displayDate, 'PPP') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={displayDate} onSelect={handleDateSelect} initialFocus />
      </PopoverContent>
    </Popover>
  )
}
