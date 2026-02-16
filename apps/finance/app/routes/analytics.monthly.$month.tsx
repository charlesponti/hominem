import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card';
import { Skeleton } from '@hominem/ui/components/ui/skeleton';
import { redirect, useParams } from 'react-router';

import { useMonthlyStats } from '~/lib/hooks/use-monthly-stats';
import { formatCurrency } from '~/lib/number.utils';
import { requireAuth } from '~/lib/guards';
import { createServerHonoClient } from '~/lib/api.server';

import type { Route } from './+types/analytics.monthly.$month';

export async function loader({ request, params }: Route.LoaderArgs) {
  const { month } = params;
  if (!month) {
    return redirect('/analytics');
  }

  const authResult = await requireAuth(request);
  if (!authResult.user) {
    return redirect('/auth/signin');
  }

  const client = createServerHonoClient(authResult.user.id, request);

  const res = await client.api.finance.analyze['monthly-stats'].$post({ json: { month } });
  const stats = res.ok ? await res.json() : null;

  return { stats };
}

// Helper function to format month string (e.g., "2024-05" to "May 2024")
function formatMonthDisplay(monthStr: string | undefined) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function MonthlyAnalyticsPage({ loaderData }: Route.ComponentProps) {
  const { month } = useParams<{ month: string }>();
  const { stats: initialStats } = loaderData;
  const { stats, isLoading, error } = useMonthlyStats(month, { initialData: initialStats });

  const formattedMonth = formatMonthDisplay(month);

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-xl font-bold mb-6 flex flex-col">
        Monthly Analytics
        <span className="text-lg text-primary/40">{formattedMonth}</span>
      </h1>

      {isLoading && (
        <div className="flex flex-col gap-4">
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
        <div className="text-destructive p-4 border border-destructive/50 bg-destructive/10">
          <p>Error loading monthly statistics</p>
        </div>
      ) : null}

      {stats && !isLoading && !error && (
        <div className="flex flex-col gap-4">
          {/* Combined Summary Card */}
          <Card className="lg:col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Net Income</span>
                  <span
                    className={`font-bold ${(stats.netIncome ?? 0) >= 0 ? 'text-foreground' : 'text-destructive'}`}
                  >
                    {formatCurrency(stats.netIncome ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Total Income</span>
                  <span className="text-foreground">{formatCurrency(stats.totalIncome ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm ">
                  <span className="font-medium">Total Expenses</span>
                  <span className="text-destructive">
                    {formatCurrency(stats.totalExpenses ?? 0)}
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
              {stats.categorySpending && stats.categorySpending.length > 0 ? (
                <ul className="space-y-2">
                  {stats.categorySpending.map((category: any) => (
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
  );
}
