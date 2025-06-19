import { getSpendingCategories } from '@hominem/utils/finance'
import { Hono } from 'hono'
import { requireAuth } from '../../middleware/auth.js'

export const financeCategoriesRoutes = new Hono()

// Get spending categories
financeCategoriesRoutes.get('/', requireAuth, async (c) => {
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
