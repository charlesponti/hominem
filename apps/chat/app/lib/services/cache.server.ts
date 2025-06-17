import { LRUCache } from 'lru-cache'
import crypto from 'node:crypto'

// Cache configurations for different data types
const CACHE_CONFIGS = {
  transcription: {
    max: 1000, // Max 1000 transcriptions
    ttl: 1000 * 60 * 60 * 24, // 24 hours
    updateAgeOnGet: true
  },
  fileProcessing: {
    max: 500, // Max 500 processed files
    ttl: 1000 * 60 * 60 * 12, // 12 hours
    updateAgeOnGet: true
  },
  tts: {
    max: 2000, // Max 2000 TTS responses
    ttl: 1000 * 60 * 60 * 48, // 48 hours
    updateAgeOnGet: true
  },
  search: {
    max: 1000, // Max 1000 search results
    ttl: 1000 * 60 * 30, // 30 minutes
    updateAgeOnGet: false // Search results can get stale
  },
  chatResponse: {
    max: 5000, // Max 5000 chat responses
    ttl: 1000 * 60 * 60 * 6, // 6 hours
    updateAgeOnGet: true
  }
}

// Create cache instances
const caches = {
  transcription: new LRUCache<string, any>(CACHE_CONFIGS.transcription),
  fileProcessing: new LRUCache<string, any>(CACHE_CONFIGS.fileProcessing),
  tts: new LRUCache<string, any>(CACHE_CONFIGS.tts),
  search: new LRUCache<string, any>(CACHE_CONFIGS.search),
  chatResponse: new LRUCache<string, any>(CACHE_CONFIGS.chatResponse)
}

export type CacheType = keyof typeof caches

// Generate cache key from inputs
export function generateCacheKey(type: CacheType, ...inputs: any[]): string {
  const data = JSON.stringify(inputs)
  return crypto.createHash('sha256').update(`${type}:${data}`).digest('hex')
}

// Generic cache operations
export class CacheService {
  static get<T>(type: CacheType, key: string): T | undefined {
    return caches[type].get(key) as T | undefined
  }

  static set<T>(type: CacheType, key: string, value: T): void {
    caches[type].set(key, value)
  }

  static has(type: CacheType, key: string): boolean {
    return caches[type].has(key)
  }

  static delete(type: CacheType, key: string): boolean {
    return caches[type].delete(key)
  }

  static clear(type: CacheType): void {
    caches[type].clear()
  }

  static getStats(type: CacheType) {
    const cache = caches[type]
    return {
      size: cache.size,
      max: cache.max,
      ttl: cache.ttl,
      calculatedSize: cache.calculatedSize,
      hitRatio: cache.calculatedSize > 0 ? cache.size / cache.calculatedSize : 0
    }
  }

  static getAllStats() {
    return Object.keys(caches).reduce((acc, type) => {
      acc[type as CacheType] = this.getStats(type as CacheType)
      return acc
    }, {} as Record<CacheType, any>)
  }
}

// Specialized cache helpers
export class TranscriptionCache {
  static async getOrCreate<T>(
    audioHash: string,
    creator: () => Promise<T>
  ): Promise<T> {
    const key = generateCacheKey('transcription', audioHash)
    
    const cached = CacheService.get<T>('transcription', key)
    if (cached) {
      console.log(`Transcription cache hit: ${key.substring(0, 8)}...`)
      return cached
    }

    console.log(`Transcription cache miss: ${key.substring(0, 8)}...`)
    const result = await creator()
    CacheService.set('transcription', key, result)
    return result
  }
}

export class FileProcessingCache {
  static async getOrCreate<T>(
    fileHash: string,
    fileSize: number,
    mimetype: string,
    creator: () => Promise<T>
  ): Promise<T> {
    const key = generateCacheKey('fileProcessing', fileHash, fileSize, mimetype)
    
    const cached = CacheService.get<T>('fileProcessing', key)
    if (cached) {
      console.log(`File processing cache hit: ${key.substring(0, 8)}...`)
      return cached
    }

    console.log(`File processing cache miss: ${key.substring(0, 8)}...`)
    const result = await creator()
    CacheService.set('fileProcessing', key, result)
    return result
  }
}

export class TTSCache {
  static async getOrCreate<T>(
    text: string,
    voice: string,
    speed: number,
    creator: () => Promise<T>
  ): Promise<T> {
    const key = generateCacheKey('tts', text, voice, speed)
    
    const cached = CacheService.get<T>('tts', key)
    if (cached) {
      console.log(`TTS cache hit: ${key.substring(0, 8)}...`)
      return cached
    }

    console.log(`TTS cache miss: ${key.substring(0, 8)}...`)
    const result = await creator()
    CacheService.set('tts', key, result)
    return result
  }
}

export class SearchCache {
  static async getOrCreate<T>(
    query: string,
    maxResults: number,
    creator: () => Promise<T>
  ): Promise<T> {
    const key = generateCacheKey('search', query.toLowerCase().trim(), maxResults)
    
    const cached = CacheService.get<T>('search', key)
    if (cached) {
      console.log(`Search cache hit: ${key.substring(0, 8)}...`)
      return cached
    }

    console.log(`Search cache miss: ${key.substring(0, 8)}...`)
    const result = await creator()
    CacheService.set('search', key, result)
    return result
  }
}

export class ChatResponseCache {
  static async getOrCreate<T>(
    messageContext: string,
    model: string,
    temperature: number,
    creator: () => Promise<T>
  ): Promise<T> {
    // Note: Only cache for deterministic responses (temperature = 0)
    if (temperature > 0) {
      return creator()
    }

    const key = generateCacheKey('chatResponse', messageContext, model, temperature)
    
    const cached = CacheService.get<T>('chatResponse', key)
    if (cached) {
      console.log(`Chat response cache hit: ${key.substring(0, 8)}...`)
      return cached
    }

    console.log(`Chat response cache miss: ${key.substring(0, 8)}...`)
    const result = await creator()
    CacheService.set('chatResponse', key, result)
    return result
  }
}

// Cache warming utilities
export class CacheWarmer {
  static async warmCommonTTSPhrases(): Promise<void> {
    const commonPhrases = [
      'Hello! How can I help you today?',
      'I understand. Let me help you with that.',
      'I\'m sorry, I don\'t have enough information to answer that question.',
      'Thank you for uploading the file. Let me analyze it.',
      'I\'ve completed the analysis. Here are the results.',
      'Is there anything else I can help you with?'
    ]

    const voices = ['alloy', 'echo', 'nova']
    const speed = 1.0

    console.log('Warming TTS cache with common phrases...')
    
    for (const phrase of commonPhrases) {
      for (const voice of voices) {
        const key = generateCacheKey('tts', phrase, voice, speed)
        if (!CacheService.has('tts', key)) {
          // In a real implementation, you'd generate the TTS here
          // For now, just mark the cache warming
          console.log(`Would warm TTS cache for: "${phrase.substring(0, 30)}..." with voice ${voice}`)
        }
      }
    }
  }
}

// Cache cleanup utilities
export class CacheManager {
  static scheduleCleanup(): NodeJS.Timeout {
    // Clean expired entries every hour
    return setInterval(() => {
      console.log('Running cache cleanup...')
      const stats = CacheService.getAllStats()
      console.log('Cache stats before cleanup:', stats)
      
      // LRU cache automatically removes expired entries when accessed
      // Force cleanup by checking a dummy key
      Object.keys(caches).forEach(type => {
        caches[type as CacheType].get('__cleanup_check__')
      })
      
      const statsAfter = CacheService.getAllStats()
      console.log('Cache stats after cleanup:', statsAfter)
    }, 1000 * 60 * 60) // Every hour
  }

  static emergencyCleanup(): void {
    console.log('Emergency cache cleanup triggered')
    Object.keys(caches).forEach(type => {
      const cache = caches[type as CacheType]
      const sizeBefore = cache.size
      
      // Clear oldest 50% of entries
      const entries = Array.from(cache.entries())
      const toClear = Math.floor(entries.length / 2)
      
      for (let i = 0; i < toClear; i++) {
        cache.delete(entries[i][0])
      }
      
      console.log(`${type} cache: cleared ${sizeBefore - cache.size} entries`)
    })
  }
}

// Initialize cache cleanup on module load
if (typeof window === 'undefined') {
  // Only run on server
  CacheManager.scheduleCleanup()
}