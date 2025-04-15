export const budget = {
  types: [
    { name: 'fixed', amount: 0.5 },
    { name: 'flexible', amount: 0.3 },
    { name: 'goals', amount: 0.2 },
  ],
  categories: {
    Housing: { amount: 0.3, type: 'fixed' },
    'Living Expenses': {
      amount: 0.1,
      type: 'fixed',
      includes: ['electricity'],
    },
    Food: {
      amount: 0.1,
      type: 'fixed',
      includes: ['groceries', 'dining out'],
    },
    Savings: { amount: 0.2, type: 'goals' },
    Debt: { amount: 0.1, type: 'goals' },
    Transportation: { amount: 0.05, type: 'fixed' },
    Personal: { amount: 0.15, type: 'flexible' },
  },
}

/**
 * Often called the 'One Number' Budget, this budgeting method is
 * based on the 50/30/20 rule. This rule states that 50% of your
 * income should go towards needs, 30% towards wants, and 20% towards
 * savings and debt repayment.
 *
 * This function calculates users' weekly flexible spending budget by
 * subtracting monthly fixed costs from monthly income and dividing the remainder by 4.3.
 * NOTE: 4.3 is used instead of 4 to account for months with 5 weeks.
 *
 * @param {number} monthlyIncome - The total sum of all income per month
 * @param {number} monthlyFixedCosts - The sum of all costs that are fixed
 * @return {number}
 */
export function getFlexBudget(monthlyIncome: number, monthlyFixedCosts: number): number {
  return (monthlyIncome - monthlyFixedCosts) / 4.3
}
