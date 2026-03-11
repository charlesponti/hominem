# OpenSpec Next Steps

Updated: 2026-03-10

## Current State

Active change selection:
- `openspec/ACTIVE_CHANGE.md` is currently unset (`active_change: none`)

Open changes discovered from `openspec list --json`:
- `assistant-thought-lifecycle-foundation` (`0/6`, status: `in-progress`)
- `assistant-thought-lifecycle` (`0/6`, status: `in-progress`)
- `ai-elements-adoption` (`0/6`, status: `in-progress`)
- `void-design-app-alignment` (`0/6`, status: `in-progress`)
- `platform-observability-with-opentelemetry` (`0/20`, status: `in-progress`)

## Recommended Execution Order

1. Select the single change that should be active next and update `openspec/ACTIVE_CHANGE.md`.
2. Keep implementation scoped to that change until it is archived or deliberately deactivated.
3. Use `openspec list --json` as the source of truth for the current open-change set.

## Why This Order

- The active-change guardrail requires an explicit active change before implementation work starts.
- The repo currently has multiple in-progress changes, so leaving the selector unset is safer than pointing at archived work.

## Immediate Actions

1. Choose one of the five open changes as the next active change.
2. Update `openspec/ACTIVE_CHANGE.md` before implementation starts.
3. Keep archived work in `openspec/changes/archive` and canonical completed capability specs in `openspec/specs`.

## Layout Reminder

- Open work lives in `openspec/changes`
- Archived changes live in `openspec/changes/archive`
- Completed canonical specs live in `openspec/specs`
