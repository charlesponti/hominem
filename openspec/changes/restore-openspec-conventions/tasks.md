## 1. Activate And Repoint OpenSpec Paths

- [x] 1.1 Update `openspec/ACTIVE_CHANGE.md` to point at `restore-openspec-conventions`
- [x] 1.2 Move canonical spec files from `openspec/done/specs` back into `openspec/specs`
- [x] 1.3 Move merged record files from `openspec/done/records` back into `openspec/merged`

## 2. Restore Standard Open Change Layout

- [x] 2.1 Move open changes from `openspec/inbox` back into `openspec/changes`
- [x] 2.2 Remove the temporary `openspec/inbox` and `openspec/done` layout artifacts after the move
- [x] 2.3 Ensure `openspec/specs`, `openspec/merged`, and `openspec/changes` are real directories, not compatibility symlinks

## 3. Update Live Guidance And Verify

- [x] 3.1 Update live OpenSpec docs and indexes to reference `changes`, `specs`, and `merged`
- [x] 3.2 Verify the archived `openspec-refactor` record and canonical `openspec-workflow` spec still resolve correctly after relocation
- [x] 3.3 Run `openspec list --json` and confirm the restored standard layout works
