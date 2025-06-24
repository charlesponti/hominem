import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
const salesTaxCalculationSchema = z.object({
  amount: z.number().positive(),
  taxRate: z.number().positive(),
})

export const financeSalesTaxRoutes = new Hono()

// Calculate sales tax
financeSalesTaxRoutes.post(
  '/',
  zValidator('json', salesTaxCalculationSchema),
  async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }


    try {
      const userId = c.get('userId')
      if (!userId) {
        return c.json({ error: 'Not authorized' }, 401)
      }

      const validated = c.req.valid('json')

      // Sales tax calculation logic
      const taxAmount = validated.amount * (validated.taxRate / 100)
      const total = validated.amount + taxAmount

      return c.json({
        originalAmount: validated.amount,
        taxRate: validated.taxRate,
        taxAmount,
        total,
        calculatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Sales tax calculation error:', error)
      return c.json({ error: 'Failed to calculate sales tax' }, 500)
    }
  }
)
