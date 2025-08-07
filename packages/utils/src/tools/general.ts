import { tool } from 'ai'
import { z } from 'zod'

/**
 * Binds userId to tools that require it, removing userId from the parameters schema if present.
 * Shallow clones the tool and only overrides the execute method for performance and memory safety.
 */
export function bindUserIdToTools(tools: Record<string, any>, userId: string) {
  const boundTools: Record<string, any> = {}

  for (const [key, originalTool] of Object.entries(tools)) {
    // Skip tools that don't have the expected structure
    if (!originalTool || typeof originalTool !== 'object') {
      console.warn(`Skipping malformed tool: ${key}`)
      continue
    }

    // Check if the tool has parameters and if it has a userId field
    let hasUserId = false
    try {
      hasUserId =
        originalTool.parameters?.shape?.userId ||
        (originalTool.parameters &&
          typeof originalTool.parameters.shape === 'function' &&
          originalTool.parameters.shape().userId)
    } catch (error) {
      console.warn(`Error checking userId for tool ${key}:`, error)
      // If we can't check for userId, just copy the tool as-is
      boundTools[key] = originalTool
      continue
    }

    if (hasUserId) {
      // Shallow clone, remove userId from parameters, override execute
      const { parameters, ...rest } = originalTool
      boundTools[key] = {
        ...rest,
        parameters: parameters?.omit ? parameters.omit({ userId: true }) : parameters,
        execute: async (args: any) => originalTool.execute({ ...args, userId }),
      }
    } else {
      boundTools[key] = originalTool
    }
  }

  return boundTools
}

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
