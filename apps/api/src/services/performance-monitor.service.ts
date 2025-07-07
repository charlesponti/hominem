import { LRUCache } from 'lru-cache'

interface PerformanceMetric {
  id: string
  name: string
  duration: number
  timestamp: number
  metadata?: Record<string, any>
  tags?: string[]
}

interface APIMetrics {
  endpoint: string
  method: string
  statusCode: number
  duration: number
  timestamp: number
  userAgent?: string
  ip?: string
  userId?: string
}

interface ErrorMetric {
  id: string
  message: string
  stack?: string
  endpoint?: string
  timestamp: number
  userId?: string
  metadata?: Record<string, any>
}

interface SystemMetrics {
  memoryUsage: NodeJS.MemoryUsage
  timestamp: number
  uptime: number
  activeConnections?: number
}

// In-memory storage for metrics (in production, use a proper metrics system)
const performanceCache = new LRUCache<string, PerformanceMetric>({
  max: 10000,
  ttl: 24 * 60 * 60 * 1000, // 24 hours
})

const apiMetricsCache = new LRUCache<string, APIMetrics>({
  max: 10000,
  ttl: 24 * 60 * 60 * 1000, // 24 hours
})

const errorMetricsCache = new LRUCache<string, ErrorMetric>({
  max: 5000,
  ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
})

const systemMetricsCache = new LRUCache<string, SystemMetrics>({
  max: 1000,
  ttl: 60 * 60 * 1000, // 1 hour
})

export class PerformanceMonitorService {
  /**
   * Record a performance metric
   */
  static recordMetric(
    name: string,
    duration: number,
    metadata?: Record<string, any>,
    tags?: string[]
  ) {
    const id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const metric: PerformanceMetric = {
      id,
      name,
      duration,
      timestamp: Date.now(),
      metadata,
      tags,
    }

    performanceCache.set(id, metric)
  }

  /**
   * Time a function execution and record the metric
   */
  static async timeFunction<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>,
    tags?: string[]
  ): Promise<T> {
    const startTime = performance.now()

    try {
      const result = await fn()
      const duration = performance.now() - startTime
      PerformanceMonitorService.recordMetric(name, duration, metadata, tags)
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      PerformanceMonitorService.recordMetric(name, duration, { ...metadata, error: true }, tags)
      throw error
    }
  }

  /**
   * Create a timer for manual timing
   */
  static createTimer(name: string, metadata?: Record<string, any>, tags?: string[]) {
    const startTime = performance.now()

    return {
      end: () => {
        const duration = performance.now() - startTime
        PerformanceMonitorService.recordMetric(name, duration, metadata, tags)
        return duration
      },
    }
  }

  /**
   * Record API request metrics
   */
  static recordAPIMetrics(params: Omit<APIMetrics, 'timestamp'>) {
    const id = `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const metrics: APIMetrics = {
      ...params,
      timestamp: Date.now(),
    }

    apiMetricsCache.set(id, metrics)

    // Log slow requests
    if (params.duration > 1000) {
      console.warn(
        `Slow API request: ${params.method} ${params.endpoint} took ${params.duration}ms`
      )
    }
  }

  /**
   * Record error metrics
   */
  static recordError(
    error: Error,
    endpoint?: string,
    userId?: string,
    metadata?: Record<string, any>
  ) {
    const id = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const errorMetric: ErrorMetric = {
      id,
      message: error.message,
      stack: error.stack,
      endpoint,
      userId,
      metadata,
      timestamp: Date.now(),
    }

    errorMetricsCache.set(id, errorMetric)
    console.error('Error recorded:', errorMetric)
  }

  /**
   * Record system metrics
   */
  static recordSystemMetrics(activeConnections?: number) {
    const id = `system-${Date.now()}`
    const metrics: SystemMetrics = {
      memoryUsage: process.memoryUsage(),
      timestamp: Date.now(),
      uptime: process.uptime(),
      activeConnections,
    }

    systemMetricsCache.set(id, metrics)
  }

  /**
   * Get performance metrics summary
   */
  static getPerformanceSummary(timeWindow = 60 * 60 * 1000): {
    averageResponseTime: number
    totalRequests: number
    errorRate: number
    slowRequests: number
    topEndpoints: Array<{ endpoint: string; count: number; avgDuration: number }>
  } {
    const now = Date.now()
    const cutoff = now - timeWindow

    // Get API metrics within time window
    const recentApiMetrics = Array.from(apiMetricsCache.values()).filter(
      (metric) => metric.timestamp > cutoff
    )

    // Get error metrics within time window
    const recentErrors = Array.from(errorMetricsCache.values()).filter(
      (metric) => metric.timestamp > cutoff
    )

    // Calculate summary statistics
    const totalRequests = recentApiMetrics.length
    const totalDuration = recentApiMetrics.reduce((sum, metric) => sum + metric.duration, 0)
    const averageResponseTime = totalRequests > 0 ? totalDuration / totalRequests : 0
    const errorRate = totalRequests > 0 ? recentErrors.length / totalRequests : 0
    const slowRequests = recentApiMetrics.filter((metric) => metric.duration > 1000).length

    // Calculate top endpoints
    const endpointStats = new Map<string, { count: number; totalDuration: number }>()
    recentApiMetrics.forEach((metric) => {
      const key = `${metric.method} ${metric.endpoint}`
      const existing = endpointStats.get(key) || { count: 0, totalDuration: 0 }
      endpointStats.set(key, {
        count: existing.count + 1,
        totalDuration: existing.totalDuration + metric.duration,
      })
    })

    const topEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      averageResponseTime,
      totalRequests,
      errorRate,
      slowRequests,
      topEndpoints,
    }
  }

  /**
   * Get system health information
   */
  static getSystemHealth(): {
    memoryUsage: NodeJS.MemoryUsage
    uptime: number
    cacheStats: {
      performance: { size: number; max: number }
      apiMetrics: { size: number; max: number }
      errors: { size: number; max: number }
      system: { size: number; max: number }
    }
  } {
    return {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      cacheStats: {
        performance: { size: performanceCache.size, max: performanceCache.max },
        apiMetrics: { size: apiMetricsCache.size, max: apiMetricsCache.max },
        errors: { size: errorMetricsCache.size, max: errorMetricsCache.max },
        system: { size: systemMetricsCache.size, max: systemMetricsCache.max },
      },
    }
  }

  /**
   * Get recent errors
   */
  static getRecentErrors(limit = 50): ErrorMetric[] {
    return Array.from(errorMetricsCache.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /**
   * Get performance trends over time
   */
  static getPerformanceTrends(hours = 24): Array<{
    hour: number
    avgResponseTime: number
    requestCount: number
    errorCount: number
  }> {
    const now = Date.now()
    const trends: Array<{
      hour: number
      avgResponseTime: number
      requestCount: number
      errorCount: number
    }> = []

    for (let i = 0; i < hours; i++) {
      const hourStart = now - (i + 1) * 60 * 60 * 1000
      const hourEnd = now - i * 60 * 60 * 1000

      const hourMetrics = Array.from(apiMetricsCache.values()).filter(
        (metric) => metric.timestamp >= hourStart && metric.timestamp < hourEnd
      )

      const hourErrors = Array.from(errorMetricsCache.values()).filter(
        (metric) => metric.timestamp >= hourStart && metric.timestamp < hourEnd
      )

      const totalDuration = hourMetrics.reduce((sum, metric) => sum + metric.duration, 0)
      const avgResponseTime = hourMetrics.length > 0 ? totalDuration / hourMetrics.length : 0

      trends.unshift({
        hour: i,
        avgResponseTime,
        requestCount: hourMetrics.length,
        errorCount: hourErrors.length,
      })
    }

    return trends
  }

  /**
   * Clean up old metrics
   */
  static cleanup() {
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000

    // Clean up old performance metrics
    for (const [key, metric] of performanceCache.entries()) {
      if (metric.timestamp < oneDayAgo) {
        performanceCache.delete(key)
      }
    }

    // Clean up old API metrics
    for (const [key, metric] of apiMetricsCache.entries()) {
      if (metric.timestamp < oneDayAgo) {
        apiMetricsCache.delete(key)
      }
    }

    // Clean up old error metrics
    for (const [key, metric] of errorMetricsCache.entries()) {
      if (metric.timestamp < oneWeekAgo) {
        errorMetricsCache.delete(key)
      }
    }

    // Clean up old system metrics
    for (const [key, metric] of systemMetricsCache.entries()) {
      if (metric.timestamp < oneDayAgo) {
        systemMetricsCache.delete(key)
      }
    }

    console.log('Performance monitor cleanup completed')
  }
}

/**
 * Higher-order function to wrap API handlers with performance monitoring
 */
export function withPerformanceMonitoring(
  operation: string,
  handler: (request: Request) => Promise<Response>,
  options?: { trackErrors?: boolean; trackSlowRequests?: boolean }
) {
  return async (request: Request): Promise<Response> => {
    const startTime = performance.now()
    const timer = PerformanceMonitorService.createTimer(operation, {
      method: request.method,
      url: request.url,
    })

    try {
      const response = await handler(request)
      const duration = performance.now() - startTime

      // Record API metrics
      PerformanceMonitorService.recordAPIMetrics({
        endpoint: new URL(request.url).pathname,
        method: request.method,
        statusCode: response.status,
        duration,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      })

      // Track slow requests if enabled
      if (options?.trackSlowRequests && duration > 1000) {
        console.warn(`Slow ${operation}: ${duration}ms`)
      }

      return response
    } catch (error) {
      const duration = performance.now() - startTime

      // Record error if enabled
      if (options?.trackErrors && error instanceof Error) {
        PerformanceMonitorService.recordError(error, new URL(request.url).pathname)
      }

      // Record failed API metrics
      PerformanceMonitorService.recordAPIMetrics({
        endpoint: new URL(request.url).pathname,
        method: request.method,
        statusCode: 500,
        duration,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      })

      throw error
    }
  }
}
