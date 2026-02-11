import { Badge } from '@hominem/ui/components/ui/badge';
import { Button } from '@hominem/ui/components/ui/button';
import { LoadingSpinner } from '@hominem/ui/components/ui/loading-spinner';
import { useSort } from '@hominem/ui/hooks';
import { format, subMonths } from 'date-fns';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { TransactionFilters } from '~/components/finance/transaction-filters';
import { useCategoryBreakdown } from '~/lib/hooks/use-analytics';
import { type FilterArgs, useFinanceAccounts } from '~/lib/hooks/use-finance-data';
import { useSelectedAccount } from '~/lib/hooks/use-selected-account';
import { formatCurrency } from '~/lib/number.utils';

export default function CategoriesAnalyticsPage() {
  const navigate = useNavigate();
  const { selectedAccount, setSelectedAccount } = useSelectedAccount();

  // Initialize filters with default date range
  const [filters, setFilters] = useState<FilterArgs>({
    dateFrom: subMonths(new Date(), 6),
    dateTo: new Date(),
  });

  // Debounced filters for API calls
  const [debouncedFilters, setDebouncedFilters] = useState<FilterArgs>(filters);

  const [searchValue, setSearchValue] = useState('');
  const { sortOptions, addSortOption, updateSortOption, removeSortOption } = useSort({
    initialSortOptions: [],
  });

  const {
    accountsMap,
    isLoading: accountsLoading,
    refetch: refetchAccounts,
  } = useFinanceAccounts();

  // Debounce filter changes (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [filters]);

  const {
    data: breakdown,
    isLoading,
    isFetching,
    error,
    refetch: refetchBreakdown,
  } = useCategoryBreakdown({
    from: debouncedFilters.dateFrom,
    to: debouncedFilters.dateTo,
    account: selectedAccount !== 'all' ? selectedAccount : undefined,
    limit: 100,
  });

  // Calculate total spending for percentage calculations
  const totalSpending = useMemo(() => {
    if (!Array.isArray(breakdown)) return 0;
    return breakdown.reduce((sum, item) => sum + Number.parseFloat(item.total), 0);
  }, [breakdown]);

  // Client-side filtering and sorting
  const filteredAndSortedData = useMemo(() => {
    if (!Array.isArray(breakdown)) {
      return [];
    }

    let result = [...breakdown];

    // Apply search filter
    if (searchValue.trim()) {
      result = result.filter((item) =>
        item.category.toLowerCase().includes(searchValue.toLowerCase()),
      );
    }

    // Apply sort
    if (sortOptions.length > 0) {
      const sort = sortOptions[0];
      if (sort) {
        result.sort((a, b) => {
          let aValue: string | number;
          let bValue: string | number;

          if (sort.field === 'category') {
            aValue = a.category.toLowerCase();
            bValue = b.category.toLowerCase();
          } else if (sort.field === 'total') {
            aValue = Number.parseFloat(a.total);
            bValue = Number.parseFloat(b.total);
          } else if (sort.field === 'count') {
            aValue = a.count;
            bValue = b.count;
          } else {
            return 0;
          }

          if (aValue < bValue) {
            return sort.direction === 'asc' ? -1 : 1;
          }
          if (aValue > bValue) {
            return sort.direction === 'asc' ? 1 : -1;
          }
          return 0;
        });
      }
    }

    return result;
  }, [breakdown, searchValue, sortOptions]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: FilterArgs) => {
    setFilters(newFilters);
  }, []);

  // Handle search changes
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetchAccounts();
    refetchBreakdown();
  }, [refetchAccounts, refetchBreakdown]);

  // Handle sort header click
  const handleSortHeaderClick = useCallback(
    (field: 'category' | 'total' | 'count') => {
      const existingSort = sortOptions.find((s) => s.field === field);
      if (existingSort) {
        // Toggle direction if same field
        updateSortOption(0, {
          ...existingSort,
          direction: existingSort.direction === 'asc' ? 'desc' : 'asc',
        });
      } else {
        // Add new sort option
        addSortOption({ field, direction: 'desc' });
      }
    },
    [sortOptions, addSortOption, updateSortOption],
  );

  // Get sort direction for header
  const getSortDirection = (field: string) => {
    const sort = sortOptions.find((s) => s.field === field);
    return sort?.direction;
  };

  // Active filters for display
  const activeFilters = useMemo(() => {
    const filterChips: Array<{ id: string; label: string; onRemove: () => void }> = [];

    if (debouncedFilters.dateFrom) {
      filterChips.push({
        id: 'dateFrom',
        label: `From: ${format(debouncedFilters.dateFrom, 'MMM d, yyyy')}`,
        onRemove: () => {
          handleFiltersChange({ ...debouncedFilters, dateFrom: undefined });
        },
      });
    }

    if (debouncedFilters.dateTo) {
      filterChips.push({
        id: 'dateTo',
        label: `To: ${format(debouncedFilters.dateTo, 'MMM d, yyyy')}`,
        onRemove: () => {
          handleFiltersChange({ ...debouncedFilters, dateTo: undefined });
        },
      });
    }

    if (selectedAccount !== 'all') {
      const accountName = accountsMap.get(selectedAccount)?.name || 'Account';
      filterChips.push({
        id: 'account',
        label: accountName,
        onRemove: () => {
          setSelectedAccount('all');
        },
      });
    }

    return filterChips;
  }, [debouncedFilters, selectedAccount, accountsMap, handleFiltersChange, setSelectedAccount]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilters({
      dateFrom: subMonths(new Date(), 6),
      dateTo: new Date(),
    });
    setSelectedAccount('all');
    setSearchValue('');
  }, [setSelectedAccount]);

  const loading = isLoading || accountsLoading;

  return (
    <div className="container">
      <h1 className="text-2xl font-bold mb-4">Categories Breakdown</h1>

      {/* Transaction Filters */}
      <TransactionFilters
        accountsMap={accountsMap}
        accountsLoading={accountsLoading}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        sortOptions={sortOptions}
        addSortOption={addSortOption}
        updateSortOption={updateSortOption}
        removeSortOption={removeSortOption}
        onRefresh={handleRefresh}
        loading={loading}
      />

      {/* Active Filters Display */}
      {(activeFilters.length > 0 || searchValue.trim()) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.id}
              className="flex items-center gap-1 pr-1 border border-foreground text-foreground text-xs"
            >
              <span>{filter.label}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-4 p-0 ml-1 shrink-0"
                aria-label={`Remove ${filter.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  filter.onRemove();
                }}
              >
                <X className="size-3" />
              </Button>
            </Badge>
          ))}
          {searchValue.trim() && (
            <Badge className="flex items-center gap-1 pr-1 border border-foreground text-foreground text-xs">
              <span>Search: {searchValue}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-4 p-0 ml-1 shrink-0"
                aria-label="Clear search"
                onClick={() => setSearchValue('')}
              >
                <X className="size-3" />
              </Button>
            </Badge>
          )}
          {(activeFilters.length > 0 || searchValue.trim()) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={handleClearFilters}
            >
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-10">
          <output className="space-y-4 w-full" aria-live="polite">
            {[1, 2, 3, 4, 5].map((val) => (
              <div key={val} className="h-12 border border-foreground w-full" />
            ))}
          </output>
        </div>
      ) : error ? (
        /* Error State */
        <div className="p-8 text-center text-destructive" role="alert">
          <p className="mb-4">
            {typeof error === 'string'
              ? error
              : error instanceof Error
                ? error.message
                : 'An unknown error occurred'}
          </p>
          <Button onClick={() => refetchBreakdown()} variant="outline">
            Retry
          </Button>
        </div>
      ) : filteredAndSortedData.length === 0 ? (
        /* Empty State */
        <div className="p-8 text-center text-muted-foreground">
          {searchValue.trim() || activeFilters.length > 0
            ? 'No categories found matching your filters.'
            : 'No category data available for the selected period.'}
        </div>
      ) : (
        /* Table with Data */
        <div className="relative">
          {isFetching && !isLoading && (
            <div className="absolute inset-0 bg-emphasis-medium z-10 flex items-center justify-center">
              <LoadingSpinner size="md" />
            </div>
          )}
          <table className="w-full text-sm" aria-label="Categories breakdown">
            <thead>
              <tr>
                <th
                  className="text-left py-2"
                  aria-sort={
                    getSortDirection('category') === 'asc'
                      ? 'ascending'
                      : getSortDirection('category') === 'desc'
                        ? 'descending'
                        : 'none'
                  }
                >
                  <button
                    type="button"
                    onClick={() => handleSortHeaderClick('category')}
                    className="flex items-center gap-1 hover:text-foreground"
                    aria-label="Sort by category"
                  >
                    Category
                    {getSortDirection('category') === 'asc' && (
                      <ArrowUp className="size-4" aria-hidden="true" />
                    )}
                    {getSortDirection('category') === 'desc' && (
                      <ArrowDown className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </th>
                <th
                  className="text-right py-2"
                  aria-sort={
                    getSortDirection('total') === 'asc'
                      ? 'ascending'
                      : getSortDirection('total') === 'desc'
                        ? 'descending'
                        : 'none'
                  }
                >
                  <button
                    type="button"
                    onClick={() => handleSortHeaderClick('total')}
                    className="flex items-center gap-1 justify-end hover:text-foreground ml-auto"
                    aria-label="Sort by total"
                  >
                    Total
                    {getSortDirection('total') === 'asc' && (
                      <ArrowUp className="size-4" aria-hidden="true" />
                    )}
                    {getSortDirection('total') === 'desc' && (
                      <ArrowDown className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedData.map((item) => {
                const itemTotal = Number.parseFloat(item.total);
                const percentage = totalSpending > 0 ? (itemTotal / totalSpending) * 100 : 0;

                return (
                  <tr
                    key={item.category}
                    className="border-b border-border "
                    onClick={() =>
                      navigate(`/analytics/category/${encodeURIComponent(item.category)}`)
                    }
                    tabIndex={0}
                    aria-label={`View details for ${item.category}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        navigate(`/analytics/category/${encodeURIComponent(item.category)}`);
                      }
                    }}
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="w-12 justify-center">
                          {item.count}x
                        </Badge>
                        <span className="font-medium">{item.category}</span>
                      </div>
                    </td>
                    <td className="text-right py-3">
                      <div className="flex flex-col items-end gap-1">
                        <div
                          className="font-mono font-semibold"
                          title={
                            'average' in item && 'minimum' in item && 'maximum' in item
                              ? `Average: ${formatCurrency(item.average)}\nMin: ${formatCurrency(item.minimum)}\nMax: ${formatCurrency(item.maximum)}`
                              : undefined
                          }
                        >
                          {formatCurrency(item.total)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </div>
                        {/* Progress Bar */}
                        <div className="w-24 border border-foreground h-1">
                          <div
                            className="h-1 bg-primary"
                            style={{
                              width: `${Math.min(percentage, 100)}%`,
                            }}
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
