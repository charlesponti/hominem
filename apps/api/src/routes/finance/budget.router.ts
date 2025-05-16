import { db } from '@hominem/utils/db'
import { summarizeByMonth } from '@hominem/utils/finance'
import { budgetCategories } from '@hominem/utils/schema'
import { and, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { handleError } from '../../lib/errors'
import { verifyAuth } from '../../middleware/auth'

// Zod schema for creating a budget category
const createBudgetCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['income', 'expense'], { message: "Type must be 'income' or 'expense'" }),
  // 'allocatedAmount' from the form maps to 'averageMonthlyExpense' in the DB
  allocatedAmount: z.number().min(0).optional(),
  budgetId: z.string().uuid('Invalid budget ID format').optional(),
})

// Zod schema for updating a budget category
const updateBudgetCategorySchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['income', 'expense']).optional(),
  allocatedAmount: z.number().min(0).optional(),
  budgetId: z.string().uuid().optional(),
})

export async function budgetRoutes(fastify: FastifyInstance) {
  // Create a new budget category
  fastify.post('/categories', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) return reply.code(401).send({ error: 'Not authorized' })

    try {
      const validatedData = createBudgetCategorySchema.parse(request.body)
      const { allocatedAmount, ...restOfData } = validatedData

      const [newCategory] = await db
        .insert(budgetCategories)
        .values({
          ...restOfData,
          id: crypto.randomUUID(),
          averageMonthlyExpense: allocatedAmount?.toString(), // Convert number to string for numeric type
          userId,
        })
        .returning()

      return reply.code(201).send(newCategory)
    } catch (error) {
      return handleError(error as Error, reply)
    }
  })

  // Get all budget categories for the user
  fastify.get('/categories', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) return reply.code(401).send({ error: 'Not authorized' })

    try {
      const categories = await db.query.budgetCategories.findMany({
        where: eq(budgetCategories.userId, userId),
        orderBy: (table, { asc }) => [asc(table.name)],
      })
      return categories
    } catch (error) {
      return handleError(error as Error, reply)
    }
  })

  // Get a single budget category by ID
  fastify.get('/categories/:id', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) return reply.code(401).send({ error: 'Not authorized' })

    const { id } = request.params as { id: string }
    if (!id || !z.string().uuid().safeParse(id).success) {
      return reply.code(400).send({ error: 'Invalid category ID format' })
    }

    try {
      const category = await db.query.budgetCategories.findFirst({
        where: and(eq(budgetCategories.id, id), eq(budgetCategories.userId, userId)),
      })

      if (!category) {
        return reply.code(404).send({ error: 'Budget category not found' })
      }
      return category
    } catch (error) {
      return handleError(error as Error, reply)
    }
  })

  // Update an existing budget category
  fastify.put('/categories/:id', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) return reply.code(401).send({ error: 'Not authorized' })

    const { id } = request.params as { id: string }
    if (!id || !z.string().uuid().safeParse(id).success) {
      return reply.code(400).send({ error: 'Invalid category ID format' })
    }

    try {
      const validatedData = updateBudgetCategorySchema.parse(request.body)
      if (Object.keys(validatedData).length === 0) {
        return reply.code(400).send({ error: 'No update data provided' })
      }
      const { allocatedAmount, ...restOfData } = validatedData

      const [updatedCategory] = await db
        .update(budgetCategories)
        .set({
          ...restOfData,
          ...(allocatedAmount !== undefined && {
            averageMonthlyExpense: allocatedAmount.toString(),
          }),
        })
        .where(and(eq(budgetCategories.id, id), eq(budgetCategories.userId, userId)))
        .returning()

      if (!updatedCategory) {
        return reply
          .code(404)
          .send({ error: 'Budget category not found or not authorized to update' })
      }
      return updatedCategory
    } catch (error) {
      return handleError(error as Error, reply)
    }
  })

  // Delete a budget category
  fastify.delete('/categories/:id', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) return reply.code(401).send({ error: 'Not authorized' })

    const { id } = request.params as { id: string }
    if (!id || !z.string().uuid().safeParse(id).success) {
      return reply.code(400).send({ error: 'Invalid category ID format' })
    }

    try {
      const result = await db
        .delete(budgetCategories)
        .where(and(eq(budgetCategories.id, id), eq(budgetCategories.userId, userId)))

      // Drizzle delete returns a result object, check affectedRows or similar if supported by driver
      // For now, assuming if no error, it worked or didn't find it.
      // A select before delete or checking result.rowCount could be more robust.
      if (result.length === 0) {
        return reply
          .code(404)
          .send({ error: 'Budget category not found or not authorized to delete' })
      }

      return reply
        .code(200)
        .send({ success: true, message: 'Budget category deleted successfully' })
    } catch (error) {
      return handleError(error as Error, reply)
    }
  })

  // Get historical budget vs. actuals data
  fastify.get('/history', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) return reply.code(401).send({ error: 'Not authorized' })

    const { months: monthsQuery } = request.query as { months?: string }
    const monthsToFetch = monthsQuery ? Number.parseInt(monthsQuery, 10) : 12

    if (Number.isNaN(monthsToFetch) || monthsToFetch <= 0 || monthsToFetch > 60) {
      // Cap at 5 years
      return reply.code(400).send({ error: 'Invalid number of months. Must be between 1 and 60.' })
    }

    try {
      const userExpenseCategories = await db.query.budgetCategories.findMany({
        where: and(eq(budgetCategories.userId, userId), eq(budgetCategories.type, 'expense')),
      })

      const totalMonthlyBudget = userExpenseCategories.reduce(
        (sum, cat) => sum + Number.parseFloat(cat.averageMonthlyExpense || '0'),
        0
      )

      const today = new Date()
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0) // Last day of current month
      const startDate = new Date(today.getFullYear(), today.getMonth() - (monthsToFetch - 1), 1) // First day of the Nth month ago

      const allMonthlySummaries = await summarizeByMonth({
        userId,
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      })

      const actualsMap = new Map<string, number>()
      for (const summary of allMonthlySummaries) {
        if (summary.month && summary.expenses) {
          // Ensure month and expenses are present
          actualsMap.set(summary.month, Number.parseFloat(summary.expenses))
        }
      }

      const results = []
      for (let i = 0; i < monthsToFetch; i++) {
        const targetIterationDate = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const year = targetIterationDate.getFullYear()
        const monthNum = targetIterationDate.getMonth()
        const monthKey = `${year}-${(monthNum + 1).toString().padStart(2, '0')}` // YYYY-MM

        const displayMonth = targetIterationDate.toLocaleString('default', {
          month: 'short',
          year: 'numeric',
        })
        const actualSpending = actualsMap.get(monthKey) || 0

        results.push({
          date: displayMonth,
          budgeted: totalMonthlyBudget,
          actual: -actualSpending,
        })
      }

      return results.reverse() // Oldest to newest
    } catch (error) {
      return handleError(error as Error, reply)
    }
  })
}
