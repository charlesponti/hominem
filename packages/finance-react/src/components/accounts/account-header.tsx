import { Button } from '@hominem/ui/button'
import { Badge } from '@hominem/ui/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@hominem/ui/components/ui/card'
import { ArrowLeft, Building2, CreditCard, Eye, EyeOff, RefreshCcw } from 'lucide-react'
import { Link } from 'react-router'

import type { AccountWithPlaidInfo } from '@hominem/rpc/types/finance.types'

import { AccountConnectionDialog } from './account-connection-dialog'
import { AccountStatusDisplay } from './account-status-display'

interface AccountHeaderProps {
  account: AccountWithPlaidInfo
  isBalanceVisible: boolean
  onToggleBalance: () => void
  onRefresh: () => void
  isLoading: boolean
}

export function AccountHeader({
  account,
  isBalanceVisible,
  onToggleBalance,
  onRefresh,
  isLoading,
}: AccountHeaderProps) {
  const getAccountTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'credit':
        return <CreditCard className="size-6" />
      default:
        return <Building2 className="size-6" />
    }
  }

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(balance)
  }

  const getAccountTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'credit':
        return 'text-foreground border-2 border-emphasis-lower'
      case 'depository':
        return 'text-foreground border-2 border-emphasis-lower'
      case 'investment':
        return 'text-foreground border-2 border-emphasis-subtle'
      case 'loan':
        return 'text-foreground border-2 border-emphasis-minimal'
      default:
        return 'text-foreground border-2 border-border'
    }
  }

  const isPlaidAccount = !!account.plaidItemId

  return (
    <>
      <div className="flex items-center justify-between">
        <Button variant="outline" className="flex items-center gap-1" asChild>
          <Link to="/accounts">
            <ArrowLeft className="size-4 mr-2" />
            Back to Accounts
          </Link>
        </Button>
        <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
          <RefreshCcw className="size-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-muted">{getAccountTypeIcon(account.accountType)}</div>
              <div>
                <CardTitle className="text-xl">{account.name}</CardTitle>
                <CardDescription className="flex items-center space-x-2">
                  <Badge variant="outline" className={getAccountTypeColor(account.accountType)}>
                    {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)}
                  </Badge>
                  {isPlaidAccount && <Badge variant="secondary">Connected via Plaid</Badge>}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isPlaidAccount && account.balance && (
            <div className="flex items-center justify-between p-4 bg-muted/50">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Current Balance:</span>
                <span className="text-2xl font-bold">
                  {isBalanceVisible ? formatBalance(Number(account.balance)) : '••••••'}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={onToggleBalance}>
                {isBalanceVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Connection Management</h3>
              <AccountConnectionDialog
                account={account}
                trigger={
                  <Button variant="outline" size="sm">
                    Manage Connection
                  </Button>
                }
              />
            </div>
            <AccountStatusDisplay account={account} onRefresh={onRefresh} />
          </div>
        </CardContent>
      </Card>
    </>
  )
}
