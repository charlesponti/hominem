'use client'

import type { FinanceAccount } from '@hominem/utils/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

interface AccountSelectProps {
  accounts: FinanceAccount[]
  selectedAccount: string
  setSelectedAccount: (value: string) => void
  className?: string
}

export function AccountSelect({
  accounts,
  selectedAccount,
  setSelectedAccount,
  className,
}: AccountSelectProps) {
  return (
    <Select name="account" value={selectedAccount} onValueChange={setSelectedAccount}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="All accounts" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All accounts</SelectItem>
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            {account.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
