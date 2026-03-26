# ClickStack Dashboard SQL Queries

Collection of SQL queries for building dashboards in ClickStack/HyperDX UI.

## Service Latency Overview

### Average & P99 Latency by Service
```sql
SELECT 
  ServiceName,
  avg(Duration) as avg_duration_ms,
  quantile(0.50)(Duration) as p50_duration_ms,
  quantile(0.95)(Duration) as p95_duration_ms,
  quantile(0.99)(Duration) as p99_duration_ms,
  count() as total_spans
FROM otel_traces
WHERE Timestamp >= now() - INTERVAL 1 HOUR
GROUP BY ServiceName
ORDER BY avg_duration_ms DESC
```

### Latency Over Time (Line Chart)
```sql
SELECT 
  ServiceName,
  toStartOfInterval(Timestamp, INTERVAL 5 MINUTE) as time,
  avg(Duration) as avg_duration_ms,
  quantile(0.99)(Duration) as p99_duration_ms
FROM otel_traces
WHERE Timestamp >= now() - INTERVAL 1 HOUR
GROUP BY ServiceName, time
ORDER BY time
```

## API Requests

### Requests by Endpoint (Top 20 Slowest)
```sql
SELECT 
  ServiceName,
  SpanName,
  avg(Duration) as avg_duration_ms,
  quantile(0.99)(Duration) as p99_duration_ms,
  count() as request_count
FROM otel_traces
WHERE 
  Timestamp >= now() - INTERVAL 1 HOUR
  AND SpanName LIKE 'HTTP %'
GROUP BY ServiceName, SpanName
ORDER BY avg_duration_ms DESC
LIMIT 20
```

### Request Rate Over Time
```sql
SELECT 
  ServiceName,
  toStartOfInterval(Timestamp, INTERVAL 1 MINUTE) as time,
  count() as requests_per_minute
FROM otel_traces
WHERE 
  Timestamp >= now() - INTERVAL 1 HOUR
  AND SpanName LIKE 'HTTP %'
GROUP BY ServiceName, time
ORDER BY time
```

## Errors & Status Codes

### Error Rate by Service
```sql
SELECT 
  ServiceName,
  StatusCode,
  count() as count,
  count() / groupArraySum(count()) * 100 as percentage
FROM otel_traces
WHERE Timestamp >= now() - INTERVAL 1 HOUR
GROUP BY ServiceName, StatusCode
```

### Failed Requests (StatusCode = 2)
```sql
SELECT 
  ServiceName,
  SpanName,
  StatusMessage,
  count() as error_count
FROM otel_traces
WHERE 
  Timestamp >= now() - INTERVAL 1 HOUR
  AND StatusCode = 2
GROUP BY ServiceName, SpanName, StatusMessage
ORDER BY error_count DESC
```

### Errors Over Time
```sql
SELECT 
  toStartOfInterval(Timestamp, INTERVAL 5 MINUTE) as time,
  countIf(StatusCode = 2) as errors,
  count() as total,
  countIf(StatusCode = 2) / count() * 100 as error_rate_pct
FROM otel_traces
WHERE Timestamp >= now() - INTERVAL 1 HOUR
GROUP BY time
ORDER BY time
```

## Database Queries

### DB Query Latency (If instrumented with db.name attribute)
```sql
SELECT 
  ServiceName,
  SpanName,
  avg(Duration) as avg_duration_ms,
  quantile(0.99)(Duration) as p99_duration_ms,
  count() as query_count
FROM otel_traces
WHERE 
  Timestamp >= now() - INTERVAL 1 HOUR
  AND SpanName LIKE '%query%'
  OR SpanName LIKE '%db%'
GROUP BY ServiceName, SpanName
ORDER BY avg_duration_ms DESC
LIMIT 20
```

### DB Errors
```sql
SELECT 
  ServiceName,
  SpanName,
  StatusMessage,
  count() as error_count
FROM otel_traces
WHERE 
  Timestamp >= now() - INTERVAL 1 HOUR
  AND (SpanName LIKE '%query%' OR SpanName LIKE '%db%')
  AND StatusCode = 2
GROUP BY ServiceName, SpanName, StatusMessage
ORDER BY error_count DESC
```

## Web Vitals (Browser Metrics)

### Average Web Vitals
```sql
SELECT 
  ServiceName,
  avg(Value) as avg_value
FROM otel_metrics
WHERE 
  MetricName IN ('web_vitals_lcp', 'web_vitals_fid', 'web_vitals_cls')
  AND Time >= now() - INTERVAL 1 HOUR
GROUP BY ServiceName, MetricName
```

## Service-Specific Queries

### hominem-web (Browser)
```sql
SELECT 
  SpanName,
  avg(Duration) as avg_duration_ms,
  quantile(0.99)(Duration) as p99_duration_ms,
  count() as count
FROM otel_traces
WHERE 
  Timestamp >= now() - INTERVAL 1 HOUR
  AND ServiceName = 'hominem-web'
GROUP BY SpanName
ORDER BY count DESC
```

### hominem-api (Backend)
```sql
SELECT 
  SpanName,
  avg(Duration) as avg_duration_ms,
  quantile(0.99)(Duration) as p99_duration_ms,
  count() as count
FROM otel_traces
WHERE 
  Timestamp >= now() - INTERVAL 1 HOUR
  AND ServiceName = 'hominem-api'
GROUP BY SpanName
ORDER BY count DESC
```

## Trace Analysis

### Recent Traces with Errors
```sql
SELECT 
  Timestamp,
  TraceId,
  ServiceName,
  SpanName,
  Duration as duration_ms,
  StatusCode,
  StatusMessage
FROM otel_traces
WHERE 
  Timestamp >= now() - INTERVAL 15 MINUTE
  AND StatusCode = 2
ORDER BY Timestamp DESC
LIMIT 50
```

### Slowest Traces (P99+)
```sql
SELECT 
  Timestamp,
  TraceId,
  ServiceName,
  SpanName,
  Duration as duration_ms
FROM otel_traces
WHERE 
  Timestamp >= now() - INTERVAL 1 HOUR
  AND Duration > (
    SELECT quantile(0.99)(Duration) 
    FROM otel_traces 
    WHERE Timestamp >= now() - INTERVAL 1 HOUR
  )
ORDER BY Duration DESC
LIMIT 20
```

## Column Reference

| Column | Type | Description |
|--------|------|-------------|
| Timestamp | DateTime | When the span started |
| TraceId | String | Unique trace identifier |
| SpanId | String | Unique span identifier |
| ParentSpanId | String | Parent span ID (if any) |
| SpanName | String | Name of the span (e.g., "HTTP GET /users") |
| ServiceName | String | Service that generated the span |
| Duration | Int64 | Duration in nanoseconds (divide by 1000000 for ms) |
| StatusCode | Int | 0=Unset, 1=Ok, 2=Error |
| StatusMessage | String | Error message if StatusCode = 2 |
| SpanAttributes | JSON | Span-specific attributes |

## Common Filters

- **Filter by time**: `WHERE Timestamp >= now() - INTERVAL 1 HOUR`
- **Filter by service**: `AND ServiceName = 'hominem-api'`
- **Filter by endpoint**: `AND SpanName LIKE 'HTTP GET%'`
- **Filter errors**: `AND StatusCode = 2`
- **Filter by trace ID**: `AND TraceId = '...'`

## Notes

- Duration is in **nanoseconds** - divide by 1,000,000 for milliseconds
- Replace `INTERVAL 1 HOUR` with desired time range
- ClickStack requires a time column for charts - ensure `Timestamp` is included in GROUP BY for time-series

## Programmatic Dashboard Creation

### ClickStack Cloud API (Production)

The full API is available on ClickStack Cloud / managed instances:

```bash
# List dashboards
curl -X GET \
  'https://api.clickhouse.cloud/v1/organizations/{orgId}/services/{serviceId}/clickstack/dashboards' \
  --user '<keyId>:<keySecret>'

# Create dashboard
curl -X POST \
  'https://api.clickhouse.cloud/v1/organizations/{orgId}/services/{serviceId}/clickstack/dashboards' \
  --user '<keyId>:<keySecret>' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "API Monitoring",
    "tiles": [
      {
        "x": 0,
        "y": 0,
        "w": 24,
        "h": 12,
        "type": "LINE_CHART",
        "query": "SELECT...",
        "sourceId": "..."
      }
    ]
  }'
```

### Local ClickStack (Limited API)

The local `clickstack-local` image has limited API support. Options:

1. **Manual creation** - Build dashboards in the UI at http://localhost:8080
2. **Export/Import** - Some versions support exporting dashboard JSON configs
3. **ClickHouse direct** - Store dashboard configs in ClickHouse directly if the schema supports it

### Terraform (Coming Soon)

ClickStack is developing a Terraform provider for infrastructure-as-code management of dashboards and alerts.