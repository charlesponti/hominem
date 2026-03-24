import { Label } from '@hominem/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hominem/ui/components/ui/select';
import { useId } from 'react';

export interface Account {
  id: string;
  name: string;
}

export interface AccountSelectProps {
  selectedAccount: string;
  onAccountChange: (value: string) => void;
  accounts?: Account[];
  isLoading?: boolean;
  placeholder?: string;
  label?: string;
  className?: string;
  showLabel?: boolean;
}

export function AccountSelect({
  selectedAccount,
  onAccountChange,
  accounts = [],
  isLoading = false,
  placeholder = 'All accounts',
  label = 'Account',
  className,
  showLabel = false,
}: AccountSelectProps) {
  const id = useId();

  const selectElement = (
    <Select name="account" value={selectedAccount} onValueChange={onAccountChange}>
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
          accounts.map((account) => (
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
