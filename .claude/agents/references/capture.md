# Capture

Use this reference when the user wants to record what was learned from a session, project, or incident — and make that knowledge useful to the next person or the next time. Capture is not a formality; it is how teams get smarter over time instead of repeating the same mistakes.

## When to Enter Capture Mode

- A project, sprint, or significant session just ended
- An incident or unexpected failure was resolved
- A non-obvious decision was made that future contributors will encounter
- A long investigation just concluded and the findings shouldn't be lost
- The user says "let's write a retro" or "document what we learned"

## Protocol

### 1. Establish Scope

Before capturing anything, agree on what is being captured:

- What time period or body of work does this cover?
- Who was involved?
- What was the goal? What actually happened?

### 2. Gather Raw Material

Pull together the honest account of the work:

- What did we set out to do?
- What did we actually do?
- What surprised us?
- What took longer than expected, and why?
- What decisions had unexpected consequences?
- Where did we get stuck, and how did we get unstuck?

Capture mode is not a highlight reel. It must include the uncomfortable things — the misestimates, the wrong turns, the things that almost worked.

### 3. Derive Learnings

Transform raw observations into reusable knowledge:

#### What Went Well
Document the things that worked — not to congratulate, but to make them repeatable:

- What processes, tools, or patterns saved time or prevented errors?
- What decisions proved correct in hindsight?
- What should be done the same way next time?

#### What Didn't Work
Document failures and friction honestly:

- What slowed us down?
- What did we have to redo, and why?
- What did we assume that turned out to be wrong?
- What gaps in our process or knowledge were exposed?

Be specific about root causes, not just symptoms. "It took too long" is not a learning. "We underestimated the time because we didn't account for X" is.

#### What to Change
For each "what didn't work", identify a specific, actionable change:

- A process tweak
- A convention to adopt
- A tool to add or remove
- A habit to build
- An assumption to challenge earlier

Changes that are vague ("communicate better") will never be made. Changes that are specific ("add a dependency mapping step before starting any work touching the auth layer") can be.

#### Key Decisions
Record the rationale for significant decisions made during the work:

- What was decided?
- What were the alternatives considered?
- Why was this option chosen?
- What are the known tradeoffs?
- Under what conditions would we revisit this?

This is the single highest-value artifact of capture mode. Six months from now, someone will encounter the decision and not understand why. This document is the answer.

### 4. Format the Output

Write capture documents that people will actually read:

- **Short** — say the important thing, then stop
- **Indexed** — use section headers so readers can skip to what they need
- **Active voice** — "we underestimated X" not "X was underestimated"
- **Numbered specifics** — name files, tools, and systems; don't be abstract

#### Capture Document Format

```
## Context
[What was this work? What was the goal? When did it happen?]

## What Went Well
- [observation]: [why it worked / what made it effective]

## What Didn't Work
- [observation]: [root cause, not just symptom]

## Changes to Make
- [specific action]: [what it addresses]

## Key Decisions

### [Decision Title]
- **What was decided**: [outcome]
- **Alternatives considered**: [list]
- **Rationale**: [why this option]
- **Tradeoffs**: [what we gave up or accepted]
- **Revisit when**: [conditions that would prompt reconsideration]

## Open Items
[Unresolved questions or follow-up work that came out of the retro]
```

### 5. Store and Surface the Output

A capture document only has value if people can find it:

- Store it where relevant future work will be done (near the code, in the project space, in a learnings index)
- Link it from the work item or PR that relates to it
- If it surfaces a broadly applicable pattern, promote it to a team standard

## Quality Checks

Before closing a capture session:

- [ ] Failures are named specifically, not softened
- [ ] Each "what didn't work" has a corresponding "what to change"
- [ ] Key decisions include rationale, not just outcomes
- [ ] The document is short enough to be read in under five minutes
- [ ] It is stored somewhere it will be found, not just written and forgotten
