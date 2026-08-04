import { create } from 'zustand';

interface SelectedAccountState {
  selectedAccounts: string[];
  setSelectedAccounts: (accountIds: string[]) => void;
}

const useSelectedAccountStore = create<SelectedAccountState>((set) => ({
  selectedAccounts: [],
  setSelectedAccounts: (accountIds: string[]) => set({ selectedAccounts: accountIds }),
}));

export function useSelectedAccount() {
  const { selectedAccounts, setSelectedAccounts } = useSelectedAccountStore();

  return {
    selectedAccounts,
    setSelectedAccounts,
    // Back-compat single-account view for pages that only filter by one account.
    selectedAccount: selectedAccounts[0] ?? 'all',
    setSelectedAccount: (accountId: string) =>
      setSelectedAccounts(accountId === 'all' ? [] : [accountId]),
  };
}
