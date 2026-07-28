import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import type { RelativePathString } from 'expo-router';
import { Stack, useIsFocused, useRouter } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';

import { makeStyles, useThemeColors } from '~/components/theme';
import { EmptyState } from '~/components/ui/EmptyState';
import AppIcon from '~/components/ui/icon';
import { useArchivedChats } from '~/hooks/useArchivedChats';
import { formatRelativeAge } from '~/services/date/format-relative-age';
import { getContentRoute } from '~/services/navigation/routes';
import t from '~/translations';

const useStyles = makeStyles(() => ({
  chatCopy: {
    flex: 1,
    gap: 2,
  },
  chatMeta: {
    fontSize: 12,
  },
  chatRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
    paddingVertical: 12,
  },
  chatRowPressed: {
    opacity: 0.6,
  },
  chatTitle: {
    fontSize: 15,
  },
  emptyWrap: {
    paddingTop: 32,
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    gap: 2,
    paddingVertical: 2,
  },
  emptyTitle: {
    fontSize: 15,
  },
  header: {
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  helperText: {
    fontSize: 15,
    lineHeight: 22,
  },
  rowWrap: {
    paddingHorizontal: 16,
  },
}));

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
  const themeColors = useThemeColors();
  const styles = useStyles();
  const header = useMemo(
    () => (
      <View style={styles.header}>
        <Text style={[styles.helperText, { color: themeColors['text-secondary'] }]}>
          {t.settings.archivedChatsScreen.description}
        </Text>
      </View>
    ),
    [themeColors],
  );
  const empty = useMemo(
    () => (
      <View style={styles.emptyWrap}>
        {error ? (
          <EmptyState
            action={{ label: t.settings.archivedChatsScreen.loadErrorRetry, onPress: onRefresh }}
            sfSymbol="arrow.clockwise.circle"
            title={t.settings.archivedChatsScreen.loadErrorTitle}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: themeColors['text-primary'] }]}>
              {t.settings.archivedChatsScreen.emptyTitle}
            </Text>
            <Text style={[styles.emptyCopy, { color: themeColors['text-secondary'] }]}>
              {t.settings.archivedChatsScreen.emptyCopy}
            </Text>
          </View>
        )}
      </View>
    ),
    [error, onRefresh, themeColors],
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
    const themeColors = useThemeColors();
    const styles = useStyles();

    return (
      <View style={styles.rowWrap}>
        <Pressable
          onPress={() => onPressChat(chat.id)}
          style={({ pressed }) => [styles.chatRow, pressed && styles.chatRowPressed]}
        >
          <AppIcon name="tray" size={14} tintColor={themeColors['text-secondary']} />
          <View style={styles.chatCopy}>
            <Text style={[styles.chatTitle, { color: themeColors['text-primary'] }]}>
              {chat.title ?? t.inbox.item.untitledChat}
            </Text>
            <Text style={[styles.chatMeta, { color: themeColors['text-secondary'] }]}>
              Archived {formatRelativeAge(chat.archivedAt ?? chat.activityAt)}
            </Text>
          </View>
          <AppIcon name="chevron.right" size={12} tintColor={themeColors['tertiary']} />
        </Pressable>
      </View>
    );
  },
);

ArchivedChatRow.displayName = 'ArchivedChatRow';
