---
visibility: private
slug: task-lists
title: task lists
type: note
updated: 2026-08-19T02:56:14.778766+00:00
status: draft
---

# Task Lists Feature

Task-list creation from chat exists to preserve a different kind of user intent from task creation. A task says "this conversation should become one unit of work." A task list says "this conversation should become a grouped set of work." That distinction matters even when the underlying conversation transcript is the same.

This feature is therefore not just a sibling of tasks. It is the place where the product began acknowledging a richer work shape than a single artifact, while still deliberately avoiding a full task-list domain redesign.

## Problem

### The Product Exposed a Task-list Action without a True Task-list Flow

Mobile chat already showed `Transform to task list` in the conversation actions. That gave users a reasonable expectation that the system could:

- distinguish a task list from a note
- distinguish a task list from a single task
- review and save the result as a task-list-shaped artifact

That expectation was not being met. The earlier flow still forced transformations through note-oriented behavior. So even though the action label said "task list," the system was not preserving that meaning through the review and save pipeline.

### Task Lists Revealed a Deeper Modeling Problem than Tasks

Tasks had a relatively straightforward path once persistence was added because the database already had a real `app.tasks` table. Task lists were harder because the system did not yet have:

- a `task_lists` table
- membership relations between a list and its items
- ordering semantics
- a broader management model for list-shaped work

That meant the task-list problem was never just "wire up the menu action." It was also "decide how to represent a first-class task-list intent before the relational model fully exists."

### The Main Risk Was Semantic Dishonesty

There were two obvious bad outcomes:

1. show `Transform to task list` and silently save a note
2. show `Transform to task list` and silently save a plain task while pretending that was equivalent

Both would damage trust because the user is choosing a structure, not just a label. A list implies grouping and organization, even if the first version of the feature does not yet model every downstream list behavior.

The real product challenge was finding a way to preserve that semantic distinction immediately without pretending the storage layer was already richer than it really was.

### The Old Actions UI Made Conceptual Distinctions Harder to Understand

Task lists are a more abstract feature than single tasks. A flat alert menu made that abstraction harder to communicate because every action looked like a sibling string with no real context.

Once the menu included search, debugging, transforms, and destructive archive behavior, the user needed more help understanding:

- which actions change the conversation state
- which actions generate new artifacts
- which actions are destructive
- how task list differs from task

That made the actions-surface redesign part of the feature rather than a separate visual cleanup.

## Explorations

### Exploration 1: Defer Task Lists until the Schema is Fully Ready

This was the most conservative option. We could have decided that task lists were too under-modeled to ship until the database supported them as a dedicated aggregate.

That would have reduced ambiguity, but it would also have forced the product to keep flattening all conversational work into single artifacts. The user need was already real: sometimes a conversation naturally resolves into multiple related tasks rather than one.

We did not choose this option because the application could preserve that intent before the relational model was fully specialized.

### Exploration 2: Treat Task Lists as Notes with Different Copy

This was the cheapest implementation path and the least acceptable one.

A note is free-form captured content. A task list implies structure and actionability. Using note persistence and note review semantics under a task-list label would erase the exact distinction the user was trying to express.

We rejected this early because it would have repeated the same semantic failure that existed for tasks, with even more confusion.

### Exploration 3: Invent a Full Task-list Domain Model inside This Feature

At the other extreme, we could have used this feature as the start of a larger work-management redesign:

- a dedicated `task_lists` table
- list-item membership edges
- ordered item collections
- richer list editing and lifecycle semantics

That would likely be the right long-term domain model. It was not the right scope for the immediate feature.

The problem we were solving was:

- "when a user chooses task list from chat, the app should preserve that intent truthfully"

The problem we were not trying to solve yet was:

- "define the full relational and product model for list management across the app"

Keeping those separate was an important scoping decision.

### Exploration 4: Treat Task Lists as First-class Application Artifacts Backed by Existing Task Storage

This is the path we chose.

The reasoning was straightforward:

- the user-facing distinction between `task` and `task_list` is valuable now
- the review flow can preserve that distinction now
- the transport contract can preserve that distinction now
- the storage layer can temporarily reuse existing task persistence while the deeper model remains future work

This is an incremental design, but it is not a fake design. It keeps the application honest about the user's intent while avoiding premature schema expansion.

### Exploration 5: Use the Actions-surface Redesign to Clarify Artifact Meaning

Task lists pushed harder on interaction design than tasks did because the concept is less obvious. A structured actions sheet could tell a clearer story than a native alert:

- `Transform` actions belong together
- `Archive` is destructive and belongs elsewhere
- supported artifact transforms are deliberate capabilities, not experimental labels

That made the actions redesign a real product tool for explaining the feature, not just a visual refinement.

### Exploration 6: Create a Dedicated Task-list RPC or Route

We also considered giving task lists their own separate API route and client contract.

We did not choose that because the current persistence behavior is intentionally narrow. At this stage, task lists and tasks both represent work-shaped artifacts created from chat. They can share the same creation contract as long as the `artifactType` remains explicit.

Adding a fully separate transport layer before the storage model diverged would have created ceremony without delivering clearer semantics.

## Solutions

### High-level Solution

We implemented task lists as a first-class artifact type in the chat application flow while deliberately keeping persistence simple.

In practice, that means:

1. the actions sheet can offer `Transform to task list`
2. proposal generation can build a `task_list` review object
3. the review UI can speak in task-list terms instead of note terms
4. the mobile controller can save the artifact through the shared tasks contract
5. the saved result can resolve back into chat state as a `task_list`

The key nuance is this:

- task lists are first-class in the application and interaction layers
- task lists are not yet first-class as a separate relational family in the database

That distinction is central to understanding how the feature works today.

### Solution Detail: Task Lists Are Part of the Enabled Artifact Vocabulary

The canonical artifact capability list includes `task_list` alongside `note` and `task`. The mobile controller derives transform options from that enabled set rather than inventing task-list visibility locally.

That matters because it keeps the feature aligned across layers:

- capability enables task lists
- action model shows task lists
- proposal generation supports task lists
- review preserves task-list semantics
- persistence accepts `artifactType: 'task_list'`

Once those layers all agree, the feature becomes coherent.

### Solution Detail: Proposal Generation Treats Task List as a Real Target

Proposal logic lives in `/Users/charlesponti/Developer/hominem/packages/domains/chat/src/session-artifacts.ts`.

The important function is:

- `buildArtifactProposal(messages, type)`

When `type` is `task_list`, the function:

- sets `proposedType: 'task_list'`
- derives a title from the first meaningful user message
- falls back to `Untitled task list` when needed
- describes the captured transcript as a task list in `proposedChanges`

This matters because the proposal object is what the review layer uses to explain the pending save. If `task_list` were not represented here, the review layer would be forced to either lie or invent semantics later in the flow.

### Solution Detail: the Mobile Controller Preserves Task-list Semantics through Accept

The orchestration point is `/Users/charlesponti/Developer/hominem/packages/platform/ui/src/components/chat/use-chat-controller.mobile.ts`.

For task lists, the controller now does the following:

1. receives the user's `task_list` transform selection
2. calls `buildArtifactProposal(messages, 'task_list')`
3. stores that proposal as the current pending review
4. renders the shared review experience
5. on accept, calls `client.tasks.create(…)` with `artifactType: 'task_list'`
6. converts the response back into a canonical artifact source of type `task_list`

This is the heart of the feature. The selected artifact type is no longer lost between the menu and persistence. It survives the entire flow.

### Solution Detail: the Review Surface Stays Shared, but Its Semantics Are Truthful

We did not build a task-list-specific review screen. The same review UI is used across artifact types.

That was the right choice because the structure of review is still shared:

- proposed artifact type
- proposed title
- change summary
- transcript preview
- accept and reject actions

What changed is that the content of the review is now type-aware. For task lists, the user sees task-list language, task-list labels, and a task-list save action. Shared structure is preserved without flattening meaning.

### Solution Detail: Persistence Intentionally Reuses the Task Repository

Persistence begins in `/Users/charlesponti/Developer/hominem/packages/core/db/src/services/tasks/task.repository.ts`.

The API route lives in `/Users/charlesponti/Developer/hominem/services/api/src/rpc/routes/tasks.ts`.

The RPC client lives in `/Users/charlesponti/Developer/hominem/packages/platform/rpc/src/domains/tasks.ts`.

The important current-state detail is:

- both `task` and `task_list` are created through `TaskRepository.create(…)`
- both are inserted into `app.tasks`
- the repository returns the requested `artifactType`
- that `artifactType` is application-level output data, not a separate database table

So today's design is:

- transport distinguishes `task` from `task_list`
- controller distinguishes `task` from `task_list`
- review distinguishes `task` from `task_list`
- database storage does not yet distinguish them with separate relational structures

This is deliberate. We wanted the application to preserve user intent immediately without claiming that the deeper work-domain model was already finished.

### Why Reusing Task Storage Was the Right Short-term Move

This compromise was acceptable for three reasons.

First, it solves the real user problem. A user asking to turn a conversation into a task list now gets task-list semantics in the live flow instead of being silently downgraded into a note.

Second, it minimizes schema churn while the broader task-list domain is still being defined. We do not yet know the final shape of:

- list membership
- ordering
- editing behavior
- cross-screen list management

Third, the boundary is explicit. The implementation and documentation both make it clear that task lists are first-class application artifacts backed by existing task storage for now.

That explicitness is what keeps the compromise honest.

### Solution Detail: the Transport Contract Stays Small and Expressive

The shared task creation contract accepts:

- `title`
- optional `description`
- `artifactType: 'task' | 'task_list'`

That is enough for the current feature because the chat transform flow needs to persist a work-shaped artifact and then restore the correct type in the session.

We deliberately did not introduce:

- a separate task-list route
- separate task-list DTOs
- specialized list-item creation contracts

The current contract is small, but it carries the most important semantic bit: the artifact type chosen by the user.

### Solution Detail: the Actions UI Helps Users Understand the Distinction

The actions model in `/Users/charlesponti/Developer/hominem/packages/platform/ui/src/components/chat/conversation-actions.model.ts` groups behavior into:

- `Conversation`
- `Transform`
- `Danger`

That grouping helps task lists specifically because it frames them as one of the supported transformation targets rather than as a random button buried among unrelated controls.

The result is a clearer mental model:

- search and debug affect the conversation
- transform creates a new artifact from the conversation
- archive is destructive and separate

That structure reduces ambiguity around what task-list creation actually means inside the product.

### End-to-end Runtime Flow

From the user's perspective, the task-list flow is:

1. open a conversation with enough context to be useful
2. open the actions sheet
3. choose `Transform to task list`
4. review the generated artifact
5. save it
6. watch the conversation resolve against the saved task-list source

From the system's perspective, the flow is:

1. the enabled artifact set includes `task_list`
2. `buildConversationActionsModel(…)` includes a task-list transform row
3. `useChatController(…)` receives the task-list transform selection
4. `buildArtifactProposal(messages, 'task_list')` creates the review object
5. the shared review UI renders task-list-specific labels and actions
6. accept/save calls `client.tasks.create({ artifactType: 'task_list', … })`
7. the RPC client posts to `/api/tasks`
8. the route validates input and calls `TaskRepository.create(…)`
9. the repository inserts a row into `app.tasks`
10. the returned record includes `artifactType: 'task_list'`
11. the controller emits a canonical session source with `type: 'task_list'`
12. the host updates the active chat state and related caches

That flow is the essence of the feature: user intent remains intact even though the storage model is still intentionally simple.

### What the Task-list Feature Does Not Solve yet

The feature does not yet provide a full task-list domain. Specifically, it does not yet define:

- a dedicated `task_lists` table
- explicit list-item membership
- ordering or sorting semantics within a list
- rich list editing workflows
- broader list management outside the chat transform entry point

Those are valid future directions, but they are not prerequisites for an honest first version of task-list creation from chat.

## Learnings

### Learning 1: Application Semantics Can Lead Relational Semantics, as Long as the Boundary is Explicit

Task lists taught us that the application can safely preserve a concept before the database fully specializes around it. The important condition is clarity.

If the system quietly reused task storage while pretending task lists were fully modeled, that would be risky. If the system reuses task storage while explicitly documenting the boundary, that is a reasonable incremental design.

### Learning 2: Preserving Intent is More Important than Achieving Immediate Schema Purity

The most urgent user-facing problem was not "the schema lacks a task-list aggregate." It was "choosing task list from chat does not result in task-list behavior."

By solving intent preservation first, we delivered real product value while keeping room for a deeper model later.

### Learning 3: Shared Flows Become More Valuable when Artifact Meaning is Truthful

Task lists reinforced the same core lesson as tasks: a shared lifecycle is only helpful if it carries real type semantics.

Once `task_list` became a true proposal type, a true save input, and a true resolved session source, the shared chat lifecycle started doing useful work instead of just looking generic on paper.

### Learning 4: UI Structure Reduces Conceptual Ambiguity

Task lists are inherently more conceptual than tasks. The actions-sheet redesign was therefore not incidental. Better grouping and interaction control made the feature easier to understand before the user even pressed save.

That is a useful product lesson: when a domain concept is abstract, interaction structure does part of the explanatory work.

### Learning 5: Narrow Transport Contracts Can Still Carry Important Semantics

The task-list feature did not need a sprawling API to be real. A small create contract with an explicit `artifactType` was enough to preserve meaning across the network boundary.

That is often the right shape for early domain growth: keep the contract small, but make the crucial semantic bit impossible to ignore.

### Learning 6: Incremental Truth is Better than Premature Completeness

We did not wait for a perfect task-list platform, and we did not fake task lists with note behavior. We chose the middle path:

- preserve the concept honestly now
- reuse the existing task persistence boundary for now
- leave room to deepen the relational model later

That is the main design lesson of this feature. The best first version is often the smallest system that can tell the truth.