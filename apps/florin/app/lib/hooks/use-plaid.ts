'use client'

import { trpc } from '~/lib/trpc'

// Export tRPC hooks directly for simple queries
export const usePlaidConnections = () => trpc.finance.accounts.all.useQuery()

// Hook for creating a Plaid link token
export function useCreateLinkToken() {
  return trpc.finance.plaid.createLinkToken.useMutation()
}

// Hook for exchanging a public token for an access token
export function useExchangeToken() {
  const utils = trpc.useUtils()

  return trpc.finance.plaid.exchangeToken.useMutation({
    onSuccess: () => {
      // Invalidate related queries to refresh connections and accounts
      utils.finance.accounts.all.invalidate()
      utils.finance.accounts.list.invalidate()
    },
  })
}

// Hook for syncing a Plaid item
export function useSyncPlaidItem() {
  const utils = trpc.useUtils()

  return trpc.finance.plaid.syncItem.useMutation({
    onSuccess: () => {
      // Invalidate related queries to refresh data
      utils.finance.accounts.all.invalidate()
      utils.finance.transactions.list.invalidate()
    },
  })
}

// Hook for removing a Plaid connection
export function useRemovePlaidConnection() {
  const utils = trpc.useUtils()

  return trpc.finance.plaid.removeConnection.useMutation({
    onSuccess: () => {
      // Invalidate related queries to refresh data
      utils.finance.accounts.all.invalidate()
      utils.finance.accounts.list.invalidate()
      utils.finance.transactions.list.invalidate()
    },
  })
}

// Hook for linking an account to an institution
export function useLinkAccountToInstitution() {
  const utils = trpc.useUtils()

  return trpc.finance.institutions.link.useMutation({
    onSuccess: () => {
      utils.finance.accounts.all.invalidate()
      utils.finance.accounts.list.invalidate()
    },
  })
}

// Hook for unlinking an account from an institution
export function useUnlinkAccountFromInstitution() {
  const utils = trpc.useUtils()

  return trpc.finance.institutions.unlink.useMutation({
    onSuccess: () => {
      utils.finance.accounts.all.invalidate()
      utils.finance.accounts.list.invalidate()
    },
  })
}

// Legacy hook for backward compatibility - now uses the unified accounts endpoint
export function usePlaidAccounts() {
  return trpc.finance.accounts.all.useQuery()
}
