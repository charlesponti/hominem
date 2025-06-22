import { getFinancialInstitutions } from '@hominem/utils/finance'
import { Hono } from 'hono'
import { requireAuth } from '../../middleware/auth.js'

export const financeInstitutionsRoutes = new Hono()

// Get all financial institutions
financeInstitutionsRoutes.get('/', requireAuth, async (c) => {
  try {
    const institutions = await getFinancialInstitutions()
    return c.json(institutions)
  } catch (error) {
    console.error('Error fetching financial institutions:', error)
    return c.json({ error: 'Failed to fetch financial institutions' }, 500)
  }
})
