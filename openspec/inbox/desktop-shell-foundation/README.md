# Desktop Shell Foundation Proposal

This directory contains the complete OpenSpec proposal for integrating neko into the hominem monorepo and establishing a clean Electron desktop shell foundation.

## Files

- **`proposal.md`** - High-level what/why/how. Start here.
- **`design.md`** - Deep technical architecture, file structure, key decisions
- **`tasks.md`** - Detailed checklist of 27 tasks organized into 8 groups
- **`PROGRESS.md`** - Progress tracker (updated as work happens)
- **`SUMMARY.md`** - Executive summary for quick understanding

## Quick Navigation

### For Managers/Stakeholders
Read: **SUMMARY.md** (3 min)
- What problem we're solving
- Timeline (8-15 hours)
- Success criteria
- Risks

### For Architects
Read: **design.md** (15 min)
- Full architecture overview
- File structure
- Build pipeline
- Key decisions with rationale
- Dependency breakdown

### For Implementers
Follow: **tasks.md** (main reference)
- 27 tasks in 8 groups, sequenced for execution
- Success criteria for each task
- Time estimates
- Definition of Done

Track progress: **PROGRESS.md**
- Live checklist of all tasks
- Status tracking
- Quick reference

### Quick Reference
- **What**: Integrate neko as `apps/desktop` with optimized Electron shell
- **Why**: Multi-platform code sharing (web, mobile, desktop)
- **How**: Delete domain code, keep infrastructure, add design system
- **When**: Phase 1 = now, Phase 2 = after this change
- **Size**: 8-15 hours
- **Risk**: Medium (electron-vite integration, build performance)

## Phases

### Phase 1: Desktop Shell Foundation (THIS CHANGE)
- Migrate neko to monorepo
- Delete all tracker code
- Build minimal React shell
- Integrate with monorepo design system and tooling
- **Result**: Lean desktop app ready for logic in Phase 2

### Phase 2: Shared Logic Layer (FUTURE CHANGE)
- Create packages/tracker-logic/ with shared code
- Share components between apps/notes (web) and apps/desktop (desktop)
- Replace IPC with RPC client
- **Result**: One codebase powering web, mobile, and desktop

## Starting Implementation

1. Read **proposal.md** to understand the approach
2. Review **design.md** to understand the architecture
3. Follow **tasks.md** step by step
4. Update **PROGRESS.md** as you complete tasks
5. Run final smoke test (Task 8.2) when complete

## Status

**Phase 1**: Not started
**Phase 2**: Proposed (pending Phase 1 completion)

## Key Artifacts

- neko source: `~/Developer/neko/`
- Notes app (reference): `hominem/apps/notes/`
- Design system: `hominem/packages/ui/`

---

Ready to start? Begin with `proposal.md`.
