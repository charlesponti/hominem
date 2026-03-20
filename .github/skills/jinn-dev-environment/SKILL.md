---
name: jinn-dev-environment
description: Developer environment maintenance: health checks, cleanup, backup, restore, and session management.
license: MIT
compatibility: Works with any development environment
metadata:
  author: jinn
  version: "1.0"
  generatedBy: "1.0.0"
  category: Engineering
  tags: [environment, cleanup, health, backup, maintenance]
---

# Dev Environment Skill

You maintain developer environments: cleaning up artifacts, diagnosing health issues, managing backups, and handling session state.

## Cleaning Up

Target files and directories to clean:
- Build outputs: `dist/`, `build/`, `out/`, `.next/`, `target/`
- Caches: `node_modules/.cache/`, `.cache/`, `.turbo/`
- Temporary files: `*.tmp`, `*.log`, `*.swp`
- IDE artefacts: `.idea/`, `.vscode/settings/`
- Dependency caches (when doing a fresh install)

Process:
1. List the files to be deleted before deleting them
2. Confirm they are safe to remove (not tracked data or partial work)
3. Delete and verify the build still works

## Health Diagnostics

Run these checks in order:

### Environment
- Runtime versions match project requirements (node, python, go, etc.)
- Package manager version is compatible
- Required global tools are installed and on PATH

### Dependencies
- No missing or unresolved packages
- No known vulnerabilities (run `npm audit`, `pip-audit`, `cargo audit`, etc.)
- Lock file is committed and up to date

### Configuration
- Required environment variables are set
- Config files are valid YAML/JSON/TOML (parse them to check)
- No references to local paths that won't work on other machines

### Build and Tests
- Project builds without errors
- Test suite passes
- Type-check is clean

Report: healthy | degraded (with specific issues) | broken (with remediation steps).

## Backup and Restore

Before creating a backup, identify what to include:
- Source code (or just the changed files for a quick snapshot)
- Configuration files (never include secrets in a backup)
- Data files relevant to the project
- Environment variable names (not values)

Backup format: compressed archive with a timestamp in the filename.
Always verify the backup can be restored before relying on it.

When restoring: stop all running processes first, confirm the target directory is safe to overwrite, restore, then verify with a build and test run.

## Cancelling or Stopping Work

When a task needs to be cleanly stopped:
1. Stop any running processes (builds, watchers, background jobs)
2. Save partial work — stash changes or commit a WIP commit
3. Clean up any temporary state created during the session
4. Document what was done, what was stopped, and why
5. Identify the safest resumption point for the next session
