import {
  listHealthDailySummary,
  listHealthRecentWorkouts,
  listHealthSleepSummary,
} from '../../application/health.service';
import {
  healthDailySummaryInputSchema,
  healthDailySummaryOutputSchema,
  healthRecentWorkoutsInputSchema,
  healthRecentWorkoutsOutputSchema,
  healthSleepSummaryInputSchema,
  healthSleepSummaryOutputSchema,
} from '../../schemas/health.schema';
import { registerTool } from '../tools';

registerTool(
  {
    name: 'health_daily_summary',
    title: 'Health daily summary',
    description:
      'Returns daily aggregated health metrics (steps, distance, calories, elevation) from tracker samples and daily/hourly summaries.',
    inputSchema: healthDailySummaryInputSchema,
    outputSchema: healthDailySummaryOutputSchema,
    readOnly: true,
    scopes: ['health:read'],
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => listHealthDailySummary(ownerUserId, input),
);

registerTool(
  {
    name: 'health_recent_workouts',
    title: 'Health recent workouts',
    description:
      'Lists recent workouts (runs, cycles, weights, yoga, etc.) with duration, calories, distance, and heart rate metrics.',
    inputSchema: healthRecentWorkoutsInputSchema,
    outputSchema: healthRecentWorkoutsOutputSchema,
    readOnly: true,
    scopes: ['health:read'],
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => listHealthRecentWorkouts(ownerUserId, input),
);

registerTool(
  {
    name: 'health_sleep_summary',
    title: 'Health sleep summary',
    description:
      'Lists recent sleep sessions with stage breakdowns (deep, light, REM, awake), total sleep duration, heart rate, and wake-up count.',
    inputSchema: healthSleepSummaryInputSchema,
    outputSchema: healthSleepSummaryOutputSchema,
    readOnly: true,
    scopes: ['health:read'],
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => listHealthSleepSummary(ownerUserId, input),
);
