#!/usr/bin/env bash
set -euo pipefail

database_url="${DATABASE_URL:-}"
[[ -n "$database_url" ]] || {
  echo 'error: set DATABASE_URL to the intended database' >&2
  exit 1
}

echo 'Speech usage diagnosis (aggregate-only)'
echo

psql "$database_url" -X -v ON_ERROR_STOP=1 <<'SQL'
\pset pager off
SELECT 'reconciliation_status' AS report,
       reconciliation_status AS status,
       count(*) AS runs
FROM app.chat_speech_runs
GROUP BY reconciliation_status
ORDER BY reconciliation_status;

SELECT 'missing_usage_events' AS report,
       count(*) AS runs
FROM app.chat_speech_runs AS runs
WHERE runs.provider_generation_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM app.ai_usage_events AS events
    WHERE events.id = runs.usage_event_id
  );

SELECT 'current_month_usage' AS report,
       feature,
       count(*) AS requests,
       count(*) FILTER (WHERE usage_available) AS usage_available,
       coalesce(sum(total_tokens), 0) AS total_tokens,
       coalesce(sum(cost_usd), 0) AS cost_usd
FROM app.ai_usage_events
WHERE createdat >= date_trunc('month', now() AT TIME ZONE 'UTC')
GROUP BY feature
ORDER BY cost_usd DESC, total_tokens DESC;
SQL
