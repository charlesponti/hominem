import type { ArtifactType, ThoughtLifecycleState } from '@hominem/chat-services/types';
import { buildNoteProposal, deriveSessionSource } from '@hominem/chat-services/ui';
import { useApiClient } from '@hominem/hono-client/react';
import { chatTokensNative, fontFamiliesNative, fontSizes } from '@hominem/ui/tokens';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useMutation } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Alert, Modal, Platform, Pressable, Share, StyleSheet, View } from 'react-native';

import { Button } from '~/components/Button';
import { FeatureErrorBoundary } from '~/components/error-boundary';
import TextInputField from '~/components/text-input';
import { Text, makeStyles } from '~/theme';
import queryClient from '~/utils/query-client';
import { useChatMessages, useEndChat, useSendMessage } from '~/utils/services/chat';
import type { MessageOutput } from '~/utils/services/chat';

import AppIcon from '../ui/icon';
import { ChatInput } from './chat-input';
import { loadMarkdown, renderMessage, type MarkdownComponent } from './chat-message';
import { ChatShimmerMessage } from './chat-shimmer-message';
import { ChatThinkingIndicator } from './chat-thinking-indicator';
import { ClassificationReview } from './classification-review';
import { ContextAnchor, type SessionSource } from './context-anchor';

const keyExtractor = (item: MessageOutput) => item.id;

interface PendingReview {
  proposedType: ArtifactType;
  proposedTitle: string;
  proposedChanges: string[];
  previewContent: string;
}

type ChatProps = {
  chatId: string;
  onChatEnd: () => void;
  source: SessionSource;
};
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const Chat = (props: ChatProps) => {
  const styles = useStyles();
  const { top } = useSafeAreaInsets();
  const { chatId, onChatEnd, source } = props;
  const client = useApiClient();
  const { isPending: isMessagesLoading, data: messages } = useChatMessages({ chatId });
  const { mutate: endChat, isPending: isEnding } = useEndChat({
    chatId,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', chatId] });
      onChatEnd();
    },
  });
  const { sendChatMessage, isChatSending, chatSendStatus } = useSendMessage({ chatId });
  const [message, setMessage] = useState('');
  const [Markdown, setMarkdown] = useState<MarkdownComponent | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [lifecycleState, setLifecycleState] = useState<ThoughtLifecycleState>('idle');
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [persistedSource, setPersistedSource] = useState<SessionSource | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<React.ElementRef<typeof TextInputField> | null>(null);

  const formattedMessages = useMemo(
    () => (messages && messages.length > 0 ? messages : []),
    [messages],
  );

  const displayMessages = useMemo(() => {
    if (!searchQuery.trim()) return formattedMessages;
    const lower = searchQuery.toLowerCase();
    return formattedMessages.filter((m) => m.message?.toLowerCase().includes(lower));
  }, [formattedMessages, searchQuery]);
  const isLifecycleBlocked =
    lifecycleState === 'classifying' ||
    lifecycleState === 'reviewing_changes' ||
    lifecycleState === 'persisting';
  const canTransform = formattedMessages.length > 0 && !isLifecycleBlocked;
  const statusCopy =
    lifecycleState === 'classifying'
      ? 'Preparing note review'
      : lifecycleState === 'reviewing_changes'
        ? 'Review ready'
        : lifecycleState === 'persisting'
          ? 'Saving note'
          : formattedMessages.length > 0
            ? `${formattedMessages.length} ${formattedMessages.length === 1 ? 'message' : 'messages'}`
            : 'New conversation';

  const proposalMessages = useMemo(
    () => formattedMessages.map((message) => ({ role: message.role, content: message.message })),
    [formattedMessages],
  );
  const resolvedSource = useMemo(
    () =>
      persistedSource ??
      (source.kind === 'artifact' ? source : deriveSessionSource({ messages: proposalMessages })),
    [persistedSource, proposalMessages, source],
  );
  const createNote = useMutation({
    mutationKey: ['chat-note', chatId],
    mutationFn: async (review: PendingReview) => {
      return client.notes.create({
        content: review.previewContent,
        excerpt: review.previewContent.slice(0, 160),
        title: review.proposedTitle,
        type: 'note',
      });
    },
  });

  useEffect(() => {
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    loadMarkdown()
      .then((component) => {
        if (!signal.aborted) setMarkdown(() => component);
      })
      .catch(() => {
        if (!signal.aborted) setMarkdown(null);
      });

    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!showSearch) return;

    const timeout = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    return () => clearTimeout(timeout);
  }, [showSearch]);

  const onEndChatPress = useCallback(() => {
    endChat();
  }, [endChat]);

  const handleSendMessage = useCallback(
    (messageText: string) => {
      if (!messageText.trim()) return;
      void sendChatMessage(messageText);
      setMessage('');
    },
    [sendChatMessage],
  );

  const handleCopyMessage = useCallback((copiedMessage: MessageOutput) => {
    const text = copiedMessage.message;
    if (!text) return;

    if (Platform.OS !== 'web') {
      void Clipboard.setStringAsync(text).catch(() => {
        void Share.share({
          message: text,
          title: 'Copy message',
        });
      });
      return;
    }

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text).catch(() => {
        void Share.share({
          message: text,
          title: 'Copy message',
        });
      });
      return;
    }

    void Share.share({
      message: text,
      title: 'Copy message',
    });
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

      try {
        await client.messages.delete({ messageId });
      } catch {
        // Intentionally fall through to keep parity with existing UX while avoiding hard failure
      }

      await sendChatMessage(previousUserMessage.message);
    },
    [client.messages, formattedMessages, sendChatMessage],
  );

  const handleEditMessage = useCallback(
    async (messageId: string, content: string) => {
      const trimmedContent = content.trim();
      if (!trimmedContent) return;

      try {
        await client.messages.update({
          messageId,
          content: trimmedContent,
        });
      } catch {
        return;
      }

      await sendChatMessage(trimmedContent);
    },
    [client.messages, sendChatMessage],
  );

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      void client.messages.delete({ messageId }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['chatMessages', chatId] });
      });
    },
    [chatId, client.messages],
  );

  const renderItem = useCallback<ListRenderItem<MessageOutput>>(
    ({ item }) =>
      renderMessage(item, Markdown, {
        showDebug,
        onCopy: handleCopyMessage,
        onEdit: handleEditMessage,
        onRegenerate: handleRegenerate,
        onDelete: handleDeleteMessage,
      }),
    [
      Markdown,
      handleCopyMessage,
      handleDeleteMessage,
      handleEditMessage,
      handleRegenerate,
      showDebug,
    ],
  );

  // Phase 7: classification API not yet implemented.
  // Passes through 'classifying' so ArtifactActions dim state renders before the review sheet.
  const handleTransform = useCallback(
    (_type: ArtifactType) => {
      setLifecycleState('classifying');
      const proposal = buildNoteProposal(proposalMessages);
      queueMicrotask(() => {
        setLifecycleState('reviewing_changes');
        setPendingReview(proposal);
      });
    },
    [proposalMessages],
  );

  const handleAcceptReview = useCallback(async () => {
    if (!pendingReview) return;

    setLifecycleState('persisting');

    try {
      const note = await createNote.mutateAsync(pendingReview);
      setPersistedSource({
        kind: 'artifact',
        id: note.id,
        type: 'note',
        title: note.title || pendingReview.proposedTitle,
      });
      setLifecycleState('idle');
      setPendingReview(null);
    } catch {
      setLifecycleState('reviewing_changes');
      Alert.alert('Could not save note', 'Please try again.');
    }
  }, [createNote, pendingReview]);

  const handleRejectReview = useCallback(() => {
    setLifecycleState('idle');
    setPendingReview(null);
  }, []);

  const handleOpenSearch = useCallback(() => {
    setShowSearch(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery('');
  }, []);

  const handleOpenMenu = useCallback(() => {
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: 'cancel' | 'default' | 'destructive';
    }> = [
      {
        text: 'Search messages',
        onPress: handleOpenSearch,
      },
      {
        text: showDebug ? 'Hide debug metadata' : 'Show debug metadata',
        onPress: () => setShowDebug((current) => !current),
      },
    ];

    if (canTransform) {
      buttons.push({
        text: 'Transform to note',
        onPress: () => handleTransform('note'),
      });
    }

    buttons.push(
      {
        text: isEnding ? 'Ending…' : 'End chat',
        onPress: onEndChatPress,
        style: 'destructive',
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    );

    Alert.alert('Conversation', undefined, buttons);
  }, [canTransform, handleOpenSearch, handleTransform, isEnding, onEndChatPress, showDebug]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(top, 16) }]}>
        <Button
          variant="ghost"
          size="icon-xs"
          onPress={onEndChatPress}
          style={styles.headerBack}
          accessibilityLabel="Back"
        >
          <AppIcon name="arrow-left" size={20} style={styles.headerBackIcon} />
        </Button>
        <View style={styles.headerCenter}>
          <ContextAnchor source={resolvedSource} />
          {statusCopy ? <Text style={styles.headerStatus}>{statusCopy}</Text> : null}
        </View>
        <Button
          variant="ghost"
          size="icon-xs"
          onPress={handleOpenSearch}
          style={styles.headerIconButton}
          accessibilityLabel="Search messages"
          testID="chat-search-toggle"
        >
          <AppIcon name="magnifying-glass" size={16} style={styles.headerIcon} />
        </Button>
        <Button
          variant="primary"
          size="icon-xs"
          onPress={handleOpenMenu}
          style={styles.headerNewButton}
          accessibilityLabel="Conversation actions"
        >
          <AppIcon name="plus" size={18} style={styles.headerNewIcon} />
        </Button>
      </View>

      <Modal
        visible={showSearch}
        transparent
        animationType="fade"
        onRequestClose={handleCloseSearch}
      >
        <Pressable style={styles.searchBackdrop} onPress={handleCloseSearch}>
          <View style={styles.searchPanel}>
            <View style={styles.searchPanelHeader}>
              <Text style={styles.searchTitle}>Search messages</Text>
              <Button
                variant="ghost"
                size="icon-xs"
                onPress={handleCloseSearch}
                style={styles.headerIconButton}
                accessibilityLabel="Close search"
              >
                <AppIcon name="x" size={16} style={styles.headerIcon} />
              </Button>
            </View>

            <TextInputField
              ref={searchInputRef}
              containerStyle={styles.searchInputContainer}
              style={styles.searchInput}
              placeholder="Search messages…"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
              testID="chat-search-input"
            />

            <Text style={styles.searchResultCount}>
              {searchQuery.trim().length > 0
                ? `${displayMessages.length} result${displayMessages.length !== 1 ? 's' : ''}`
                : 'Search the current conversation'}
            </Text>
          </View>
        </Pressable>
      </Modal>

      {isMessagesLoading ? (
        <View style={styles.shimmerContainer}>
          <ChatShimmerMessage />
          <ChatShimmerMessage variant="user" />
          <ChatShimmerMessage />
        </View>
      ) : (
        <>
          <FlashList
            contentContainerStyle={styles.messagesContainer}
            data={displayMessages}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            scrollEnabled={displayMessages.length > 0}
            ListEmptyComponent={
              showSearch && searchQuery.length > 0 ? (
                <View style={styles.emptySearch}>
                  <Text style={styles.emptySearchText}>No messages matching "{searchQuery}"</Text>
                </View>
              ) : null
            }
          />
          {chatSendStatus === 'submitted' && <ChatShimmerMessage />}
          {chatSendStatus === 'streaming' && <ChatThinkingIndicator />}
          <ChatInput
            message={message}
            onMessageChange={setMessage}
            onSendMessage={handleSendMessage}
            onTransformNote={canTransform ? () => handleTransform('note') : undefined}
            canTransformNote={canTransform}
            isPending={isChatSending}
          />
        </>
      )}

      {lifecycleState === 'reviewing_changes' && pendingReview && (
        <ClassificationReview
          proposedType={pendingReview.proposedType}
          proposedTitle={pendingReview.proposedTitle}
          proposedChanges={pendingReview.proposedChanges}
          previewContent={pendingReview.previewContent}
          onAccept={handleAcceptReview}
          onReject={handleRejectReview}
        />
      )}
    </View>
  );
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.background,
      flexDirection: 'column',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: t.spacing.sm_12,
      paddingVertical: t.spacing.sm_12,
      borderBottomWidth: 1,
      borderBottomColor: t.colors['border-default'],
      gap: t.spacing.sm_8,
    },
    headerBack: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    headerBackIcon: {
      color: t.colors.foreground,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      gap: t.spacing.xs_4,
    },
    headerStatus: {
      color: t.colors['text-tertiary'],
      fontSize: fontSizes.xs,
      fontFamily: fontFamiliesNative.mono,
    },
    headerIconButton: {
      backgroundColor: t.colors['bg-surface'],
      borderColor: t.colors['border-default'],
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    headerIcon: {
      color: t.colors['text-tertiary'],
    },
    headerNewButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    headerNewIcon: {
      color: t.colors.white,
    },
    searchInputContainer: {
      width: '100%',
    },
    searchInput: {
      color: t.colors.foreground,
      fontSize: fontSizes.sm,
      fontFamily: fontFamiliesNative.mono,
      minHeight: 36,
      paddingVertical: t.spacing.sm_8,
    },
    searchResultCount: {
      color: t.colors['text-tertiary'],
      fontSize: fontSizes.xs,
      fontFamily: fontFamiliesNative.mono,
    },
    messagesContainer: {
      flexGrow: 1,
      paddingTop: t.spacing.m_16,
      paddingHorizontal: t.spacing.m_16,
      paddingBottom: t.spacing.sm_12,
      rowGap: chatTokensNative.turnGap,
    },
    shimmerContainer: {
      flex: 1,
      paddingTop: t.spacing.sm_12,
    },
    emptySearch: {
      paddingTop: t.spacing.xl_48,
      alignItems: 'center',
    },
    emptySearchText: {
      color: t.colors['text-tertiary'],
      fontSize: fontSizes.sm,
      fontFamily: fontFamiliesNative.mono,
    },
    searchBackdrop: {
      flex: 1,
      backgroundColor: t.colors['overlay-modal-medium'],
      justifyContent: 'flex-start',
      paddingHorizontal: t.spacing.m_16,
      paddingTop: t.spacing.xl_48,
    },
    searchPanel: {
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      borderRadius: chatTokensNative.radii.composer,
      backgroundColor: t.colors.background,
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.m_16,
      gap: t.spacing.sm_12,
    },
    searchPanelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.spacing.sm_8,
    },
    searchTitle: {
      color: t.colors.foreground,
      fontSize: 17,
      lineHeight: 24,
    },
  }),
);

// Wrapped export with error boundary
export const ChatWithErrorBoundary = (props: ChatProps) => (
  <FeatureErrorBoundary featureName="Chat">
    <Chat {...props} />
  </FeatureErrorBoundary>
);
