import type { SessionSource } from '@hominem/rpc/types';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ChatMessageList,
  ChatReviewOverlay,
  ChatSearchModal,
  useChatController,
  type ChatRenderIcon,
  type ChatServices,
} from '~/components/chat';
import { buildConversationActionsModel } from '~/components/chat/conversation-actions.model';
import { Composer } from '~/components/composer/Composer';
import { ComposerDock, getCollapsedComposerDockHeight } from '~/components/composer/ComposerDock';
import { makeStyles } from '~/components/theme';
import { EmptyState } from '~/components/ui';
import AppIcon from '~/components/ui/icon';
import {
  DEFAULT_CHAT_TITLE,
  getChatTitle,
  updateChatTitleCaches,
  useActiveChat,
  useChatArchive,
  useChatMessages,
  useSendMessage,
} from '~/services/chat';
import { useCreateChat } from '~/services/chat/use-create-chat';
import { formatRelativeAge } from '~/services/date/format-relative-age';
import { invalidateInboxQueries } from '~/services/inbox/inbox-refresh';
import { writeResumeTarget } from '~/services/navigation/launch-state';
import { INBOX_ROUTE, getContentRoute } from '~/services/navigation/routes';
import { chatKeys } from '~/services/notes/query-keys';
import t from '~/translations';

const useStyles = makeStyles(() => ({
  container: {
    flex: 1,
  },
  reviewOverlay: {
    bottom: 0,
    left: 0,
    top: 0,
    pointerEvents: 'box-none',
    position: 'absolute',
    right: 0,
  },
}));

function getConversationActionIcon(kind: string, type?: string) {
  if (kind === 'search') return 'magnifyingglass';
  if (kind === 'toggle-debug') return 'ladybug';
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
  const insets = useSafeAreaInsets();
  const { data: activeChat } = useActiveChat(id);
  const styles = useStyles();
  const chatId = activeChat?.id ?? id;
  const [composerHeight, setComposerHeight] = useState(() =>
    getCollapsedComposerDockHeight(insets.bottom),
  );
  const canGoBack = navigation.canGoBack();

  const services = useMemo<ChatServices>(
    () => ({
      useArchiveChat: useChatArchive,
      useChatMessages,
      useSendMessage,
      onContentCreated: async ({ source, updatedAt }) => {
        updateChatTitleCaches(queryClient, {
          chatId,
          title: source.title,
          updatedAt,
        });
        await invalidateInboxQueries(queryClient);
      },
      chatKeys: {
        messages: chatKeys.messages,
      },
    }),
    [chatId, queryClient],
  );

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

  const controller = useChatController({
    chatId,
    onChatArchive: () => router.replace(INBOX_ROUTE),
    services,
    source,
  });

  const displayTitle = getChatTitle(activeChat?.title, controller.resolvedSource);
  const { mutateAsync: createChat, isPending: isCreatingChat } = useCreateChat();

  useEffect(() => {
    writeResumeTarget({
      kind: 'chat',
      id: chatId,
      title: displayTitle,
      updatedAt: activeChat?.updatedAt ?? null,
    });
  }, [activeChat?.updatedAt, chatId, displayTitle]);

  const conversationActions = useMemo(
    () =>
      buildConversationActionsModel({
        canTransform: controller.canTransform,
        isArchiving: controller.isArchiving,
        showDebug: controller.showDebug,
      }),
    [controller.canTransform, controller.isArchiving, controller.showDebug],
  );
  const emptyState = useMemo(
    () => <EmptyState sfSymbol="bubble.left" title={t.chat.emptyState.title} />,
    [],
  );
  const errorState = useMemo(
    () => (
      <EmptyState
        action={{ label: t.chat.loadErrorRetry, onPress: () => void controller.refetchMessages() }}
        sfSymbol="arrow.clockwise.circle"
        title={t.chat.loadErrorTitle}
      />
    ),
    [controller],
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
                    onPress={controller.handleOpenSearch}
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
                    isOn={controller.showDebug}
                    onPress={controller.handleToggleDebug}
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

                      controller.handleTransformFromMenu(item.type);
                    }}
                  >
                    {item.label}
                  </Stack.Toolbar.MenuAction>
                );
              }

              return (
                <Stack.Toolbar.MenuAction
                  key={item.kind}
                  destructive={item.kind === 'archive'}
                  icon={getConversationActionIcon(item.kind)}
                  onPress={controller.handleArchiveChat}
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
        <ChatSearchModal
          visible={controller.showSearch}
          searchQuery={controller.searchQuery}
          resultCount={controller.displayMessages.length}
          searchInputRef={controller.searchInputRef}
          onClose={controller.handleCloseSearch}
          onChangeSearchQuery={controller.handleSearchQueryChange}
        />
        <ChatMessageList
          isMessagesLoading={controller.isMessagesLoading}
          displayMessages={controller.displayMessages}
          showSearch={controller.showSearch}
          searchQuery={controller.searchQuery}
          markdown={controller.Markdown}
          showDebug={controller.showDebug}
          onCopy={controller.handleCopyMessage}
          onShare={(message: Parameters<typeof controller.handleShareMessage>[0]) => {
            void controller.handleShareMessage(message);
          }}
          renderIcon={renderChatIcon}
          formatTimestamp={formatRelativeAge}
          contentPaddingBottom={composerHeight + 8}
          emptyState={controller.messagesError ? errorState : emptyState}
          refreshControl={
            <RefreshControl
              refreshing={controller.isMessagesRefreshing}
              onRefresh={() => {
                void controller.refetchMessages();
              }}
            />
          }
        />
        <ComposerDock onHeightChange={setComposerHeight} testID="chat-composer-dock">
          <Composer mode="chat" chatId={chatId} />
        </ComposerDock>
        <View style={styles.reviewOverlay}>
          <ChatReviewOverlay
            pendingReview={controller.pendingReview}
            isVisible={controller.isReviewVisible}
            onAccept={() => {
              void controller.handleAcceptReview();
            }}
            onReject={() => {
              void controller.handleRejectReview();
            }}
          />
        </View>
      </View>
    </>
  );
}
