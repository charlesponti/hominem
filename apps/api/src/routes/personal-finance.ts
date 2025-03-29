import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { verifyAuth } from '../middleware/auth'
import { handleError } from '../utils/errors'

// Mock destination costs for demo
// In production, this would use real travel cost APIs
const destinationCosts = {
  'New York': { flight: 350, hotel: 250, food: 80, activities: 50 },
  'San Francisco': { flight: 450, hotel: 280, food: 85, activities: 60 },
  Austin: { flight: 300, hotel: 180, food: 50, activities: 40 },
  London: { flight: 800, hotel: 220, food: 70, activities: 45 },
  Tokyo: { flight: 1200, hotel: 200, food: 60, activities: 55 },
  Paris: { flight: 850, hotel: 210, food: 75, activities: 65 },
  // Add more destinations as needed
}

export async function personalFinanceRoutes(fastify: FastifyInstance) {
  // Schema definitions
  const budgetSchema = z.object({
    income: z.number().positive(),
    expenses: z.array(
      z.object({
        category: z.string(),
        amount: z.number().positive(),
      })
    ),
  })

  const runwayCalculationSchema = z.object({
    balance: z.number().positive(),
    monthlyExpenses: z.number().positive(),
    plannedPurchases: z
      .array(
        z.object({
          description: z.string(),
          amount: z.number().positive(),
          date: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
            message: 'Invalid date format',
          }),
        })
      )
      .optional(),
  })

  const musicStreamingCalculationSchema = z.object({
    streams: z.number().int().positive(),
    rate: z.number().positive().optional(),
    platform: z.enum(['spotify', 'apple', 'youtube', 'other']).optional(),
  })

  const salesTaxCalculationSchema = z.object({
    amount: z.number().positive(),
    taxRate: z.number().positive(),
  })

  const locationComparisonSchema = z.object({
    currentLocation: z.string(),
    targetLocation: z.string(),
    income: z.number().positive(),
    expenses: z.array(
      z.object({
        category: z.string(),
        amount: z.number().positive(),
      })
    ),
  })

  const travelCostSchema = z.object({
    origin: z.string(),
    destination: z.string(),
    departureDate: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
      message: 'Invalid departure date format',
    }),
    returnDate: z
      .string()
      .refine((val) => !Number.isNaN(Date.parse(val)), {
        message: 'Invalid return date format',
      })
      .optional(),
    travelers: z.number().int().positive().default(1),
    includeAccommodation: z.boolean().default(true),
    includeTransportation: z.boolean().default(true),
    includeFood: z.boolean().default(true),
    includeActivities: z.boolean().default(false),
  })

  // Calculate budget endpoint
  fastify.post('/budget', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const validated = budgetSchema.parse(request.body)

      // Budget calculation logic with caching
      const cacheKey = `budget:${userId}:${JSON.stringify(validated)}`
      const cachedResult = await fastify.cache?.get(cacheKey)

      if (cachedResult) {
        return JSON.parse(cachedResult)
      }

      // Calculate budget
      const totalExpenses = validated.expenses.reduce((sum, expense) => sum + expense.amount, 0)
      const surplus = validated.income - totalExpenses
      const savingsRate = ((validated.income - totalExpenses) / validated.income) * 100

      // Category breakdown with percentages
      const categories = validated.expenses.map((expense) => ({
        ...expense,
        percentage: (expense.amount / validated.income) * 100,
      }))

      // Monthly projections for 12 months
      const projections = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        savings: surplus * (i + 1),
        totalSaved: surplus * (i + 1),
      }))

      const result = {
        income: validated.income,
        totalExpenses,
        surplus,
        savingsRate,
        categories,
        projections,
        calculatedAt: new Date().toISOString(),
      }

      // Cache result for 1 hour
      await fastify.cache?.set(cacheKey, JSON.stringify(result), 3600)

      return result
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Calculate runway endpoint
  fastify.post('/runway', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const validated = runwayCalculationSchema.parse(request.body)

      // Runway calculation logic
      let balance = validated.balance
      const purchasesByMonth: Record<string, number> = {}

      // Process planned purchases if provided
      if (validated.plannedPurchases && validated.plannedPurchases.length > 0) {
        for (const purchase of validated.plannedPurchases) {
          const purchaseDate = new Date(purchase.date)
          const monthKey = `${purchaseDate.getFullYear()}-${purchaseDate.getMonth() + 1}`

          purchasesByMonth[monthKey] = (purchasesByMonth[monthKey] || 0) + purchase.amount
        }
      }

      // Calculate months of runway with monthly breakdown
      const today = new Date()
      const monthlyBreakdown = []
      const currentDate = new Date(today)
      let runwayMonths = 0

      while (balance > 0) {
        const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`
        const monthExpenses = validated.monthlyExpenses + (purchasesByMonth[monthKey] || 0)

        balance -= monthExpenses

        if (balance > 0) {
          runwayMonths++
          monthlyBreakdown.push({
            month: currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            expenses: monthExpenses,
            purchases: purchasesByMonth[monthKey] || 0,
            endingBalance: balance,
          })

          // Move to next month
          currentDate.setMonth(currentDate.getMonth() + 1)
        }

        // Safety limit to prevent infinite loops
        if (runwayMonths > 120) break
      }

      // Calculate burn rate
      const burnRate = validated.monthlyExpenses
      const runwayEndDate = new Date(today)
      runwayEndDate.setMonth(today.getMonth() + runwayMonths)

      return {
        runwayMonths,
        burnRate,
        initialBalance: validated.balance,
        currentBalance: balance > 0 ? balance : 0,
        runwayEndDate: runwayEndDate.toISOString(),
        monthlyBreakdown,
      }
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Calculate music streaming earnings
  fastify.post('/music-streaming', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const validated = musicStreamingCalculationSchema.parse(request.body)

      // Platform-specific rates if not provided
      let rate = validated.rate
      if (!rate) {
        switch (validated.platform) {
          case 'spotify':
            rate = 0.0033
            break
          case 'apple':
            rate = 0.0056
            break
          case 'youtube':
            rate = 0.0018
            break
          default:
            rate = 0.004 // Average rate
        }
      }

      // Music streaming calculation logic
      const earnings = validated.streams * rate

      // Calculate different distribution scenarios
      const distributionScenarios = {
        individual: earnings,
        withLabel: earnings * 0.2, // Typical artist gets 20% with label
        independent: earnings * 0.8, // Independent artists keep ~80%
      }

      // Monthly projections
      const monthlyProjections = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        streams: validated.streams * (i + 1),
        earnings: earnings * (i + 1),
      }))

      return {
        platform: validated.platform || 'average',
        streams: validated.streams,
        rate,
        earnings,
        distributionScenarios,
        monthlyProjections,
        calculatedAt: new Date().toISOString(),
      }
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Calculate sales tax
  fastify.post('/sales-tax', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const validated = salesTaxCalculationSchema.parse(request.body)

      // Sales tax calculation logic
      const taxAmount = validated.amount * (validated.taxRate / 100)
      const total = validated.amount + taxAmount

      return {
        originalAmount: validated.amount,
        taxRate: validated.taxRate,
        taxAmount,
        total,
        calculatedAt: new Date().toISOString(),
      }
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Calculate cost of living comparison between locations
  fastify.post('/location-comparison', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      // Mock cost of living indices for demo
      // In production, this would use real cost of living data APIs
      const costOfLivingIndices = {
        'New York': 100,
        'San Francisco': 110,
        Austin: 65,
        Chicago: 75,
        London: 85,
        Tokyo: 95,
        Berlin: 70,
        Seattle: 90,
        Boston: 85,
        // Add more cities as needed
      }

      const validated = locationComparisonSchema.parse(request.body) as {
        currentLocation: keyof typeof costOfLivingIndices
        targetLocation: keyof typeof costOfLivingIndices
        income: number
        expenses: Array<{ category: string; amount: number }>
      }

      // Get indices or use default 100 if not found
      const currentIndex = costOfLivingIndices[validated.currentLocation] || 100
      const targetIndex = costOfLivingIndices[validated.targetLocation] || 100

      // Calculate cost of living difference
      const costDifference = targetIndex / currentIndex - 1

      // Calculate adjusted income and expenses
      const adjustedIncome = validated.income * (targetIndex / currentIndex)

      const adjustedExpenses = validated.expenses.map((expense) => ({
        category: expense.category,
        originalAmount: expense.amount,
        adjustedAmount: expense.amount * (targetIndex / currentIndex),
      }))

      // Calculate monthly surplus in both locations
      const currentTotalExpenses = validated.expenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
      )
      const adjustedTotalExpenses = adjustedExpenses.reduce(
        (sum, expense) => sum + expense.adjustedAmount,
        0
      )

      const currentSurplus = validated.income - currentTotalExpenses
      const adjustedSurplus = adjustedIncome - adjustedTotalExpenses

      // Quality of life change percentage
      const qolChangePercent =
        (adjustedSurplus / adjustedIncome - currentSurplus / validated.income) * 100

      return {
        currentLocation: validated.currentLocation,
        targetLocation: validated.targetLocation,
        costDifferencePercent: costDifference * 100,
        currentIncome: validated.income,
        adjustedIncome,
        currentExpenses: currentTotalExpenses,
        adjustedExpenses: adjustedTotalExpenses,
        currentSurplus,
        adjustedSurplus,
        qualityOfLifeChangePercent: qolChangePercent,
        expenseBreakdown: adjustedExpenses,
        calculatedAt: new Date().toISOString(),
      }
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Calculate travel costs
  // !TODO use real travel cost APIs
  fastify.post('/travel-cost', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const validated = travelCostSchema.parse(request.body)
      const destination = validated.destination as keyof typeof destinationCosts

      // Parse dates for calculations
      const departureDate = new Date(validated.departureDate)
      const returnDate = validated.returnDate ? new Date(validated.returnDate) : null

      // Calculate trip duration
      const tripDuration = returnDate
        ? Math.ceil((returnDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24))
        : 7 // Default to 7 days if no return date

      // Get costs or use average if destination not found
      const costs = destinationCosts[destination] || {
        flight: 500,
        hotel: 200,
        food: 65,
        activities: 50,
      }

      // Calculate costs based on options
      let totalCost = 0
      const costBreakdown = {
        transportation: 0,
        accommodation: 0,
        food: 0,
        activities: 0,
      }

      if (validated.includeTransportation) {
        costBreakdown.transportation = costs.flight * validated.travelers
        totalCost += costBreakdown.transportation
      }

      if (validated.includeAccommodation) {
        costBreakdown.accommodation = costs.hotel * tripDuration
        totalCost += costBreakdown.accommodation
      }

      if (validated.includeFood) {
        costBreakdown.food = costs.food * validated.travelers * tripDuration
        totalCost += costBreakdown.food
      }

      if (validated.includeActivities) {
        costBreakdown.activities = costs.activities * validated.travelers * tripDuration
        totalCost += costBreakdown.activities
      }

      // Calculate daily cost
      const dailyCost = totalCost / tripDuration

      return {
        origin: validated.origin,
        destination: validated.destination,
        departureDate: departureDate.toISOString(),
        returnDate: returnDate ? returnDate.toISOString() : null,
        tripDuration,
        travelers: validated.travelers,
        totalCost,
        dailyCost,
        costBreakdown,
        options: {
          includeAccommodation: validated.includeAccommodation,
          includeTransportation: validated.includeTransportation,
          includeFood: validated.includeFood,
          includeActivities: validated.includeActivities,
        },
        calculatedAt: new Date().toISOString(),
      }
    } catch (error) {
      handleError(error as Error, reply)
    }
  })
}
