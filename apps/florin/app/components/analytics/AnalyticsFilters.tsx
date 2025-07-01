import { X } from 'lucide-react'
import { type Dispatch, type SetStateAction, useId } from 'react'
import { AccountSelect } from '~/components/account-select'
import { CategorySelect } from '~/components/category-select'
import { DatePicker } from '~/components/date-picker'
import { GroupBySelect } from '~/components/group-by-select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Label } from '~/components/ui/label'
import { Skeleton } from '~/components/ui/skeleton'
import { Switch } from '~/components/ui/switch'
import { useFinanceAccounts } from '~/lib/hooks/use-finance-data'
import { trpc } from '~/lib/trpc'

type AccountsData = ReturnType<typeof useFinanceAccounts>['data']

interface AnalyticsFiltersProps {
  dateFrom: Date | undefined
  setDateFrom: Dispatch<SetStateAction<Date | undefined>>
  dateTo: Date | undefined
  setDateTo: Dispatch<SetStateAction<Date | undefined>>
  selectedAccount: string
  setSelectedAccount: Dispatch<SetStateAction<string>>
  selectedCategory: string
  setSelectedCategory: Dispatch<SetStateAction<string>>
  groupBy: 'month' | 'week' | 'day'
  setGroupBy: Dispatch<SetStateAction<'month' | 'week' | 'day'>>
  includeStats: boolean
  setIncludeStats: Dispatch<SetStateAction<boolean>>
  compareToPrevious: boolean
  setCompareToPrevious: Dispatch<SetStateAction<boolean>>
}

interface FilterChipsProps {
  dateFrom: Date | undefined
  setDateFrom: Dispatch<SetStateAction<Date | undefined>>
  dateTo: Date | undefined
  setDateTo: Dispatch<SetStateAction<Date | undefined>>
  selectedAccount: string
  setSelectedAccount: Dispatch<SetStateAction<string>>
  selectedCategory: string
  setSelectedCategory: Dispatch<SetStateAction<string>>
  groupBy: 'month' | 'week' | 'day'
  setGroupBy: Dispatch<SetStateAction<'month' | 'week' | 'day'>>
  includeStats: boolean
  setIncludeStats: Dispatch<SetStateAction<boolean>>
  compareToPrevious: boolean
  setCompareToPrevious: Dispatch<SetStateAction<boolean>>
  accounts: AccountsData
  categories: { id: string; name: string }[]
  isLoading: boolean
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
    return <Skeleton className="h-6 w-32" />
  }

  const chips = []
  if (dateFrom) {
    chips.push({
      key: 'dateFrom',
      label: `From: ${dateFrom.toLocaleDateString()}`,
      onRemove: () => setDateFrom(undefined),
    })
  }
  if (dateTo) {
    chips.push({
      key: 'dateTo',
      label: `To: ${dateTo.toLocaleDateString()}`,
      onRemove: () => setDateTo(undefined),
    })
  }
  if (selectedAccount && selectedAccount !== 'all') {
    const accountLabel = accounts?.find((a) => a.id === selectedAccount)?.name || 'Account'
    chips.push({
      key: 'account',
      label: accountLabel,
      onRemove: () => setSelectedAccount('all'),
    })
  }
  if (selectedCategory && selectedCategory !== 'all') {
    const categoryLabel =
      categories.find((c) => c.id === selectedCategory)?.name || selectedCategory
    chips.push({
      key: 'category',
      label: categoryLabel,
      onRemove: () => setSelectedCategory('all'),
    })
  }
  if (groupBy !== 'month') {
    chips.push({
      key: 'groupBy',
      label: `Grouped: ${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}`,
      onRemove: () => setGroupBy('month'),
    })
  }
  if (includeStats) {
    chips.push({
      key: 'includeStats',
      label: 'Stats',
      onRemove: () => setIncludeStats(false),
    })
  }
  if (compareToPrevious) {
    chips.push({
      key: 'compareToPrevious',
      label: 'Trends',
      onRemove: () => setCompareToPrevious(false),
    })
  }
  if (!chips.length) {
    return <span className="text-xs text-muted-foreground">No filters</span>
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
            className="h-4 w-4 p-0 ml-1 flex-shrink-0"
            aria-label={`Remove ${chip.label}`}
            onClick={(e) => {
              e.stopPropagation()
              chip.onRemove()
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
    </div>
  )
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
  const accountsQuery = useFinanceAccounts()
  const { data: categories = [], isLoading: categoriesLoading } =
    trpc.finance.categories.list.useQuery()

  const isLoading = accountsQuery.isLoading || categoriesLoading
  const dateFromId = useId()
  const dateToId = useId()
  const includeStatsId = useId()
  const compareToPreviousId = useId()

  // Ensure we have valid data even during loading
  const safeAccounts = accountsQuery.data || []
  const safeCategories =
    categories
      .map((category) => ({
        id: category.category || '',
        name: category.category || '',
      }))
      .filter((cat) => cat.id && cat.name) || []

  return (
    <Accordion type="single" collapsible defaultValue={undefined}>
      <AccordionItem value="filters">
        <Card className="border-none shadow-none">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex flex-col sm:flex-row items-center justify-start gap-2 sm:gap-4 w-full">
              <span className="text-lg font-semibold self-start">Filters</span>
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
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className="space-y-6">
              {/* Date Range Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={dateFromId}>From Date</Label>
                  <DatePicker date={dateFrom} setDate={setDateFrom} placeholder="Start date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={dateToId}>To Date</Label>
                  <DatePicker date={dateTo} setDate={setDateTo} placeholder="End date" />
                </div>
              </div>

              {/* Account and Category Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AccountSelect
                  selectedAccount={selectedAccount}
                  onAccountChange={setSelectedAccount}
                  accounts={safeAccounts}
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
            </CardContent>
          </AccordionContent>
        </Card>
      </AccordionItem>
    </Accordion>
  )
}
