import * as z from 'zod';

export const runwayCalculationSchema = z.object({
  monthlyIncome: z.number().nonnegative(),
  monthlyExpenses: z.number().nonnegative(),
  cashReserve: z.number().nonnegative(),
});

export const calculateBudgetBreakdownInputSchema = z.object({
  monthlyIncome: z.number().nonnegative(),
  savingsTarget: z.number().nonnegative().optional(),
});

export const calculateSavingsGoalInputSchema = z.object({
  currentSavings: z.number().nonnegative(),
  goalAmount: z.number().nonnegative(),
  monthlyContribution: z.number().positive(),
  interestRate: z.number().nonnegative().optional(),
});

export const calculateBudgetSchema = z.object({
  monthlyIncome: z.number().nonnegative(),
  savingsTarget: z.number().nonnegative().optional(),
});

export const loanDetailsInputSchema = z.object({
  principal: z.number().positive(),
  annualRate: z.number().nonnegative(),
  months: z.number().int().positive(),
});

export interface LoanDetails {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  amortizationSchedule: Array<{
    month: number;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
  }>;
}

export function calculateBudgetBreakdown(
  input: z.infer<typeof calculateBudgetBreakdownInputSchema>,
): {
  needs: number;
  wants: number;
  savings: number;
  unallocated: number;
} {
  const { monthlyIncome: income, savingsTarget = income * 0.2 } = input;

  const needs = income * 0.5;
  const wants = income * 0.3;
  const savings = Math.min(savingsTarget, income * 0.2);
  const unallocated = Math.max(0, income - needs - wants - savings);

  return {
    needs,
    wants,
    savings,
    unallocated,
  };
}

export function calculateSavingsGoal(input: z.infer<typeof calculateSavingsGoalInputSchema>): {
  months: number;
  interestEarned: number;
  totalContributions: number;
  finalAmount: number;
} {
  const rate = (input.interestRate ?? 0) / 12 / 100;
  const monthlyContribution = input.monthlyContribution;
  let balance = input.currentSavings;
  let months = 0;

  while (balance < input.goalAmount) {
    balance = balance * (1 + rate) + monthlyContribution;
    months += 1;
    if (months > 1200) break;
  }

  const totalContributions = input.currentSavings + monthlyContribution * months;
  const interestEarned = balance - totalContributions;

  return {
    months,
    interestEarned,
    totalContributions,
    finalAmount: balance,
  };
}

export function calculateLoanDetails(input: z.infer<typeof loanDetailsInputSchema>): LoanDetails {
  const { principal, annualRate, months } = input;
  const r = annualRate / 100 / 12;

  let monthlyPayment: number;
  if (r === 0) {
    monthlyPayment = principal / months;
  } else {
    const factor = (1 + r) ** months;
    monthlyPayment = (principal * r * factor) / (factor - 1);
  }

  const amortizationSchedule: LoanDetails['amortizationSchedule'] = [];
  let balance = principal;

  for (let month = 1; month <= months; month++) {
    const interest = balance * r;
    const principalPaid = monthlyPayment - interest;
    balance = Math.max(0, balance - principalPaid);

    amortizationSchedule.push({
      month,
      payment: monthlyPayment,
      principal: principalPaid,
      interest,
      balance,
    });
  }

  const totalPayment = monthlyPayment * months;
  return {
    monthlyPayment,
    totalPayment,
    totalInterest: totalPayment - principal,
    amortizationSchedule,
  };
}

export function calculateRunway(input: z.infer<typeof runwayCalculationSchema>): {
  months: number;
} {
  const net = input.monthlyExpenses - input.monthlyIncome;
  if (net <= 0) {
    return { months: Number.POSITIVE_INFINITY };
  }
  return { months: input.cashReserve / net };
}
