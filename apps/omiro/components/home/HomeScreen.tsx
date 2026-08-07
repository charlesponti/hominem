import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { Composer } from '~/components/composer/Composer';
import { ComposerDock } from '~/components/composer/ComposerDock';
import { InboxStreamItem } from '~/components/inbox/InboxStreamItem';
import { makeStyles, Text } from '~/components/theme';
import { useInboxStreamItems } from '~/services/inbox/use-inbox-stream-items';
import {
  clearInboxDraft,
  readInboxDraft,
  writeInboxDraft,
} from '~/services/navigation/launch-state';
import { useTasksQuery } from '~/services/tasks/use-tasks-query';

export function HomeScreen() {
  const styles = useStyles();
  const inbox = useInboxStreamItems();
  const { isFetching: isFetchingTasks, refetch: refetchTasks } = useTasksQuery();
  const recentItems = inbox.items.slice(0, 6);

  return (
    <View style={styles.container} testID="home-screen">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
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
            <Text color="text-secondary" style={styles.emptyCopy}>
              Capture a thought to start your inbox.
            </Text>
          ) : null}
        </HomeSection>
      </ScrollView>
      <ComposerDock testID="home-composer-dock">
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
  const styles = useStyles();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="title2">{title}</Text>
        {actionLabel && onActionPress ? (
          <Pressable accessibilityRole="button" onPress={onActionPress}>
            <Text color="primary" variant="subhead">
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  container: { backgroundColor: theme.colors.background, flex: 1 },
  content: { gap: theme.spacing.lg, paddingBottom: 128 },
  emptyCopy: { paddingHorizontal: theme.spacing.lg },
  section: { gap: theme.spacing.sm },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
  },
}));
