/**
 * AI Tools Router
 * tRPC implementations of TanStack AI tools for accessing AI-powered features
 * This includes notes, finance, workouts, wellness, flights, and tax calculations
 */

import { NotesService } from '@hominem/data/services'
import {
  assessMentalWellnessInputSchema,
  assessMentalWellnessOutputSchema,
  calculateBudgetBreakdownInputSchema,
  calculateLoanDetailsInputSchema,
  calculateRunwayInputSchema,
  calculateSavingsGoalInputSchema,
  createFinanceAccountInputSchema,
  createNoteInputSchema,
  createTransactionInputSchema,
  deleteFinanceAccountInputSchema,
  deleteTransactionInputSchema,
  getCategoryBreakdownInputSchema,
  getFinanceAccountsInputSchema,
  getSpendingCategoriesInputSchema,
  getSpendingTimeSeriesInputSchema,
  getTopMerchantsInputSchema,
  getTransactionsInputSchema,
  listNotesInputSchema,
  recommendWorkoutInputSchema,
  recommendWorkoutOutputSchema,
  updateFinanceAccountInputSchema,
  updateTransactionInputSchema,
} from '@hominem/tools'
import { generateObject } from 'ai'
import { z } from 'zod'
import { loadPrompt } from '../../utils/prompts'
import { protectedProcedure, router } from '../procedures'

/**
 * NOTES TOOLS
 */

const notesService = new NotesService()

const createNoteProcedure = protectedProcedure
  .input(createNoteInputSchema)
  .mutation(async ({ input, ctx }) => {
    const userId = ctx.userId
    if (!userId) {
      throw new Error('User ID is required')
    }

    const note = await notesService.create({
      title: input.title,
      content: input.content,
      type: input.type,
      tags: input.tags,
      userId,
    })

    return note
  })

const listNotesProcedure = protectedProcedure
  .input(listNotesInputSchema)
  .query(async ({ input, ctx }) => {
    const userId = ctx.userId
    if (!userId) {
      throw new Error('User ID is required')
    }

    const notes = await notesService.list(userId, {})

    return {
      notes: notes.slice(input.offset || 0, (input.offset || 0) + (input.limit || 50)),
      total: notes.length,
    }
  })

/**
 * FINANCE TOOLS
 */

// Account Management
const createFinanceAccountProcedure = protectedProcedure
  .input(createFinanceAccountInputSchema)
  .mutation(async ({ input, ctx }) => {
    // TODO: Implement using FinanceService or direct API call
    // Placeholder response
    return {
      id: `acc_'${Math.random().toString(36).substring(7)}`,
      name: input.name,
      type: input.type,
      balance: input.balance || 0,
      currency: input.currency || 'USD',
      lastUpdated: new Date().toISOString(),
    }
  })

const getFinanceAccountsProcedure = protectedProcedure
  .input(getFinanceAccountsInputSchema)
  .query(async ({ input, ctx }) => {
    // TODO: Implement using FinanceService
    // Placeholder response
    return {
      accounts: [],
      total: 0,
    }
  })

const updateFinanceAccountProcedure = protectedProcedure
  .input(updateFinanceAccountInputSchema)
  .mutation(async ({ input, ctx }) => {
    // TODO: Implement using FinanceService
    return {
      id: input.accountId,
      name: input.name || '',
      type: 'checking' as const,
      balance: input.balance || 0,
      currency: 'USD',
      lastUpdated: new Date().toISOString(),
    }
  })

const deleteFinanceAccountProcedure = protectedProcedure
  .input(deleteFinanceAccountInputSchema)
  .mutation(async ({ input, ctx }) => {
    // TODO: Implement using FinanceService
    return {
      success: true,
      message: `Account ${input.accountId} deleted successfully`,
    }
  })

// Transaction Management
const createTransactionProcedure = protectedProcedure
  .input(createTransactionInputSchema)
  .mutation(async ({ input, ctx }) => {
    // TODO: Implement using FinanceService
    return {
      id: `txn_'${Math.random().toString(36).substring(7)}`,
      accountId: input.accountId,
      amount: input.amount,
      description: input.description,
      category: input.category,
      type: input.type,
      date: input.date || new Date().toISOString(),
    }
  })

const getTransactionsProcedure = protectedProcedure
  .input(getTransactionsInputSchema)
  .query(async ({ input, ctx }) => {
    // TODO: Implement using FinanceService
    return {
      transactions: [],
      total: 0,
    }
  })

const updateTransactionProcedure = protectedProcedure
  .input(updateTransactionInputSchema)
  .mutation(async ({ input, ctx }) => {
    // TODO: Implement using FinanceService
    return {
      id: input.transactionId,
      accountId: '',
      amount: input.amount || 0,
      description: input.description || '',
      category: input.category,
      type: 'expense' as const,
      date: new Date().toISOString(),
    }
  })

const deleteTransactionProcedure = protectedProcedure
  .input(deleteTransactionInputSchema)
  .mutation(async ({ input, ctx }) => {
    // TODO: Implement using FinanceService
    return {
      success: true,
      message: `Transaction ${input.transactionId} deleted successfully`,
    }
  })

// Analytics
const getSpendingCategoriesProcedure = protectedProcedure
  .input(getSpendingCategoriesInputSchema)
  .query(async ({ input, ctx }) => {
    // TODO: Implement using FinanceService
    return {
      categories: [],
      total: 0,
    }
  })

const getCategoryBreakdownProcedure = protectedProcedure
  .input(getCategoryBreakdownInputSchema)
  .query(async ({ input, ctx }) => {
    // TODO: Implement using FinanceService
    return {
      breakdown: [],
      totalSpending: 0,
      averagePerDay: 0,
    }
  })

const getSpendingTimeSeriesProcedure = protectedProcedure
  .input(getSpendingTimeSeriesInputSchema)
  .query(async ({ input, ctx }) => {
    // TODO: Implement using FinanceService
    return {
      series: [],
      total: 0,
      average: 0,
    }
  })

const getTopMerchantsProcedure = protectedProcedure
  .input(getTopMerchantsInputSchema)
  .query(async ({ input, ctx }) => {
    // TODO: Implement using FinanceService
    return {
      merchants: [],
    }
  })

// Financial Calculators
const calculateBudgetBreakdownProcedure = protectedProcedure
  .input(calculateBudgetBreakdownInputSchema)
  .query(async ({ input, ctx }) => {
    const percentage = input.savingsTarget ? (input.savingsTarget / input.monthlyIncome) * 100 : 20
    const remaining = input.monthlyIncome * (1 - percentage / 100)

    return {
      housing: remaining * 0.28,
      food: remaining * 0.12,
      transportation: remaining * 0.15,
      utilities: remaining * 0.08,
      healthcare: remaining * 0.08,
      entertainment: remaining * 0.05,
      savings: input.monthlyIncome * (percentage / 100),
    }
  })

const calculateRunwayProcedure = protectedProcedure
  .input(calculateRunwayInputSchema)
  .query(async ({ input, ctx }) => {
    const months = Math.floor(input.currentBalance / input.monthlyExpenses)
    const days = Math.floor(
      ((input.currentBalance % input.monthlyExpenses) / input.monthlyExpenses) * 30
    )
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + months)
    endDate.setDate(endDate.getDate() + days)

    return {
      months,
      days,
      estimatedEndDate: endDate.toISOString().split('T')[0],
    }
  })

const calculateSavingsGoalProcedure = protectedProcedure
  .input(calculateSavingsGoalInputSchema)
  .query(async ({ input, ctx }) => {
    const monthlyRate = (input.interestRate || 0) / 100 / 12
    const remaining = input.goalAmount - input.currentSavings

    let months = 0
    if (monthlyRate === 0) {
      months = Math.ceil(remaining / input.monthlyContribution)
    } else {
      // Using FV formula to calculate months
      months = Math.ceil(
        Math.log((remaining * monthlyRate) / input.monthlyContribution + 1) /
          Math.log(1 + monthlyRate)
      )
    }

    const completionDate = new Date()
    completionDate.setMonth(completionDate.getMonth() + months)

    // Calculate total interest earned
    const totalInterest =
      input.goalAmount - input.currentSavings - months * input.monthlyContribution

    return {
      monthsToGoal: months,
      completionDate: completionDate.toISOString().split('T')[0],
      totalInterestEarned: Math.max(0, totalInterest),
    }
  })

const calculateLoanDetailsProcedure = protectedProcedure
  .input(calculateLoanDetailsInputSchema)
  .query(async ({ input, ctx }) => {
    const monthlyRate = input.annualRate / 100 / 12
    const monthlyPayment =
      (input.principal * (monthlyRate * (1 + monthlyRate) ** input.months)) /
      ((1 + monthlyRate) ** input.months - 1)

    return {
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalPayment: Math.round(monthlyPayment * input.months * 100) / 100,
      totalInterest: Math.round((monthlyPayment * input.months - input.principal) * 100) / 100,
    }
  })

/**
 * AI-POWERED TOOLS (using LM Studio)
 */

const recommendWorkoutProcedure = protectedProcedure
  .input(recommendWorkoutInputSchema)
  .query(async ({ input, ctx }) => {
    try {
      const prompt = loadPrompt('workout', {
        fitnessLevel: input.fitnessLevel,
        goal: input.goal.replace('_', ' '),
        timeAvailable: `${input.timeAvailable} minutes`,
        equipment: input.equipment?.join(', ') || 'none specifically mentioned',
        limitations: input.limitations?.join(', ') || 'none specified',
      })

      const response = await generateObject({
        model: lmstudio('qwen/qwen3-4b-thinking-2507'),
        prompt,
        schema: recommendWorkoutOutputSchema,
      })

      return response.object
    } catch (error) {
      console.error('[tRPC Workout Error]', error)
      // Return basic workout fallback
      return {
        title: `Basic ${input.goal.replace('_', ' ')} Workout`,
        duration: `${input.timeAvailable} minutes`,
        exercises: [
          { name: 'Warm-up', sets: 1, reps: '5-10 minutes', restTime: 'N/A' },
          { name: 'Main Exercise', sets: 3, reps: '8-12', restTime: '60-90 seconds' },
          { name: 'Cool-down', sets: 1, reps: '5 minutes', restTime: 'N/A' },
        ],
        notes: ['Error generating custom workout. Here is a basic alternative.'],
      }
    }
  })

const assessMentalWellnessProcedure = protectedProcedure
  .input(assessMentalWellnessInputSchema)
  .query(async ({ input, ctx }) => {
    try {
      const prompt = loadPrompt('mentalWellness', {
        stressDescription: input.stressDescription,
        moodRating: `${input.moodRating} out of 10`,
        recentChallenges: input.recentChallenges?.join(', ') || 'None specified',
        currentCopingStrategies: input.currentCopingStrategies?.join(', ') || 'None specified',
      })

      const response = await generateObject({
        model: lmstudio('qwen/qwen3-4b-thinking-2507'),
        prompt,
        schema: assessMentalWellnessOutputSchema,
      })

      return response.object
    } catch (error) {
      console.error('[tRPC Mental Wellness Error]', error)
      // Return basic assessment fallback
      return {
        overallAssessment:
          'We recommend taking time to reflect and practice self-care. Consider speaking with a mental health professional.',
        stressLevel: input.moodRating <= 5 ? 8 : 5,
        copingStrategies: [
          'Take deep breaths',
          'Go for a walk',
          'Practice meditation',
          'Connect with friends',
        ],
        recommendations: [
          'Consider talking to a mental health professional',
          'Practice daily mindfulness',
          'Maintain a regular exercise routine',
          'Ensure adequate sleep',
        ],
        positiveAffirmation:
          'You are capable of handling challenges. Be kind to yourself and take it one day at a time.',
      }
    }
  })

const getFlightPricesProcedure = protectedProcedure
  .input(getFlightPricesInputSchema)
  .query(async ({ input }) => {
    try {
      const response = await generateObject({
        model: lmstudio('qwen/qwen3-4b-thinking-2507'),
        prompt: `
Based on the user input, return the primary airport codes for the origin and destination cities.
For instance, New York City would return JFK, and Los Angeles would return LAX.
If there are multiple airports, return the one most commonly used for international flights.
If you cannot find the airport code, return "unknown".

User input: ${input.query}
        `,
        schema: z.object({
          originCode: z.string(),
          destinationCode: z.string(),
        }),
      })

      const { originCode, destinationCode } = response.object

      if (originCode === 'unknown' || destinationCode === 'unknown') {
        return {
          originCode: 'UNKNOWN',
          destinationCode: 'UNKNOWN',
        }
      }

      // Note: Actual flight price fetching would require integration with flight APIs
      return {
        originCode,
        destinationCode,
      }
    } catch (error) {
      console.error('[tRPC Flights Error]', error)
      return {
        originCode: 'ERROR',
        destinationCode: 'ERROR',
      }
    }
  })

export const aiRouter = router({
  // Notes
  createNote: createNoteProcedure,
  listNotes: listNotesProcedure,

  // Finance - Accounts
  createAccount: createFinanceAccountProcedure,
  getAccounts: getFinanceAccountsProcedure,
  updateAccount: updateFinanceAccountProcedure,
  deleteAccount: deleteFinanceAccountProcedure,

  // Finance - Transactions
  createTransaction: createTransactionProcedure,
  getTransactions: getTransactionsProcedure,
  updateTransaction: updateTransactionProcedure,
  deleteTransaction: deleteTransactionProcedure,

  // Finance - Analytics
  getSpendingCategories: getSpendingCategoriesProcedure,
  getCategoryBreakdown: getCategoryBreakdownProcedure,
  getSpendingTimeSeries: getSpendingTimeSeriesProcedure,
  getTopMerchants: getTopMerchantsProcedure,

  // Finance - Calculators
  calculateBudgetBreakdown: calculateBudgetBreakdownProcedure,
  calculateRunway: calculateRunwayProcedure,
  calculateSavingsGoal: calculateSavingsGoalProcedure,
  calculateLoanDetails: calculateLoanDetailsProcedure,

  // Fitness & Wellness
  recommendWorkout: recommendWorkoutProcedure,
  assessMentalWellness: assessMentalWellnessProcedure,

  // Travel
  getFlightPrices: getFlightPricesProcedure,
})
