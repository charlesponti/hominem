import type { Chat } from '@hominem/rpc/types';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, RefreshControl, View } from 'react-native';

import { makeStyles } from '~/components/theme';
import { EmptyState, ListRow } from '~/components/ui';
import AppIcon from '~/components/ui/icon';
import { getChatActivityAt } from '~/services/chat/chat-activity';
import { useChatArchive } from '~/services/chat/use-chat-archive';
import { useChatsList } from '~/services/chat/use-chats-list';
import { formatRelativeAge } from '~/services/date/format-relative-age';
import { getContentRoute } from '~/services/navigation/routes';

export function ChatsScreen() {
  const router = useRouter();
  const chats = useChatsList();
  const openChat = useCallback(
    (chatId: string) => router.push(getContentRoute('chat', chatId)),
    [router],
  );
  const renderItem = useCallback<ListRenderItem<Chat>>(
    ({ item }) => <ChatRow chat={item} onPress={openChat} />,
    [openChat],
  );

  if (chats.error) {
    return (
      <View style={styles.centered} testID="chats-error">
        <EmptyState
          action={{ label: 'Retry', onPress: () => void chats.refetch() }}
          description="Your chats could not be loaded."
          sfSymbol="arrow.clockwise.circle"
          title="Chats unavailable"
        />
      </View>
    );
  }

  return (
    <FlashList
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      data={chats.chats}
      keyExtractor={(chat) => chat.id}
      ListEmptyComponent={chats.isPending ? undefined : <EmptyChats />}
      onEndReached={() => {
        if (chats.hasNextPage && !chats.isFetchingNextPage) void chats.fetchNextPage();
      }}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl refreshing={chats.isRefetching} onRefresh={() => void chats.refetch()} />
      }
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      testID="chats-screen"
    />
  );
}

function EmptyChats() {
  return (
    <View style={styles.centered}>
      <EmptyState
        description="Start a new conversation to see it here."
        sfSymbol="bubble.left"
        title="No chats yet"
      />
    </View>
  );
}

function ChatRow({ chat, onPress }: { chat: Chat; onPress: (chatId: string) => void }) {
  const archive = useChatArchive({ chatId: chat.id });
  const confirmArchive = useCallback(() => {
    Alert.alert('Archive chat?', 'You can find it later in Settings.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: () => void archive.mutateAsync() },
    ]);
  }, [archive]);

  return (
    <ListRow
      accessibilityLabel={`Open ${chat.title || 'untitled chat'}`}
      actionTestID={`chats-item-${chat.id}`}
      leading={<AppIcon name="bubble.left.fill" size={14} />}
      onLongPress={confirmArchive}
      onPress={() => onPress(chat.id)}
      subtitle={formatRelativeAge(getChatActivityAt(chat))}
      title={chat.title || 'Untitled chat'}
    />
  );
}

const styles = makeStyles((theme) => ({
  centered: {
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: { paddingHorizontal: 16 },
}));
