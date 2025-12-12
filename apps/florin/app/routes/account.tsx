import { useApiClient } from '@hominem/ui'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@hominem/ui/components/ui/alert-dialog'
import { Button, buttonVariants } from '@hominem/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@hominem/ui/components/ui/card'
import { toast } from '@hominem/ui/components/ui/use-toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ExportTransactions } from '~/components/finance/export-transactions'
import { RouteLink } from '~/components/route-link'
import { useSupabaseAuth } from '~/lib/supabase/use-auth'

export default function AccountPage() {
  const { logout } = useSupabaseAuth()
  const api = useApiClient()
  const queryClient = useQueryClient()
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  const _handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
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
            <ExportTransactions />
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
                disabled={deleteAllFinanceData.isPending}
                className="mt-2 sm:mt-0"
              >
                {deleteAllFinanceData.isPending ? 'Deleting...' : 'Delete All Data'}
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
              <Button variant="outline" onClick={() => logout()}>
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
            <AlertDialogCancel disabled={deleteAllFinanceData.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAllFinanceData.mutate()}
              disabled={deleteAllFinanceData.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteAllFinanceData.isPending ? 'Deleting...' : 'Yes, delete all data'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
