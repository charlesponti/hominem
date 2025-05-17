import { useParams } from 'react-router'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { formatCurrency } from '~/lib/finance.utils'
import { useMonthlyStats } from '~/lib/hooks/use-monthly-stats'

// Helper function to format month string (e.g., "2024-05" to "May 2024")
function formatMonthDisplay(monthStr: string | undefined): string {
  if (!monthStr) return ''
  const [year, month] = monthStr.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function MonthlyAnalyticsPage() {
  const { month } = useParams<{ month: string }>()
  const { stats, isLoading, error } = useMonthlyStats(month)

  const formattedMonth = formatMonthDisplay(month)

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-xl font-bold mb-6 flex flex-col">
        Monthly Analytics
        <span className="text-lg text-primary/40">{formattedMonth}</span>
      </h1>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Loading skeleton cards */}
          {[0, 1, 2, 3].map((index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
          <Card className="md:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={index} className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {error ? (
        <div className="text-red-500 p-4 border border-red-300 rounded bg-red-50">
          <p>Error loading monthly statistics</p>
        </div>
      ) : null}

      {stats && !isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Combined Summary Card */}
          <Card className="lg:col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Net Income</span>
                  <span
                    className={`text-2xl font-bold ${stats.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {formatCurrency(stats.netIncome)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Income</span>
                  <span className="text-xl text-green-600">
                    {formatCurrency(stats.totalIncome)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Expenses</span>
                  <span className="text-xl text-red-600">
                    {formatCurrency(stats.totalExpenses)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Spending */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.categorySpending.length > 0 ? (
                <ul className="space-y-2">
                  {stats.categorySpending.map((category) => (
                    <li
                      key={category.name}
                      className="flex justify-between items-center border-b pb-1"
                    >
                      <span>{category.name}</span>
                      <span className="font-mono">{formatCurrency(category.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No spending recorded for this month.</p>
              )}
            </CardContent>
          </Card>

          {/* TODO: Add more details like top transactions, comparison to previous month/budget, etc. */}
        </div>
      )}
    </div>
  )
}
