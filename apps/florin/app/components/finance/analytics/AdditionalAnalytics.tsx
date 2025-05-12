import type { TimeSeriesDataPoint, TimeSeriesStats } from '@hominem/utils/types' // Keep only used types
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { formatCurrency } from '~/lib/finance'

interface CategoryBreakdownItem {
  category: string
  total: string
  count: number
}

interface TopMerchantItem {
  merchant: string
  totalSpent: string
  frequency: number
}

interface AdditionalAnalyticsProps {
  categoryBreakdown: CategoryBreakdownItem[] | undefined
  isLoadingCategories: boolean
  errorCategories: unknown
  topMerchants: TopMerchantItem[] | undefined
  isLoadingMerchants: boolean
  errorMerchants: unknown
  timeSeriesData:
    | { data?: TimeSeriesDataPoint[]; stats?: TimeSeriesStats | null }
    | null
    | undefined
  formatDateLabel: (dateStr: string) => string
}

export function AdditionalAnalytics({
  categoryBreakdown,
  isLoadingCategories,
  errorCategories,
  topMerchants,
  isLoadingMerchants,
  errorMerchants,
  timeSeriesData,
  formatDateLabel,
}: AdditionalAnalyticsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Top Categories */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Top Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingCategories ? (
            <div>Loading...</div>
          ) : errorCategories instanceof Error ? (
            <div className="text-red-500">
              {/* Display error message if available */}
              {errorCategories.message ||
                'Your categories are not available. Please try again later.'}
            </div>
          ) : errorCategories ? (
            <div className="text-red-500">An unknown error occurred while fetching categories.</div>
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
          ) : errorMerchants instanceof Error ? ( // Check if error is an Error instance
            <div className="text-red-500">
              {/* Display error message if available */}
              {errorMerchants.message ||
                'Your merchants are not available. Please try again later.'}
            </div>
          ) : errorMerchants ? ( // Handle other unknown error types
            <div className="text-red-500">An unknown error occurred while fetching merchants.</div>
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
  )
}
