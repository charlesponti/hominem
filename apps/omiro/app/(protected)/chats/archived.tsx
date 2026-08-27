import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import type { RelativePathString } from 'expo-router';
import { Stack, useIsFocused, useRouter } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';

import { useAppTheme, useStyles } from '~/components/theme';
import { EmptyState } from '~/components/ui/EmptyState';
import AppIcon from '~/components/ui/icon';
import { useArchivedChats } from '~/hooks/useArchivedChats';
import { formatRelativeAge } from '~/services/date/format-relative-age';
import { getContentRoute } from '~/services/navigation/routes';
import t from '~/translations';

export default function ArchivedChatsScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { data: chats = [], error, isFetching, refetch } = useArchivedChats({ enabled: isFocused });
  const onPressChat = useCallback(
    (chatId: string) => {
      router.push(getContentRoute('chat', chatId) as RelativePathString);
    },
    [router],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t.settings.archivedChatsScreen.title,
        }}
      />
      <ArchivedChatsSwiftUI
        chats={chats}
        error={error}
        isRefreshing={isFetching}
        onPressChat={onPressChat}
        onRefresh={() => {
          void refetch();
        }}
      />
    </>
  );
}

function useArchivedStyles() {
  return useStyles((theme) => ({
    headerContainer: { paddingBottom: 8, paddingHorizontal: 16, paddingTop: 8 },
    description: { fontSize: 15, lineHeight: 22, color: theme.colors.mutedForeground },
    emptyContainer: { paddingTop: 32 },
    emptyContent: { gap: 2, paddingVertical: 2 },
    emptyTitle: { fontSize: 15, color: theme.colors.foreground },
    emptyMessage: { lineHeight: 20, color: theme.colors.mutedForeground },
    rowContainer: { paddingHorizontal: 16 },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
      minHeight: 52,
      paddingVertical: 12,
    },
    chatContent: { flex: 1, gap: 2 },
    chatTitle: { fontSize: 15, color: theme.colors.foreground },
    archivedLabel: { color: theme.colors.mutedForeground },
  }));
}

function ArchivedChatsSwiftUI({
  chats,
  error,
  isRefreshing,
  onPressChat,
  onRefresh,
}: {
  chats: NonNullable<ReturnType<typeof useArchivedChats>['data']>;
  error: Error | null;
  isRefreshing: boolean;
  onPressChat: (chatId: string) => void;
  onRefresh: () => void;
}) {
  const styles = useArchivedStyles();
  const header = useMemo(
    () => (
      <View style={styles.headerContainer}>
        <Text style={styles.description}>{t.settings.archivedChatsScreen.description}</Text>
      </View>
    ),
    [styles],
  );
  const empty = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        {error ? (
          <EmptyState
            action={{ label: t.settings.archivedChatsScreen.loadErrorRetry, onPress: onRefresh }}
            sfSymbol="arrow.clockwise.circle"
            title={t.settings.archivedChatsScreen.loadErrorTitle}
          />
        ) : (
          <View style={styles.emptyContent}>
            <Text style={styles.emptyTitle}>{t.settings.archivedChatsScreen.emptyTitle}</Text>
            <Text style={styles.emptyMessage}>{t.settings.archivedChatsScreen.emptyCopy}</Text>
          </View>
        )}
      </View>
    ),
    [error, onRefresh, styles],
  );
  const renderItem = useCallback<ListRenderItem<(typeof chats)[number]>>(
    ({ item }) => <ArchivedChatRow chat={item} onPressChat={onPressChat} />,
    [onPressChat],
  );

  return (
    <FlashList
      contentInsetAdjustmentBehavior="automatic"
      data={chats}
      keyExtractor={(chat) => chat.id}
      ListEmptyComponent={empty}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
    />
  );
}

const ArchivedChatRow = memo(
  ({
    chat,
    onPressChat,
  }: {
    chat: NonNullable<ReturnType<typeof useArchivedChats>['data']>[number];
    onPressChat: (chatId: string) => void;
  }) => {
    const { mutedForeground: textSecondary, tertiary } = useAppTheme().colors;
    const styles = useArchivedStyles();

    return (
      <View style={styles.rowContainer}>
        <Pressable
          onPress={() => onPressChat(chat.id)}
          style={({ pressed }) => [styles.row, pressed ? { opacity: 0.6 } : undefined]}
        >
          <AppIcon name="tray" size={14} tintColor={textSecondary} />
          <View style={styles.chatContent}>
            <Text style={styles.chatTitle}>{chat.title ?? t.inbox.item.untitledChat}</Text>
            <Text style={styles.archivedLabel}>
              Archived {formatRelativeAge(chat.archivedAt ?? chat.activityAt)}
            </Text>
          </View>
          <AppIcon name="chevron.right" size={12} tintColor={tertiary} />
        </Pressable>
      </View>
    );
  },
);

ArchivedChatRow.displayName = 'ArchivedChatRow';
