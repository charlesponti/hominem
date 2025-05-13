import type { FinanceAccount, Transaction } from '@hominem/utils/types'
import { AccountCard } from './account-card'

type Account = FinanceAccount & { transactions: Transaction[] }
interface AccountsListProps {
  accounts: Account[]
  loading: boolean
  error: string | null
}

export function AccountsList({ accounts, loading, error }: AccountsListProps) {
  if (loading) {
    return <div className="col-span-full text-center p-8">Loading accounts...</div>
  }

  if (error) {
    return <div className="col-span-full text-center p-8 text-red-500">{error}</div>
  }

  if (accounts.length === 0) {
    return <div className="col-span-full text-center p-8">No accounts found.</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {accounts.map((account) => (
        <AccountCard key={account.id} account={account} recentTransactions={account.transactions} />
      ))}
    </div>
  )
}
