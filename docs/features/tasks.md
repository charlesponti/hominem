---
status: draft
slug: tasks
title: tasks
visibility: private
updated: 2026-08-19T02:56:14.779552+00:00
type: note
---

# Tasks Feature

Task creation from chat exists to turn conversational intent into a durable unit of work without forcing the user to manually retype context somewhere else. The important part of the feature is not the presence of a menu item. It is the end-to-end preservation of meaning from the moment a user chooses `Transform to task` through review, persistence, and post-save chat state.

This document explains why the feature needed to exist, which alternatives we considered, how the implementation works today, and what we learned by building it.

## Problem

### The Product Advertised a Task Feature that Did Not Truly Exist

Mobile chat already exposed a `Transform to task` action in the conversation menu. From a user's perspective, that communicated a strong promise:

- the system understands the difference between a note and a task
- the system can extract actionable work from the conversation
- the result will be saved and reflected back into the product as a task

That promise was not being honored. The UI suggested task creation, but the underlying flow still treated every transform as a note-shaped operation. The product looked broader than the implementation really was.

### The System Had Generic Types, but Not Generic Behavior

At the domain level, the chat stack already knew about multiple artifact types. The lifecycle and shared types could represent:

- `note`
- `task`
- `task_list`
- `tracker`

That was the right abstraction surface. The problem was that the mobile caller was not actually preserving those semantics. The code looked generic from the outside, but the behavior was still specialized around note creation.

This is a dangerous kind of incompleteness because it hides behind clean type names. A reader could see `ArtifactType` and reasonably assume the full pipeline honored it, even though the runtime behavior did not.

### The Transform Flow Broke the User's Intent

For a feature like task creation, the core user intent is precise:

- "this conversation should become a task"

That intent has to survive several transitions:

1. the user chooses a transform action
2. the system builds a proposal
3. the user reviews what will be saved
4. the system persists the artifact
5. the surrounding chat updates to reflect the saved source

Before the implementation was completed, that chain broke almost immediately. The transform action implied `task`, but the review and save path still behaved like `note`. That meant the system did not just have a missing persistence hook. It had a semantic mismatch across the whole lifecycle.

### The Interaction Model Was Too Primitive for Richer Artifact Semantics

The original mobile actions menu used the native alert surface. That was fast to prototype, but it became a liability once the menu needed to communicate a richer domain model.

A task action is not just another random button in a stack of strings. Once the conversation menu started to include:

- message search
- debug toggles
- artifact transforms
- destructive archive behavior

the product needed more structure than a flat alert could comfortably provide. The UI needed grouping, better spacing, clear destructive treatment, and a stable relationship to the design system.

### The Persistence Boundary Was Missing

Even after deciding to treat tasks as real artifacts, the feature still needed a clean place to write them. We did not want mobile chat to invent ad hoc persistence logic, and we did not want the API route to quietly become the home of data access concerns.

The feature needed a proper persistence stack:

- a DB-level repository
- a thin API route
- a small RPC client contract
- a mobile controller that could call that contract without knowing storage details

Without that layering, the feature would work mechanically but would age badly.

## Explorations

### Exploration 1: Remove the Task Action and Postpone the Feature

The simplest response to the mismatch would have been to hide `Transform to task` until the full flow existed. That would have reduced user confusion quickly and honestly.

We did not choose that as the final direction because the codebase already had most of the architectural ingredients for a proper multi-artifact flow. The better move was to finish the feature truthfully rather than retreat from it.

This exploration still mattered because it clarified an important product rule: unsupported actions should never remain visible merely because they fit a future roadmap.

### Exploration 2: Keep Using a Note Proposal and Branch Only at save Time

This was the most tempting implementation shortcut. We could have left proposal generation alone, continued showing note-like review content, and only switched the persistence destination when the user pressed save.

That option was attractive because it minimized code movement. It was also wrong.

A task is not just a note with a different endpoint. The review step exists precisely to confirm the meaning of the artifact before persistence. If the proposal says "note" while the user chose "task," then the review layer is lying about what will happen next.

We rejected this because it would have preserved the core semantic bug:

- selected type: `task`
- reviewed type: effectively `note`
- saved type: some conditional branch

That mismatch would keep leaking into titles, previews, analytics, cache updates, and future behavior.

### Exploration 3: Build a Completely Separate Task-only Mobile Flow

At the opposite extreme, we considered giving tasks their own dedicated controller and review surface, separate from notes and separate from the existing chat lifecycle.

That would make every branch explicit, but it would also duplicate the strongest part of the current design:

- one transform lifecycle
- one review state model
- one concept of "pending artifact"
- one place that resolves the chat's source after save

We rejected this because the differences between note and task were meaningful, but not large enough to justify separate orchestration. The right architecture was a shared lifecycle with truthful type-specific behavior.

### Exploration 4: Put Task Persistence Directly in the API Service Layer

We also considered implementing task writes as a thin helper local to the API route. That would have gotten the feature working with minimal code.

We did not choose that because it violated the repository structure already used elsewhere in the codebase. Persistence logic belongs with the DB services, not inside a transport handler. If tasks were worth adding as a feature, they were worth adding with a real storage boundary.

This exploration led directly to the decision to place task persistence in `packages/core/db/src/services/tasks/task.repository.ts`.

### Exploration 5: Keep the Native Alert for Conversation Actions

The native alert menu was fine for a prototype, but tasks exposed its limits immediately. We needed the actions surface to do more than list labels:

- group related actions
- separate transformation from destructive operations
- reflect enabled capabilities
- fit the design language of the app

That pushed us toward a shared actions model and a custom mobile sheet rather than leaving the interface trapped inside a platform primitive.

### Exploration 6: Make Task Creation Broader than the Chat Feature

We briefly considered folding broader task-domain work into the same implementation:

- more task fields
- richer priority or status handling
- parent-child task relationships
- task management screens beyond the transform flow

We deliberately did not do that. The immediate problem was preserving chat-to-task intent. Expanding the scope too early would have blurred the feature boundary and slowed down the part users were actually waiting on.

## Solutions

### High-level Solution

We implemented tasks as a first-class artifact type in the mobile chat lifecycle and completed the supporting stack all the way down to persistence.

At a high level, the shipped solution has six parts:

1. The conversation actions surface only offers supported transforms and presents them in a structured, design-system-backed sheet.
2. Proposal generation now understands `task` as a real artifact target.
3. The mobile chat controller carries the selected type all the way through review and accept.
4. Task persistence lives in the DB package instead of being embedded in the route or the mobile client.
5. The API and RPC layers expose a narrow, typed task creation contract.
6. Post-save chat state updates immediately so the newly created task becomes part of the active session identity.

The important architectural outcome is that every layer now agrees on what the user asked the system to do.

### Solution Detail: the Action Surface Became Capability-driven

The conversation actions model lives in `/Users/charlesponti/Developer/hominem/packages/platform/ui/src/components/chat/conversation-actions.model.ts`.

This model is small, but it is one of the most important design decisions in the feature. It defines three sections:

- `Conversation`
- `Transform`
- `Danger`

The transform section is only present when transforms are actually available. Its rows are derived from enabled artifact types instead of being hardcoded independently from the rest of the system.

That means the actions UI is now a projection of product truth:

- if `task` is enabled, the sheet can show `Transform to task`
- if `task` is not enabled, the sheet should not imply otherwise

This removed the earlier gap where the UI could advertise capabilities the runtime did not really support.

### Solution Detail: Proposal Generation Became Artifact-aware

Proposal generation lives in `/Users/charlesponti/Developer/hominem/packages/domains/chat/src/session-artifacts.ts`.

The key function is `buildArtifactProposal(messages, type)`.

For tasks, it does three important things:

- sets `proposedType: 'task'`
- derives a title from the first meaningful user message, falling back to `Untitled task`
- builds review copy that says the conversation is being captured into a task

This matters because the proposal layer is where the system turns raw transcript content into an artifact the user can reason about. If this layer gets the semantics wrong, every downstream layer starts from the wrong premise.

The title strategy is intentionally simple:

- scan user messages in order
- normalize whitespace
- use the first non-empty user message as the seed
- truncate to the allowed title length

That approach keeps the proposal deterministic, cheap, and legible. It does not attempt to "summarize" the conversation with extra inference. It simply promotes the clearest available user-authored intent.

### Solution Detail: the Mobile Controller now Preserves the Selected Artifact Type

The orchestration layer lives in `/Users/charlesponti/Developer/hominem/packages/platform/ui/src/components/chat/use-chat-controller.mobile.ts`.

This is where the feature truly became complete.

The controller now:

1. collects the current conversation into normalized `proposalMessages`
2. derives `enabledTransforms` from `ENABLED_ARTIFACT_TYPES`
3. invokes `buildArtifactProposal(…)` with the selected transform type
4. enters the shared review state
5. persists according to `review.proposedType`
6. returns a canonical artifact source that the rest of the chat UI can use immediately

The critical difference from the old behavior is that the controller no longer treats `ArtifactType` as decorative metadata. It uses the type to decide what proposal is built and which mutation is executed when the user accepts the review.

For task review acceptance, the controller calls:

- `client.tasks.create({ artifactType, title, description })`

For note review acceptance, it still calls:

- `client.notes.create(…)`

That split is exactly what we wanted. The lifecycle remains shared. The meaning and save path remain type-specific.

### Solution Detail: Task Persistence Lives in the DB Package

Task persistence is defined in `/Users/charlesponti/Developer/hominem/packages/core/db/src/services/tasks/task.repository.ts`.

This repository owns the database write for task artifacts. Its `create(…)` method:

- inserts into `app.tasks`
- trims `title`
- trims `description`
- stores the new record with the current user as `owner_userid`
- returns a normalized `TaskRecord`

The repository also carries `artifactType` in its returned record. That detail is important because the chat flow needs to know whether the saved artifact should resolve back into the session as a `task` or `task_list`.

Placing this in the DB package was the correct decision for three reasons:

- it keeps storage logic out of UI code
- it keeps the API route thin
- it creates a reusable persistence primitive for future task-related features

### Solution Detail: the API and RPC Contracts Are Intentionally Narrow

The route lives in `/Users/charlesponti/Developer/hominem/services/api/src/rpc/routes/tasks.ts`.

The client lives in `/Users/charlesponti/Developer/hominem/packages/platform/rpc/src/domains/tasks.ts`.

The shared input and output types live in `/Users/charlesponti/Developer/hominem/packages/platform/rpc/src/types/tasks.types.ts`.

The contract is intentionally minimal:

- input: `title`, optional `description`, and `artifactType`
- output: the persisted task record

This narrow surface is a strength, not a limitation. The feature only needed task creation. By keeping the contract small, we avoided inventing a larger task API before the broader product requirements were clear.

The route's responsibility is deliberately modest:

1. validate the input
2. get the authenticated `userId`
3. call `TaskRepository.create(…)`
4. return the typed result

That preserves clean layering. The route transports; the repository persists; the controller orchestrates.

### Solution Detail: the Feature Completes with Source Resolution and Cache Updates

Saving a task is only part of the user experience. The surrounding chat has to reflect the new artifact immediately, or the feature feels half-finished.

The mobile controller uses `onArtifactCreated` to hand the host app a canonical source object:

- `kind: 'artifact'`
- `id`
- `title`
- `type: 'task'`

That source is then used to update session identity and related caches so the chat header and surrounding UI reflect the newly created task without waiting for a full refetch.

This is easy to underestimate, but it is one of the most important quality details in the feature. Users judge the completeness of a workflow by what the interface does right after success.

### End-to-end Runtime Flow

From the user's perspective, the flow now looks like this:

1. open a conversation with meaningful content
2. open the conversation actions sheet
3. choose `Transform to task`
4. review the generated task proposal
5. save the task
6. see the conversation resolve against the saved task source

From the system's perspective, the flow is:

1. `buildConversationActionsModel(…)` includes the task transform action
2. `useChatController(…)` receives the transform choice
3. `buildArtifactProposal(messages, 'task')` creates a task proposal
4. the shared review UI renders task-specific labels and title
5. accept/save calls `client.tasks.create(…)`
6. the RPC client posts to `/api/tasks`
7. the API route validates and delegates to `TaskRepository.create(…)`
8. the repository inserts into `app.tasks`
9. the created record is returned up the stack
10. the controller emits a canonical task source to the host
11. the chat state updates to reflect the saved artifact

That is the full feature. Everything else is just support for keeping those steps truthful and stable.

### What the Task Feature Does Not Try to Solve

The current feature is deliberately focused. It does not attempt to solve the entire task domain.

It does not currently add:

- advanced task editing
- list membership or ordering
- expanded task metadata beyond the current schema fields
- a separate task management workflow outside the transform flow

That restraint was intentional. The goal was to make task transformation honest and complete, not to front-load an entire work-management subsystem.

## Learnings

### Learning 1: Feature Completeness is Semantic, Not just Mechanical

A feature is not complete because a button exists, nor because a database write happens somewhere. It is complete when the user's intent survives every stage of the flow.

Tasks forced us to hold ourselves to that standard. Once we did, the gaps became obvious and the correct implementation path became much clearer.

### Learning 2: Generic Abstractions Only Help if Callers Honor Them Truthfully

The codebase already had a multi-artifact vocabulary. That did not automatically make the behavior multi-artifact.

The real lesson was that abstraction surfaces only earn their value when the calling layers carry the same semantics all the way through runtime. Otherwise they become a polite fiction.

### Learning 3: Interaction Design and Domain Design Are Coupled

We initially could have treated this as a persistence-only feature. In practice, task support also required redesigning the actions surface.

That coupling is healthy. As product meaning becomes richer, the UI needs more structure to communicate it. The old alert menu was not "ugly but acceptable." It was structurally too weak for the semantics the product needed to carry.

### Learning 4: Repositories Make Feature Growth Safer

Putting task writes in the DB package was not just an organizational preference. It makes the feature easier to extend later because the storage boundary is explicit and reusable.

If task persistence had lived in the route or the mobile controller, every future task change would have started from a muddier architecture.

### Learning 5: Post-save Coherence is Part of the Feature

Users do not separate "artifact creation" from "the rest of the UI noticing." They experience both as one event.

That is why source resolution and cache synchronization are not nice-to-have polish. They are part of the feature's core correctness.

### Learning 6: Honest Scope Beats Premature Domain Expansion

We could have broadened this work into a larger task initiative. We did not.

The better decision was to solve the actual problem in front of us:

- make `Transform to task` real
- make it consistent
- make it persist correctly
- make the chat reflect the saved result immediately

That narrower, truthful scope delivered a better feature than a half-started "task platform" would have.