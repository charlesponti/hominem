import { calculateRunway } from '../packages/finance/src/core/runway.service';

const today = new Date();
const nextMonth = new Date(today);
nextMonth.setMonth(today.getMonth() + 1);

const result = calculateRunway({
  balance: 5000,
  monthlyExpenses: 1000,
  plannedPurchases: [
    { description: 'Expensive repair', amount: 6000, date: nextMonth.toISOString() },
  ],
  projectionMonths: 3,
});

console.log(JSON.stringify(result, null, 2));
