import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ponti-studios/ui/forms';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@ponti-studios/ui/overlays';
import { Button, Label } from '@ponti-studios/ui/primitives';
import { ChevronDownIcon } from 'lucide-react';
import { useId, useMemo } from 'react';

import { useFinanceAccounts } from '~/lib/hooks/use-finance-data';

interface AccountSelectSingleProps {
  multiple?: false;
  selectedAccount: string;
  setSelectedAccount?: (value: string) => void;
  onAccountChange?: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  label?: string;
  className?: string;
  showLabel?: boolean;
}

interface AccountSelectMultipleProps {
  multiple: true;
  selectedAccounts: string[];
  onAccountsChange: (value: string[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  label?: string;
  className?: string;
  showLabel?: boolean;
}

type AccountSelectProps = AccountSelectSingleProps | AccountSelectMultipleProps;

export function AccountSelect(props: AccountSelectProps) {
  const id = useId();
  const {
    isLoading: externalLoading,
    placeholder = 'All accounts',
    label = 'Account',
    className,
    showLabel = false,
  } = props;

  // Use external data if provided, otherwise fetch internally
  const { data: internalAccounts, isLoading: internalLoading } = useFinanceAccounts();
  const accounts = Array.isArray(internalAccounts) ? internalAccounts : [];
  const isLoading = externalLoading !== undefined ? externalLoading : internalLoading;

  const items = useMemo(
    () => [
      { value: 'all', label: 'All accounts' },
      ...accounts.map((account: { id: string; name: string }) => ({
        value: account.id,
        label: account.name,
      })),
    ],
    [accounts],
  );

  const triggerClassName = `h-10! w-full ${className ?? ''}`.trim();

  const selectElement = props.multiple ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={`${triggerClassName} justify-between font-normal`}
        >
          <span className="truncate">
            {props.selectedAccounts.length === 0
              ? placeholder
              : props.selectedAccounts.length === 1
                ? (accounts.find((a: { id: string }) => a.id === props.selectedAccounts[0])?.name ??
                  placeholder)
                : `${props.selectedAccounts.length} accounts selected`}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-[250px] min-w-48 overflow-y-auto">
        {isLoading ? (
          <div className="text-muted-foreground px-2 py-1.5 text-sm">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="text-muted-foreground px-2 py-1.5 text-sm">No accounts available</div>
        ) : (
          accounts.map((account: { id: string; name: string }) => (
            <DropdownMenuCheckboxItem
              key={account.id}
              checked={props.selectedAccounts.includes(account.id)}
              onCheckedChange={(checked) => {
                const next = checked
                  ? [...props.selectedAccounts, account.id]
                  : props.selectedAccounts.filter((id) => id !== account.id);
                props.onAccountsChange(next);
              }}
              onSelect={(e) => e.preventDefault()}
            >
              {account.name}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <Select
      name="account"
      items={items}
      value={props.selectedAccount}
      onValueChange={(v) => {
        const handleChange = props.onAccountChange || props.setSelectedAccount;
        if (!handleChange) {
          throw new Error(
            'AccountSelect requires either setSelectedAccount or onAccountChange prop',
          );
        }
        handleChange(v);
      }}
    >
      <SelectTrigger id={id} className={triggerClassName}>
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
