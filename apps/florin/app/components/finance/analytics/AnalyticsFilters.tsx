import type { FinanceAccount } from '@hominem/utils/types'
import type { Dispatch, SetStateAction } from 'react'
import { DatePicker } from '~/components/form/date-picker'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Switch } from '~/components/ui/switch'

interface AnalyticsFiltersProps {
  dateFrom: Date | undefined
  setDateFrom: Dispatch<SetStateAction<Date | undefined>>
  dateTo: Date | undefined
  setDateTo: Dispatch<SetStateAction<Date | undefined>>
  selectedAccount: string
  setSelectedAccount: Dispatch<SetStateAction<string>>
  accounts: FinanceAccount[]
  accountsLoading: boolean
  selectedCategory: string
  setSelectedCategory: Dispatch<SetStateAction<string>>
  categories: string[]
  categoriesLoading: boolean
  groupBy: 'month' | 'week' | 'day'
  setGroupBy: Dispatch<SetStateAction<'month' | 'week' | 'day'>>
  includeStats: boolean
  setIncludeStats: Dispatch<SetStateAction<boolean>>
  compareToPrevious: boolean
  setCompareToPrevious: Dispatch<SetStateAction<boolean>>
}

export function AnalyticsFilters({
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  selectedAccount,
  setSelectedAccount,
  accounts,
  accountsLoading,
  selectedCategory,
  setSelectedCategory,
  categories,
  categoriesLoading,
  groupBy,
  setGroupBy,
  includeStats,
  setIncludeStats,
  compareToPrevious,
  setCompareToPrevious,
}: AnalyticsFiltersProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Filters</CardTitle>
      </CardHeader>
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
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accountsLoading ? (
                  <SelectItem value="disabled" disabled>
                    Loading accounts...
                  </SelectItem>
                ) : (
                  accounts.map((account) => (
                    <SelectItem key={account.id} value={account.name}>
                      {account.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categoriesLoading ? (
                  <SelectItem value="disabled" disabled>
                    Loading categories...
                  </SelectItem>
                ) : (
                  categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
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
              <Switch id="includeStats" checked={includeStats} onCheckedChange={setIncludeStats} />
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
        {/* Removed Update Chart button as React Query handles refetching */}
      </CardContent>
    </Card>
  )
}
