import { deleteAllFinanceData } from '@hominem/utils/finance'
import { Hono } from 'hono'
export const financeDataRoutes = new Hono()

// Delete all finance data for the authenticated user
financeDataRoutes.delete('/', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Not authorized' }, 401)
  }

  try {
    await deleteAllFinanceData(userId)
    return c.json({ success: true, message: 'All finance data deleted' })
  } catch (error) {
    console.error(`Error deleting finance data: ${error}`)
    return c.json(
      {
        error: 'Failed to delete finance data',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})
