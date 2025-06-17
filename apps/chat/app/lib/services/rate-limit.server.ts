import { LRUCache } from 'lru-cache'

// Rate limit configurations for different operations
const RATE_LIMITS = {
  transcription: {
    requests: 10, // 10 requests
    window: 60 * 1000, // per minute
    burst: 3 // allow 3 requests immediately
  },
  tts: {
    requests: 20, // 20 requests
    window: 60 * 1000, // per minute
    burst: 5
  },
  chatStream: {
    requests: 30, // 30 requests
    window: 60 * 1000, // per minute
    burst: 10
  },
  search: {
    requests: 50, // 50 requests
    window: 60 * 1000, // per minute
    burst: 10
  },
  upload: {
    requests: 20, // 20 uploads
    window: 60 * 1000, // per minute
    burst: 5
  }
}

interface RateLimitRecord {
  count: number
  resetTime: number
  burstUsed: number
}

// Create rate limit caches
const rateLimitCaches: Record<keyof typeof RATE_LIMITS, LRUCache<string, RateLimitRecord>> = {
  transcription: new LRUCache({ max: 10000, ttl: RATE_LIMITS.transcription.window }),
  tts: new LRUCache({ max: 10000, ttl: RATE_LIMITS.tts.window }),
  chatStream: new LRUCache({ max: 10000, ttl: RATE_LIMITS.chatStream.window }),
  search: new LRUCache({ max: 10000, ttl: RATE_LIMITS.search.window }),
  upload: new LRUCache({ max: 10000, ttl: RATE_LIMITS.upload.window })
}

export type RateLimitType = keyof typeof RATE_LIMITS

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

export class RateLimitService {
  static check(type: RateLimitType, identifier: string): RateLimitResult {
    const config = RATE_LIMITS[type]
    const cache = rateLimitCaches[type]
    const now = Date.now()
    
    // Get or create rate limit record
    let record = cache.get(identifier)
    
    if (!record || now >= record.resetTime) {
      // Create new window
      record = {
        count: 0,
        resetTime: now + config.window,
        burstUsed: 0
      }
    }

    // Check if request is allowed
    const isAllowed = record.count < config.requests || record.burstUsed < config.burst

    if (isAllowed) {
      record.count++
      if (record.count > config.requests) {
        record.burstUsed++
      }
      cache.set(identifier, record)
    }

    const remaining = Math.max(0, config.requests - record.count)
    const retryAfter = isAllowed ? undefined : Math.ceil((record.resetTime - now) / 1000)

    return {
      allowed: isAllowed,
      remaining,
      resetTime: record.resetTime,
      retryAfter
    }
  }

  static async enforce(
    type: RateLimitType, 
    identifier: string,
    operation: () => Promise<Response>
  ): Promise<Response> {
    const result = this.check(type, identifier)

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          type: 'RATE_LIMIT_EXCEEDED',
          retryAfter: result.retryAfter
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': result.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': RATE_LIMITS[type].requests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.toString()
          }
        }
      )
    }

    try {
      const response = await operation()
      
      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Limit', RATE_LIMITS[type].requests.toString())
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
      response.headers.set('X-RateLimit-Reset', result.resetTime.toString())
      
      return response
    } catch (error) {
      // If operation fails, we might want to refund the rate limit
      // For now, we'll keep it simple and not refund
      throw error
    }
  }

  static getStats(type: RateLimitType) {
    const cache = rateLimitCaches[type]
    const config = RATE_LIMITS[type]
    
    return {
      type,
      config,
      activeUsers: cache.size,
      maxUsers: cache.max
    }
  }

  static getAllStats() {
    return Object.keys(RATE_LIMITS).map(type => 
      this.getStats(type as RateLimitType)
    )
  }

  static clearUserLimits(identifier: string, type?: RateLimitType) {
    if (type) {
      rateLimitCaches[type].delete(identifier)
    } else {
      // Clear from all caches
      Object.values(rateLimitCaches).forEach(cache => {
        cache.delete(identifier)
      })
    }
  }
}

// IP-based rate limiting for requests without user identification
export class IPRateLimitService {
  private static readonly globalCache = new LRUCache<string, RateLimitRecord>({
    max: 50000, // Support up to 50k unique IPs
    ttl: 60 * 1000 // 1 minute TTL
  })

  static check(ip: string, requests: number = 100, windowMs: number = 60 * 1000): RateLimitResult {
    const now = Date.now()
    let record = this.globalCache.get(ip)
    
    if (!record || now >= record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs,
        burstUsed: 0
      }
    }

    const isAllowed = record.count < requests

    if (isAllowed) {
      record.count++
      this.globalCache.set(ip, record)
    }

    return {
      allowed: isAllowed,
      remaining: Math.max(0, requests - record.count),
      resetTime: record.resetTime,
      retryAfter: isAllowed ? undefined : Math.ceil((record.resetTime - now) / 1000)
    }
  }
}

// Utility to extract client IP from request
export function getClientIP(request: Request): string {
  // Check various headers that might contain the real IP
  const headers = [
    'CF-Connecting-IP', // Cloudflare
    'X-Forwarded-For', // Standard proxy header
    'X-Real-IP', // Nginx
    'X-Client-IP', // Apache
    'True-Client-IP' // Cloudflare Enterprise
  ]

  for (const header of headers) {
    const value = request.headers.get(header)
    if (value) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      return value.split(',')[0].trim()
    }
  }

  // Fallback to a default IP if none found
  return '127.0.0.1'
}

// Middleware function for easy rate limiting
export function withRateLimit(
  type: RateLimitType,
  getIdentifier: (request: Request) => string = getClientIP
) {
  return async (request: Request, operation: () => Promise<Response>): Promise<Response> => {
    const identifier = getIdentifier(request)
    return RateLimitService.enforce(type, identifier, operation)
  }
}

// Enhanced rate limiting with user context
export function withUserRateLimit(
  type: RateLimitType,
  getUserId: (request: Request) => Promise<string | null>
) {
  return async (request: Request, operation: () => Promise<Response>): Promise<Response> => {
    let identifier: string
    
    try {
      const userId = await getUserId(request)
      identifier = userId || getClientIP(request)
    } catch {
      identifier = getClientIP(request)
    }

    return RateLimitService.enforce(type, identifier, operation)
  }
}

// Background cleanup for rate limit caches
export function scheduleRateLimitCleanup(): NodeJS.Timeout {
  return setInterval(() => {
    console.log('Cleaning up rate limit caches...')
    
    // LRU caches automatically clean up expired entries
    // This is just for logging and monitoring
    const stats = RateLimitService.getAllStats()
    console.log('Rate limit stats:', stats)
    
    // Emergency cleanup if any cache gets too large
    Object.entries(rateLimitCaches).forEach(([type, cache]) => {
      if (cache.size > cache.max * 0.9) {
        console.warn(`Rate limit cache for ${type} is ${cache.size}/${cache.max} - cleaning up`)
        // Clear oldest 25% of entries
        const entries = Array.from(cache.keys())
        const toClear = Math.floor(entries.length * 0.25)
        for (let i = 0; i < toClear; i++) {
          cache.delete(entries[i])
        }
      }
    })
  }, 5 * 60 * 1000) // Every 5 minutes
}

// Initialize cleanup on module load (server-side only)
if (typeof window === 'undefined') {
  scheduleRateLimitCleanup()
}