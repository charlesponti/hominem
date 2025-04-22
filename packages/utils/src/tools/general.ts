import { tool } from 'ai'
import { z } from 'zod'

const CalculatorToolSchema = z.object({
  calculations: z.array(
    z.object({
      x: z.number(),
      y: z.number(),
      action: z.enum(['add', 'subtract', 'multiply', 'divide']),
      order: z.number(),
    })
  ),
})

export const calculatorTool = tool({
  description: 'A calculator tool that can evaluate mathematical expressions',
  parameters: CalculatorToolSchema,
  execute: async ({ calculations }: z.infer<typeof CalculatorToolSchema>): Promise<number> => {
    let result = 0
    const sortedCalculations = calculations.sort((a, b) => a.order - b.order)

    try {
      for (const calculation of sortedCalculations) {
        const { x, y, action } = calculation
        switch (action) {
          case 'add':
            result = x + y
            break
          case 'subtract':
            result = x - y
            break
          case 'multiply':
            result = x * y
            break
          case 'divide':
            if (y === 0) {
              throw new Error('Division by zero is not allowed')
            }
            result = x / y
            break
        }
      }
      return result
    } catch (error) {
      throw new Error(`Error in calculation: ${error}`)
    }
  },
})
