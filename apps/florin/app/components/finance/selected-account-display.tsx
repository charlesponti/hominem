import { Badge } from '~/components/ui/badge'
import { useFinanceAccountsWithMap } from '~/lib/hooks/use-finance-data'
import { useSelectedAccount } from '~/lib/hooks/use-selected-account'

export function SelectedAccountDisplay() {
  const { selectedAccount } = useSelectedAccount()
  const { accountsMap } = useFinanceAccountsWithMap()

  const selectedAccountData = selectedAccount !== 'all' ? accountsMap.get(selectedAccount) : null

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Selected Account:</span>
      {selectedAccount === 'all' ? (
        <Badge variant="secondary">All Accounts</Badge>
      ) : selectedAccountData ? (
        <Badge variant="default">{selectedAccountData.name}</Badge>
      ) : (
        <Badge variant="outline">Loading...</Badge>
      )}
    </div>
  )
}
