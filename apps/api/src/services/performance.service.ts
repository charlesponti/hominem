import { logger } from '@ponti/utils/logger'
import { encode } from 'gpt-tokenizer'

/**
 * Statistics for a single AI generation operation
 */
export class GenerationStatistics {
  private readonly startTime: number
  private endTime = 0

  constructor(
    public readonly modelName: string = '',
    public inputTokens = 0,
    public outputTokens = 0,
    public inputTime = 0,
    public outputTime = 0,
    public queueTime = 0
  ) {
    this.startTime = performance.now()
  }

  /**
   * Stop timing and calculate total duration
   */
  stop(): void {
    this.endTime = performance.now()
  }

  /**
   * Get the total time spent in seconds
   */
  get totalTime(): number {
    const end = this.endTime || performance.now()
    return (end - this.startTime) / 1000
  }

  /**
   * Calculate tokens per second for input
   */
  get inputSpeed(): number {
    if (this.inputTime <= 0) return 0
    return this.inputTokens / this.inputTime
  }

  /**
   * Calculate tokens per second for output
   */
  get outputSpeed(): number {
    if (this.outputTime <= 0) return 0
    return this.outputTokens / this.outputTime
  }

  /**
   * Calculate total tokens per second
   */
  get totalSpeed(): number {
    const totalTokens = this.inputTokens + this.outputTokens
    if (this.totalTime <= 0) return 0
    return totalTokens / this.totalTime
  }

  /**
   * Add statistics from another GenerationStatistics object
   */
  add(other: GenerationStatistics): void {
    this.inputTime += other.inputTime
    this.outputTime += other.outputTime
    this.queueTime += other.queueTime
    this.inputTokens += other.inputTokens
    this.outputTokens += other.outputTokens
  }

  /**
   * Get statistics as a structured object
   */
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  getStats(): Record<string, any> {
    return {
      model_name: this.modelName,
      input: {
        speed: this.inputSpeed,
        tokens: this.inputTokens,
        time: this.inputTime,
      },
      output: {
        speed: this.outputSpeed,
        tokens: this.outputTokens,
        time: this.outputTime,
      },
      queue: {
        time: this.queueTime,
      },
      total: {
        speed: this.totalSpeed,
        tokens: this.inputTokens + this.outputTokens,
        time: this.totalTime,
      },
    }
  }

  /**
   * Format statistics as a readable table
   */
  toString(): string {
    return `
## ${this.outputSpeed.toFixed(2)} T/s ⚡
Round trip time: ${this.totalTime.toFixed(2)}s  Model: ${this.modelName}

| Metric             | Input          | Output         | Total          |
|-------------------|----------------|----------------|----------------|
| Speed (T/s)       | ${this.inputSpeed.toFixed(2).padStart(12, ' ')} | ${this.outputSpeed.toFixed(2).padStart(12, ' ')} | ${this.totalSpeed.toFixed(2).padStart(12, ' ')} |
| Tokens            | ${String(this.inputTokens).padStart(12, ' ')} | ${String(this.outputTokens).padStart(12, ' ')} | ${String(this.inputTokens + this.outputTokens).padStart(12, ' ')} |
| Inference Time (s)| ${this.inputTime.toFixed(2).padStart(12, ' ')} | ${this.outputTime.toFixed(2).padStart(12, ' ')} | ${this.totalTime.toFixed(2).padStart(12, ' ')} |
`
  }

  /**
   * Create statistics from prompt and response
   */
  static fromCompletion(options: {
    modelName: string
    prompt: string | object
    response: string | object
    inputTime: number
    outputTime: number
    queueTime?: number
  }): GenerationStatistics {
    const { modelName, prompt, response, inputTime, outputTime, queueTime = 0 } = options

    // Convert objects to strings for token counting
    const promptText = typeof prompt === 'string' ? prompt : JSON.stringify(prompt)
    const responseText = typeof response === 'string' ? response : JSON.stringify(response)

    // Count tokens
    const inputTokens = encode(promptText).length
    const outputTokens = encode(responseText).length

    return new GenerationStatistics(
      modelName,
      inputTokens,
      outputTokens,
      inputTime,
      outputTime,
      queueTime
    )
  }
}

/**
 * Timer class for tracking performance of operations
 */
export class PerformanceTimer {
  private startTime: number
  private markTimes: Record<string, number> = {}
  private endTime: number | null = null

  constructor(public readonly name: string) {
    this.startTime = performance.now()
  }

  /**
   * Mark a specific point in time during execution
   */
  mark(name: string): void {
    this.markTimes[name] = performance.now()
  }

  /**
   * Get duration since the start or since a specific mark
   */
  getDuration(fromMark?: string): number {
    const now = performance.now()
    const startPoint = fromMark ? this.markTimes[fromMark] || this.startTime : this.startTime
    return (now - startPoint) / 1000 // Convert to seconds
  }

  /**
   * Get duration between two marks
   */
  getDurationBetween(fromMark: string, toMark: string): number {
    if (!this.markTimes[fromMark] || !this.markTimes[toMark]) {
      return 0
    }
    return (this.markTimes[toMark] - this.markTimes[fromMark]) / 1000
  }

  /**
   * Stop the timer
   */
  stop(): number {
    this.endTime = performance.now()
    const duration = (this.endTime - this.startTime) / 1000
    return duration
  }

  /**
   * Get total elapsed time
   */
  get totalTime(): number {
    return this.endTime
      ? (this.endTime - this.startTime) / 1000
      : (performance.now() - this.startTime) / 1000
  }
}

/**
 * Performance service for tracking AI operations
 */
export class PerformanceService {
  private static instance: PerformanceService
  private statsRegistry: Record<string, GenerationStatistics> = {}
  private timerRegistry: Record<string, PerformanceTimer> = {}

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService()
    }
    return PerformanceService.instance
  }

  /**
   * Start a new timer
   */
  startTimer(name: string): PerformanceTimer {
    const timer = new PerformanceTimer(name)
    this.timerRegistry[name] = timer
    return timer
  }

  /**
   * Get an existing timer
   */
  getTimer(name: string): PerformanceTimer | undefined {
    return this.timerRegistry[name]
  }

  /**
   * Stop a timer and return the duration
   */
  stopTimer(name: string): number {
    const timer = this.timerRegistry[name]
    if (!timer) return 0

    const duration = timer.stop()
    delete this.timerRegistry[name]
    return duration
  }

  /**
   * Track an AI generation operation with timing
   */
  trackGeneration(options: {
    operationId: string
    modelName: string
    prompt: string | object
    response: string | object
    inputTime?: number
    outputTime?: number
    queueTime?: number
  }): GenerationStatistics {
    const {
      operationId,
      modelName,
      prompt,
      response,
      inputTime = 0,
      outputTime = 0,
      queueTime = 0,
    } = options

    const stats = GenerationStatistics.fromCompletion({
      modelName,
      prompt,
      response,
      inputTime,
      outputTime,
      queueTime,
    })

    this.statsRegistry[operationId] = stats
    return stats
  }

  /**
   * Get statistics for a specific operation
   */
  getStats(operationId: string): GenerationStatistics | undefined {
    return this.statsRegistry[operationId]
  }

  /**
   * Log statistics for debugging or monitoring
   */
  logStats(stats: GenerationStatistics): void {
    logger.debug(stats.toString())
  }
}

/**
 * Helper function to get the performance service instance
 */
export function getPerformanceService(): PerformanceService {
  return PerformanceService.getInstance()
}
