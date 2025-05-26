import type { FinanceAccount } from '@hominem/utils/types'
import { AlertCircleIcon, Banknote, CheckCircleIcon, LinkIcon } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { useFinancialInstitutions } from '~/lib/hooks/use-financial-institutions'
import { usePlaidAccountsByInstitution } from '~/lib/hooks/use-plaid-accounts-by-institution'
import { AccountConnectionDialog } from './account-connection-dialog'

interface AccountConnectionStatusProps {
  account: FinanceAccount
  showDialog?: boolean
}

export function AccountConnectionStatus({
  account,
  showDialog = true,
}: AccountConnectionStatusProps) {
  const { data: institutions } = useFinancialInstitutions()
  const { accounts: plaidAccounts } = usePlaidAccountsByInstitution(account.institutionId)

  const isLinked = !!account.institutionId
  const linkedInstitution = institutions?.find((inst) => inst.id === account.institutionId)
  const linkedPlaidAccount = plaidAccounts.find((plaidAcc) => plaidAcc.id === account.plaidItemId)

  if (!isLinked) {
    return (
      <div className="flex items-center space-x-2">
        <Badge variant="outline" className="text-muted-foreground">
          <AlertCircleIcon className="h-3 w-3 mr-1" />
          Not Connected
        </Badge>
        {showDialog && (
          <AccountConnectionDialog
            account={account}
            trigger={
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <LinkIcon className="h-3 w-3 mr-1" />
                Connect
              </Button>
            }
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <Badge variant="secondary" className="text-green-700 bg-green-50 border-green-200">
        <CheckCircleIcon className="h-3 w-3 mr-1" />
        Connected
      </Badge>
      {linkedInstitution && (
        <span className="text-sm text-muted-foreground">to {linkedInstitution.name}</span>
      )}
      {linkedPlaidAccount && (
        <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">
          <Banknote className="h-3 w-3 mr-1" />
          Plaid: {linkedPlaidAccount.name}{' '}
          {linkedPlaidAccount.mask ? `••••${linkedPlaidAccount.mask}` : ''}
        </Badge>
      )}
      {showDialog && (
        <AccountConnectionDialog
          account={account}
          trigger={
            <Button variant="ghost" size="sm" className="h-6 px-2">
              Manage
            </Button>
          }
        />
      )}
    </div>
  )
}

interface AccountConnectionSummaryProps {
  accounts: FinanceAccount[]
}

export function AccountConnectionSummary({ accounts }: AccountConnectionSummaryProps) {
  const connectedCount = accounts.filter((account) => account.institutionId).length
  const plaidLinkedCount = accounts.filter((account) => account.plaidItemId).length
  const totalCount = accounts.length
  const connectionRate = totalCount > 0 ? Math.round((connectedCount / totalCount) * 100) : 0

  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Account Connections</h3>
          <p className="text-sm text-muted-foreground">
            {connectedCount} of {totalCount} accounts connected ({connectionRate}%)
          </p>
          {plaidLinkedCount > 0 && (
            <p className="text-xs text-blue-600">
              <Banknote className="h-3 w-3 inline mr-1" />
              {plaidLinkedCount} linked to Plaid accounts
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">{connectedCount}</div>
          <div className="text-xs text-muted-foreground">Connected</div>
          {plaidLinkedCount > 0 && (
            <div className="text-sm font-medium text-blue-600">{plaidLinkedCount} Plaid</div>
          )}
        </div>
      </div>
    </div>
  )
}
