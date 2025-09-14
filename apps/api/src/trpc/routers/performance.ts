import { z } from 'zod'
import { protectedProcedure, router } from '../index.js'
import { PerformanceMonitorService } from '../../services/performance-monitor.service.js'

export const performanceRouter = router({
  // Get performance summary
  getSummary: protectedProcedure
    .input(
      z.object({
        timeWindow: z
          .number()
          .optional()
          .default(60 * 60 * 1000), // 1 hour default
      })
    )
    .query(async ({ input }) => {
      try {
        return PerformanceMonitorService.getPerformanceSummary(input.timeWindow)
      } catch (error) {
        throw new Error(
          `Failed to get performance summary: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Get system health
  getSystemHealth: protectedProcedure.query(async () => {
    try {
      return PerformanceMonitorService.getSystemHealth()
    } catch (error) {
      throw new Error(
        `Failed to get system health: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }),

  // Get recent errors
  getRecentErrors: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
      })
    )
    .query(async ({ input }) => {
      try {
        return PerformanceMonitorService.getRecentErrors(input.limit)
      } catch (error) {
        throw new Error(
          `Failed to get recent errors: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Get performance trends
  getTrends: protectedProcedure
    .input(
      z.object({
        hours: z.number().optional().default(24),
      })
    )
    .query(async ({ input }) => {
      try {
        return PerformanceMonitorService.getPerformanceTrends(input.hours)
      } catch (error) {
        throw new Error(
          `Failed to get performance trends: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Record a custom metric
  recordMetric: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        duration: z.number(),
        metadata: z.record(z.unknown()).optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        PerformanceMonitorService.recordMetric(
          input.name,
          input.duration,
          input.metadata,
          input.tags
        )
        return { success: true }
      } catch (error) {
        throw new Error(
          `Failed to record metric: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Record system metrics
  recordSystemMetrics: protectedProcedure
    .input(
      z.object({
        activeConnections: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        PerformanceMonitorService.recordSystemMetrics(input.activeConnections)
        return { success: true }
      } catch (error) {
        throw new Error(
          `Failed to record system metrics: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Clean up old metrics
  cleanup: protectedProcedure.mutation(async () => {
    try {
      PerformanceMonitorService.cleanup()
      return { success: true, message: 'Cleanup completed' }
    } catch (error) {
      throw new Error(
        `Failed to cleanup metrics: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }),
})
