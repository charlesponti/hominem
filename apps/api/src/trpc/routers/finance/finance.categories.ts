import { getSpendingCategories } from '@hominem/data/finance'
import { Hono } from 'hono'
import { protectedProcedure, router } from '../../procedures.js'

// Keep existing Hono route for backward compatibility
export const financeCategoriesRoutes = new Hono()

// Get spending categories
financeCategoriesRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Not authorized' }, 401)
  }

  try {
    const categories = await getSpendingCategories(userId)
    return c.json(categories)
  } catch (error) {
    console.error('Error fetching spending categories:', error)
    return c.json(
      {
        error: 'Failed to fetch spending categories',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Export tRPC router
export const categoriesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getSpendingCategories(ctx.userId)
  }),
})
