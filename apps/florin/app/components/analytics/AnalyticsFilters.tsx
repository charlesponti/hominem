import type { FinanceAccount } from '@hominem/utils/types'
import { X } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import { DatePicker } from '~/components/date-picker'
import { AccountSelect } from '~/components/finance/account-select'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Skeleton } from '~/components/ui/skeleton'
import { Switch } from '~/components/ui/switch'
import { useFinanceCategories } from '~/lib/hooks/use-finance-categories'
import { useFinanceAccounts } from '~/lib/hooks/use-finance-data'

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
  accounts: FinanceAccount[]
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
    const accountLabel = accounts.find((a) => a.id === selectedAccount)?.name || 'Account'
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
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Badge key={chip.key} className="flex items-center gap-1 pr-1 bg-muted text-foreground">
          <span>{chip.label}</span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-4 w-4 p-0 ml-1"
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
  const { accounts, isLoading: accountsLoading } = useFinanceAccounts()
  const { categories, isLoading: categoriesLoading } = useFinanceCategories()

  const isLoading = accountsLoading || categoriesLoading

  // Ensure we have valid data even during loading
  const safeAccounts = accounts || []
  const safeCategories = categories || []

  // Debug logging
  console.log('AnalyticsFilters render:', {
    accountsLoading,
    categoriesLoading,
    isLoading,
    accountsCount: safeAccounts.length,
    categoriesCount: safeCategories.length,
  })

  return (
    <Accordion type="single" collapsible defaultValue={undefined}>
      <AccordionItem value="filters">
        <Card className="border-none shadow-none">
          <AccordionTrigger className="px-4">
            <span className="text-lg font-semibold">Filters</span>
            <span className="ml-4">
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
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateFrom">From Date</Label>
                  <DatePicker date={dateFrom} setDate={setDateFrom} placeholder="Start date" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateTo">To Date</Label>
                  <DatePicker date={dateTo} setDate={setDateTo} placeholder="End date" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account">Account</Label>
                  {accountsLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <AccountSelect
                      accounts={safeAccounts}
                      selectedAccount={selectedAccount}
                      setSelectedAccount={setSelectedAccount}
                      className="w-full"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  {categoriesLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 overflow-y-auto">
                        <SelectItem value="all">All categories</SelectItem>
                        {safeCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="groupBy">Group By</Label>
                  <Select
                    value={groupBy}
                    onValueChange={(value) => setGroupBy(value as 'month' | 'week' | 'day')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="week">Weekly</SelectItem>
                      <SelectItem value="day">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="includeStats"
                      checked={includeStats}
                      onCheckedChange={setIncludeStats}
                    />
                    <Label htmlFor="includeStats">Include Statistics</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="compareToPrevious"
                      checked={compareToPrevious}
                      onCheckedChange={setCompareToPrevious}
                    />
                    <Label htmlFor="compareToPrevious">Show Trends</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </AccordionContent>
        </Card>
      </AccordionItem>
    </Accordion>
  )
}
