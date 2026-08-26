import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useCallback, useMemo } from 'react';
import { RefreshControl, Text, View } from 'react-native';

import { Composer } from '~/components/composer/Composer';
import { ComposerDock, useComposerDockMetrics } from '~/components/composer/ComposerDock';
import { makeStyles } from '~/components/theme';
import { useInboxStreamItems } from '~/services/inbox/use-inbox-stream-items';
import { clearAllDraft, readAllDraft, writeAllDraft } from '~/services/navigation/launch-state';
import { useTasksQuery } from '~/services/tasks/use-tasks-query';

import { inboxDayGroupKey, inboxDayGroupLabel } from './format-inbox-date';
import { InboxStreamItem } from './InboxStreamItem';
import type { InboxStreamItemData } from './InboxStreamItem.types';

export type StreamFilter = 'all' | 'chats' | 'notes';

export const streamFilterOptions: { key: StreamFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'chats', label: 'Chats' },
  { key: 'notes', label: 'Notes' },
];

type StreamRow =
  | { type: 'header'; key: string; label: string }
  | { type: 'row'; key: string; item: InboxStreamItemData };

function filterItems(items: InboxStreamItemData[], filter: StreamFilter): InboxStreamItemData[] {
  if (filter === 'all') return items;
  const kind = filter === 'chats' ? 'chat' : 'note';
  return items.filter((item) => item.kind === kind);
}

function buildRows(items: InboxStreamItemData[]): StreamRow[] {
  const rows: StreamRow[] = [];
  let lastGroupKey: string | null = null;
  for (const item of items) {
    const groupKey = inboxDayGroupKey(item.updatedAt);
    if (groupKey !== lastGroupKey) {
      rows.push({ type: 'header', key: `header-${groupKey}`, label: inboxDayGroupLabel(item.updatedAt) });
      lastGroupKey = groupKey;
    }
    rows.push({ type: 'row', key: item.id, item });
  }
  return rows;
}

interface StreamScreenProps {
  filter: StreamFilter;
}

export function StreamScreen({ filter }: StreamScreenProps) {
  const { inset: composerInset, safeAreaBottom } = useComposerDockMetrics();
  const inbox = useInboxStreamItems();
  const { isFetching: isFetchingTasks, refetch: refetchTasks } = useTasksQuery();

  const rows = useMemo(() => buildRows(filterItems(inbox.items, filter)), [inbox.items, filter]);
  const inset = useMemo(() => ({ bottom: composerInset }), [composerInset]);

  const renderItem = useCallback<ListRenderItem<StreamRow>>(({ item: row }) => {
    if (row.type === 'header') {
      return <Text style={styles.dayLabel}>{row.label}</Text>;
    }
    return <InboxStreamItem item={row.item} />;
  }, []);

  return (
    <View style={styles.container} testID="stream-screen">
      <FlashList
        contentContainerStyle={styles.content}
        contentInset={inset}
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        getItemType={(row) => row.type}
        keyExtractor={(row) => row.key}
        ListEmptyComponent={
          !inbox.isInitialLoading ? (
            <Text style={styles.emptyText}>Capture a thought to start your inbox.</Text>
          ) : null
        }
        onEndReached={() => {
          if (inbox.hasNextPage && !inbox.isFetchingNextPage) void inbox.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={inbox.isRefreshing || isFetchingTasks}
            onRefresh={() => {
              void inbox.refetch();
              void refetchTasks();
            }}
          />
        }
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

const styles = makeStyles((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 16 },
  dayLabel: {
    ...theme.typography.caption1,
    color: theme.colors.tertiary,
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  emptyText: { paddingHorizontal: 16, color: theme.colors.mutedForeground },
}));
