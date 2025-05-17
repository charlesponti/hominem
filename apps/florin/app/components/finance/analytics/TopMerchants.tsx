import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { formatCurrency } from '~/lib/finance.utils'
import type { TopMerchantItem } from './types'

interface TopMerchantsProps {
  topMerchants: TopMerchantItem[] | undefined
  isLoadingMerchants: boolean
  errorMerchants: unknown
}

export function TopMerchants({
  topMerchants,
  isLoadingMerchants,
  errorMerchants,
}: TopMerchantsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Top Merchants</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingMerchants ? (
          <div>Loading...</div>
        ) : errorMerchants instanceof Error ? (
          <div className="text-red-500">
            {errorMerchants.message || 'Your merchants are not available. Please try again later.'}
          </div>
        ) : errorMerchants ? (
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
  )
}
