import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { RefreshControl, Text, View } from 'react-native';

import { Composer } from '~/components/composer/Composer';
import { ComposerDock, useComposerDockMetrics } from '~/components/composer/ComposerDock';
import { useStyles } from '~/components/theme';
import { useInboxStreamItems } from '~/services/inbox/use-inbox-stream-items';
import { clearAllDraft, readAllDraft, writeAllDraft } from '~/services/navigation/launch-state';
import { useTasksQuery } from '~/services/tasks/use-tasks-query';

import { InboxStreamItem } from './InboxStreamItem';
import type { InboxStreamItemData } from './InboxStreamItem.types';
import { getEnteringItemIds } from './stream-rows';

export type StreamFilter = 'all' | 'chats' | 'notes';

export const streamFilterOptions: { key: StreamFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'chats', label: 'Chats' },
  { key: 'notes', label: 'Notes' },
];

function filterItems(items: InboxStreamItemData[], filter: StreamFilter): InboxStreamItemData[] {
  if (filter === 'all') {
    return items;
  }
  const kind = filter === 'chats' ? 'chat' : 'note';
  return items.filter((item) => item.kind === kind);
}

interface StreamScreenProps {
  filter: StreamFilter;
}

export function StreamScreen({ filter }: StreamScreenProps) {
  const { inset: composerInset, safeAreaBottom } = useComposerDockMetrics();
  const inbox = useInboxStreamItems();
  const { isFetching: isFetchingTasks, refetch: refetchTasks } = useTasksQuery();
  const styles = useStyles((theme) => ({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingBottom: 16 },
    emptyText: { paddingHorizontal: 16, color: theme.colors.mutedForeground },
  }));

  const items = useMemo(() => filterItems(inbox.items, filter), [inbox.items, filter]);
  const inset = useMemo(() => ({ bottom: composerInset }), [composerInset]);

  // Seeded with whatever the first settled render holds (including empty),
  // then grows with every commit -- the same gating ChatMessageList uses so
  // historical rows never count as new.
  const seenIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (inbox.isInitialLoading) {
      return;
    }
    const seen = seenIdsRef.current ?? new Set<string>();
    for (const item of inbox.items) {
      seen.add(item.id);
    }
    seenIdsRef.current = seen;
  }, [inbox.isInitialLoading, inbox.items]);

  const enteringIds = useMemo(
    () => getEnteringItemIds(items, seenIdsRef.current ?? new Set<string>()),
    [items],
  );

  const renderItem = useCallback<ListRenderItem<InboxStreamItemData>>(
    ({ item }) => <InboxStreamItem isNew={enteringIds.has(item.id)} item={item} />,
    [enteringIds],
  );

  return (
    <View style={styles.container} testID="stream-screen">
      <FlashList
        contentContainerStyle={styles.content}
        contentInset={inset}
        contentInsetAdjustmentBehavior="automatic"
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          !inbox.isInitialLoading ? (
            <Text style={styles.emptyText}>Capture a thought to start your inbox.</Text>
          ) : null
        }
        onEndReached={() => {
          if (inbox.hasNextPage && !inbox.isFetchingNextPage) {
            void inbox.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        refreshControl=<RefreshControl
          refreshing={inbox.isRefreshing || isFetchingTasks}
          onRefresh={() => {
            void inbox.refetch();
            void refetchTasks();
          }}
        />
        renderItem={renderItem}
        scrollIndicatorInsets={inset}
        showsVerticalScrollIndicator={false}
      />
      <ComposerDock safeAreaBottom={safeAreaBottom} testID="stream-composer-dock">
        <Composer
          entryMode="mixed"
          initialMessage={readAllDraft()}
          mode="inbox"
          onClearDraft={clearAllDraft}
          onDraftChange={writeAllDraft}
        />
      </ComposerDock>
    </View>
  );
}
