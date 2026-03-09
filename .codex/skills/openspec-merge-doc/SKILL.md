---
name: openspec-merge-doc
description: Create a detailed, standardized post-merge project record for a completed OpenSpec change using the canonical table-first template, then retire superseded planning docs.
---

Create a single canonical merged document for a completed change.

**Input**: Change slug. If omitted, infer from context or ask for clarification.

**Required Output Style**

- Use `openspec/merged/_TEMPLATE.md` exactly as the baseline.
- Keep the doc detailed and generous, not a short recap.
- Prefer tables for metadata, decisions, validation, operations, and follow-ups.
- Include concrete evidence references (PRs, commits, workflow runs) where available.
- Keep prose concise but complete; avoid log dumping.

**Steps**

1. **Select completed change**

   Locate the change under:
   - `openspec/changes/archive/<change>/`
   - or completed active change directory if not yet archived

2. **Collect source artifacts**

   Read, when present:
   - `proposal.md`
   - `design.md`
   - `tasks.md`
   - progress docs
   - spec delta files

   Collect deployment/CI evidence from repository history and workflow runs when available.

3. **Write canonical merged document**

   Create:
   - `openspec/merged/YYYY-MM-DD-<change>.md`

   Fill every template section:
   - metadata
   - executive summary
   - scope
   - baseline vs target vs actual
   - decisions and tradeoffs
   - implementation footprint
   - migration/safety notes
   - validation evidence
   - operations and rollout
   - security/compliance impact
   - lessons learned
   - actionable follow-ups

4. **Retire superseded planning docs**

   Remove when the merge doc is complete:
   - `proposal.md`
   - `design.md`
   - `tasks.md`

   Keep:
   - capability/spec deltas for auditability
   - required compliance records

5. **Report completion**

   Provide:
   - created merge doc path
   - removed files
   - retained files and reason

**Guardrails**

- Do not process incomplete or active changes unless explicitly requested.
- Do not remove audit/compliance artifacts.
- Keep follow-ups specific with owner, priority, and due date.
- Keep naming consistent: `openspec/merged/YYYY-MM-DD-<change>.md`.
