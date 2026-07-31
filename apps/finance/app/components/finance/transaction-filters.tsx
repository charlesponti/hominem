import { ActiveFiltersBar, SortControls } from '@ponti-studios/ui/data-display';
import { DatePicker, Input } from '@ponti-studios/ui/forms';
import { type SortOption } from '@ponti-studios/ui/hooks';
import type { SortField } from '@ponti-studios/ui/hooks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ponti-studios/ui/overlays';
import { Button, Label } from '@ponti-studios/ui/primitives';
import { ListFilter, RefreshCcw } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { AccountSelect } from '~/components/account-select';
import type { FilterArgs, useFinanceAccounts } from '~/lib/hooks/use-finance-data';
import { useSelectedAccount } from '~/lib/hooks/use-selected-account';

const sortableFields: SortField[] = ['amount', 'date', 'description', 'category'];

interface ActiveSortOption extends SortOption {
  onRemove: () => void;
  onClick: () => void;
}

interface TransactionFiltersProps {
  accountsMap: ReturnType<typeof useFinanceAccounts>['accountsMap'];
  accountsLoading: boolean;
  filters: FilterArgs;
  onFiltersChange: (filters: FilterArgs) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  sortOptions: SortOption[];
  addSortOption: (option: SortOption) => void;
  updateSortOption: (index: number, option: SortOption) => void;
  removeSortOption: (index: number) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function TransactionFilters({
  accountsMap,
  accountsLoading,
  filters,
  onFiltersChange,
  searchValue,
  onSearchChange,
  sortOptions,
  addSortOption,
  updateSortOption,
  removeSortOption,
  onRefresh,
  loading = false,
}: TransactionFiltersProps) {
  const { selectedAccount, setSelectedAccount } = useSelectedAccount();
  const [isFilterControlsOpen, setIsFilterControlsOpen] = useState(false);
  const [isSortControlsOpen, setIsSortControlsOpen] = useState(false);
  const [focusedSortIndex, setFocusedSortIndex] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const accountNames = useMemo(() => {
    const names = new Map<string, string>();
    accountsMap.forEach((account, id) => {
      names.set(id, account.name);
    });
    return names;
  }, [accountsMap]);

  const allFilters = useMemo(
    () => ({
      ...filters,
      accountId: selectedAccount === 'all' ? undefined : selectedAccount,
    }),
    [filters, selectedAccount],
  );

  const handleSelectedAccountChange = useCallback(
    (accountId: string) => {
      setSelectedAccount(accountId);
    },
    [setSelectedAccount],
  );

  const handleDateFromChange = useCallback(
    (date: Date | undefined) => {
      onFiltersChange({
        ...filters,
        dateFrom: date,
      });
    },
    [filters, onFiltersChange],
  );

  const handleDateToChange = useCallback(
    (date: Date | undefined) => {
      onFiltersChange({
        ...filters,
        dateTo: date,
      });
    },
    [filters, onFiltersChange],
  );

  const handleSortControlsOpenChange = useCallback((open: boolean) => {
    setIsSortControlsOpen(open);
    if (!open) {
      setFocusedSortIndex(null);
    }
  }, []);

  const handleSortChipClick = useCallback((index: number) => {
    setFocusedSortIndex(index);
    setIsSortControlsOpen(true);
  }, []);

  const activeFilters = useMemo(() => {
    return Object.entries(allFilters)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => {
        let displayValue = String(value);
        let displayKey = key.charAt(0).toUpperCase() + key.slice(1);

        if (key === 'accountId' && value && typeof value === 'string') {
          displayValue = accountNames.get(value) || value;
          displayKey = 'Account';
        }

        if ((key === 'dateFrom' || key === 'dateTo') && value) {
          try {
            const date = value instanceof Date ? value : new Date(String(value));
            displayValue = date.toLocaleDateString();
            displayKey = key === 'dateFrom' ? 'From' : 'To';
          } catch {
            // Keep original value if date parsing fails
          }
        }

        return {
          id: key,
          label: `${displayKey}: ${displayValue}`,
          onRemove: () => {
            if (key === 'accountId') {
              setSelectedAccount('all');
            } else {
              onFiltersChange({
                ...filters,
                [key]: undefined,
              });
              if (key === 'description') {
                onSearchChange('');
              }
            }
          },
          onClick: () => {
            if (key === 'description') {
              searchInputRef.current?.focus();
            }
          },
        };
      });
  }, [allFilters, accountNames, filters, onFiltersChange, onSearchChange, setSelectedAccount]);

  const activeSortOptions: ActiveSortOption[] = useMemo(() => {
    return sortOptions.map((sortOption: SortOption, index: number) => ({
      ...sortOption,
      onRemove: () => {
        removeSortOption(index);
      },
      onClick: () => handleSortChipClick(index),
    }));
  }, [sortOptions, removeSortOption, handleSortChipClick]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          ref={searchInputRef}
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search transactions..."
          aria-label="Search transactions"
        />

        <div className="flex flex-wrap gap-2">
          <DropdownMenu open={isFilterControlsOpen} onOpenChange={setIsFilterControlsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ListFilter className="size-4" aria-hidden />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Apply filters</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <AccountSelect
                selectedAccount={selectedAccount}
                onAccountChange={handleSelectedAccountChange}
                isLoading={accountsLoading}
                showLabel={true}
                label="Account"
              />

              <div className="space-y-1.5">
                <Label htmlFor="from-date-filter">From date</Label>
                <DatePicker
                  value={filters.dateFrom}
                  onSelect={handleDateFromChange}
                  placeholder="Start date"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="to-date-filter">To date</Label>
                <DatePicker
                  value={filters.dateTo}
                  onSelect={handleDateToChange}
                  placeholder="End date"
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <SortControls
            sortableFields={sortableFields}
            sortOptions={sortOptions || []}
            addSortOption={addSortOption}
            updateSortOption={updateSortOption}
            removeSortOption={removeSortOption}
            open={isSortControlsOpen}
            onOpenChange={handleSortControlsOpenChange}
            focusedSortIndex={focusedSortIndex}
          />

          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCcw className="size-4" aria-hidden />
            Refresh
          </Button>
        </div>
      </div>

      <ActiveFiltersBar
        filters={[
          ...activeFilters,
          ...activeSortOptions.map((s) => ({
            id: `sort-${s.field}-${s.direction}`,
            label: `Sort: ${s.field} (${s.direction})`,
            onRemove: s.onRemove,
            onClick: s.onClick,
          })),
        ]}
      />
    </div>
  );
}
