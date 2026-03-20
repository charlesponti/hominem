---
name: jinn-review
description: Use after a deliverable is complete to assess whether work is ready to move forward. Evaluates correctness, completeness, quality, security, performance, and standards. Produces an approve / approve-with-changes / needs-rework recommendation.
license: MIT
compatibility: Use after implementation is complete, before handoff, merge, or deployment.
metadata:
  author: jinn
  version: "1.0"
  generatedBy: "1.0.0"
  category: Workflow
  tags: [workflow, review, quality, post-completion]
when:
  - a deliverable is complete and ready for sign-off
  - a milestone has been reached and work should be reviewed before continuing
  - before handing off, deploying, or merging
  - after jinn-apply completes a set of sub-issues
applicability:
  - Use to formally assess whether completed work meets its acceptance criteria
  - Use to surface must-fix issues before the work moves downstream
termination:
  - All evaluation dimensions covered
  - Findings prioritised as must-fix, should-fix, or consider
  - Clear recommendation delivered: approve | approve with changes | needs rework
outputs:
  - Review report with recommendation
  - Prioritised findings list
  - Updated Linear issue status (Done or back to In Progress) via mcp_linear_save_issue
---

Answer: *is this done well enough to move forward?*

## Steps

### 1. Read the plan
- Use `mcp_linear_get_issue` (+ `includeRelations: true`) to retrieve the issue description and acceptance criteria.
- Identify the goal and what "done" means for this work.

### 2. Examine the output
- Read the relevant files, diffs, or artifacts produced.
- Check whether the output matches what was promised.

### 3. Evaluate across dimensions
Weight each dimension by what matters most for this work:

| Dimension | Question |
|---|---|
| **Correctness** | Does it do what it is supposed to do? |
| **Completeness** | Are all acceptance criteria satisfied? |
| **Quality** | Is it well-made, readable, and maintainable? |
| **Security** | Are there vulnerabilities or unsafe patterns? |
| **Performance** | Are there obvious bottlenecks or wasted resources? |
| **Standards** | Does it conform to project conventions? |

### 4. Prioritise findings

- **Must fix** — blocks approval; cannot move forward without this
- **Should fix** — significant issue; address before closing but not a blocker today
- **Consider** — improvement that would add value but is not required

### 5. Deliver the review report

```
## Review: [approve | approve with changes | needs rework]

**Summary**
[2–3 sentences: what was reviewed and the overall finding]

**Findings**

### Must Fix
- [specific issue]: [why it matters] — [what to do]

### Should Fix
- [specific issue]: [why it matters] — [what to do]

### Consider
- [suggestion]: [rationale]

**Recommendation**
[Clear direction: what happens next and who owns it]
```

### 6. Update Linear
- If approved: use `mcp_linear_save_issue` to transition the issue to **Done** and add the review summary as a comment via `mcp_linear_save_comment`.
- If needs rework: add a comment with the must-fix list and leave the issue In Progress.
- If approve with changes: add the should-fix list as a comment and transition to Done only after changes are confirmed.

## Review Principles
- **Review against the goal, not your preferences.** The question is whether the work achieves its stated intent.
- **Be specific.** Name the exact location, the exact problem, and the exact fix.
- **Prioritise ruthlessly.** A review with ten must-fixes is broken. If everything is urgent, nothing is.
- **Recommend, don't just report.** A review that surfaces problems without a path forward leaves the recipient stuck.
- **Acknowledge what works.** A review that only criticises misses context and demotivates iterative improvement.

## Quality Checks
Before delivering the review:
- [ ] Findings are specific and actionable, not vague
- [ ] Must-fix items are genuinely blocking
- [ ] The recommendation is clear and unambiguous
- [ ] The report distinguishes between fact and opinion
- [ ] Nothing important was omitted to avoid an uncomfortable conversation
