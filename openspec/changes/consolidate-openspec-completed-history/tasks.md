## 1. Workflow Contract

- [x] 1.1 Update the live `openspec-workflow` spec and related guidance to make `openspec/specs` the only completed OpenSpec source of truth
- [x] 1.2 Remove live references that instruct users or agents to keep or consult `openspec/archive` or `openspec/merged`

## 2. Repository Cleanup

- [x] 2.1 Delete the existing `openspec/archive` tree from the repository
- [x] 2.2 Delete the existing `openspec/merged` tree from the repository
- [x] 2.3 Delete the legacy top-level `specs/` planning tree from the repository
- [x] 2.4 Migrate surviving `docs/plans` documents into `openspec/changes`
- [x] 2.5 Delete the legacy `docs/plans` planning tree from the repository
- [x] 2.6 Update any remaining OpenSpec indexes or docs so the filesystem layout matches the specs-only model
- [x] 2.7 Consolidate overlapping auth documents under `docs` into one canonical current reference
- [x] 2.8 Consolidate `docs/docker/*` into one canonical `docker.instructions.md` file and remove the redundant Docker docs
- [x] 2.9 Consolidate overlapping root setup and deployment docs into canonical `setup.instructions.md` and `deployment.instructions.md` files
- [x] 2.10 Rename the generic design-system troubleshooting doc to a scoped path and remove the superseded setup/deployment duplicates
- [x] 2.11 Move the remaining repo-wide instructional docs into `.github/instructions` and merge duplicated guidance into the existing instruction set
- [x] 2.12 Delete the remaining stale root `docs/` analysis, brainstorm, and template files that no longer belong to OpenSpec, service-local docs, or the instruction set
- [x] 2.13 Delete the root `docs/` directory after migrating or removing its remaining contents
- [x] 2.14 Convert the current `.github/instructions` guidance bodies into canonical `.github/skills` entries
- [x] 2.15 Add matching `.codex/skills` wrappers that point at the canonical GitHub skill bodies
- [x] 2.16 Reduce `.github/instructions` files to minimal `applyTo` dispatchers that route to the correct skill
- [x] 2.17 Remove `.github/instructions` entirely and repoint all remaining repo guidance to the skill layer

## 3. Verification

- [x] 3.1 Verify `openspec list --json` still reports open changes correctly after the cleanup
- [x] 3.2 Review the repo for stale `openspec/archive`, `openspec/merged`, legacy top-level `specs/`, or `docs/plans` references and resolve any remaining live-path mismatches
- [x] 3.3 Review the repo for stale references to superseded auth documentation paths
- [x] 3.4 Review the repo for stale references to superseded Docker documentation paths
- [x] 3.5 Review the repo for stale references to superseded setup, deployment, or troubleshooting documentation paths
- [x] 3.6 Review the repo for stale references to the removed root `docs/` files and confirm the surviving instruction paths are the only repo-wide source of documentation guidance
- [x] 3.7 Verify the converted instruction files still provide complete path coverage while the skill layer becomes the canonical source of repo-wide guidance
- [x] 3.8 Review the repo for stale `.github/instructions` references and confirm skills are the only surviving repo-wide guidance layer
