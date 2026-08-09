import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import type { RelativePathString } from 'expo-router';
import { Stack, useIsFocused, useRouter } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

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
      <View className="pb-2 px-4 pt-2">
        <Text className="text-[15px] leading-[22px] text-muted-foreground">
          {t.settings.archivedChatsScreen.description}
        </Text>
      </View>
    ),
    [],
  );
  const empty = useMemo(
    () => (
      <View className="pt-8">
        {error ? (
          <EmptyState
            action={{ label: t.settings.archivedChatsScreen.loadErrorRetry, onPress: onRefresh }}
            sfSymbol="arrow.clockwise.circle"
            title={t.settings.archivedChatsScreen.loadErrorTitle}
          />
        ) : (
          <View className="gap-0.5 py-0.5">
            <Text className="text-[15px] text-foreground">
              {t.settings.archivedChatsScreen.emptyTitle}
            </Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              {t.settings.archivedChatsScreen.emptyCopy}
            </Text>
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
    const [textSecondary, tertiary] = useCSSVariable([
      '--color-muted-foreground',
      '--color-tertiary',
    ]) as string[];

    return (
      <View className="px-4">
        <Pressable
          onPress={() => onPressChat(chat.id)}
          className="items-center flex-row gap-2.5 min-h-[52px] py-3"
          style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}
        >
          <AppIcon name="tray" size={14} tintColor={textSecondary} />
          <View className="flex-1 gap-0.5">
            <Text className="text-[15px] text-foreground">
              {chat.title ?? t.inbox.item.untitledChat}
            </Text>
            <Text className="text-xs text-muted-foreground">
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
