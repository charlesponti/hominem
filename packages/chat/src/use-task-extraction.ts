// Shared task-extraction flow for chat surfaces (mobile + web).
//
// The generic lifecycle machine lives in use-chat-lifecycle.ts; this hook
// wires it to the task extract → review → batch-create flow. Everything
// platform-specific — the RPC calls, cache invalidation, user-facing copy,
// and error presentation — is injected by the caller, so this module stays
// free of transport, i18n, and native dependencies.

import type { ArtifactType, SessionSource } from './capture-types';
import type { ChatMessageSnapshot } from './generation-schemas';
import { buildArtifactProposal } from './session-artifacts';
import { useChatLifecycle, type PendingReview } from './use-chat-lifecycle';

export interface ExtractedTask {
  title: string;
  description?: string;
}

export interface TaskProposalItem extends ExtractedTask {
  id: string;
}

export interface CreatedTaskRef {
  id: string;
  title: string;
  type: ArtifactType;
  updatedAt?: string;
}

export interface CreatedTasksResult {
  parent: CreatedTaskRef | null;
  tasks: CreatedTaskRef[];
}

export interface ExtractedTasksCreated {
  source: { kind: 'artifact'; id: string; type: ArtifactType; title: string };
  updatedAt?: string;
}

export interface TaskExtractionStrings {
  noTasksFoundTitle: string;
  noTasksFoundDescription: string;
  tasksFoundTitle: (count: number) => string;
  prepareReviewErrorTitle: string;
  saveContentErrorTitle: string;
  errorMessage: string;
}

export interface TaskExtractionReview extends PendingReview {
  items: TaskProposalItem[];
}

export interface UseTaskExtractionInput {
  // Normalized transcript messages — map the platform's message type to
  // `{ role, content }` before passing it in.
  messages: readonly Pick<ChatMessageSnapshot, 'role' | 'content'>[];
  source: SessionSource;
  extractTasks: (transcript: string) => Promise<{ tasks: ExtractedTask[] }>;
  createTasks: (tasks: ExtractedTask[]) => Promise<CreatedTasksResult>;
  onTasksChanged?: () => void;
  strings: TaskExtractionStrings;
  onErrorNotice: (title: string, message: string, error: unknown) => void;
  onContentCreated?: (content: ExtractedTasksCreated) => Promise<void>;
}

type ProposalStrings = Pick<
  TaskExtractionStrings,
  'noTasksFoundTitle' | 'noTasksFoundDescription' | 'tasksFoundTitle'
>;

export function buildExtractedTasksProposal(
  previewContent: string,
  tasks: ExtractedTask[],
  strings: ProposalStrings,
): TaskExtractionReview {
  return {
    proposedType: 'task_list' as const,
    proposedTitle:
      tasks.length === 0
        ? strings.noTasksFoundTitle
        : tasks.length === 1
          ? (tasks[0]?.title ?? strings.noTasksFoundTitle)
          : strings.tasksFoundTitle(tasks.length),
    proposedChanges:
      tasks.length === 0 ? [strings.noTasksFoundDescription] : tasks.map((task) => task.title),
    previewContent,
    items: tasks.map((task, index) => ({ ...task, id: `task-proposal-${index}` })),
  };
}

// This hook only sends task_list; other ArtifactType values remain in the
// shared lifecycle contract for other transforms.
export function useTaskExtraction({
  messages,
  source,
  extractTasks,
  createTasks,
  onTasksChanged,
  strings,
  onErrorNotice,
  onContentCreated,
}: UseTaskExtractionInput) {
  return useChatLifecycle<TaskExtractionReview>({
    messages,
    source,
    onTransform: async (type: ArtifactType): Promise<TaskExtractionReview> => {
      if (type === 'task_list') {
        const { previewContent } = buildArtifactProposal(messages, 'task_list');
        const { tasks } = await extractTasks(previewContent);
        return buildExtractedTasksProposal(previewContent, tasks, strings);
      }

      throw new Error(`Unsupported extraction type: ${type}`);
    },
    onAcceptReview: async (review): Promise<SessionSource> => {
      if (review.items) {
        if (review.items.length === 0) {
          throw new Error('No tasks to create');
        }

        const result = await createTasks(review.items.map(({ id: _id, ...task }) => task));
        onTasksChanged?.();
        const created = result.parent ?? result.tasks[0];
        if (!created) {
          throw new Error('No tasks to create');
        }
        if (onContentCreated) {
          await onContentCreated({
            source: {
              kind: 'artifact',
              id: created.id,
              title: created.title,
              type: created.type,
            },
            ...(created.updatedAt ? { updatedAt: created.updatedAt } : {}),
          });
        }

        return {
          kind: 'artifact' as const,
          id: created.id,
          type: created.type,
          title: created.title,
        };
      }

      // This hook only produces task_list reviews with items.
      throw new Error(`Unsupported review type: ${review.proposedType}`);
    },
    onRejectReview: async () => {},
    onError: (phase, error) => {
      onErrorNotice(
        phase === 'accept' ? strings.saveContentErrorTitle : strings.prepareReviewErrorTitle,
        strings.errorMessage,
        error,
      );
    },
  });
}
