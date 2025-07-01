import { ListFilter } from 'lucide-react'
import { AccountSelect } from '~/components/account-select'
import { DatePicker } from '~/components/date-picker'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import type { useFinanceAccounts } from '~/lib/hooks/use-finance-data'

interface FilterControlsProps {
  accounts: ReturnType<typeof useFinanceAccounts>['data']
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
        <AccountSelect
          selectedAccount={selectedAccount}
          onAccountChange={setSelectedAccount}
          accounts={accounts}
          isLoading={accountsLoading}
          showLabel={true}
          label="Account"
        />

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
