import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { formatCurrency } from '~/lib/finance'
import type { CategoryBreakdownItem } from './types'

interface TopCategoriesProps {
  categoryBreakdown: CategoryBreakdownItem[] | undefined
  isLoadingCategories: boolean
  errorCategories: unknown
}

export function TopCategories({
  categoryBreakdown,
  isLoadingCategories,
  errorCategories,
}: TopCategoriesProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Top Categories</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingCategories ? (
          <div>Loading...</div>
        ) : errorCategories instanceof Error ? (
          <div className="text-red-500">
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
  )
}
