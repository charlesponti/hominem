import type { AccountData } from '@hominem/hono-rpc/types/finance.types';

import { Button } from '@hominem/ui/button';
import { DatePicker } from '@hominem/ui/components/date-picker';
import { Badge } from '@hominem/ui/components/ui/badge';
import { Card } from '@hominem/ui/components/ui/card';
import { Label } from '@hominem/ui/components/ui/label';
import { Skeleton } from '@hominem/ui/components/ui/skeleton';
import { Switch } from '@hominem/ui/components/ui/switch';
import * as Dialog from '@radix-ui/react-dialog';
import { Filter, X } from 'lucide-react';
import { type Dispatch, type SetStateAction, useId, useState } from 'react';

import { AccountSelect } from '~/components/account-select';
import { CategorySelect } from '~/components/category-select';
import { GroupBySelect } from '~/components/group-by-select';
import { useFinanceCategories } from '~/lib/hooks/use-analytics';
import { useFinanceAccounts } from '~/lib/hooks/use-finance-data';

type AccountsData = AccountData[];

interface AnalyticsFiltersProps {
  dateFrom: Date | undefined;
  setDateFrom: Dispatch<SetStateAction<Date | undefined>>;
  dateTo: Date | undefined;
  setDateTo: Dispatch<SetStateAction<Date | undefined>>;
  selectedAccount: string;
  setSelectedAccount: Dispatch<SetStateAction<string>>;
  selectedCategory: string;
  setSelectedCategory: Dispatch<SetStateAction<string>>;
  groupBy: 'month' | 'week' | 'day';
  setGroupBy: Dispatch<SetStateAction<'month' | 'week' | 'day'>>;
  includeStats: boolean;
  setIncludeStats: Dispatch<SetStateAction<boolean>>;
  compareToPrevious: boolean;
  setCompareToPrevious: Dispatch<SetStateAction<boolean>>;
}

interface FilterChipsProps {
  dateFrom: Date | undefined;
  setDateFrom: Dispatch<SetStateAction<Date | undefined>>;
  dateTo: Date | undefined;
  setDateTo: Dispatch<SetStateAction<Date | undefined>>;
  selectedAccount: string;
  setSelectedAccount: Dispatch<SetStateAction<string>>;
  selectedCategory: string;
  setSelectedCategory: Dispatch<SetStateAction<string>>;
  groupBy: 'month' | 'week' | 'day';
  setGroupBy: Dispatch<SetStateAction<'month' | 'week' | 'day'>>;
  includeStats: boolean;
  setIncludeStats: Dispatch<SetStateAction<boolean>>;
  compareToPrevious: boolean;
  setCompareToPrevious: Dispatch<SetStateAction<boolean>>;
  accounts: AccountsData;
  categories: { id: string; name: string }[];
  isLoading: boolean;
}

function FilterChips({
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  selectedAccount,
  setSelectedAccount,
  selectedCategory,
  setSelectedCategory,
  groupBy,
  setGroupBy,
  includeStats,
  setIncludeStats,
  compareToPrevious,
  setCompareToPrevious,
  accounts,
  categories,
  isLoading,
}: FilterChipsProps) {
  if (isLoading) {
    return <Skeleton className="h-6 w-32" />;
  }

  const chips = [];
  if (dateFrom) {
    chips.push({
      key: 'dateFrom',
      label: `From: ${dateFrom.toLocaleDateString()}`,
      onRemove: () => setDateFrom(undefined),
    });
  }
  if (dateTo) {
    chips.push({
      key: 'dateTo',
      label: `To: ${dateTo.toLocaleDateString()}`,
      onRemove: () => setDateTo(undefined),
    });
  }
  if (selectedAccount && selectedAccount !== 'all') {
    const accountLabel = Array.isArray(accounts)
      ? accounts.find((a) => a.id === selectedAccount)?.name || 'Account'
      : 'Account';
    chips.push({
      key: 'account',
      label: accountLabel,
      onRemove: () => setSelectedAccount('all'),
    });
  }
  if (selectedCategory && selectedCategory !== 'all') {
    const categoryLabel =
      categories.find((c) => c.id === selectedCategory)?.name || selectedCategory;
    chips.push({
      key: 'category',
      label: categoryLabel,
      onRemove: () => setSelectedCategory('all'),
    });
  }
  if (groupBy !== 'month') {
    chips.push({
      key: 'groupBy',
      label: `Grouped: ${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}`,
      onRemove: () => setGroupBy('month'),
    });
  }
  if (includeStats) {
    chips.push({
      key: 'includeStats',
      label: 'Stats',
      onRemove: () => setIncludeStats(false),
    });
  }
  if (compareToPrevious) {
    chips.push({
      key: 'compareToPrevious',
      label: 'Trends',
      onRemove: () => setCompareToPrevious(false),
    });
  }
  if (!chips.length) {
    return <span className="text-xs text-muted-foreground">No filters</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5 max-w-full">
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          className="flex items-center gap-1 pr-1 bg-muted text-foreground text-xs max-w-full"
        >
          <span className="truncate">{chip.label}</span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-4 p-0 ml-1 shrink-0"
            aria-label={`Remove ${chip.label}`}
            onClick={(e) => {
              e.stopPropagation();
              chip.onRemove();
            }}
          >
            <X className="size-3" />
          </Button>
        </Badge>
      ))}
    </div>
  );
}

export function AnalyticsFilters({
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  selectedAccount,
  setSelectedAccount,
  selectedCategory,
  setSelectedCategory,
  groupBy,
  setGroupBy,
  includeStats,
  setIncludeStats,
  compareToPrevious,
  setCompareToPrevious,
}: AnalyticsFiltersProps) {
  const accountsQuery = useFinanceAccounts();
  const categoriesQuery = useFinanceCategories();
  const categories = Array.isArray(categoriesQuery.data) ? categoriesQuery.data : [];
  const categoriesLoading = categoriesQuery.isLoading;

  const isLoading = accountsQuery.isLoading || categoriesLoading;
  const dateFromId = useId();
  const dateToId = useId();
  const includeStatsId = useId();
  const compareToPreviousId = useId();

  // Ensure we have valid data even during loading
  const safeAccounts = Array.isArray(accountsQuery.data) ? accountsQuery.data : [];
  const safeCategories = categories
    .map((category) => ({
      id: category || '',
      name: category || '',
    }))
    .filter((cat) => cat.id && cat.name);

  const [open, setOpen] = useState(false);

  return (
    <Card className="border-none shadow-none">
      <div className="px-4 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Filter Dialog Trigger */}
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="size-4" />
                Filters
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 data-[state=open]:animate-fade-in" />
              <Dialog.Content className="fixed right-0 top-0 z-50 h-full w-full sm:max-w-md overflow-y-auto bg-white shadow-lg focus:outline-none">
                <div className="p-6">
                  <div className="mb-6">
                    <Dialog.Title className="text-lg font-bold">Customize Filters</Dialog.Title>
                    <Dialog.Description className="text-sm text-muted-foreground">
                      Refine your analytics view with these filter options
                    </Dialog.Description>
                  </div>
                  <div className="space-y-6">
                    {/* Date Range Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={dateFromId}>From Date</Label>
                        <DatePicker
                          value={dateFrom}
                          onSelect={setDateFrom}
                          placeholder="Start date"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={dateToId}>To Date</Label>
                        <DatePicker value={dateTo} onSelect={setDateTo} placeholder="End date" />
                      </div>
                    </div>

                    {/* Account and Category Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <AccountSelect
                        selectedAccount={selectedAccount}
                        setSelectedAccount={setSelectedAccount}
                        isLoading={isLoading}
                        showLabel={true}
                      />
                      <CategorySelect
                        selectedCategory={selectedCategory}
                        onCategoryChange={setSelectedCategory}
                        categories={safeCategories}
                        isLoading={isLoading}
                      />
                    </div>

                    {/* Group By Filter */}
                    <GroupBySelect groupBy={groupBy} onGroupByChange={setGroupBy} />

                    {/* Toggle Filters */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor={includeStatsId}>Include Statistics</Label>
                          <p className="text-sm text-muted-foreground">
                            Show summary statistics with the data
                          </p>
                        </div>
                        <Switch
                          id={includeStatsId}
                          checked={includeStats}
                          onCheckedChange={setIncludeStats}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor={compareToPreviousId}>Compare to Previous Period</Label>
                          <p className="text-sm text-muted-foreground">
                            Show trend information compared to the previous period
                          </p>
                        </div>
                        <Switch
                          id={compareToPreviousId}
                          checked={compareToPrevious}
                          onCheckedChange={setCompareToPrevious}
                        />
                      </div>
                    </div>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="absolute right-4 top-4 text-muted-foreground hover:text-gray-700"
                      aria-label="Close"
                    >
                      <span className="sr-only">Close</span>×
                    </button>
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

          {/* Active Filters Display */}
          <div className="flex-1 min-w-0">
            <FilterChips
              dateFrom={dateFrom}
              setDateFrom={setDateFrom}
              dateTo={dateTo}
              setDateTo={setDateTo}
              selectedAccount={selectedAccount}
              setSelectedAccount={setSelectedAccount}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              groupBy={groupBy}
              setGroupBy={setGroupBy}
              includeStats={includeStats}
              setIncludeStats={setIncludeStats}
              compareToPrevious={compareToPrevious}
              setCompareToPrevious={setCompareToPrevious}
              accounts={safeAccounts}
              categories={safeCategories}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
