import type { ChatMessageItem } from '@hominem/chat';
import type { PendingReview } from '@hominem/chat/react';
import { useChatLifecycle } from '@hominem/chat/react';
import { buildArtifactProposal } from '@hominem/chat/ui';
import { useApiClient } from '@hominem/rpc/react';
import type { ArtifactType, CaptureLifecycleState, SessionSource } from '@hominem/rpc/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { useCallback, useMemo, useReducer, useRef, type RefObject } from 'react';
import { Alert, Share, TextInput } from 'react-native';

import {
  hasNonEmptyListData,
  resolveRestoredQueryState,
} from '../services/query/restored-query-state';
import t from '../translations';

export interface ChatServices {
  useChatMessages: (args: { chatId: string }) => {
    error: Error | null;
    isFetching: boolean;
    isPending: boolean;
    refetch: () => Promise<unknown>;
    data: ChatMessageItem[] | undefined;
  };
  useArchiveChat: (args: { chatId: string; onSuccess: () => void }) => {
    mutate: () => void;
    isPending: boolean;
  };
  chatKeys: { messages: (chatId: string) => readonly unknown[] };
  onNoteCreated?: () => Promise<void>;
  onContentCreated?: (content: {
    source: { kind: 'artifact'; id: string; type: Exclude<ArtifactType, 'tracker'>; title: string };
    updatedAt?: string;
  }) => Promise<void>;
}

interface MobileUiState {
  showDebug: boolean;
  showSearch: boolean;
  showActionsMenu: boolean;
  searchQuery: string;
}

type MobileUiAction =
  | { type: 'toggle-debug' }
  | { type: 'open-search' }
  | { type: 'close-search' }
  | { type: 'open-actions' }
  | { type: 'close-actions' }
  | { type: 'set-search-query'; searchQuery: string };

const initialMobileUiState: MobileUiState = {
  showDebug: false,
  showSearch: false,
  showActionsMenu: false,
  searchQuery: '',
};

function mobileUiReducer(state: MobileUiState, action: MobileUiAction): MobileUiState {
  switch (action.type) {
    case 'toggle-debug':
      return { ...state, showDebug: !state.showDebug };
    case 'open-search':
      return { ...state, showSearch: true };
    case 'close-search':
      return { ...state, showSearch: false, searchQuery: '' };
    case 'open-actions':
      return { ...state, showActionsMenu: true };
    case 'close-actions':
      return { ...state, showActionsMenu: false };
    case 'set-search-query':
      return { ...state, searchQuery: action.searchQuery };
  }
}

interface UseChatControllerInput {
  chatId: string;
  onChatArchive: () => void;
  source: SessionSource;
  services: ChatServices;
}

interface UseChatControllerResult {
  displayMessages: ChatMessageItem[];
  handleAcceptReview: () => Promise<void>;
  handleArchiveChat: () => void;
  handleCloseSearch: () => void;
  handleCopyMessage: (message: ChatMessageItem) => void;
  handleOpenMenu: () => void;
  handleCloseMenu: () => void;
  handleToggleDebug: () => void;
  handleTransformFromMenu: (type: ArtifactType) => void;
  handleOpenSearch: () => void;
  handleRejectReview: () => Promise<void>;
  handleSearchQueryChange: (query: string) => void;
  handleShareMessage: (message: ChatMessageItem) => Promise<void>;
  canTransform: boolean;
  isMessagesLoading: boolean;
  isMessagesRefreshing: boolean;
  isArchiving: boolean;
  isReviewVisible: boolean;
  messagesError: Error | null;
  showActionsMenu: boolean;
  lifecycleState: CaptureLifecycleState;
  pendingReview: PendingReview | null;
  refetchMessages: () => Promise<unknown>;
  resolvedSource: SessionSource;
  searchInputRef: RefObject<TextInput | null>;
  searchQuery: string;
  showDebug: boolean;
  showSearch: boolean;
  statusCopy: string;
}

export function useChatController({
  chatId,
  onChatArchive,
  source,
  services,
}: UseChatControllerInput): UseChatControllerResult {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const {
    error: messagesError,
    isFetching: isMessagesFetching,
    isPending: isMessagesPending,
    refetch: refetchMessages,
    data: messages,
  } = services.useChatMessages({ chatId });
  const { mutate: archiveChat, isPending: isArchiving } = services.useArchiveChat({
    chatId,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: services.chatKeys.messages(chatId) });
      onChatArchive();
    },
  });
  const [uiState, dispatch] = useReducer(mobileUiReducer, initialMobileUiState);
  const searchInputRef = useRef<TextInput | null>(null);

  const formattedMessages = useMemo(
    () => (messages && messages.length > 0 ? messages : []),
    [messages],
  );
  const messagesState = resolveRestoredQueryState({
    data: messages,
    isPending: isMessagesPending,
    isFetching: isMessagesFetching,
    hasUsableData: hasNonEmptyListData,
  });

  const displayMessages = useMemo(() => {
    if (!uiState.searchQuery.trim()) return formattedMessages;
    const lower = uiState.searchQuery.toLowerCase();
    return formattedMessages.filter((message) => message.message?.toLowerCase().includes(lower));
  }, [formattedMessages, uiState.searchQuery]);

  const proposalMessages = useMemo(
    () => formattedMessages.map((message) => ({ role: message.role, content: message.message })),
    [formattedMessages],
  );

  const createTask = useMutation({
    mutationKey: ['chat-task', chatId],
    mutationFn: async (review: {
      proposedType: Exclude<ArtifactType, 'note' | 'tracker'>;
      proposedTitle: string;
      previewContent: string;
    }) => {
      const res = await client.api.tasks.$post({
        json: {
          artifactType: review.proposedType,
          description: review.previewContent,
          title: review.proposedTitle,
        },
      });
      return res.json();
    },
    onSuccess: async (task) => {
      if (services.onContentCreated) {
        await services.onContentCreated({
          source: {
            kind: 'artifact',
            id: task.id,
            title: task.title,
            type: task.artifactType,
          },
          updatedAt: task.updatedAt,
        });
      }
    },
  });

  const createNote = useMutation({
    mutationKey: ['chat-note', chatId],
    mutationFn: async (review: { proposedTitle: string; previewContent: string }) => {
      const res = await client.api.notes.$post({
        json: { content: review.previewContent, title: review.proposedTitle, type: 'note' },
      });
      return res.json();
    },
    onSuccess: async () => {
      if (services.onNoteCreated) {
        await services.onNoteCreated();
      }
    },
  });

  const extractTasksFromTranscript = useMutation({
    mutationKey: ['chat-task-extract', chatId],
    mutationFn: async (input: { transcript: string }) => {
      const res = await client.api.tasks.extract.$post({ json: input });
      const json = await res.json();
      if ('error' in json) {
        throw new Error(json.error);
      }
      return json;
    },
  });

  const createTasksBatch = useMutation({
    mutationKey: ['chat-task-batch', chatId],
    mutationFn: async (input: { tasks: { title: string; description?: string }[] }) => {
      const res = await client.api.tasks.batch.$post({ json: input });
      return res.json();
    },
  });

  const {
    lifecycleState,
    pendingReview,
    resolvedSource,
    canTransform,
    statusCopy,
    isReviewVisible,
    handleTransform,
    handleAcceptReview,
    handleRejectReview,
  } = useChatLifecycle({
    messages: proposalMessages,
    source,
    onTransform: async (type: ArtifactType) => {
      if (type === 'task_list') {
        const { previewContent } = buildArtifactProposal(proposalMessages, 'task_list');
        const { tasks } = await extractTasksFromTranscript.mutateAsync({
          transcript: previewContent,
        });
        return {
          proposedType: 'task_list' as const,
          proposedTitle:
            tasks.length === 0
              ? t.chat.actions.noTasksFoundTitle
              : tasks.length === 1
                ? tasks[0].title
                : t.chat.actions.tasksFoundTitle(tasks.length),
          proposedChanges:
            tasks.length === 0
              ? [t.chat.actions.noTasksFoundDescription]
              : tasks.map((task) => task.title),
          previewContent,
          items: tasks,
        };
      }

      return buildArtifactProposal(
        proposalMessages,
        type === 'tracker' ? 'note' : (type as 'note' | 'task'),
      );
    },
    onAcceptReview: async (review) => {
      if (review.items) {
        if (review.items.length === 0) {
          throw new Error('No tasks to create');
        }

        const result = await createTasksBatch.mutateAsync({ tasks: review.items });
        const created = result.parent ?? result.tasks[0];
        if (services.onContentCreated) {
          await services.onContentCreated({
            source: {
              kind: 'artifact',
              id: created.id,
              title: created.title,
              type: created.artifactType,
            },
            updatedAt: created.updatedAt,
          });
        }

        return {
          kind: 'artifact' as const,
          id: created.id,
          type: created.artifactType,
          title: created.title,
        };
      }

      if (review.proposedType === 'note') {
        const note = await createNote.mutateAsync(review);
        if (services.onContentCreated) {
          await services.onContentCreated({
            source: {
              kind: 'artifact',
              id: note.id,
              title: note.title || review.proposedTitle,
              type: 'note',
            },
            updatedAt: note.updatedAt,
          });
        }
        return {
          kind: 'artifact' as const,
          id: note.id,
          type: 'note' as const,
          title: note.title || review.proposedTitle,
        };
      }

      if (review.proposedType !== 'task' && review.proposedType !== 'task_list') {
        const note = await createNote.mutateAsync({
          proposedTitle: review.proposedTitle,
          previewContent: review.previewContent,
        });
        return {
          kind: 'artifact' as const,
          id: note.id,
          type: 'note' as const,
          title: note.title || review.proposedTitle,
        };
      }

      const task = await createTask.mutateAsync({
        proposedTitle: review.proposedTitle,
        previewContent: review.previewContent,
        proposedType: review.proposedType,
      });
      return {
        kind: 'artifact' as const,
        id: task.id,
        type: review.proposedType,
        title: task.title,
      };
    },
    onRejectReview: async () => {},
    onError: (_phase, _error) => {
      Alert.alert(
        _phase === 'accept' ? 'Could not save content' : 'Could not prepare review',
        'Please try again.',
      );
    },
  });

  const handleArchiveChat = useCallback(() => {
    archiveChat();
  }, [archiveChat]);

  const handleCopyMessage = useCallback((copiedMessage: ChatMessageItem) => {
    const text = copiedMessage.message;
    if (!text) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    void Clipboard.setStringAsync(text).catch(() => {
      void Share.share({ message: text, title: 'Copy message' });
    });
  }, []);

  const handleShareMessage = useCallback(async (message: ChatMessageItem) => {
    const text = message.message;
    if (!text) return;
    const uri = `${FileSystem.cacheDirectory}message_${message.id}.txt`;
    await FileSystem.writeAsStringAsync(uri, text, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(uri, { mimeType: 'text/plain', UTI: 'public.plain-text' });
  }, []);

  const handleOpenSearch = useCallback(() => {
    dispatch({ type: 'open-search' });
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  }, []);

  const handleCloseSearch = useCallback(() => {
    dispatch({ type: 'close-search' });
  }, []);

  const handleSearchQueryChange = useCallback((searchQuery: string) => {
    dispatch({ type: 'set-search-query', searchQuery });
  }, []);

  const handleToggleDebug = useCallback(() => {
    dispatch({ type: 'toggle-debug' });
  }, []);

  const handleOpenMenu = useCallback(() => {
    dispatch({ type: 'open-actions' });
  }, []);

  const handleCloseMenu = useCallback(() => {
    dispatch({ type: 'close-actions' });
  }, []);

  const handleTransformFromMenu = useCallback(
    (type: ArtifactType) => {
      handleCloseMenu();
      void handleTransform(type);
    },
    [handleCloseMenu, handleTransform],
  );

  return {
    displayMessages,
    handleAcceptReview,
    handleArchiveChat,
    handleCloseSearch,
    handleCloseMenu,
    handleCopyMessage,
    handleOpenMenu,
    handleOpenSearch,
    handleRejectReview,
    handleSearchQueryChange,
    handleShareMessage,
    handleTransformFromMenu,
    handleToggleDebug,
    canTransform,
    isMessagesLoading: messagesState.isInitialLoading,
    isMessagesRefreshing: messagesState.isRefreshing,
    isArchiving,
    lifecycleState,
    messagesError,
    pendingReview,
    resolvedSource,
    refetchMessages,
    searchInputRef,
    searchQuery: uiState.searchQuery,
    showDebug: uiState.showDebug,
    showActionsMenu: uiState.showActionsMenu,
    showSearch: uiState.showSearch,
    statusCopy,
    isReviewVisible,
  };
}
