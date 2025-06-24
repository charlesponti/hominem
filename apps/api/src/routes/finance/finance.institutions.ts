import { getFinancialInstitutions } from '@hominem/utils/finance'
import { Hono } from 'hono'
export const financeInstitutionsRoutes = new Hono()

// Get all financial institutions
financeInstitutionsRoutes.get('/', async (c) => {
  try {
    const institutions = await getFinancialInstitutions()
    return c.json(institutions)
  } catch (error) {
    console.error('Error fetching financial institutions:', error)
    return c.json({ error: 'Failed to fetch financial institutions' }, 500)
  }
})
