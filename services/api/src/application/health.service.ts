import { db, sql } from '@hominem/db';

import type {
  HealthDailySummaryOutput,
  HealthRecentWorkoutsOutput,
  HealthSleepSummaryOutput,
} from '../schemas/health.schema';

function endOfDay(value: string): string {
  return `${value}T23:59:59.999Z`;
}

// ── health_daily_summary ────────────────────────────────────────────

export async function listHealthDailySummary(
  ownerUserId: string,
  input: { from?: string; to?: string; limit: number },
): Promise<HealthDailySummaryOutput> {
  const { from, to, limit } = input;

  let query = db
    .selectFrom('app.healthActivities as ha')
    .select(['ha.startsAt', 'ha.metrics', 'ha.source'])
    .where('ha.ownerUserid', '=', ownerUserId)
    .where('ha.activityType', 'in', ['tracker_sample', 'daily_summary', 'hourly_summary']);

  if (from) {
    query = query.where(sql`ha.starts_at::date`, '>=', from);
  }
  if (to) {
    query = query.where(sql`ha.starts_at::date`, '<=', to);
  }

  const rows = await query
    .orderBy(sql`ha.starts_at::date desc`)
    .limit(limit)
    .execute();

  const grouped = new Map<
    string,
    { steps: number; distanceM: number; caloriesTotal: number; elevationM: number; source: string }
  >();
  for (const r of rows) {
    const date = (r.startsAt as string).slice(0, 10);
    const m = r.metrics as Record<string, unknown>;
    const existing = grouped.get(date) ?? {
      steps: 0,
      distanceM: 0,
      caloriesTotal: 0,
      elevationM: 0,
      source: (r.source as string) ?? '',
    };
    existing.steps += numberOr(m.steps, 0);
    existing.distanceM += numberOr(m.distance_m, 0);
    existing.caloriesTotal +=
      numberOr(m.calories, 0) + numberOr(m.calories_active, 0) + numberOr(m.calories_passive, 0);
    existing.elevationM += numberOr(m.elevation_m, 0);
    grouped.set(date, existing);
  }

  // Convert to sorted array
  const days = [...grouped.entries()]
    .map(([date, v]) => ({
      date,
      steps: v.steps || null,
      distanceM: v.distanceM || null,
      caloriesTotal: v.caloriesTotal || null,
      elevationM: v.elevationM || null,
      source: v.source,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return { from: from ?? null, to: to ?? null, days, count: days.length };
}

// ── health_recent_workouts ──────────────────────────────────────────

export async function listHealthRecentWorkouts(
  ownerUserId: string,
  input: { from?: string; to?: string; limit: number },
): Promise<HealthRecentWorkoutsOutput> {
  const { from, to, limit } = input;

  let query = db
    .selectFrom('app.healthActivities as ha')
    .select(['ha.id', 'ha.activityType', 'ha.startsAt', 'ha.endsAt', 'ha.metrics', 'ha.source'])
    .where('ha.ownerUserid', '=', ownerUserId)
    .where('ha.activityType', 'not in', [
      'tracker_sample',
      'daily_summary',
      'hourly_summary',
      'sleep',
    ]);

  if (from) {
    query = query.where('ha.startsAt', '>=', from);
  }
  if (to) {
    query = query.where('ha.startsAt', '<=', endOfDay(to));
  }

  const rows = await query.orderBy('ha.startsAt', 'desc').limit(limit).execute();

  const workouts = rows.map((r) => {
    const m = r.metrics as Record<string, unknown>;
    return {
      id: r.id,
      activityType: r.activityType as string,
      startedAt: toIso(r.startsAt)!,
      endedAt: toIso(r.endsAt),
      durationS: intOrNull(m.duration_s),
      calories: numOrNull(m.calories),
      distanceM: numOrNull(m.distance_m),
      avgHeartRate: numOrNull(m.avg_heart_rate),
      minHeartRate: numOrNull(m.min_heart_rate),
      maxHeartRate: numOrNull(m.max_heart_rate),
      steps: intOrNull(m.steps),
      source: (r.source as string) ?? '',
    };
  });

  return { workouts, count: workouts.length };
}

// ── health_sleep_summary ────────────────────────────────────────────

export async function listHealthSleepSummary(
  ownerUserId: string,
  input: { from?: string; to?: string; limit: number },
): Promise<HealthSleepSummaryOutput> {
  const { from, to, limit } = input;

  let query = db
    .selectFrom('app.healthActivities as ha')
    .select(['ha.id', 'ha.startsAt', 'ha.endsAt', 'ha.metrics', 'ha.source'])
    .where('ha.ownerUserid', '=', ownerUserId)
    .where('ha.activityType', '=', 'sleep');

  if (from) {
    query = query.where('ha.startsAt', '>=', from);
  }
  if (to) {
    query = query.where('ha.startsAt', '<=', endOfDay(to));
  }

  const rows = await query.orderBy('ha.startsAt', 'desc').limit(limit).execute();

  const sessions = rows.map((r) => {
    const m = r.metrics as Record<string, unknown>;
    const deep = intOrNull(m.deep_sleep_s) ?? 0;
    const light = intOrNull(m.light_sleep_s) ?? 0;
    const rem = intOrNull(m.rem_sleep_s) ?? 0;
    const allNull = m.deep_sleep_s == null && m.light_sleep_s == null && m.rem_sleep_s == null;

    return {
      id: r.id,
      startedAt: toIso(r.startsAt)!,
      endedAt: toIso(r.endsAt)!,
      totalSleepS: allNull ? null : deep + light + rem,
      deepSleepS: intOrNull(m.deep_sleep_s),
      lightSleepS: intOrNull(m.light_sleep_s),
      remSleepS: intOrNull(m.rem_sleep_s),
      awakeS: intOrNull(m.awake_s),
      avgHeartRate: numOrNull(m.avg_heart_rate),
      minHeartRate: numOrNull(m.min_heart_rate),
      maxHeartRate: numOrNull(m.max_heart_rate),
      wakeUpCount: intOrNull(m.wake_up_count),
      source: (r.source as string) ?? '',
    };
  });

  return { sessions, count: sessions.length };
}

// ── helpers ──────────────────────────────────────────────────────────

function toIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value as string).toISOString();
}

function numberOr(value: unknown, fallback: number): number {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function intOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? null : n;
}
