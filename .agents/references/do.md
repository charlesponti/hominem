# Do

Use this reference when the user is executing a plan — working through tasks, making changes, and moving toward a defined goal. Execution is not just doing things; it is doing the right thing next, verifying it worked, and surfacing problems before they compound.

## When to Enter Do Mode

- A plan exists and tasks are ready to execute
- The user says "let's start", "continue", or "do the next task"
- Work is in progress and needs to be driven forward
- A task needs to be delegated to a specialist

## Protocol

### 1. Orient Before Acting

Before touching anything, read the plan:

- What is the current state of progress?
- What is the next unblocked task?
- Are there any blockers that appeared since the last session?
- Has the goal shifted?

Never pick up a task without confirming it is still the right next move.

### 2. Confirm the Completion Criterion

Before starting a task, state how you will know it is done:

> "This task is complete when [specific, observable condition]."

If you cannot state this clearly, the task is not well enough defined to execute — go back to plan mode for that item.

### 3. Execute in Small, Verifiable Increments

Work through one task at a time:

1. Start the task
2. Make the change or produce the artifact
3. Verify it matches the acceptance criterion
4. Record the outcome (done / partially done / blocked)
5. Move to the next task

Avoid doing multiple tasks in a single step unless they are trivially related and both verifiable together.

### 4. Handle Blockers Immediately

If you discover a blocker during execution:

- **Stop** — do not guess around it or proceed with uncertainty
- **Name it** — state exactly what is blocked and why
- **Assess it** — is this resolvable now or does it need external input?
- **Options**:
  - Resolve it if you have enough context and authority
  - Defer it and mark the task as blocked, then move to the next unblocked task
  - Escalate it to the user with a clear description of what is needed

Never silently work around a blocker by making unvalidated assumptions.

### 5. Adapt to Discoveries

Execution reveals things planning cannot anticipate. When reality differs from the plan:

- Assess the impact before continuing
- If the change is small, note it and continue
- If the change invalidates a task or milestone, pause and revise the plan before proceeding
- If a new requirement surfaces, add it to the plan — do not absorb it silently

### 6. Delegate When Appropriate

Some tasks require specialist knowledge. When a task is outside your competence or would benefit from specialization:

- Name the right agent or domain expert
- Hand off with full context: goal, task, constraints, what has been done so far
- Do not approximate specialist work — a partial answer here creates debt

### 7. Report Progress

After completing a meaningful chunk of work, produce a brief progress update:

```
## Progress Update

**Done**
- [Task]: [what was produced / what changed]

**In Progress**
- [Task]: [current state]

**Blocked**
- [Task]: [what is blocking it and why]

**Next**
- [Task]
```

## Quality Checks

After each task is marked done:

- [ ] The acceptance criterion was met — not just "I think it works"
- [ ] No silent assumptions were made to get past an obstacle
- [ ] Blockers are named and visible
- [ ] The plan reflects the current state of the work
- [ ] No scope was added without updating the plan
