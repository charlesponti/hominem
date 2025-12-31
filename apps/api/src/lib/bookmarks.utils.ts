import { logger } from '@hominem/utils/logger'
import ogs from 'open-graph-scraper'
import type { OgObject } from 'open-graph-scraper/types'
import { z } from 'zod'

// Configuration schema for bookmark processing
const BookmarkConfigSchema = z.object({
  timeout: z.number().default(10000),
  userAgent: z.string().default('Mozilla/5.0 (compatible; BookmarkBot/1.0)'),
  cacheTtl: z.number().default(3600), // 1 hour default
  maxRetries: z.number().default(2),
  retryDelay: z.number().default(1000), // 1 second
  rateLimitDelay: z.number().default(500), // 500ms between requests
})

// Site-specific configuration
const SITE_CONFIGS = {
  twitter: {
    domain: 'twitter.com',
    siteName: 'Twitter',
    faviconUrl: 'https://abs.twimg.com/favicons/twitter.2.ico',
    patterns: [/twitter\.com/i, /x\.com/i],
  },
  facebook: {
    domain: 'facebook.com',
    siteName: 'Facebook',
    faviconUrl: 'https://static.xx.fbcdn.net/rsrc.php/yD/r/d4ZIVX-0C-b.ico',
    patterns: [/facebook\.com/i, /fb\.com/i, /m\.facebook\.com/i],
  },
  linkedin: {
    domain: 'linkedin.com',
    siteName: 'LinkedIn',
    faviconUrl: 'https://static.licdn.com/sc/h/akt4ae504epesldzj74dzred8',
    patterns: [/linkedin\.com/i],
  },
  applePodcasts: {
    domain: 'podcasts.apple.com',
    siteName: 'Apple Podcasts',
    faviconUrl: 'https://podcasts.apple.com/favicon.ico',
    patterns: [/podcasts\.apple\.com/i],
  },
  spotify: {
    domain: 'open.spotify.com',
    siteName: 'Spotify',
    faviconUrl: 'https://open.scdn.co/cdn/images/favicon.0f31d2be.ico',
    patterns: [/open\.spotify\.com/i],
  },
  youtube: {
    domain: 'youtube.com',
    siteName: 'YouTube',
    faviconUrl: 'https://www.youtube.com/s/desktop/0d84c0f6/img/favicon.ico',
    patterns: [/youtube\.com/i, /youtu\.be/i],
  },
  github: {
    domain: 'github.com',
    siteName: 'GitHub',
    faviconUrl: 'https://github.com/favicon.ico',
    patterns: [/github\.com/i],
  },
  medium: {
    domain: 'medium.com',
    siteName: 'Medium',
    faviconUrl: 'https://medium.com/favicon.ico',
    patterns: [/medium\.com/i],
  },
  reddit: {
    domain: 'reddit.com',
    siteName: 'Reddit',
    faviconUrl: 'https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png',
    patterns: [/reddit\.com/i],
  },
} as const

// Types
export interface BookmarkConfig extends z.infer<typeof BookmarkConfigSchema> {}

type OGImage = { width?: number; height?: number; url?: string }

export interface SiteConfig {
  domain: string
  siteName: string
  faviconUrl: string
  patterns: RegExp[]
}

export interface OpenGraphData extends OgObject {
  description?: string
  faviconUrl?: string
  imageHeight?: number
  imageWidth?: number
  imageUrl?: string
  siteName: string
  title: string
}

export interface BookmarkData {
  image: string
  title: string
  description: string
  url: string
  siteName: string
  imageWidth: string
  imageHeight: string
}

export interface CacheEntry {
  data: OpenGraphData
  timestamp: number
  ttl: number
}

export interface ScrapingMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  cacheHitRate: number
}

// Simple in-memory cache (in production, use Redis)
class MemoryCache {
  private cache = new Map<string, CacheEntry>()

  get(key: string): OpenGraphData | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  set(key: string, data: OpenGraphData, ttl: number) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  clear() {
    this.cache.clear()
  }

  size() {
    return this.cache.size
  }
}

// Rate limiter
class RateLimiter {
  private lastRequestTime = 0
  private delay: number

  constructor(delay: number) {
    this.delay = delay
  }

  async wait(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (timeSinceLastRequest < this.delay) {
      const waitTime = this.delay - timeSinceLastRequest
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }

    this.lastRequestTime = Date.now()
  }
}

// URL utilities
class URLUtils {
  /**
   * Normalize and validate URL
   */
  static normalizeUrl(url: string) {
    const trimmed = url.trim()

    // Add protocol if missing
    if (!(trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
      return `https://${trimmed}`
    }

    return trimmed
  }

  /**
   * Extract domain from URL using URL API
   */
  static extractDomain(url: string) {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.replace(/^www\./, '')
    } catch {
      // Fallback for malformed URLs
      const domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '')
      return domain.split(/[/?#]/)[0]
    }
  }

  /**
   * Check if URL is valid
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Resolve relative URLs to absolute URLs
   */
  static resolveUrl(baseUrl: string, relativeUrl: string) {
    try {
      return new URL(relativeUrl, baseUrl).href
    } catch {
      return relativeUrl
    }
  }

  /**
   * Generate cache key for URL
   */
  static generateCacheKey(url: string) {
    return `og:${Buffer.from(url).toString('base64')}`
  }
}

// Site detection utilities
class SiteDetector {
  /**
   * Detect site configuration based on URL
   */
  static detectSite(url: string): SiteConfig | null {
    for (const config of Object.values(SITE_CONFIGS)) {
      if (config.patterns.some((pattern) => pattern.test(url))) {
        return {
          domain: config.domain,
          siteName: config.siteName,
          faviconUrl: config.faviconUrl,
          patterns: [...config.patterns],
        }
      }
    }

    return null
  }

  /**
   * Get fallback site name
   */
  static getFallbackSiteName(url: string) {
    const site = SiteDetector.detectSite(url)
    return site?.siteName || URLUtils.extractDomain(url)
  }

  /**
   * Get fallback favicon URL
   */
  static getFallbackFaviconUrl(url: string) {
    const site = SiteDetector.detectSite(url)
    return site?.faviconUrl
  }
}

// OpenGraph data processing
class OpenGraphProcessor {
  /**
   * Extract image URL from OpenGraph data
   */
  static extractImageUrl(ogImage: OGImage[] | OGImage | undefined) {
    if (!ogImage) return undefined

    if (typeof ogImage === 'string') {
      return ogImage
    }

    if (Array.isArray(ogImage)) {
      return ogImage[0]?.url
    }

    if (typeof ogImage === 'object' && ogImage && typeof ogImage.url === 'string') {
      return ogImage.url
    }

    return undefined
  }

  /**
   * Extract image dimensions from OpenGraph data
   */
  static extractImageDimensions(ogImage: OGImage[] | OGImage | undefined): {
    width?: number
    height?: number
  } {
    if (!ogImage) return {}

    if (Array.isArray(ogImage) && ogImage[0]) {
      return {
        width: ogImage[0].width,
        height: ogImage[0].height,
      }
    }

    if (!Array.isArray(ogImage) && typeof ogImage === 'object') {
      const width = typeof ogImage.width === 'number' ? ogImage.width : undefined
      const height = typeof ogImage.height === 'number' ? ogImage.height : undefined
      return { width, height }
    }

    return {}
  }

  /**
   * Process favicon URL
   */
  static processFaviconUrl(faviconUrl: string | undefined, baseUrl: string) {
    if (!faviconUrl) return undefined

    // If already absolute, return as is
    if (faviconUrl.startsWith('http://') || faviconUrl.startsWith('https://')) {
      return faviconUrl
    }

    // If protocol-relative, convert to https
    if (faviconUrl.startsWith('//')) {
      return `https:${faviconUrl}`
    }

    // If relative, resolve against base URL
    return URLUtils.resolveUrl(baseUrl, faviconUrl)
  }
}

// Main bookmark service with production features
class BookmarkService {
  private config: BookmarkConfig
  private cache: MemoryCache
  private rateLimiter: RateLimiter
  private metrics: ScrapingMetrics

  constructor(config: Partial<BookmarkConfig> = {}) {
    this.config = BookmarkConfigSchema.parse(config)
    this.cache = new MemoryCache()
    this.rateLimiter = new RateLimiter(this.config.rateLimitDelay)
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
    }
  }

  /**
   * Fetch OpenGraph data for a URL with caching and retries
   */
  async getOpenGraphData(url: string): Promise<OpenGraphData> {
    const startTime = Date.now()
    const normalizedUrl = URLUtils.normalizeUrl(url)
    const cacheKey = URLUtils.generateCacheKey(normalizedUrl)

    this.metrics.totalRequests++

    if (!URLUtils.isValidUrl(normalizedUrl)) {
      logger.error('Invalid URL provided', { url, normalizedUrl })
      throw new Error(`Invalid URL: ${url}`)
    }

    // Check cache first
    const cachedData = this.cache.get(cacheKey)
    if (cachedData) {
      this.updateMetrics(true, Date.now() - startTime)
      logger.info('Cache hit for URL', { url: normalizedUrl })
      return cachedData
    }

    // Rate limiting
    await this.rateLimiter.wait()

    // Fetch with retries
    let lastError: Error | null = null
    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        const data = await this.fetchOpenGraphData(normalizedUrl)

        // Cache successful result
        this.cache.set(cacheKey, data, this.config.cacheTtl)

        this.updateMetrics(true, Date.now() - startTime)
        logger.info('Successfully fetched OpenGraph data', {
          url: normalizedUrl,
          attempt,
          responseTime: Date.now() - startTime,
        })

        return data
      } catch (error) {
        lastError = error as Error
        logger.warn('OpenGraph fetch attempt failed', {
          url: normalizedUrl,
          attempt,
          error: error instanceof Error ? error.message : 'Unknown error',
        })

        if (attempt <= this.config.maxRetries) {
          await this.delay(this.config.retryDelay * attempt) // Exponential backoff
        }
      }
    }

    this.updateMetrics(false, Date.now() - startTime)
    logger.error('All OpenGraph fetch attempts failed', {
      url: normalizedUrl,
      attempts: this.config.maxRetries + 1,
      lastError: lastError?.message,
    })

    throw new Error(
      `Failed to fetch OpenGraph data after ${this.config.maxRetries + 1} attempts: ${lastError?.message}`
    )
  }

  /**
   * Actual OpenGraph fetching logic
   */
  private async fetchOpenGraphData(url: string): Promise<OpenGraphData> {
    const { error, result } = await ogs({
      onlyGetOpenGraphInfo: true,
      url,
      timeout: this.config.timeout,
    })

    if (error) {
      throw new Error(`OpenGraph scraper error: ${error}`)
    }

    return this.processOpenGraphResult(result, url)
  }

  /**
   * Process OpenGraph result into standardized format
   */
  private processOpenGraphResult(result: OgObject, url: string): OpenGraphData {
    const domain = URLUtils.extractDomain(url)

    // Extract image data
    const imageUrl = OpenGraphProcessor.extractImageUrl(result.ogImage)
    const { width: imageWidth, height: imageHeight } = OpenGraphProcessor.extractImageDimensions(
      result.ogImage
    )

    // Process site name
    let siteName = result.ogSiteName
    if (!siteName) {
      siteName = SiteDetector.getFallbackSiteName(url)
    }

    // Process favicon
    let faviconUrl = OpenGraphProcessor.processFaviconUrl(result.favicon, url)
    if (!faviconUrl) {
      faviconUrl = SiteDetector.getFallbackFaviconUrl(url)
    }

    // Process title
    const title = result.ogTitle || domain

    return {
      ...result,
      description: result.ogDescription,
      faviconUrl,
      imageUrl,
      siteName,
      title,
      imageWidth,
      imageHeight,
    }
  }

  /**
   * Convert OpenGraph data to bookmark format
   */
  convertToBookmark(url: string, ogData: OpenGraphData): BookmarkData {
    return {
      image: ogData.imageUrl ?? '',
      title: ogData.title,
      description: ogData.description ?? '',
      url,
      siteName: ogData.siteName,
      imageWidth: ogData.imageWidth?.toString() ?? '',
      imageHeight: ogData.imageHeight?.toString() ?? '',
    }
  }

  /**
   * Create bookmark with fallback handling
   */
  async createBookmark(url: string): Promise<BookmarkData> {
    try {
      const ogData = await this.getOpenGraphData(url)
      return this.convertToBookmark(url, ogData)
    } catch (error) {
      // Fallback to basic URL data if OpenGraph fails
      logger.warn('OpenGraph fetch failed, using fallback data', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      const domain = URLUtils.extractDomain(url)
      return {
        url,
        title: domain,
        description: '',
        image: '',
        siteName: domain,
        imageWidth: '',
        imageHeight: '',
      }
    }
  }

  /**
   * Get service metrics
   */
  getMetrics(): ScrapingMetrics {
    const cacheHits =
      this.metrics.totalRequests - (this.metrics.successfulRequests + this.metrics.failedRequests)
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.totalRequests > 0 ? cacheHits / this.metrics.totalRequests : 0,
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear()
    logger.info('Cache cleared')
  }

  /**
   * Update metrics
   */
  private updateMetrics(success: boolean, responseTime: number) {
    if (success) {
      this.metrics.successfulRequests++
    } else {
      this.metrics.failedRequests++
    }

    // Update average response time
    const totalSuccessful = this.metrics.successfulRequests
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (totalSuccessful - 1) + responseTime) / totalSuccessful
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Export convenience functions for backward compatibility
export const getOpenGraphData = async (params: { url: string }): Promise<OpenGraphData> => {
  const service = new BookmarkService()
  return service.getOpenGraphData(params.url)
}

export const convertOGContentToBookmark = (params: {
  url: string
  ogContent: OpenGraphData
}): BookmarkData => {
  const service = new BookmarkService()
  return service.convertToBookmark(params.url, params.ogContent)
}
