## Why

The current OpenSpec layout splits current truth, working changes, and historical summaries across `changes`, `specs`, and `merged`. That makes it harder to understand where to look for active work versus final truth, and it creates two different historical homes that feel redundant.

## What Changes

- Reorganize OpenSpec around `openspec/inbox`, `openspec/done`, and `openspec/archive`.
- Move open changes into `inbox` and completed canonical artifacts into `done`.
- Keep raw archived change folders under `archive` for traceability only.
- Add compatibility shims so the existing `openspec` CLI and prompt/skill workflows continue to work while the repo adopts the cleaner structure.
- Update live repo instructions, prompts, and skills to point to the new layout and semantics.

## Capabilities

### Modified Capabilities
- `openspec-workflow`: The repository OpenSpec workflow now uses `inbox`, `done`, and `archive` as the primary mental model and filesystem layout.

## Impact

- Affected code: OpenSpec directory layout, repo workflow instructions, Codex skills, GitHub prompts, and active change guardrails.
- Affected systems: `openspec` CLI compatibility in this repo, archive flow, merged-doc flow, and proposal/apply documentation.
- Risk areas: breaking CLI expectations if compatibility shims are incomplete, stale path references in live instructions, and active change path drift during the move.
