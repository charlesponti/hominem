import { FilterChip, SortControls } from '@ponti-studios/ui/data-display';
import { DatePicker, Input } from '@ponti-studios/ui/forms';
import { type SortOption } from '@ponti-studios/ui/hooks';
import type { SortField } from '@ponti-studios/ui/hooks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
  isDefaultSort?: boolean;
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
  isDefaultSort = false,
  addSortOption,
  updateSortOption,
  removeSortOption,
  onRefresh,
  loading = false,
}: TransactionFiltersProps) {
  const { selectedAccounts, setSelectedAccounts } = useSelectedAccount();
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
      accountIds: selectedAccounts.length > 0 ? selectedAccounts : undefined,
    }),
    [filters, selectedAccounts],
  );

  const handleSelectedAccountsChange = useCallback(
    (accountIds: string[]) => {
      setSelectedAccounts(accountIds);
    },
    [setSelectedAccounts],
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

  const accountChips = useMemo(
    () =>
      selectedAccounts.map((accountId) => ({
        id: `account-${accountId}`,
        label: `Account: ${accountNames.get(accountId) || accountId}`,
        onRemove: () => {
          setSelectedAccounts(selectedAccounts.filter((id) => id !== accountId));
        },
        onClick: () => {},
        variant: 'default' as const,
        direction: undefined,
      })),
    [selectedAccounts, accountNames, setSelectedAccounts],
  );

  const activeFilters = useMemo(() => {
    return (
      Object.entries(allFilters)
        // description mirrors the search box, which already shows the text and has its own clear affordance
        // accountIds is rendered separately as one chip per selected account
        .filter(
          ([key, value]) =>
            key !== 'description' &&
            key !== 'accountIds' &&
            key !== 'accountId' &&
            value !== undefined &&
            value !== '',
        )
        .map(([key, value]) => {
          let displayValue = String(value);
          let displayKey = key.charAt(0).toUpperCase() + key.slice(1);

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
              onFiltersChange({
                ...filters,
                [key]: undefined,
              });
              if (key === 'description') {
                onSearchChange('');
              }
            },
            onClick: () => {
              if (key === 'description') {
                searchInputRef.current?.focus();
              }
            },
            variant: 'default' as const,
            direction: undefined,
          };
        })
    );
  }, [allFilters, filters, onFiltersChange, onSearchChange]);

  const activeSortOptions: ActiveSortOption[] = useMemo(() => {
    if (isDefaultSort) return [];
    return sortOptions.map((sortOption: SortOption, index: number) => ({
      ...sortOption,
      onRemove: () => {
        removeSortOption(index);
      },
      onClick: () => handleSortChipClick(index),
    }));
  }, [sortOptions, isDefaultSort, removeSortOption, handleSortChipClick]);

  const chips = useMemo(
    () => [
      ...accountChips,
      ...activeFilters,
      ...activeSortOptions.map((s) => ({
        id: `sort-${s.field}-${s.direction}`,
        label: `${s.field} (${s.direction})`,
        onRemove: s.onRemove,
        onClick: s.onClick,
        variant: 'sort' as const,
        direction: s.direction,
      })),
    ],
    [accountChips, activeFilters, activeSortOptions],
  );

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
          className="sm:min-w-0 sm:flex-1"
        />

        <div className="flex shrink-0 flex-wrap gap-2">
          <DropdownMenu open={isFilterControlsOpen} onOpenChange={setIsFilterControlsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ListFilter className="size-4" aria-hidden />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Apply filters</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <AccountSelect
                  multiple
                  selectedAccounts={selectedAccounts}
                  onAccountsChange={handleSelectedAccountsChange}
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
              </DropdownMenuGroup>
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

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <FilterChip
              key={chip.id}
              label={chip.label}
              onRemove={chip.onRemove}
              onClick={chip.onClick}
              variant={chip.variant}
              direction={chip.direction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
