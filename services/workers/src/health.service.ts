import type { Worker } from 'bullmq';

/**
 * Production-ready health monitoring service for workers
 * Uses event-driven approach instead of polling intervals
 */
import { logger } from '@hominem/utils/logger';

export interface HealthMetrics {
  startTime: number;
  lastJobProcessed?: number;
  totalJobsProcessed: number;
  totalJobsFailed: number;
  isHealthy: boolean;
  redisConnected: boolean;
  workerName: string;
}

export class HealthService {
  private metrics: HealthMetrics;
  private worker: Worker;
  private workerName: string;
  private isStopped = false;

  constructor(worker: Worker, workerName: string) {
    this.worker = worker;
    this.workerName = workerName;
    this.metrics = {
      startTime: Date.now(),
      totalJobsProcessed: 0,
      totalJobsFailed: 0,
      isHealthy: true,
      redisConnected: true,
      workerName,
    };

    this.setupHealthMonitoring();
    // Only log if there are issues - silent initialization for clean startup
  }

  /**
   * Set up event-driven health monitoring
   */
  private setupHealthMonitoring() {
    // Monitor worker events for health status
    this.worker.on('ready', () => {
      this.metrics.redisConnected = true;
      this.metrics.isHealthy = true;
      logger.info(`${this.workerName}: Ready and healthy`);
    });

    this.worker.on('completed', () => {
      this.metrics.lastJobProcessed = Date.now();
      this.metrics.totalJobsProcessed++;
      this.metrics.isHealthy = true;
    });

    this.worker.on('failed', () => {
      this.metrics.totalJobsFailed++;
      // Don't mark as unhealthy immediately - could be data issues
      if (this.getFailureRate() > 0.5) {
        this.metrics.isHealthy = false;
        logger.warn(`${this.workerName}: High failure rate detected`);
      }
    });

    this.worker.on('error', (error) => {
      this.metrics.isHealthy = false;
      logger.error(`${this.workerName}: Worker error detected`, error);
    });

    this.worker.on('stalled', (jobId) => {
      logger.warn(`${this.workerName}: Job ${jobId} stalled`);
    });
  }

  /**
   * Get current health status
   */
  getHealthStatus(): HealthMetrics {
    return { ...this.metrics };
  }

  /**
   * Get failure rate (0-1)
   */
  private getFailureRate() {
    const total = this.metrics.totalJobsProcessed + this.metrics.totalJobsFailed;
    return total > 0 ? this.metrics.totalJobsFailed / total : 0;
  }

  /**
   * Check if worker is healthy based on multiple criteria
   */
  isHealthy(): boolean {
    return this.metrics.isHealthy && this.metrics.redisConnected && this.getFailureRate() < 0.5;
  }

  /**
   * Get uptime in milliseconds
   */
  getUptime() {
    return Date.now() - this.metrics.startTime;
  }

  /**
   * Format health status for logging
   */
  getHealthSummary() {
    const uptime = Math.floor(this.getUptime() / 1000);
    const failureRate = (this.getFailureRate() * 100).toFixed(1);

    return `${this.workerName}: Healthy=${this.isHealthy()}, Uptime=${uptime}s, Jobs=${
      this.metrics.totalJobsProcessed
    }, Failures=${failureRate}%`;
  }

  /**
   * Optional: Create health check endpoint data
   */
  async getHealthCheckResponse(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: HealthMetrics & {
      uptime: number;
      failureRate: number;
    };
  }> {
    const isHealthy = this.isHealthy();

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      details: {
        ...this.metrics,
        uptime: this.getUptime(),
        failureRate: this.getFailureRate(),
      },
    };
  }

  /**
   * Stop the health service and log final health summary
   * Event listeners will be cleaned up automatically when the worker is closed
   */
  async stop(): Promise<void> {
    if (this.isStopped) {
      return;
    }

    this.isStopped = true;
    logger.info(this.getHealthSummary());
  }
}
