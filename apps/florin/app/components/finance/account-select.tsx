import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import type { useFinanceAccounts } from '~/lib/hooks/use-finance-data'

type AccountsData = ReturnType<typeof useFinanceAccounts>['accounts']

interface AccountSelectProps {
  accounts: AccountsData
  selectedAccount: string
  setSelectedAccount: (value: string) => void
  className?: string
  isLoading?: boolean
}

export function AccountSelect({
  accounts,
  selectedAccount,
  setSelectedAccount,
  className,
  isLoading = false,
}: AccountSelectProps) {
  return (
    <Select name="account" value={selectedAccount} onValueChange={setSelectedAccount}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="All accounts" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All accounts</SelectItem>
        {isLoading ? (
          <SelectItem value="loading" disabled>
            Loading accounts...
          </SelectItem>
        ) : accounts.length === 0 ? (
          <SelectItem value="no-accounts" disabled>
            No accounts available
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
  )
}
