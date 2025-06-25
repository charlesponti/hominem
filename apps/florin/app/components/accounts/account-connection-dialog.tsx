import type { FinanceAccount } from '@hominem/utils/types'
import { useQueryClient } from '@tanstack/react-query'
import { LinkIcon, UnlinkIcon } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { useFinancialInstitutions } from '~/lib/hooks/use-financial-institutions'
import { useLinkAccountToInstitution, useUnlinkAccountFromInstitution } from '~/lib/hooks/use-plaid'
import { usePlaidAccountsByInstitution } from '~/lib/hooks/use-plaid-accounts-by-institution'

interface AccountConnectionDialogProps {
  account: FinanceAccount
  trigger?: React.ReactNode
}

export function AccountConnectionDialog({ account, trigger }: AccountConnectionDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('')
  const [selectedPlaidAccountId, setSelectedPlaidAccountId] = useState<string>('')
  const queryClient = useQueryClient()

  const { institutions, isLoading: institutionsLoading } = useFinancialInstitutions()
  const { accounts: plaidAccounts, isLoading: plaidAccountsLoading } =
    usePlaidAccountsByInstitution(selectedInstitutionId)
  const linkMutation = useLinkAccountToInstitution()
  const unlinkMutation = useUnlinkAccountFromInstitution()

  const isLinked = !!account.institutionId
  const linkedInstitution = institutions?.find((inst: any) => inst.id === account.institutionId)
  const linkedPlaidAccount = plaidAccounts.find(
    (plaidAcc: any) => plaidAcc.id === account.plaidItemId
  )

  const handleInstitutionChange = (institutionId: string) => {
    setSelectedInstitutionId(institutionId)
    setSelectedPlaidAccountId('') // Reset Plaid account selection when institution changes
  }

  const handleLink = async () => {
    if (!selectedInstitutionId) return

    try {
      await linkMutation.linkAccount.mutateAsync({
        accountId: account.id,
        institutionId: selectedInstitutionId,
        plaidItemId:
          selectedPlaidAccountId && selectedPlaidAccountId !== 'none'
            ? selectedPlaidAccountId
            : undefined,
      })
      setOpen(false)
      setSelectedInstitutionId('')
      setSelectedPlaidAccountId('')
    } catch (error) {
      console.error('Failed to link account:', error)
    }
  }

  const handleUnlink = async () => {
    try {
      await unlinkMutation.unlinkAccount.mutateAsync(account.id)
      setOpen(false)
    } catch (error) {
      console.error('Failed to unlink account:', error)
    }
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      {isLinked ? (
        <>
          <UnlinkIcon className="h-4 w-4 mr-2" />
          Manage Connection
        </>
      ) : (
        <>
          <LinkIcon className="h-4 w-4 mr-2" />
          Connect Account
        </>
      )}
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isLinked ? 'Manage Account Connection' : 'Connect Account to Institution'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Account Details</h4>
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium">{account.name}</div>
              <div className="text-sm text-muted-foreground">{account.type}</div>
              {account.balance && (
                <div className="text-sm">Balance: ${Number(account.balance).toLocaleString()}</div>
              )}
            </div>
          </div>

          {isLinked && linkedInstitution ? (
            <div>
              <h4 className="text-sm font-medium mb-2">Current Connection</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="font-medium">{linkedInstitution.name}</div>
                    <Badge variant="secondary">Connected</Badge>
                  </div>
                </div>
                {linkedPlaidAccount && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm font-medium text-blue-900">Linked to Plaid Account</div>
                    <div className="text-sm text-blue-700">
                      {linkedPlaidAccount.name}{' '}
                      {linkedPlaidAccount.mask ? `••••${linkedPlaidAccount.mask}` : ''}
                    </div>
                    <div className="text-xs text-blue-600">
                      Balance: ${Number(linkedPlaidAccount.balance).toLocaleString()}
                    </div>
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleUnlink}
                  disabled={unlinkMutation.isLoading}
                  className="w-full"
                >
                  {unlinkMutation.isLoading ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Select Institution</h4>
                <Select value={selectedInstitutionId} onValueChange={handleInstitutionChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a financial institution" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutionsLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading institutions...
                      </SelectItem>
                    ) : (
                      institutions?.map((institution: any) => (
                        <SelectItem key={institution.id} value={institution.id}>
                          {institution.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedInstitutionId && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Link to Plaid Account (Optional)</h4>
                  <Select value={selectedPlaidAccountId} onValueChange={setSelectedPlaidAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a connected Plaid account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific Plaid account</SelectItem>
                      {plaidAccountsLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading Plaid accounts...
                        </SelectItem>
                      ) : plaidAccounts.length === 0 ? (
                        <SelectItem value="no-accounts" disabled>
                          No Plaid accounts found for this institution
                        </SelectItem>
                      ) : (
                        plaidAccounts.map((plaidAccount: any) => (
                          <SelectItem key={plaidAccount.id} value={plaidAccount.id}>
                            <div className="flex flex-col">
                              <span>
                                {plaidAccount.name}{' '}
                                {plaidAccount.mask ? `••••${plaidAccount.mask}` : ''}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {plaidAccount.type} • $
                                {Number(plaidAccount.balance).toLocaleString()}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Link this imported account to a specific Plaid account for better transaction
                    matching.
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleLink}
                  disabled={!selectedInstitutionId || linkMutation.isLoading}
                >
                  {linkMutation.isLoading ? 'Connecting...' : 'Connect Account'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
