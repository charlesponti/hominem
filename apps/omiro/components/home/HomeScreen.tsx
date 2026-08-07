import { useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Composer } from '~/components/composer/Composer';
import { ComposerDock } from '~/components/composer/ComposerDock';
import { InboxStreamItem } from '~/components/inbox/InboxStreamItem';
import { useInboxStreamItems } from '~/services/inbox/use-inbox-stream-items';
import {
  clearInboxDraft,
  readInboxDraft,
  writeInboxDraft,
} from '~/services/navigation/launch-state';
import { useTasksQuery } from '~/services/tasks/use-tasks-query';

export function HomeScreen() {
  const [composerHeight, setComposerHeight] = useState(0);
  const inbox = useInboxStreamItems();
  const { isFetching: isFetchingTasks, refetch: refetchTasks } = useTasksQuery();
  const recentItems = inbox.items.slice(0, 6);

  return (
    <View className="flex-1 bg-background" testID="home-screen">
      <ScrollView
        contentInset={Platform.OS === 'ios' ? { bottom: composerHeight } : undefined}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={
          Platform.OS === 'android' ? { paddingBottom: composerHeight + 20 } : undefined
        }
        className="gap-4"
        scrollIndicatorInsets={Platform.OS === 'ios' ? { bottom: composerHeight } : undefined}
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
        <HomeSection title="Continue">
          {recentItems.map((item) => (
            <InboxStreamItem item={item} key={item.id} />
          ))}
          {!inbox.isInitialLoading && recentItems.length === 0 ? (
            <Text className="px-4 text-muted-foreground">
              Capture a thought to start your inbox.
            </Text>
          ) : null}
        </HomeSection>
      </ScrollView>
      <ComposerDock onHeightChange={setComposerHeight} testID="home-composer-dock">
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

function HomeSection({
  actionLabel,
  children,
  onActionPress,
  title,
}: {
  actionLabel?: string;
  children: React.ReactNode;
  onActionPress?: () => void;
  title: string;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between px-4">
        <Text className="text-title2">{title}</Text>
        {actionLabel && onActionPress ? (
          <Pressable accessibilityRole="button" onPress={onActionPress}>
            <Text className="text-primary text-subhead">{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}
