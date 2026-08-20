import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import type { RelativePathString } from 'expo-router';
import { Stack, useIsFocused, useRouter } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';

import { makeStyles, withAlpha } from '~/components/theme';
import { useThemeColor } from '~/components/theme';
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
  const header = useMemo(
    () => (
      <View style={styles.s0}>
        <Text style={styles.s1}>{t.settings.archivedChatsScreen.description}</Text>
      </View>
    ),
    [],
  );
  const empty = useMemo(
    () => (
      <View style={styles.s2}>
        {error ? (
          <EmptyState
            action={{ label: t.settings.archivedChatsScreen.loadErrorRetry, onPress: onRefresh }}
            sfSymbol="arrow.clockwise.circle"
            title={t.settings.archivedChatsScreen.loadErrorTitle}
          />
        ) : (
          <View style={styles.s3}>
            <Text style={styles.s4}>{t.settings.archivedChatsScreen.emptyTitle}</Text>
            <Text style={styles.s5}>{t.settings.archivedChatsScreen.emptyCopy}</Text>
          </View>
        )}
      </View>
    ),
    [error, onRefresh],
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
    const [textSecondary, tertiary] = useThemeColor([
      '--color-muted-foreground',
      '--color-tertiary',
    ]) as string[];

    return (
      <View style={styles.s6}>
        <Pressable
          onPress={() => onPressChat(chat.id)}
          style={({ pressed }) => [styles.s7, pressed ? { opacity: 0.6 } : undefined]}
        >
          <AppIcon name="tray" size={14} tintColor={textSecondary} />
          <View style={styles.s8}>
            <Text style={styles.s9}>{chat.title ?? t.inbox.item.untitledChat}</Text>
            <Text style={styles.s10}>
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

const styles = makeStyles((theme) => ({
  s0: { paddingBottom: 8, paddingHorizontal: 16, paddingTop: 8 },
  s1: { fontSize: 15, lineHeight: 22, color: theme.colors.mutedForeground },
  s2: { paddingTop: 32 },
  s3: { gap: 2, paddingVertical: 2 },
  s4: { fontSize: 15, color: theme.colors.foreground },
  s5: { lineHeight: 20, color: theme.colors.mutedForeground },
  s6: { paddingHorizontal: 16 },
  s7: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 52, paddingVertical: 12 },
  s8: { flex: 1, gap: 2 },
  s9: { fontSize: 15, color: theme.colors.foreground },
  s10: { color: theme.colors.mutedForeground },
}));
