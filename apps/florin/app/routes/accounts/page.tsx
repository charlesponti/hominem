'use client'

import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  Plus,
  RefreshCcw,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import {
  AccountConnectionStatus,
  AccountConnectionSummary,
} from '~/components/accounts/account-connection-status'
import { AccountCard } from '~/components/finance/account-card'
import { PlaidConnectButton, PlaidLink } from '~/components/plaid/plaid-link'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { toast } from '~/components/ui/use-toast'
import { useAllAccounts } from '~/lib/hooks/use-finance-data'
import { useRemovePlaidConnection, useSyncPlaidItem } from '~/lib/hooks/use-plaid'
import { cn } from '~/lib/utils'

interface PlaidConnection {
  id: string
  itemId: string
  institutionId: string
  institutionName: string
  status: 'active' | 'error' | 'pending_expiration' | 'revoked'
  lastSyncedAt: string | null
  error: string | null
  createdAt: string
}

interface PlaidAccount {
  id: string
  name: string
  type: string
  balance: string
  mask: string | null
  subtype: string | null
  institutionId: string
  plaidItemId: string
  institutionName: string
  institutionLogo: string | null
}

function ConnectionCard({ connection }: { connection: PlaidConnection }) {
  const { syncItem, isLoading: isSyncing } = useSyncPlaidItem()
  const { removeConnection, isLoading: isRemoving } = useRemovePlaidConnection()

  const getStatusBadge = (status: PlaidConnection['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        )
      case 'pending_expiration':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Expiring Soon
          </Badge>
        )
      case 'revoked':
        return (
          <Badge variant="outline" className="text-gray-600">
            Revoked
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleSync = async () => {
    try {
      await syncItem.mutateAsync(connection.itemId)
      toast({
        title: 'Sync Started',
        description: `Started syncing data for ${connection.institutionName}`,
      })
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: 'Failed to start sync. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleRemove = async () => {
    try {
      await removeConnection.mutateAsync(connection.itemId)
      toast({
        title: 'Connection Removed',
        description: `${connection.institutionName} has been disconnected from your account.`,
      })
    } catch (error) {
      toast({
        title: 'Removal Failed',
        description: 'Failed to remove connection. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{connection.institutionName}</CardTitle>
              <CardDescription>Connected {formatDate(connection.createdAt)}</CardDescription>
            </div>
          </div>
          {getStatusBadge(connection.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {connection.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{connection.error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Last Synced</p>
            <p className="font-medium">{formatDate(connection.lastSyncedAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Item ID</p>
            <p className="font-mono text-xs bg-muted px-2 py-1 rounded">{connection.itemId}</p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing || connection.status === 'revoked'}
          >
            {isSyncing ? (
              <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCcw className="w-4 h-4 mr-2" />
            )}
            Sync Now
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isRemoving}>
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Bank Connection</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the connection to {connection.institutionName}. All
                  associated accounts and transactions will be removed from your account. This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemove}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remove Connection
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}

function PlaidAccountCard({
  account,
  showBalance = true,
}: { account: PlaidAccount; showBalance?: boolean }) {
  const [isBalanceVisible, setIsBalanceVisible] = useState(showBalance)

  const getAccountTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'credit':
        return <CreditCard className="h-4 w-4" />
      default:
        return <Building2 className="h-4 w-4" />
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

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-muted rounded">{getAccountTypeIcon(account.type)}</div>
            <div>
              <h4 className="font-medium">{account.name}</h4>
              <p className="text-sm text-muted-foreground">
                {account.institutionName}
                {account.mask && ` •••• ${account.mask}`}
              </p>
            </div>
          </div>
          <Badge className={cn('text-xs', getAccountTypeColor(account.type))}>
            {account.subtype || account.type}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Balance:</span>
            <span className="font-semibold">
              {isBalanceVisible ? formatBalance(account.balance) : '••••••'}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsBalanceVisible(!isBalanceVisible)}>
            {isBalanceVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AccountsPage() {
  const {
    accounts: allAccounts,
    connections,
    isLoading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts,
  } = useAllAccounts()

  const handleConnectionSuccess = (institutionName: string) => {
    toast({
      title: 'Bank Connected!',
      description: `Successfully connected to ${institutionName}. Your accounts will appear shortly.`,
    })
  }

  const handleConnectionError = (error: Error) => {
    toast({
      title: 'Connection Failed',
      description: error.message || 'Failed to connect bank account. Please try again.',
      variant: 'destructive',
    })
  }

  const isLoading = accountsLoading
  const hasError = accountsError
  const hasConnections = connections.length > 0
  const hasAccounts = allAccounts.length > 0

  // Separate manually added accounts from Plaid accounts
  const manualAccounts = allAccounts.filter((account) => !account.isPlaidConnected)
  const plaidAccounts = allAccounts.filter((account) => account.isPlaidConnected)

  const refreshData = async () => {
    await refetchAccounts()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Accounts</h1>
          <p className="text-muted-foreground">
            Manage your connected bank accounts and financial data sources
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refreshData} disabled={isLoading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <PlaidConnectButton
            variant="default"
            onSuccess={handleConnectionSuccess}
            onError={(e) =>
              e instanceof Error
                ? handleConnectionError(e)
                : handleConnectionError(new Error('Unknown error'))
            }
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Bank Account
          </PlaidConnectButton>
        </div>
      </div>

      {hasError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            {accountsError instanceof Error
              ? accountsError.message
              : accountsError || 'Failed to load banking data'}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <RefreshCcw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading your bank accounts...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !hasConnections && !hasAccounts && !hasError && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Bank Accounts</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Connect your bank accounts to automatically import transactions and get insights into
              your finances.
            </p>
            <PlaidLink
              variant="card"
              onSuccess={handleConnectionSuccess}
              onError={handleConnectionError}
            />
          </CardContent>
        </Card>
      )}

      {/* Unified Accounts Section */}
      {hasAccounts && (
        <div className="space-y-6">
          {/* Account Connection Summary */}
          <AccountConnectionSummary accounts={allAccounts} />

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Accounts</h2>
            <Badge variant="secondary">{allAccounts.length} accounts</Badge>
          </div>

          {/* Manual Accounts Section */}
          {manualAccounts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Imported Accounts</h3>
                <Badge variant="outline">{manualAccounts.length} accounts</Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {manualAccounts.map((account) => (
                  <div key={account.id} className="space-y-2">
                    <AccountCard account={account} recentTransactions={account.transactions} />
                    <AccountConnectionStatus account={account} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plaid Connected Accounts Section */}
          {plaidAccounts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Connected Accounts</h3>
                <Badge variant="outline">{plaidAccounts.length} accounts</Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plaidAccounts.map((account) => (
                  <PlaidAccountCard
                    key={account.id}
                    account={{
                      id: account.id,
                      name: account.name,
                      type: account.type,
                      balance: account.balance,
                      mask: account.mask,
                      subtype: account.subtype,
                      institutionId: account.institutionId || '',
                      plaidItemId: account.plaidItemId || '',
                      institutionName: account.institutionName || '',
                      institutionLogo: account.institutionLogo || null,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bank Connections Section */}
      {hasConnections && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Connected Banks</h2>
            <Badge variant="secondary">{connections.length} connected</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {connections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={{
                  ...connection,
                  status: connection.status as
                    | 'active'
                    | 'error'
                    | 'pending_expiration'
                    | 'revoked',
                  lastSyncedAt: connection.lastSyncedAt?.toString() || null,
                  createdAt: connection.createdAt.toString(),
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
