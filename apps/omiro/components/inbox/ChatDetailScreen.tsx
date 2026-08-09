import type { SessionSource } from '@hominem/rpc/types';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';

import {
  ChatMessageList,
  ChatReviewOverlay,
  ChatSearchModal,
  type ChatRenderIcon,
} from '~/components/chat';
import { ChatSettingsSheet } from '~/components/chat/ChatSettingsSheet';
import { buildConversationActionsModel } from '~/components/chat/conversation-actions.model';
import { Composer } from '~/components/composer/Composer';
import { ComposerDock } from '~/components/composer/ComposerDock';
import { EmptyState } from '~/components/ui';
import AppIcon from '~/components/ui/icon';
import { useChatData } from '~/hooks/use-chat-data';
import { useChatSearch } from '~/hooks/use-chat-search';
import { useChatTransform, type ChatContentCreated } from '~/hooks/use-chat-transform';
import { useCopyMessage, useShareMessage } from '~/hooks/use-message-actions';
import {
  DEFAULT_CHAT_TITLE,
  getChatTitle,
  updateChatTitleCaches,
  useActiveChat,
} from '~/services/chat';
import { useCreateChat } from '~/services/chat/use-create-chat';
import { formatRelativeAge } from '~/services/date/format-relative-age';
import { invalidateInboxQueries } from '~/services/inbox/inbox-refresh';
import { writeResumeTarget } from '~/services/navigation/launch-state';
import { INBOX_ROUTE, getContentRoute } from '~/services/navigation/routes';
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

const renderChatIcon: ChatRenderIcon = (name, props) => {
  const tintColor = props.color;
  return (
    <View style={props.style}>
      <AppIcon name={name} size={props.size} tintColor={tintColor} />
    </View>
  );
};

export function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: activeChat } = useActiveChat(id);
  const chatId = activeChat?.id ?? id;
  const canGoBack = navigation.canGoBack();
  const [composerHeight, setComposerHeight] = useState(0);
  const [showDebug, setShowDebug] = useState(false);

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
    async (content: ChatContentCreated) => {
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
    router.dismissTo(INBOX_ROUTE);
  }, [router]);

  const {
    messages,
    messagesError,
    isMessagesLoading,
    isMessagesRefreshing,
    refetchMessages,
    handleArchiveChat,
    isArchiving,
  } = useChatData({ chatId, onChatArchive: handleChatArchive });
  const search = useChatSearch(messages);
  const transform = useChatTransform({
    chatId,
    source,
    messages,
    onContentCreated: handleContentCreated,
  });
  const handleCopyMessage = useCopyMessage();
  const handleShareMessage = useShareMessage();
  const handleToggleDebug = useCallback(() => setShowDebug((value) => !value), []);

  const displayTitle = getChatTitle(activeChat?.title, transform.resolvedSource);
  const { mutateAsync: createChat, isPending: isCreatingChat } = useCreateChat();

  useEffect(() => {
    writeResumeTarget({
      kind: 'chat',
      id: chatId,
      title: displayTitle,
      updatedAt: activeChat?.updatedAt ?? null,
    });
  }, [activeChat?.updatedAt, chatId, displayTitle]);

  const [showChatSettings, setShowChatSettings] = useState(false);

  const conversationActions = useMemo(
    () =>
      buildConversationActionsModel({
        canTransform: transform.canTransform,
        isArchiving,
        showDebug,
      }),
    [transform.canTransform, isArchiving, showDebug],
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

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerBackButtonDisplayMode: 'minimal',
          headerBackVisible: canGoBack,
        }}
      />
      {!canGoBack ? (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button icon="chevron.left" onPress={() => router.replace(INBOX_ROUTE)}>
            Inbox
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu
          accessibilityLabel={t.chat.conversationActionsLabel}
          icon="ellipsis.circle"
        >
          {conversationActions.map((section) =>
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

                      void transform.handleTransform(item.type);
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

      <View className="flex-1">
        <ChatSettingsSheet visible={showChatSettings} onClose={() => setShowChatSettings(false)} />
        <ChatSearchModal
          visible={search.showSearch}
          searchQuery={search.searchQuery}
          resultCount={search.displayMessages.length}
          searchInputRef={search.searchInputRef}
          onClose={search.handleCloseSearch}
          onChangeSearchQuery={search.handleSearchQueryChange}
        />
        <ChatMessageList
          bottomInset={composerHeight}
          isMessagesLoading={isMessagesLoading}
          displayMessages={search.displayMessages}
          showSearch={search.showSearch}
          searchQuery={search.searchQuery}
          showDebug={showDebug}
          onCopy={handleCopyMessage}
          onShare={(message: Parameters<typeof handleShareMessage>[0]) => {
            void handleShareMessage(message);
          }}
          renderIcon={renderChatIcon}
          formatTimestamp={formatRelativeAge}
          emptyState={messagesError ? errorState : emptyState}
          refreshControl={
            <RefreshControl
              refreshing={isMessagesRefreshing}
              onRefresh={() => {
                void refetchMessages();
              }}
            />
          }
        />
        <ComposerDock onHeightChange={setComposerHeight} testID="chat-composer-dock">
          <Composer mode="chat" chatId={chatId} />
        </ComposerDock>
        <View className="absolute inset-0" pointerEvents="box-none">
          <ChatReviewOverlay
            pendingReview={transform.pendingReview}
            isVisible={transform.isReviewVisible}
            onAccept={() => {
              void transform.handleAcceptReview();
            }}
            onReject={() => {
              void transform.handleRejectReview();
            }}
          />
        </View>
      </View>
    </>
  );
}
