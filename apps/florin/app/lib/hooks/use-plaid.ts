'use client'

import { trpc } from '~/lib/trpc'

export const usePlaidConnections = () => trpc.finance.accounts.all.useQuery()

export function useCreateLinkToken() {
  return trpc.finance.plaid.createLinkToken.useMutation()
}

export function useExchangeToken() {
  const utils = trpc.useUtils()

  return trpc.finance.plaid.exchangeToken.useMutation({
    onSuccess: () => {
      utils.finance.accounts.all.invalidate()
      utils.finance.accounts.list.invalidate()
    },
  })
}

export function useSyncPlaidItem() {
  const utils = trpc.useUtils()

  return trpc.finance.plaid.syncItem.useMutation({
    onSuccess: () => {
      utils.finance.accounts.all.invalidate()
      utils.finance.transactions.list.invalidate()
    },
  })
}

export function useRemovePlaidConnection() {
  const utils = trpc.useUtils()

  return trpc.finance.plaid.removeConnection.useMutation({
    onSuccess: () => {
      utils.finance.accounts.all.invalidate()
      utils.finance.accounts.list.invalidate()
      utils.finance.transactions.list.invalidate()
    },
  })
}

export function useLinkAccountToInstitution() {
  const utils = trpc.useUtils()

  return trpc.finance.institutions.link.useMutation({
    onSuccess: () => {
      utils.finance.accounts.all.invalidate()
      utils.finance.accounts.list.invalidate()
    },
  })
}

export function useUnlinkAccountFromInstitution() {
  const utils = trpc.useUtils()

  return trpc.finance.institutions.unlink.useMutation({
    onSuccess: () => {
      utils.finance.accounts.all.invalidate()
      utils.finance.accounts.list.invalidate()
    },
  })
}
