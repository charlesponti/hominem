import { describe, expect, it } from 'vitest';

import {
  calculateBudgetBreakdown,
  calculateLoanDetails,
  calculateSavingsGoal,
} from './modern-finance';

describe('modern-finance calculators integration', () => {
  it('computes runway-adjacent budget breakdown deterministically', () => {
    const result = calculateBudgetBreakdown({
      monthlyIncome: 5000,
      savingsTarget: 1000,
    });

    expect(result.housing).toBe(1200);
    expect(result.food).toBe(480);
    expect(result.transportation).toBe(400);
    expect(result.utilities).toBe(240);
    expect(result.healthcare).toBe(200);
    expect(result.entertainment).toBe(200);
    expect(result.savings).toBe(1000);
  });

  it('computes savings goal timeline and interest envelope', () => {
    const result = calculateSavingsGoal({
      currentSavings: 2000,
      goalAmount: 8000,
      monthlyContribution: 1000,
      interestRate: 6,
    });

    expect(result.monthsToGoal).toBe(6);
    expect(result.totalInterestEarned).toBeGreaterThan(0);
    expect(new Date(result.completionDate).toString()).not.toBe('Invalid Date');
  });

  it('computes loan details for zero and non-zero rates', () => {
    const zeroRate = calculateLoanDetails({
      principal: 12000,
      annualRate: 0,
      months: 12,
    });
    expect(zeroRate.monthlyPayment).toBe(1000);
    expect(zeroRate.totalInterest).toBe(0);

    const withRate = calculateLoanDetails({
      principal: 12000,
      annualRate: 12,
      months: 12,
    });
    expect(withRate.monthlyPayment).toBeGreaterThan(1000);
    expect(withRate.totalInterest).toBeGreaterThan(0);
  });
});
