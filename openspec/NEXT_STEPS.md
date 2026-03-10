# OpenSpec Next Steps

Updated: 2026-03-10

## Current State

Active change selection:
- `openspec/ACTIVE_CHANGE.md` is set to `consolidate-openspec-completed-history`

Open changes discovered from `openspec list --json`:
- `consolidate-openspec-completed-history` (`0/6`, status: `in-progress`)
- `platform-observability-with-opentelemetry` (`0/20`, status: `in-progress`)

## Recommended Execution Order

1. Finish `consolidate-openspec-completed-history`.
2. Archive that change or reset `openspec/ACTIVE_CHANGE.md` when its implementation closes.
3. Activate `platform-observability-with-opentelemetry` before starting feature work there.

## Why This Order

- The active-change guardrail requires explicit activation before implementation work.
- Removing raw archive retention simplifies the completed-work model before more changes are archived.

## Immediate Actions

1. Finish `consolidate-openspec-completed-history`.
2. Activate the telemetry change if implementation should continue next.
3. Use `openspec list --json` as the source of truth for open-change discovery.

## Layout Reminder

- Open work lives in `openspec/changes`
- Completed canonical specs live in `openspec/specs`
