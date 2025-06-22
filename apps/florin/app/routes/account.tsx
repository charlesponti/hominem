import { useApiClient } from '@hominem/ui'
import type { Transaction as FinanceTransaction } from '@hominem/utils/types'
import type { User } from '@supabase/supabase-js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { RouteLink } from '~/components/route-link'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Button, buttonVariants } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { toast } from '~/components/ui/use-toast'
import { useFinanceAccounts, useFinanceTransactions } from '~/lib/hooks/use-finance-data'
import { useSupabaseAuth } from '~/lib/supabase/use-auth'

export default function AccountPage() {
  const { getUser, signOut } = useSupabaseAuth()
  const [user, setUser] = useState<User | null>(null)
  const api = useApiClient()
  const queryClient = useQueryClient()
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  const { accountsMap } = useFinanceAccounts()
  const { transactions } = useFinanceTransactions()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Error fetching user:', error)
      }
    }

    fetchUser()
  }, [getUser])

  const handleLogout = async () => {
    try {
      await signOut()
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  const exportTransactions = () => {
    if (!transactions || transactions.length === 0) {
      toast({
        title: 'No Transactions',
        description: 'There are no transactions to export.',
        variant: 'default',
      })
      return
    }
    const headers = ['Date', 'Description', 'Amount', 'Category', 'Type', 'Account']
    const csvRows = [
      headers.join(','),
      ...transactions.map((tx: FinanceTransaction) => {
        const account = accountsMap.get(tx.accountId)
        return [
          tx.date,
          `"${tx.description?.replace(/"/g, '""') || ''}"`,
          tx.amount,
          tx.category || 'Other',
          tx.type,
          account?.name || 'Unknown',
        ].join(',')
      }),
    ]
    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const date = new Date().toISOString().split('T')[0]
    a.href = url
    a.download = `transactions-${date}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast({
      title: 'Export Successful',
      description: 'Your transactions have been exported as a CSV file.',
    })
  }

  const deleteAllFinanceData = useMutation<void, Error, void>({
    mutationFn: async () => api.delete('/api/finance'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['finance'] }) // Invalidate all finance related queries
      toast({
        title: 'Data Deleted',
        description: 'All your finance data has been successfully deleted.',
      })
      setShowConfirmDelete(false)
    },
    onError: (error: Error) => {
      console.error('Error deleting finance data:', error)
      toast({
        title: 'Error',
        description:
          error.message || 'There was a problem deleting your finance data. Please try again.',
        variant: 'destructive',
      })
      setShowConfirmDelete(false)
    },
  })

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
          Finance Settings
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage your financial data, export transactions, and other account settings.
        </p>
      </header>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>
              Export your transaction data or import new transactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-md">
              <div>
                <h3 className="text-md font-semibold">Export Transactions</h3>
                <p className="text-sm text-muted-foreground">
                  Download all your transactions as a CSV file.
                </p>
              </div>
              <Button variant="outline" onClick={exportTransactions} className="mt-2 sm:mt-0">
                Export CSV
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-md">
              <div>
                <h3 className="text-md font-semibold">Import Transactions</h3>
                <p className="text-sm text-muted-foreground">
                  Upload new transactions from a CSV file.
                </p>
              </div>
              <RouteLink
                to="/import"
                className={buttonVariants({ variant: 'outline', className: 'mt-2 sm:mt-0' })}
              >
                Go to Import Page
              </RouteLink>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-destructive/50 rounded-md bg-destructive/5">
              <div>
                <h3 className="text-md font-semibold text-destructive">Delete All Finance Data</h3>
                <p className="text-sm text-destructive/80">
                  Permanently remove all your accounts, transactions, and budget information.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowConfirmDelete(true)}
                disabled={deleteAllFinanceData.isLoading}
                className="mt-2 sm:mt-0"
              >
                {deleteAllFinanceData.isLoading ? 'Deleting...' : 'Delete All Data'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>Manage your session.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div>
                <h3 className="font-medium">Sign Out</h3>
                <p className="text-sm text-muted-foreground">End your current session.</p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all your finance data from
              our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAllFinanceData.isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAllFinanceData.mutate()}
              disabled={deleteAllFinanceData.isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteAllFinanceData.isLoading ? 'Deleting...' : 'Yes, delete all data'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
