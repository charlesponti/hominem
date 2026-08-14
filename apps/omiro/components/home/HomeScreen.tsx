import { useMemo, useState } from 'react';
import { Platform, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Composer } from '~/components/composer/Composer';
import { ComposerDock } from '~/components/composer/ComposerDock';
import { inboxDayGroupKey, inboxDayGroupLabel } from '~/components/inbox/format-inbox-date';
import { InboxStreamItem } from '~/components/inbox/InboxStreamItem';
import type { InboxStreamItemData } from '~/components/inbox/InboxStreamItem.types';
import { useInboxStreamItems } from '~/services/inbox/use-inbox-stream-items';
import {
  clearInboxDraft,
  readInboxDraft,
  writeInboxDraft,
} from '~/services/navigation/launch-state';
import { useTasksQuery } from '~/services/tasks/use-tasks-query';

function groupByDay(items: InboxStreamItemData[]) {
  const groups: { key: string; label: string; items: InboxStreamItemData[] }[] = [];
  for (const item of items) {
    const key = inboxDayGroupKey(item.updatedAt);
    const lastGroup = groups.at(-1);
    if (lastGroup?.key === key) {
      lastGroup.items.push(item);
    } else {
      groups.push({ key, label: inboxDayGroupLabel(item.updatedAt), items: [item] });
    }
  }
  return groups;
}

export function HomeScreen() {
  const [composerInset, setComposerInset] = useState(0);
  const inbox = useInboxStreamItems();
  const { isFetching: isFetchingTasks, refetch: refetchTasks } = useTasksQuery();
  const recentItems = inbox.items.slice(0, 6);
  const dayGroups = useMemo(() => groupByDay(recentItems), [recentItems]);
  const inset = useMemo(
    () => (Platform.OS === 'ios' ? { bottom: composerInset } : undefined),
    [composerInset],
  );

  return (
    <View className="flex-1 bg-background" testID="home-screen">
      <ScrollView
        contentInset={inset}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={
          Platform.OS === 'android' ? { paddingBottom: composerInset + 20 } : undefined
        }
        className="gap-4"
        scrollIndicatorInsets={inset}
        refreshControl={
          <RefreshControl
            refreshing={inbox.isRefreshing || isFetchingTasks}
            onRefresh={() => {
              void inbox.refetch();
              void refetchTasks();
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2">
          {dayGroups.map((group) => (
            <View key={group.key}>
              <Text className="text-caption1 text-tertiary px-4 pb-2 pt-1 font-semibold uppercase tracking-wide">
                {group.label}
              </Text>
              {group.items.map((item) => (
                <InboxStreamItem item={item} key={item.id} />
              ))}
            </View>
          ))}
          {!inbox.isInitialLoading && recentItems.length === 0 ? (
            <Text className="px-4 text-muted-foreground">
              Capture a thought to start your inbox.
            </Text>
          ) : null}
        </View>
      </ScrollView>
      <ComposerDock onInsetChange={setComposerInset} testID="home-composer-dock">
        <Composer
          entryMode="mixed"
          initialMessage={readInboxDraft()}
          mode="inbox"
          onClearDraft={clearInboxDraft}
          onDraftChange={writeInboxDraft}
        />
      </ComposerDock>
    </View>
  );
}
