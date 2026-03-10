## 1. Layout Migration

- [x] 1.1 Create `openspec/inbox`, `openspec/done`, and `openspec/archive`
- [x] 1.2 Move open change folders into `openspec/inbox`
- [x] 1.3 Move archived change folders into `openspec/archive`
- [x] 1.4 Move canonical specs into `openspec/done/specs`
- [x] 1.5 Move merged records into `openspec/done/records`
- [x] 1.6 Recreate legacy `changes`, `specs`, and `merged` paths as compatibility symlinks

## 2. Workflow Docs

- [x] 2.1 Update `openspec/ACTIVE_CHANGE.md` and `openspec/NEXT_STEPS.md` for the new layout
- [x] 2.2 Update repo guardrails and live OpenSpec docs to point at `inbox`, `done`, and `archive`
- [x] 2.3 Update Codex skills and GitHub prompts that still describe the old structure
- [x] 2.4 Update live open-change documents that reference the old `openspec/inbox/...` paths

## 3. Validation

- [x] 3.1 Verify `openspec list --json` still returns open changes
- [x] 3.2 Verify `openspec list --specs --json` still returns canonical specs
- [x] 3.3 Search for stale live references to `openspec/archive`, `openspec/specs`, and `openspec/merged`
