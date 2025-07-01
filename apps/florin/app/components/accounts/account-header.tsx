import { ArrowLeft, Building2, CreditCard, Eye, EyeOff, RefreshCcw } from 'lucide-react'
import { RouteLink } from '~/components/route-link'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import type { RouterOutput } from '~/lib/trpc'
import { AccountConnectionDialog } from './account-connection-dialog'
import { AccountStatusDisplay } from './account-status-display'

interface AccountHeaderProps {
  account: RouterOutput['finance']['accounts']['all']['accounts'][number]
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
        return <CreditCard className="h-6 w-6" />
      default:
        return <Building2 className="h-6 w-6" />
    }
  }

  const formatBalance = (balance: string) => {
    const amount = Number.parseFloat(balance)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getAccountTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'credit':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'depository':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'investment':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'loan':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const isPlaidAccount = account.isPlaidConnected || false

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" className="flex items-center gap-1" asChild>
          <RouteLink to="/accounts">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Accounts
          </RouteLink>
        </Button>
        <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Account Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-muted rounded-lg">{getAccountTypeIcon(account.type)}</div>
              <div>
                <CardTitle className="text-xl">{account.name}</CardTitle>
                <CardDescription className="flex items-center space-x-2">
                  <Badge variant="outline" className={getAccountTypeColor(account.type)}>
                    {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                  </Badge>
                  {isPlaidAccount && <Badge variant="secondary">Connected via Plaid</Badge>}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Balance for Plaid accounts */}
          {isPlaidAccount && account.balance && (
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Current Balance:</span>
                <span className="text-2xl font-bold">
                  {isBalanceVisible ? formatBalance(account.balance) : '••••••'}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={onToggleBalance}>
                {isBalanceVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {/* Connection Management Section */}
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

            {/* Connection Status */}
            <AccountStatusDisplay account={account} onRefresh={onRefresh} />
          </div>
        </CardContent>
      </Card>
    </>
  )
}
