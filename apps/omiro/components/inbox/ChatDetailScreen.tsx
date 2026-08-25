import type { SessionSource } from '@hominem/rpc/types';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, Text, View } from 'react-native';

import { ChatMessageList, ChatReviewOverlay, ChatSearchModal } from '~/components/chat';
import { buildNoteDraft } from '~/components/chat/build-note-draft';
import { ChatSettingsSheet } from '~/components/chat/chat-settings-sheet';
import { buildConversationActionsModel } from '~/components/chat/conversation-actions.model';
import { Composer } from '~/components/composer/Composer';
import { ComposerDock, useComposerDockMetrics } from '~/components/composer/ComposerDock';
import { makeStyles } from '~/components/theme';
import { EmptyState } from '~/components/ui';
import { useChatArchiveAction } from '~/hooks/use-chat-archive-action';
import { useChatData } from '~/hooks/use-chat-data';
import { useChatSearch } from '~/hooks/use-chat-search';
import { useNetworkStatus } from '~/hooks/use-network-status';
import { useTaskExtraction, type ExtractedTasksCreated } from '~/hooks/use-task-extraction';
import {
  DEFAULT_CHAT_TITLE,
  getChatTitle,
  updateChatTitleCaches,
  useActiveChat,
  useEditChatMessage,
  useRegenerateMessage,
  useSendMessage,
} from '~/services/chat';
import { useCreateChat } from '~/services/chat/use-create-chat';
import { formatRelativeAge } from '~/services/date/format-relative-age';
import { invalidateInboxQueries } from '~/services/inbox/inbox-refresh';
import { clearResumeTarget, writeResumeTarget } from '~/services/navigation/launch-state';
import { HOME_ROUTE, getContentRoute } from '~/services/navigation/routes';
import t from '~/translations';

function getConversationActionIcon(kind: string, type?: string) {
  if (kind === 'search') return 'magnifyingglass';
  if (kind === 'toggle-debug') return 'ladybug';
  if (kind === 'settings') return 'slider.horizontal.3';
  if (kind === 'archive') return 'archivebox';
  if (type === 'note') return 'doc.text';
  if (type === 'task') return 'checkmark.circle';
  if (type === 'task_list') return 'checklist';
  return 'ellipsis.circle';
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 404;
}

// react-doctor-disable-next-line no-giant-component -- this route owns the approved chat detail orchestration and overlay stack.
export function ChatScreen({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: activeChat, error: activeChatError } = useActiveChat(id);
  const chatId = activeChat?.id ?? id;
  const { inset: composerInset, safeAreaBottom } = useComposerDockMetrics();
  const [showDebug, setShowDebug] = useState(false);
  const { isOnline } = useNetworkStatus();

  const source = useMemo<SessionSource>(() => {
    if (activeChat?.noteId) {
      return {
        kind: 'artifact',
        id: activeChat.noteId,
        title: activeChat.title,
        type: 'note',
      };
    }

    return { kind: 'new' };
  }, [activeChat]);

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
  const { handleArchiveChat, isArchiving } = useChatArchiveAction({
    chatId,
    onChatArchive: handleChatArchive,
  });
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
  const { mutateAsync: createChat, isPending: isCreatingChat } = useCreateChat();

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

  const conversationActions = useMemo(
    () =>
      buildConversationActionsModel({
        canTransform: extraction.canTransform,
        isArchiving,
        showDebug,
      }),
    [extraction.canTransform, isArchiving, showDebug],
  );
  const emptyState = useMemo(
    () => <EmptyState sfSymbol="bubble.left" title={t.chat.emptyState.title} />,
    [],
  );
  const errorState = useMemo(
    () => (
      <EmptyState
        action={{ label: t.chat.loadErrorRetry, onPress: () => void refetchMessages() }}
        sfSymbol="arrow.clockwise.circle"
        title={t.chat.loadErrorTitle}
      />
    ),
    [refetchMessages],
  );
  const missingConversationState = useMemo(
    () => (
      <EmptyState
        action={{ label: t.chat.goBack, onPress: () => router.dismissTo(HOME_ROUTE) }}
        description={t.chat.missingMessage}
        sfSymbol="bubble.left.and.exclamationmark.bubble.right"
        title={t.chat.missingTitle}
      />
    ),
    [router],
  );

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu
          accessibilityLabel={t.chat.conversationActionsLabel}
          icon="ellipsis.circle"
        >
          {(isConversationGone ? [] : conversationActions).map((section) =>
            section.items.map((item) => {
              if (item.kind === 'search') {
                return (
                  <Stack.Toolbar.MenuAction
                    key={item.kind}
                    icon={getConversationActionIcon(item.kind)}
                    onPress={search.handleOpenSearch}
                  >
                    {item.label}
                  </Stack.Toolbar.MenuAction>
                );
              }

              if (item.kind === 'toggle-debug') {
                return (
                  <Stack.Toolbar.MenuAction
                    key={item.kind}
                    icon={getConversationActionIcon(item.kind)}
                    isOn={showDebug}
                    onPress={handleToggleDebug}
                  >
                    {item.label}
                  </Stack.Toolbar.MenuAction>
                );
              }

              if (item.kind === 'settings') {
                return (
                  <Stack.Toolbar.MenuAction
                    key={item.kind}
                    icon={getConversationActionIcon(item.kind)}
                    onPress={() => setShowChatSettings(true)}
                  >
                    {item.label}
                  </Stack.Toolbar.MenuAction>
                );
              }

              if (item.kind === 'transform' && item.type) {
                return (
                  <Stack.Toolbar.MenuAction
                    key={`${item.kind}:${item.type}`}
                    icon={getConversationActionIcon(item.kind, item.type)}
                    onPress={() => {
                      if (!item.type) {
                        return;
                      }

                      if (item.type === 'note') {
                        const draft = buildNoteDraft(messages);
                        if (draft.transcript.trim().length === 0) {
                          Alert.alert(t.chat.noteDraft.emptyChat);
                          return;
                        }

                        router.push({
                          pathname: '/note-draft-sheet',
                          params: {
                            transcript: draft.transcript,
                            title: draft.title,
                            isTruncated: draft.isTruncated.toString(),
                            chatId,
                          },
                        });
                        return;
                      }

                      void extraction.handleTransform(item.type);
                    }}
                  >
                    {item.label}
                  </Stack.Toolbar.MenuAction>
                );
              }

              return (
                <Stack.Toolbar.MenuAction
                  key={item.kind}
                  icon={getConversationActionIcon(item.kind)}
                  onPress={handleArchiveChat}
                >
                  {item.label}
                </Stack.Toolbar.MenuAction>
              );
            }),
          )}
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Button
          accessibilityLabel="New chat"
          disabled={isCreatingChat}
          icon="square.and.pencil"
          onPress={() => {
            void createChat({ title: DEFAULT_CHAT_TITLE }).then((chat) => {
              router.push(getContentRoute('chat', chat.id));
            });
          }}
        />
      </Stack.Toolbar>

      <View style={styles.container}>
        <ChatSettingsSheet visible={showChatSettings} onClose={() => setShowChatSettings(false)} />
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

const styles = makeStyles((theme) => ({
  container: { flex: 1 },
  offlineIndicator: {
    backgroundColor: theme.colors.muted,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  offlineText: {
    ...theme.typography.footnote,
    textAlign: 'center',
    color: theme.colors.mutedForeground,
  },
  overlayContainer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
}));
