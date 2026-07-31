import { getLastMonthFromRange } from '@hominem/utils/dates';
import { SectionIntro } from '@ponti-studios/ui/layout';
import { subMonths } from 'date-fns';
import { useState } from 'react';

import { AnalyticsChartDisplay } from '~/components/analytics/analytics-chart-display';
import { AnalyticsFilters } from '~/components/analytics/analytics-filters';
import { AnalyticsStatisticsSummary } from '~/components/analytics/analytics-statistics-summary';
import { MonthlyBreakdown } from '~/components/analytics/monthly-breakdown';
import { TopMerchants } from '~/components/analytics/top-merchants';
import { TopTags } from '~/components/analytics/top-tags';
import { BudgetOverview } from '~/components/budget-overview';

export default function FinanceAnalyticsPage() {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subMonths(new Date(), 6));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [includeStats, setIncludeStats] = useState<boolean>(true);
  const [compareToPrevious, setCompareToPrevious] = useState<boolean>(true);
  const [groupBy, setGroupBy] = useState<'month' | 'week' | 'day'>('month');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  const lastMonthYear = getLastMonthFromRange(dateFrom, dateTo);

  return (
    <div className="flex flex-col gap-6">
      <SectionIntro
        title="Analytics"
        description="Spending patterns, budgets, and trends across your accounts."
      />

      <AnalyticsFilters
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        selectedAccount={selectedAccount}
        setSelectedAccount={setSelectedAccount}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        includeStats={includeStats}
        setIncludeStats={setIncludeStats}
        compareToPrevious={compareToPrevious}
        setCompareToPrevious={setCompareToPrevious}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnalyticsStatisticsSummary
          dateFrom={dateFrom}
          dateTo={dateTo}
          selectedAccount={selectedAccount}
          selectedTag={selectedTag}
          includeStats={includeStats}
        />
        <BudgetOverview selectedMonthYear={lastMonthYear} />
      </div>

      <AnalyticsChartDisplay
        chartType={chartType}
        setChartType={setChartType}
        dateFrom={dateFrom}
        dateTo={dateTo}
        selectedAccount={selectedAccount}
        selectedTag={selectedTag}
        groupBy={groupBy}
        compareToPrevious={compareToPrevious}
      />

      <MonthlyBreakdown
        title="Monthly Breakdown"
        dateFrom={dateFrom}
        dateTo={dateTo}
        selectedAccount={selectedAccount}
        selectedTag={selectedTag}
        compareToPrevious={compareToPrevious}
        groupBy={groupBy}
      />

      <TopTags dateFrom={dateFrom} dateTo={dateTo} selectedAccount={selectedAccount} />

      <TopMerchants
        dateFrom={dateFrom}
        dateTo={dateTo}
        selectedAccount={selectedAccount}
        selectedTag={selectedTag}
      />
    </div>
  );
}
