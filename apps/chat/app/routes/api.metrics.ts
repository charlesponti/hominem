import type { LoaderFunctionArgs } from 'react-router'
import { PerformanceMonitor } from '~/lib/services/performance-monitor.server.js'
import { RateLimitService } from '~/lib/services/rate-limit.server.js'
import { jsonResponse } from '~/lib/utils/json-response'

// GET /api/metrics - Get performance metrics and system health
export async function loader({ request }: LoaderFunctionArgs) {
  // Simple authentication check - in production, use proper auth
  const authHeader = request.headers.get('authorization')
  if (!authHeader || authHeader !== `Bearer ${process.env.METRICS_API_KEY || 'dev-key'}`) {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const type = url.searchParams.get('type') || 'summary'
  const timeWindow = Number.parseInt(url.searchParams.get('timeWindow') || '3600000') // 1 hour default
  const hours = Number.parseInt(url.searchParams.get('hours') || '24')
  const limit = Number.parseInt(url.searchParams.get('limit') || '50')

  try {
    switch (type) {
      case 'summary':
        return jsonResponse({
          type: 'performance_summary',
          data: PerformanceMonitor.getPerformanceSummary(timeWindow),
          timestamp: Date.now(),
        })

      case 'health':
        return jsonResponse({
          type: 'system_health',
          data: PerformanceMonitor.getSystemHealth(),
          timestamp: Date.now(),
        })

      case 'errors':
        return jsonResponse({
          type: 'recent_errors',
          data: PerformanceMonitor.getRecentErrors(limit),
          timestamp: Date.now(),
        })

      case 'trends':
        return jsonResponse({
          type: 'performance_trends',
          data: PerformanceMonitor.getPerformanceTrends(hours),
          timestamp: Date.now(),
        })

      case 'rate-limits':
        return jsonResponse({
          type: 'rate_limit_stats',
          data: RateLimitService.getAllStats(),
          timestamp: Date.now(),
        })

      case 'all':
        return jsonResponse({
          type: 'all_metrics',
          data: {
            summary: PerformanceMonitor.getPerformanceSummary(timeWindow),
            health: PerformanceMonitor.getSystemHealth(),
            errors: PerformanceMonitor.getRecentErrors(Math.min(limit, 20)),
            trends: PerformanceMonitor.getPerformanceTrends(Math.min(hours, 24)),
            rateLimits: RateLimitService.getAllStats(),
          },
          timestamp: Date.now(),
        })

      default:
        return jsonResponse({ error: 'Invalid metrics type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Metrics API error:', error)
    return jsonResponse(
      {
        error: 'Failed to retrieve metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
