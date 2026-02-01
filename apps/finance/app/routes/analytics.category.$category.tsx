import { subMonths } from 'date-fns';
import { useState } from 'react';
import { useParams } from 'react-router';

import { AccountSelect } from '~/components/account-select';
import { AnalyticsChartDisplay } from '~/components/analytics/analytics-chart-display';
import { MonthlyBreakdown } from '~/components/analytics/monthly-breakdown';

export default function CategoryAnalyticsPage() {
  const { category } = useParams<{ category: string }>();
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [dateFrom, _setDateFrom] = useState<Date>(subMonths(new Date(), 6));
  const [dateTo] = useState<Date>(new Date());
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  return (
    <div className="container">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold">Category Analysis: {category}</h1>

        <div className="mt-4 md:mt-0">
          <AccountSelect
            selectedAccount={selectedAccount}
            setSelectedAccount={setSelectedAccount}
          />
        </div>
      </div>

      <div className="space-y-6">
        <AnalyticsChartDisplay
          chartType={chartType}
          setChartType={setChartType}
          dateFrom={dateFrom}
          dateTo={dateTo}
          selectedAccount={selectedAccount}
          selectedCategory={category}
          groupBy="month"
          compareToPrevious={true}
        />

        <MonthlyBreakdown
          title="Monthly Breakdown"
          dateFrom={dateFrom}
          dateTo={dateTo}
          selectedAccount={selectedAccount}
          selectedCategory={category}
          compareToPrevious={true}
          groupBy="month"
          category={category}
        />
      </div>
    </div>
  );
}
