import { Label } from '@hominem/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hominem/ui/components/ui/select';
import { useId } from 'react';

import { useFinanceAccounts } from '~/lib/hooks/use-finance-data';

interface AccountSelectProps {
  selectedAccount: string;
  setSelectedAccount?: (value: string) => void;
  onAccountChange?: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  label?: string;
  className?: string;
  showLabel?: boolean;
}

export function AccountSelect({
  selectedAccount,
  setSelectedAccount,
  onAccountChange,
  isLoading: externalLoading,
  placeholder = 'All accounts',
  label = 'Account',
  className,
  showLabel = false,
}: AccountSelectProps) {
  const id = useId();

  // Use external data if provided, otherwise fetch internally
  const { data: internalAccounts, isLoading: internalLoading } = useFinanceAccounts();
  const accounts = internalAccounts || [];
  const isLoading = externalLoading !== undefined ? externalLoading : internalLoading;

  // Support both prop naming conventions for backward compatibility
  const handleChange = onAccountChange || setSelectedAccount;

  if (!handleChange) {
    throw new Error('AccountSelect requires either setSelectedAccount or onAccountChange prop');
  }

  const selectElement = (
    <Select name="account" value={selectedAccount} onValueChange={handleChange}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[250px] overflow-y-auto">
        <SelectItem value="all">All accounts</SelectItem>
        {isLoading ? (
          <SelectItem value="loading" disabled>
            Loading accounts...
          </SelectItem>
        ) : accounts.length === 0 ? (
          <SelectItem value="no-accounts" disabled>
            No accounts available
          </SelectItem>
        ) : (
          accounts.map((account: { id: string; name: string }) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );

  if (showLabel) {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        {selectElement}
      </div>
    );
  }

  return selectElement;
}
