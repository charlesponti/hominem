import { z } from 'zod';

export const calculateBudgetBreakdownInputSchema = z.object({
  monthlyIncome: z.number().describe('Monthly income'),
  savingsTarget: z.number().optional().describe('Monthly savings goal'),
});

export const calculateBudgetBreakdownOutputSchema = z.object({
  housing: z.number(),
  food: z.number(),
  transportation: z.number(),
  utilities: z.number(),
  healthcare: z.number(),
  entertainment: z.number(),
  savings: z.number(),
});

export const calculateRunwayInputSchema = z.object({
  currentBalance: z.number().describe('Current available balance'),
  monthlyExpenses: z.number().describe('Average monthly expenses'),
});

export const calculateRunwayOutputSchema = z.object({
  months: z.number(),
  days: z.number(),
  estimatedEndDate: z.string(),
});

export const calculateSavingsGoalInputSchema = z.object({
  currentSavings: z.number().describe('Current savings amount'),
  goalAmount: z.number().describe('Target savings amount'),
  monthlyContribution: z.number().describe('Monthly savings contribution'),
  interestRate: z.number().optional().describe('Annual interest rate (%)'),
});

export const calculateSavingsGoalOutputSchema = z.object({
  monthsToGoal: z.number(),
  completionDate: z.string(),
  totalInterestEarned: z.number(),
});

export const calculateLoanDetailsInputSchema = z.object({
  principal: z.number().describe('Loan amount'),
  annualRate: z.number().describe('Annual interest rate (%)'),
  months: z.number().describe('Loan term in months'),
});

export const calculateLoanDetailsOutputSchema = z.object({
  monthlyPayment: z.number(),
  totalPayment: z.number(),
  totalInterest: z.number(),
});

export async function calculateBudgetBreakdown(
  input: z.infer<typeof calculateBudgetBreakdownInputSchema>,
) {
  const { monthlyIncome, savingsTarget = 0 } = input;
  const savings = savingsTarget;
  const housing = monthlyIncome * 0.3;
  const food = monthlyIncome * 0.12;
  const transportation = monthlyIncome * 0.1;
  const utilities = monthlyIncome * 0.06;
  const healthcare = monthlyIncome * 0.05;
  const entertainment = monthlyIncome * 0.05;

  return { housing, food, transportation, utilities, healthcare, entertainment, savings };
}

export async function calculateSimpleRunway(input: z.infer<typeof calculateRunwayInputSchema>) {
  const months = Math.floor(input.currentBalance / input.monthlyExpenses);
  const days = months * 30;
  const estimatedEndDate = new Date();
  estimatedEndDate.setMonth(estimatedEndDate.getMonth() + months);
  return { months, days, estimatedEndDate: estimatedEndDate.toISOString() };
}

export async function calculateSavingsGoal(input: z.infer<typeof calculateSavingsGoalInputSchema>) {
  const monthsToGoal = Math.ceil(
    (input.goalAmount - input.currentSavings) / input.monthlyContribution,
  );
  const completionDate = new Date();
  completionDate.setMonth(completionDate.getMonth() + monthsToGoal);
  return { monthsToGoal, completionDate: completionDate.toISOString(), totalInterestEarned: 0 };
}

export async function calculateLoanDetails(input: z.infer<typeof calculateLoanDetailsInputSchema>) {
  const monthlyRate = input.annualRate / 100 / 12;
  const denominator = 1 - Math.pow(1 + monthlyRate, -input.months);
  const monthlyPayment = (input.principal * monthlyRate) / denominator;
  const totalPayment = monthlyPayment * input.months;
  const totalInterest = totalPayment - input.principal;
  return { monthlyPayment, totalPayment, totalInterest };
}
