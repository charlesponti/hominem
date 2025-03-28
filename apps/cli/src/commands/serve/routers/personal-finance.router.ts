import { google } from '@ai-sdk/google'
import { tools } from '@ponti/utils/finance'
import { generateText, tool } from 'ai'
import { z } from 'zod'
import { trpc } from '../trpc'

export class PersonalFinanceRouter {
  public router = trpc.router({
    financeQuery: trpc.procedure
      .input(z.object({ prompt: z.string() }))
      .query(async ({ input }) => {
        const response = await generateText({
          model: google('gemini-1.5-pro-latest', { structuredOutputs: true }),
          tools: {
            ...tools,
            answer: tool({
              description: 'A tool for providing the final answer.',
              parameters: z.object({
                steps: z.array(
                  z.object({
                    stepName: z.string(),
                    stepArguments: z.any(),
                  })
                ),
                answer: z.string(),
              }),
            }),
          },
          toolChoice: 'required',
          maxSteps: 10,
          system:
            'You are a personal finance assistant. ' +
            'Use the appropriate tools to provide the user with financial insights, calculations, and advice. ' +
            'Provide detailed and accurate information about budgeting, savings goals, loan calculations, and financial categories.',
          prompt: input.prompt,
        })

        return response
      }),

    budgetCalculator: trpc.procedure
      .input(
        z.object({
          prompt: z.string(),
          monthlyIncome: z.number().optional(),
          savingsPercentage: z.number().optional(),
          fixedExpenses: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        // Extract values from prompt if not explicitly provided
        const { monthlyIncome = 0, savingsPercentage = 0, fixedExpenses = 0 } = input

        const result = await tools.budgetCalculatorTool.execute(
          {
            monthlyIncome,
            savingsPercentage,
            fixedExpenses,
          },
          { messages: [], toolCallId: 'budget_calculator' }
        )

        return result
      }),

    savingsGoal: trpc.procedure
      .input(
        z.object({
          prompt: z.string(),
          targetAmount: z.number().optional(),
          currentSavings: z.number().optional(),
          monthlyContribution: z.number().optional(),
          interestRate: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        // Extract values from prompt if not explicitly provided
        const {
          targetAmount = 0,
          currentSavings = 0,
          monthlyContribution = 0,
          interestRate = 0,
        } = input

        const result = await tools.savingsGoalCalculatorTool.execute(
          {
            targetAmount,
            currentSavings,
            monthlyContribution,
            interestRate,
          },
          { messages: [], toolCallId: 'savings_goal_calculator' }
        )

        return result
      }),

    loanCalculator: trpc.procedure
      .input(
        z.object({
          prompt: z.string(),
          loanAmount: z.number().optional(),
          interestRate: z.number().optional(),
          loanTermYears: z.number().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        // Extract values from prompt if not explicitly provided
        const {
          loanAmount = 0,
          interestRate = 0,
          loanTermYears = 0,
          startDate = new Date().toISOString(),
          endDate = new Date().toISOString(),
        } = input

        const result = await tools.loanCalculatorTool.execute(
          {
            loanAmount,
            interestRate,
            loanTermYears,
            startDate,
            endDate,
          },
          { messages: [], toolCallId: 'loan_calculator' }
        )

        return result
      }),

    budgetCategories: trpc.procedure
      .input(
        z.object({
          prompt: z.string(),
          categoryName: z.string().optional(),
          categoryId: z.string().optional(),
          categoryType: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const { categoryName, categoryId, categoryType } = input
        const result = await tools.get_budget_categories.execute(
          {
            query: {
              categoryName,
              categoryId,
              categoryType,
            },
          },
          { messages: [], toolCallId: 'get_budget_categories' }
        )

        return result
      }),
  })
}
