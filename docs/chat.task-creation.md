# Task creation from chat

Turning a conversation into durable work is one shared flow, not two. A
transcript can resolve into a single task or a set of grouped tasks - the
distinction is a side effect of how many tasks are found, not a separate
product action the user picks up front.

## Entry point

Chat's conversation actions menu (`apps/omiro/components/chat/conversation-actions.model.ts`)
offers exactly two transforms: `note` ("Save as note") and `task_list`
("Create tasks"). There is no standalone "create one task" action - `task` as
an `ArtifactType` still exists (`packages/chat/src/capture-types.ts`) and can
be created directly through `POST /api/tasks`, but the chat transform surface
only ever proposes `task_list`.

## How "Create tasks" works

`apps/omiro/hooks/use-task-extraction.ts` backs the action, orchestrated
through `useChatLifecycle` (`@hominem/chat/react`):

1. **Extract** - the transcript is sent to `POST /api/tasks/extract`
   (`services/api/src/rpc/routes/tasks.ts`), which calls `extractTasks`
   (`@hominem/ai`, OpenRouter) with `TASK_EXTRACTION_PROMPT` and returns a
   list of `{ title }` drafts. Rate-limited (`ai-task-extract`, 20/min) and
   gated by the caller's monthly AI usage limit.
2. **Review** - the drafts render in the shared review surface
   (`ClassificationReview`, via `chat-review-overlay.tsx`) as a
   `task_list`-typed proposal; the user can accept or reject before anything
   is persisted.
3. **Create** - on accept, `POST /api/tasks/batch`
   (`CreateTaskBatchSchema`: 1-10 tasks, each title <=120 chars) persists the
   result:
   - **Exactly one task** -> a single row with `artifactType: 'task'`, no
     parent (`{ parent: null, tasks: [task] }`).
   - **More than one** -> `TaskRepository.createBatch` creates a parent row
     with `artifactType: 'task_list'` (title auto-derived as `${n} tasks`
     via `buildTaskListTitle`) plus child task rows under it via
     `parentTaskId`.

The hook then resolves a canonical `SessionSource` (`kind: 'artifact'`, the
created row's real `artifactType`) so the surrounding chat state updates
immediately - the user never sees the artifact type they were promised
("task list") diverge from what actually got saved.

### Recovery and submitted meaning

- **Preserve submitted meaning** - users should not lose the meaning of what
  they submitted even if secondary automation (like task extraction) fails.
  Preserve the raw transcript before any optional cleanup. If task extraction
  fails, show the transcript so the user can recover it and continue without
  losing the original content.

"Save as note" is a separate, unrelated path: `ChatScreen` intercepts that
menu item before it reaches `useTaskExtraction` and routes to
`chat-to-note-sheet.tsx` (an AI rewrite of the transcript into note content,
not a deterministic task extraction).

## Adjacent extraction paths

- `POST /api/tasks/voice` - same idea for a voice transcript
  (`extractVoiceTasks`), its own rate-limit bucket (`ai-task-voice`).
- `POST /api/tasks/parse` - time-block parsing for calendar scheduling
  (`extractTimeBlock`); unrelated to task creation.
- `POST /api/tasks` - direct single-task creation with the full scheduling
  field set (`dueAt`, `schedulingWindowStartAt`, `scheduledStartAt`,
  `participants`, ...) and an explicit `parentTaskId`/`artifactType`. This is
  the primitive the extraction flows build on, not itself reachable from
  chat.

## Current limitations

`task_list` is an application-level distinction, not a separate relational
family: a "list" is just a task row (`artifactType: 'task_list'`) with child
tasks pointing at it via `parentTaskId` on the shared `app.tasks` table. There
is no dedicated `task_lists` table, explicit ordering, or list-editing
workflow beyond what chat's create-tasks flow produces.