# Plan

Use this reference when the user needs to structure work before execution begins. A plan is not a wishlist — it is a contract between intent and action that prevents wasted effort, reveals hidden complexity early, and makes delegation and parallelization possible.

## When to Enter Plan Mode

- Work is non-trivial (more than one step or one file)
- The goal is not yet clearly defined
- Multiple people or agents will contribute
- The user asks "how should I approach this?" or "what's the plan?"

## Protocol

### 1. Understand the Goal

Before writing a single task, establish what success looks like:

- What is the desired end state?
- Who is the consumer / beneficiary of this work?
- What constraints exist (time, budget, compatibility, reversibility)?
- What is explicitly **out of scope**?

Do not proceed until the goal is unambiguous. If it is unclear, ask — do not assume.

### 2. Surface Hidden Requirements

Most requests contain implicit requirements. Expose them:

- What downstream systems depend on this?
- What must not break?
- What tests or standards govern the output?
- Are there legal, security, or compliance requirements?
- Does this deprecate or replace something that already exists?

### 3. Break Down the Work

Decompose the goal into tasks that are:

- **Independently completable** — one person or agent can do it without waiting on others in the same list
- **Verifiable** — you know when it is done without ambiguity
- **Scoped** — small enough to be done in a single focused session
- **Named clearly** — a task name should describe what is produced, not what is done

Group tasks into milestones if the work spans multiple sessions or has natural checkpoints.

### 4. Map Dependencies

For each task, determine:

- What must be finished before this can start?
- What does this task unblock?

Visualize the dependency graph mentally. Tasks with no predecessors can run in parallel — highlight them.

### 5. Identify Risks and Unknowns

A plan is incomplete without acknowledging what could go wrong:

- **Blockers** — external decisions or artifacts this work is waiting on
- **Unknowns** — things that need investigation before they can be planned
- **Risks** — things that could delay or break the plan if they go wrong

For each unknown, create an investigation task.

### 6. Document the Plan

Produce a plan document with:

```
## Goal
[Single sentence: what will be true when this work is done]

## Out of Scope
[Explicit list of what this work will NOT do]

## Tasks
- [ ] Task 1 (no blockers)
- [ ] Task 2 (no blockers)
- [ ] Task 3 (requires Task 1)
- [ ] Task 4 (requires Task 2, Task 3)

## Milestones
[If applicable: group tasks into phases with delivery checkpoints]

## Acceptance Criteria
[How will we know this is done? What does a reviewer check?]

## Open Questions
[Unresolved items that need answers before or during execution]

## Risks
[What could delay or break this?]
```

## Quality Checks

Before handing the plan off for execution:

- [ ] Every task is independently completable and verifiable
- [ ] The dependency graph is correct — no circular dependencies
- [ ] All hidden requirements have been surfaced
- [ ] Acceptance criteria are specific enough to be tested
- [ ] Open questions are assigned or scheduled for resolution
- [ ] The plan fits the user's time and scope constraints
