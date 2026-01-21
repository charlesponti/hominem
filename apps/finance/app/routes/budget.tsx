import { useState } from 'react';

import { BudgetCategoryDetails, BudgetProjectionDashboard } from '~/components/budget-categories';
import { BudgetTrackingHeader } from '~/components/budget-categories/budget-tracking-header';
import { BudgetOverview } from '~/components/budget-overview';
import { getCurrentMonthYear } from '~/components/date-month-select';

export default function BudgetDashboard() {
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(getCurrentMonthYear());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Budget Dashboard</h1>
      </div>

      <BudgetTrackingHeader
        selectedMonthYear={selectedMonthYear}
        onMonthChange={setSelectedMonthYear}
      />

      <BudgetOverview selectedMonthYear={selectedMonthYear} />

      <BudgetProjectionDashboard />

      <BudgetCategoryDetails selectedMonthYear={selectedMonthYear} />
    </div>
  );
}
