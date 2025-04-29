import type { TimeSeriesDataPoint } from '@hominem/utils/types'
import { Link, useNavigate } from 'react-router'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { cn } from '~/lib/utils'

interface AnalyticsMonthlyBreakdownProps {
  data: TimeSeriesDataPoint[] | undefined
  compareToPrevious: boolean
  formatDateLabel: (dateStr: string) => string
  formatCurrency: (value: number | string) => string
}

export function AnalyticsMonthlyBreakdown({
  data,
  compareToPrevious,
  formatDateLabel,
  formatCurrency,
}: AnalyticsMonthlyBreakdownProps) {
  const navigate = useNavigate()

  if (!data || data.length === 0) {
    return null
  }

  return (
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
              {data.map((item) => (
                <tr
                  key={item.date}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/finance/analytics/${item.date}`)}
                  tabIndex={0}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate(`/finance/analytics/${item.date}`)
                    }
                  }}
                >
                  <td className="py-2">
                    <Link
                      to={`/finance/analytics/${item.date}`}
                      className="hover:underline"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      {formatDateLabel(item.date)}
                    </Link>
                  </td>
                  <td className="text-right py-2">{item.count}</td>
                  <td className="text-right py-2 font-mono">{item.formattedAmount}</td>
                  <td className="text-right py-2 font-mono">{formatCurrency(item.average)}</td>
                  {compareToPrevious && (
                    <td
                      className={cn('text-right py-2 font-mono', {
                        'text-red-500': item.trend && item.trend.direction === 'down',
                        'text-green-500': item.trend && item.trend.direction === 'up',
                      })}
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
  )
}
