## 1. Workflow Contract

- [x] 1.1 Update the live `openspec-workflow` spec and related guidance to make `openspec/specs` the only completed OpenSpec source of truth
- [x] 1.2 Remove live references that instruct users or agents to keep or consult `openspec/archive` or `openspec/merged`

## 2. Repository Cleanup

- [x] 2.1 Delete the existing `openspec/archive` tree from the repository
- [x] 2.2 Delete the existing `openspec/merged` tree from the repository
- [x] 2.3 Delete the legacy top-level `specs/` planning tree from the repository
- [x] 2.4 Update any remaining OpenSpec indexes or docs so the filesystem layout matches the specs-only model

## 3. Verification

- [x] 3.1 Verify `openspec list --json` still reports open changes correctly after the cleanup
- [x] 3.2 Review the repo for stale `openspec/archive`, `openspec/merged`, or legacy top-level `specs/` references and resolve any remaining live-path mismatches
