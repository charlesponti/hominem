'use client'

import type { FinanceAccount } from '@hominem/utils/types' // Added type import
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { subMonths } from 'date-fns'
import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DatePicker } from '~/components/form/date-picker'
import { Button } from '~/components/ui/button'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { useApiClient } from '~/lib/hooks/use-api-client' // Added useApiClient import
import { useFinanceCategories } from '~/lib/hooks/use-finance-categories'
import { useFinanceCategoryBreakdown } from '~/lib/hooks/use-finance-category-breakdown'
// Removed useFinanceData import
import { useFinanceTopMerchants } from '~/lib/hooks/use-finance-top-merchants'
import { useTimeSeriesData } from '~/lib/hooks/use-time-series'

// Create a client
const queryClient = new QueryClient()

function AnalyticsContent() {
  // State for filters and data
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subMonths(new Date(), 6))
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date())
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [includeStats, setIncludeStats] = useState<boolean>(true)
  const [compareToPrevious, setCompareToPrevious] = useState<boolean>(true)
  const [groupBy, setGroupBy] = useState<'month' | 'week' | 'day'>('month')
  const [chartType, setChartType] = useState<'area' | 'bar'>('area')
  const apiClient = useApiClient() // Added apiClient instance

  // Fetch accounts directly
  const { data: accounts = [], isLoading: accountsLoading } = useQuery<FinanceAccount[], Error>({
    queryKey: ['finance', 'accounts'],
    queryFn: () => apiClient.get<never, FinanceAccount[]>('/api/finance/accounts'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Use our custom hook for categories
  const { categories, isLoading: categoriesLoading } = useFinanceCategories()

  // Use our custom hook for time series data
  const {
    data: timeSeriesData,
    chartData,
    isLoading,
    error,
    formatDateLabel,
    formatCurrency,
  } = useTimeSeriesData({
    dateFrom,
    dateTo,
    account: selectedAccount !== 'all' ? selectedAccount : undefined,
    category: selectedCategory || undefined,
    includeStats,
    compareToPrevious,
    groupBy,
  })

  // Top merchants and categories analytics
  const {
    data: topMerchants,
    isLoading: isLoadingMerchants,
    error: errorMerchants,
  } = useFinanceTopMerchants({
    from: dateFrom?.toISOString().split('T')[0],
    to: dateTo?.toISOString().split('T')[0],
    account: selectedAccount !== 'all' ? selectedAccount : undefined,
    category: selectedCategory || undefined,
    limit: 5,
  })
  const {
    data: categoryBreakdown,
    isLoading: isLoadingCategories,
    error: errorCategories,
  } = useFinanceCategoryBreakdown({
    from: dateFrom?.toISOString().split('T')[0],
    to: dateTo?.toISOString().split('T')[0],
    account: selectedAccount !== 'all' ? selectedAccount : undefined,
    limit: 5,
  })

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Spending Analytics</h1>
      </div>

      {/* Filters Card */}
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
          {/* Removed Update Chart button as React Query handles refetching */}
        </CardContent>
      </Card>

      {/* Chart Display */}
      <Tabs defaultValue="chart" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-2">
            <Button
              variant={chartType === 'area' ? 'default' : 'outline'}
              onClick={() => setChartType('area')}
              size="sm"
            >
              Area
            </Button>
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              onClick={() => setChartType('bar')}
              size="sm"
            >
              Bar
            </Button>
          </div>
        </div>

        <TabsContent value="chart" className="space-y-4">
          {error ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-red-500">{error.message}</div>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">Loading chart data...</div>
              </CardContent>
            </Card>
          ) : chartData && chartData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Spending Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'area' ? (
                      <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} width={80} />
                        <CartesianGrid strokeDasharray="3 3" />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="Spending"
                          stroke="#8884d8"
                          fillOpacity={1}
                          fill="url(#colorSpending)"
                        />
                      </AreaChart>
                    ) : (
                      <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} width={80} />
                        <CartesianGrid strokeDasharray="3 3" />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                        <Bar dataKey="Spending" fill="#8884d8" />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  No data available. Please adjust your filters and try again.
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          {timeSeriesData?.stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Spending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{timeSeriesData.stats.formattedTotal}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    For period {timeSeriesData.stats.periodCovered}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Average Per Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatCurrency(timeSeriesData.stats.average)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Over {timeSeriesData.stats.count} months
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Spending Range</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col">
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                      <div>
                        <div className="text-sm text-muted-foreground">Minimum</div>
                        <div className="text-lg font-medium">
                          {formatCurrency(timeSeriesData.stats.min)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Maximum</div>
                        <div className="text-lg font-medium">
                          {formatCurrency(timeSeriesData.stats.max)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-sm text-muted-foreground">Median</div>
                      <div className="text-lg font-medium">
                        {formatCurrency(timeSeriesData.stats.median)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  No statistics available. Try enabling stats in filters.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transactions Table Summary (Optional) */}
          {timeSeriesData?.data && timeSeriesData.data.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Monthly Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Period</th>
                        <th className="text-right py-2">Transactions</th>
                        <th className="text-right py-2">Total Amount</th>
                        <th className="text-right py-2">Average</th>
                        {compareToPrevious && <th className="text-right py-2">Change</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSeriesData.data.map((item) => (
                        <tr key={item.date} className="border-b">
                          <td className="py-2">{formatDateLabel(item.date)}</td>
                          <td className="text-right py-2">{item.count}</td>
                          <td className="text-right py-2">{item.formattedAmount}</td>
                          <td className="text-right py-2">{formatCurrency(item.average)}</td>
                          {compareToPrevious && (
                            <td
                              className={`text-right py-2 ${item.trend ? (item.trend.direction === 'up' ? 'text-red-500' : 'text-green-500') : ''}`}
                            >
                              {item.trend
                                ? `${item.trend.direction === 'up' ? '+' : '-'}${item.trend.percentChange}%`
                                : '-'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* --- New Analytics Cards --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {/* Top Categories */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Top Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingCategories ? (
                  <div>Loading...</div>
                ) : errorCategories ? (
                  <div className="text-red-500">
                    Your categories are not available. Please try again later.
                  </div>
                ) : categoryBreakdown && categoryBreakdown.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left">Category</th>
                        <th className="text-right">Total</th>
                        <th className="text-right">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryBreakdown.map((cat) => (
                        <tr key={cat.category}>
                          <td>{cat.category}</td>
                          <td className="text-right font-mono">{formatCurrency(cat.total)}</td>
                          <td className="text-right">{cat.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div>No data</div>
                )}
              </CardContent>
            </Card>
            {/* Top Merchants */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Top Merchants</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingMerchants ? (
                  <div>Loading...</div>
                ) : errorMerchants ? (
                  <div className="text-red-500">
                    Your merchants are not available. Please try again later.
                  </div>
                ) : topMerchants && topMerchants.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left">Merchant</th>
                        <th className="text-right">Total</th>
                        <th className="text-right">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topMerchants.map((m) => (
                        <tr key={m.merchant}>
                          <td>{m.merchant}</td>
                          <td className="text-right font-mono">{formatCurrency(m.totalSpent)}</td>
                          <td className="text-right">{m.frequency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div>No data</div>
                )}
              </CardContent>
            </Card>
            {/* Income vs. Expenses */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Income vs. Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Placeholder: Replace with real data if available */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span>Income</span>
                    <span className="font-bold text-green-600 font-mono">
                      {formatCurrency(timeSeriesData?.stats?.totalIncome || '0.00')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expenses</span>
                    <span className="font-bold text-red-600 font-mono">
                      {formatCurrency(timeSeriesData?.stats?.totalExpenses || '0.00')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Trends & Anomalies */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Trends & Anomalies</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Find largest month-over-month change */}
                {timeSeriesData?.data && timeSeriesData.data.length > 1 ? (
                  (() => {
                    let maxChange = 0
                    let maxIdx = 1
                    for (let i = 1; i < timeSeriesData.data.length; i++) {
                      const prev = timeSeriesData.data[i - 1]
                      const curr = timeSeriesData.data[i]
                      const change = Math.abs(curr.amount - prev.amount)
                      if (change > maxChange) {
                        maxChange = change
                        maxIdx = i
                      }
                    }
                    const prev = timeSeriesData.data[maxIdx - 1]
                    const curr = timeSeriesData.data[maxIdx]
                    return (
                      <div>
                        <div>
                          <span className="font-medium">Largest change:</span>{' '}
                          {formatDateLabel(prev.date)} → {formatDateLabel(curr.date)}
                        </div>
                        <div>
                          <span className="font-medium">Change:</span>{' '}
                          {formatCurrency(curr.amount - prev.amount)}
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  <div>No significant changes</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Wrap the component with QueryClientProvider
export default function FinanceAnalyticsPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <AnalyticsContent />
    </QueryClientProvider>
  )
}
