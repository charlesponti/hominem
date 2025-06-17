import { db } from '@hominem/utils/db'
import type { LoaderFunctionArgs } from 'react-router'
import { PerformanceMonitor } from '~/lib/services/performance-monitor.server.js'
import { jsonResponse } from '~/lib/utils/json-response'

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const detailed = url.searchParams.get('detailed') === 'true'

  try {
    const startTime = Date.now()
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    }

    if (detailed) {
      // Check database connection
      let dbStatus = 'unknown'
      let dbLatency = 0

      try {
        if (db) {
          const dbStart = Date.now()
          // Simple query to test DB connection
          await db.execute('SELECT 1 as test')
          dbLatency = Date.now() - dbStart
          dbStatus = 'connected'
        } else {
          dbStatus = 'not_configured'
        }
      } catch (error) {
        dbStatus = 'error'
        console.warn('Database health check failed:', error)
      }

      // Get system metrics
      const systemHealth = PerformanceMonitor.getSystemHealth()
      const performanceSummary = PerformanceMonitor.getPerformanceSummary(5 * 60 * 1000) // 5 minutes

      const detailedHealth = {
        ...health,
        services: {
          database: {
            status: dbStatus,
            latency: dbLatency,
            configured: !!process.env.DATABASE_URL,
          },
          openai: {
            status: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
          },
          storage: {
            status: 'local', // Could be extended for cloud storage
            configured: true,
          },
        },
        system: {
          memory: {
            used: Math.round(systemHealth.memoryUsage.heapUsed / 1024 / 1024),
            total: Math.round(systemHealth.memoryUsage.heapTotal / 1024 / 1024),
            external: Math.round(systemHealth.memoryUsage.external / 1024 / 1024),
            rss: Math.round(systemHealth.memoryUsage.rss / 1024 / 1024),
          },
          uptime: systemHealth.uptime,
          performance: {
            averageResponseTime: Math.round(performanceSummary.averageResponseTime),
            totalRequests: performanceSummary.totalRequests,
            errorRate: Math.round(performanceSummary.errorRate * 10000) / 100, // percentage with 2 decimals
            slowRequests: performanceSummary.slowRequests,
          },
          caches: systemHealth.cacheStats,
        },
        responseTime: Date.now() - startTime,
      }

      return jsonResponse(detailedHealth, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      })
    }

    return jsonResponse(health, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    console.error('Health check failed:', error)

    return jsonResponse(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        uptime: process.uptime(),
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    )
  }
}
