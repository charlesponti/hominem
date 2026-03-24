import { useChatLifecycle } from '@hominem/chat-services/react';
import type { ArtifactType } from '@hominem/chat-services/types';
import { buildNoteProposal } from '@hominem/chat-services/ui';
import { useApiClient } from '@hominem/rpc/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Alert, Platform, Share, type TextInput } from 'react-native';

import type { ChatMessageItem } from './chat.types';
import { loadMarkdown, type MarkdownComponent, type SessionSource } from './index.mobile';

// ─── Injectable services ──────────────────────────────────────────────────────

export interface ChatServices {
  useChatMessages: (args: { chatId: string }) => {
    isPending: boolean;
    data: ChatMessageItem[] | undefined;
  };
  useSendMessage: (args: { chatId: string }) => {
    sendChatMessage: (text: string) => Promise<unknown>;
    chatSendStatus: string;
  };
  useArchiveChat: (args: { chatId: string; onSuccess: () => void }) => {
    mutate: () => void;
    isPending: boolean;
  };
  chatKeys: { messages: (chatId: string) => readonly unknown[] };
  speech: { speakingId: string | null; speak: (id: string, text: string) => void };
  onNoteCreated?: () => Promise<void>;
}

// ─── Mobile-only UI state ─────────────────────────────────────────────────────

interface MobileUiState {
  showDebug: boolean;
  showSearch: boolean;
  searchQuery: string;
}

type MobileUiAction =
  | { type: 'toggle-debug' }
  | { type: 'open-search' }
  | { type: 'close-search' }
  | { type: 'set-search-query'; searchQuery: string };

const initialMobileUiState: MobileUiState = {
  showDebug: false,
  showSearch: false,
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
    case 'set-search-query':
      return { ...state, searchQuery: action.searchQuery };
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseChatControllerInput {
  chatId: string;
  onChatArchive: () => void;
  source: SessionSource;
  services: ChatServices;
}

export function useChatController({
  chatId,
  onChatArchive,
  source,
  services,
}: UseChatControllerInput) {
  const { speakingId, speak } = services.speech;
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { isPending: isMessagesLoading, data: messages } = services.useChatMessages({ chatId });
  const { mutate: archiveChat, isPending: isArchiving } = services.useArchiveChat({
    chatId,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: services.chatKeys.messages(chatId) });
      onChatArchive();
    },
  });
  const { sendChatMessage, chatSendStatus } = services.useSendMessage({ chatId });
  const [Markdown, setMarkdown] = useState<MarkdownComponent | null>(null);
  const [uiState, dispatch] = useReducer(mobileUiReducer, initialMobileUiState);
  const searchInputRef = useRef<TextInput | null>(null);

  const formattedMessages = useMemo(
    () => (messages && messages.length > 0 ? messages : []),
    [messages],
  );

  const displayMessages = useMemo(() => {
    if (!uiState.searchQuery.trim()) return formattedMessages;
    const lower = uiState.searchQuery.toLowerCase();
    return formattedMessages.filter((message) => message.message?.toLowerCase().includes(lower));
  }, [formattedMessages, uiState.searchQuery]);

  const proposalMessages = useMemo(
    () => formattedMessages.map((message) => ({ role: message.role, content: message.message })),
    [formattedMessages],
  );

  // ─── Note creation mutation ──────────────────────────────────────────────────

  const createNote = useMutation({
    mutationKey: ['chat-note', chatId],
    mutationFn: async (review: { proposedTitle: string; previewContent: string }) => {
      return client.notes.create({
        content: review.previewContent,
        excerpt: review.previewContent.slice(0, 160),
        title: review.proposedTitle,
        type: 'note',
      });
    },
    onSuccess: async () => {
      if (services.onNoteCreated) {
        await services.onNoteCreated();
      }
    },
  });

  // ─── Shared lifecycle ────────────────────────────────────────────────────────

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
    onTransform: async (_type: ArtifactType) => buildNoteProposal(proposalMessages),
    onAcceptReview: async (review) => {
      const note = await createNote.mutateAsync(review);
      return {
        kind: 'artifact' as const,
        id: note.id,
        type: 'note' as const,
        title: note.title || review.proposedTitle,
      };
    },
    onRejectReview: async () => {
      // No server call needed for client-side proposals
    },
    onError: (_phase, _error) => {
      Alert.alert(
        _phase === 'accept' ? 'Could not save note' : 'Could not prepare note review',
        'Please try again.',
      );
    },
  });

  // ─── Markdown loader ─────────────────────────────────────────────────────────

  const markdownLoadedRef = useRef(false);
  useEffect(() => {
    if (markdownLoadedRef.current) return;
    markdownLoadedRef.current = true;

    const controller = new AbortController();

    loadMarkdown()
      .then((component) => {
        if (!controller.signal.aborted) setMarkdown(() => component);
      })
      .catch(() => {
        if (!controller.signal.aborted) setMarkdown(null);
      });

    return () => {
      controller.abort();
    };
  }, []);

  // ─── Platform-specific handlers ───────────────────────────────────────────────

  const handleArchiveChat = useCallback(() => {
    archiveChat();
  }, [archiveChat]);

  const handleCopyMessage = useCallback((copiedMessage: ChatMessageItem) => {
    const text = copiedMessage.message;
    if (!text) return;

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void Clipboard.setStringAsync(text).catch(() => {
        void Share.share({ message: text, title: 'Copy message' });
      });
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text).catch(() => {
        void Share.share({ message: text, title: 'Copy message' });
      });
      return;
    }

    void Share.share({ message: text, title: 'Copy message' });
  }, []);

  const handleRegenerate = useCallback(
    async (messageId: string) => {
      const messageIndex = formattedMessages.findIndex((message) => message.id === messageId);
      if (messageIndex === -1) return;

      const previousUserMessage = [...formattedMessages]
        .slice(0, messageIndex)
        .reverse()
        .find((message) => message.role === 'user' && message.message.trim().length > 0);

      if (!previousUserMessage) return;

      await client.messages.delete({ messageId }).catch(() => null);
      await sendChatMessage(previousUserMessage.message);
    },
    [client.messages, formattedMessages, sendChatMessage],
  );

  const handleEditMessage = useCallback(
    async (messageId: string, content: string) => {
      const trimmedContent = content.trim();
      if (!trimmedContent) return;

      const updatedMessage = await client.messages
        .update({ messageId, content: trimmedContent })
        .catch(() => null);

      if (!updatedMessage) return;

      await sendChatMessage(trimmedContent);
    },
    [client.messages, sendChatMessage],
  );

  const handleShareMessage = useCallback(async (message: ChatMessageItem) => {
    const text = message.message;
    if (!text) return;
    const uri = `${FileSystem.cacheDirectory}message_${message.id}.txt`;
    await FileSystem.writeAsStringAsync(uri, text, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(uri, { mimeType: 'text/plain', UTI: 'public.plain-text' });
  }, []);

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      void client.messages.delete({ messageId }).then(() => {
        queryClient.invalidateQueries({ queryKey: services.chatKeys.messages(chatId) });
      });
    },
    [chatId, client.messages, queryClient, services.chatKeys],
  );

  const handleSpeakMessage = useCallback(
    (message: ChatMessageItem) => {
      speak(message.id, message.message);
    },
    [speak],
  );

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

  const handleOpenMenu = useCallback(() => {
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: 'cancel' | 'default' | 'destructive';
    }> = [
      { text: 'Search messages', onPress: handleOpenSearch },
      {
        text: uiState.showDebug ? 'Hide debug metadata' : 'Show debug metadata',
        onPress: () => dispatch({ type: 'toggle-debug' }),
      },
    ];

    if (canTransform) {
      buttons.push(
        { text: 'Transform to note', onPress: () => handleTransform('note') },
        { text: 'Transform to task', onPress: () => handleTransform('task') },
        { text: 'Transform to task list', onPress: () => handleTransform('task_list') },
        { text: 'Transform to tracker', onPress: () => handleTransform('tracker') },
      );
    }

    buttons.push(
      {
        text: isArchiving ? 'Archiving...' : 'Archive chat',
        onPress: handleArchiveChat,
        style: 'destructive',
      },
      { text: 'Cancel', style: 'cancel' },
    );

    Alert.alert('Conversation', undefined, buttons);
  }, [
    canTransform,
    handleArchiveChat,
    handleOpenSearch,
    handleTransform,
    isArchiving,
    uiState.showDebug,
  ]);

  return {
    Markdown,
    chatSendStatus,
    displayMessages,
    handleAcceptReview,
    handleArchiveChat,
    handleCloseSearch,
    handleCopyMessage,
    handleDeleteMessage,
    handleEditMessage,
    handleOpenMenu,
    handleOpenSearch,
    handleRegenerate,
    handleRejectReview,
    handleSearchQueryChange,
    handleShareMessage,
    handleSpeakMessage,
    isMessagesLoading,
    lifecycleState,
    pendingReview,
    resolvedSource,
    searchInputRef,
    searchQuery: uiState.searchQuery,
    showDebug: uiState.showDebug,
    showSearch: uiState.showSearch,
    speakingId,
    statusCopy,
    isReviewVisible,
  };
}
