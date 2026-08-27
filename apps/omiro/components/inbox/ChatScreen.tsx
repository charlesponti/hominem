import type { SessionSource } from '@hominem/rpc/types';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';

import { ChatMessageList, ChatReviewOverlay, ChatSearchModal } from '~/components/chat';
import { ChatActionsMenu } from '~/components/chat/chat-actions-menu';
import { ChatSettingsSheet } from '~/components/chat/chat-settings-sheet';
import { ChatSourcesSheet } from '~/components/chat/chat-sources-sheet';
import { Composer } from '~/components/composer/Composer';
import { ComposerDock, useComposerDockMetrics } from '~/components/composer/ComposerDock';
import { useStyles } from '~/components/theme';
import { EmptyState } from '~/components/ui';
import { useChatData } from '~/hooks/use-chat-data';
import { useChatSearch } from '~/hooks/use-chat-search';
import { useNetworkStatus } from '~/hooks/use-network-status';
import { useTaskExtraction, type ExtractedTasksCreated } from '~/hooks/use-task-extraction';
import {
  getChatTitle,
  updateChatTitleCaches,
  useActiveChat,
  useEditChatMessage,
  useRegenerateMessage,
  useSendMessage,
} from '~/services/chat';
import { formatRelativeAge } from '~/services/date/format-relative-age';
import { invalidateInboxQueries } from '~/services/inbox/inbox-refresh';
import { clearResumeTarget, writeResumeTarget } from '~/services/navigation/launch-state';
import { HOME_ROUTE, NEW_CHAT_ROUTE } from '~/services/navigation/routes';
import t from '~/translations';

function isNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 404;
}

const NEW_SESSION_SOURCE: SessionSource = { kind: 'new' };

export function ChatScreen({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: activeChat, error: activeChatError } = useActiveChat(id);
  const chatId = activeChat?.id ?? id;
  const { inset: composerInset, safeAreaBottom } = useComposerDockMetrics();
  const [showDebug, setShowDebug] = useState(false);
  const { isOnline } = useNetworkStatus();
  const styles = useStyles((theme) => ({
    container: { flex: 1 },
    offlineIndicator: {
      backgroundColor: theme.colors.muted,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    offlineText: {
      ...theme.textVariants.footnote,
      textAlign: 'center',
      color: theme.colors.mutedForeground,
    },
    overlayContainer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  }));

  const source = NEW_SESSION_SOURCE;

  const handleContentCreated = useCallback(
    async (content: ExtractedTasksCreated) => {
      updateChatTitleCaches(queryClient, {
        chatId,
        title: content.source.title,
        updatedAt: content.updatedAt,
      });
      await invalidateInboxQueries(queryClient);
    },
    [chatId, queryClient],
  );

  const handleChatArchive = useCallback(() => {
    router.dismissTo(HOME_ROUTE);
  }, [router]);

  const { messages, messagesError, isMessagesLoading, isMessagesRefreshing, refetchMessages } =
    useChatData({ chatId });
  const isConversationGone = isNotFoundError(activeChatError) || isNotFoundError(messagesError);
  const search = useChatSearch(messages, chatId);
  const extraction = useTaskExtraction({
    chatId,
    source,
    messages,
    onContentCreated: handleContentCreated,
  });
  const handleToggleDebug = useCallback(() => setShowDebug((value) => !value), []);
  // Owned here (rather than inside Composer) so the composer's send and the
  // message list's retry-a-failed-message action share one mutation instead
  // of racing two independent streams.
  const {
    cancelGeneration,
    generation,
    sendChatMessage,
    isChatSending,
    retryFailedMessage,
    retryLastGeneration,
  } = useSendMessage({ chatId });
  const chatSend = useMemo(
    () => ({ sendChatMessage, isChatSending }),
    [sendChatMessage, isChatSending],
  );
  const editMessage = useEditChatMessage(chatId);
  const handleEditMessage = useCallback(
    (messageId: string, content: string) => {
      void editMessage.mutateAsync({ messageId, content });
    },
    [editMessage],
  );

  const {
    cancelGeneration: cancelRegeneration,
    generation: regeneration,
    regenerateMessage,
    retryGeneration,
  } = useRegenerateMessage(chatId);
  const activeGeneration = generation ?? regeneration;
  const cancelActiveGeneration = generation ? cancelGeneration : cancelRegeneration;
  const retryActiveGeneration = generation ? retryLastGeneration : retryGeneration;

  const displayTitle = getChatTitle(activeChat?.title, extraction.resolvedSource);

  useEffect(() => {
    writeResumeTarget({
      kind: 'chat',
      id: chatId,
      title: displayTitle,
      updatedAt: activeChat?.updatedAt ?? null,
    });
  }, [activeChat?.updatedAt, chatId, displayTitle]);

  useEffect(() => {
    return () => {
      clearResumeTarget();
    };
  }, []);

  const [showChatSettings, setShowChatSettings] = useState(false);
  const [showChatSources, setShowChatSources] = useState(false);

  const emptyState = <EmptyState sfSymbol="bubble.left" title={t.chat.emptyState.title} />;
  const errorState = (
    <EmptyState
      action={{ label: t.chat.loadErrorRetry, onPress: () => void refetchMessages() }}
      sfSymbol="arrow.clockwise.circle"
      title={t.chat.loadErrorTitle}
    />
  );
  const missingConversationState = (
    <EmptyState
      action={{ label: t.chat.goBack, onPress: () => router.dismissTo(HOME_ROUTE) }}
      description={t.chat.missingMessage}
      sfSymbol="bubble.left.and.exclamationmark.bubble.right"
      title={t.chat.missingTitle}
    />
  );

  return (
    <>
      <Stack.Toolbar placement="right">
        <ChatActionsMenu
          chatId={chatId}
          canTransform={extraction.canTransform}
          isConversationGone={isConversationGone}
          messages={messages}
          onChatArchive={handleChatArchive}
          onOpenSearch={search.handleOpenSearch}
          onOpenSettings={() => setShowChatSettings(true)}
          onOpenSources={() => setShowChatSources(true)}
          onToggleDebug={handleToggleDebug}
          onTransform={(type) => void extraction.handleTransform(type)}
          showDebug={showDebug}
        />
        <Stack.Toolbar.Button
          accessibilityLabel="New chat"
          icon="square.and.pencil"
          onPress={() => router.push(NEW_CHAT_ROUTE)}
        />
      </Stack.Toolbar>

      <View style={styles.container}>
        <ChatSettingsSheet visible={showChatSettings} onClose={() => setShowChatSettings(false)} />
        <ChatSourcesSheet
          chatId={chatId}
          visible={showChatSources}
          onClose={() => setShowChatSources(false)}
        />
        <ChatSearchModal
          visible={search.showSearch}
          searchQuery={search.searchQuery}
          resultCount={search.displayMessages.length}
          searchInputRef={search.searchInputRef}
          onClose={search.handleCloseSearch}
          onChangeSearchQuery={search.handleSearchQueryChange}
        />
        {!isOnline ? (
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={styles.offlineIndicator}
            testID="chat-offline-indicator"
          >
            <Text style={styles.offlineText}>{t.chat.offlineIndicator}</Text>
          </View>
        ) : null}
        <ChatMessageList
          bottomInset={composerInset}
          isMessagesLoading={isMessagesLoading}
          displayMessages={search.displayMessages}
          showSearch={search.showSearch}
          searchQuery={search.searchQuery}
          showDebug={showDebug}
          onEdit={handleEditMessage}
          onRegenerate={regenerateMessage}
          onRetry={retryFailedMessage}
          generation={activeGeneration}
          onCancelGeneration={() => {
            void cancelActiveGeneration();
          }}
          onRetryGeneration={retryActiveGeneration}
          formatTimestamp={formatRelativeAge}
          emptyState={
            isConversationGone ? missingConversationState : messagesError ? errorState : emptyState
          }
          refreshControl={
            <RefreshControl
              refreshing={isMessagesRefreshing}
              onRefresh={() => {
                void refetchMessages();
              }}
            />
          }
        />
        {!isConversationGone ? (
          <>
            <ComposerDock safeAreaBottom={safeAreaBottom} testID="chat-composer-dock">
              <Composer mode="chat" chatId={chatId} chatSend={chatSend} />
            </ComposerDock>
            <View style={styles.overlayContainer} pointerEvents="box-none">
              <ChatReviewOverlay
                pendingReview={extraction.pendingReview}
                isVisible={extraction.isReviewVisible}
                onAccept={() => {
                  void extraction.handleAcceptReview();
                }}
                onReject={() => {
                  void extraction.handleRejectReview();
                }}
              />
            </View>
          </>
        ) : null}
      </View>
    </>
  );
}
