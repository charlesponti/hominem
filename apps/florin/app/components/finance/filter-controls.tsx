'use client'

import type { FinanceAccount } from '@hominem/utils/types'
import { ListFilter } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { DatePicker } from '~/components/date-picker'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

interface FilterControlsProps {
  accounts: FinanceAccount[]
  accountsLoading: boolean
  selectedAccount: string
  setSelectedAccount: (value: string) => void
  dateFrom: Date | undefined
  setDateFrom: (date: Date | undefined) => void
  dateTo: Date | undefined
  setDateTo: (date: Date | undefined) => void

  // Props for controlling the dropdown
  open?: boolean
  onOpenChange?: (open: boolean) => void
  focusedFilterKey?: string | null
  setFocusedFilterKey?: (key: string | null) => void // Simplified type
}

export function FilterControls({
  accounts,
  accountsLoading,
  selectedAccount,
  setSelectedAccount,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  open,
  onOpenChange,
  focusedFilterKey,
}: FilterControlsProps) {
  const accountSelectRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open && focusedFilterKey) {
      if (focusedFilterKey === 'accountId' && accountSelectRef.current) {
        accountSelectRef.current.focus()
      }
      // Focusing for DatePicker would require modification to DatePicker or a wrapper
      // For now, date pickers won't be auto-focused by this mechanism
    }
  }, [open, focusedFilterKey])

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <ListFilter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-2 space-y-2">
        <DropdownMenuLabel>Apply Filters</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Account Filter */}
        <div className="space-y-1">
          <label htmlFor="account-filter" className="text-sm font-medium">
            Account
          </label>
          <Select name="account-filter" value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger ref={accountSelectRef}>
              {' '}
              {/* Added ref */}
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {accountsLoading ? (
                <SelectItem value="loading" disabled>
                  Loading accounts...
                </SelectItem>
              ) : (
                accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Date From Filter */}
        <div className="space-y-1">
          <label htmlFor="from-date-filter" className="text-sm font-medium">
            From Date
          </label>
          {/* Removed ref from DatePicker */}
          <DatePicker date={dateFrom} setDate={setDateFrom} placeholder="Start date" />
        </div>

        {/* Date To Filter */}
        <div className="space-y-1">
          <label htmlFor="to-date-filter" className="text-sm font-medium">
            To Date
          </label>
          {/* Removed ref from DatePicker */}
          <DatePicker date={dateTo} setDate={setDateTo} placeholder="End date" />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
