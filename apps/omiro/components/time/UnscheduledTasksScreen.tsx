import { Stack, useRouter } from 'expo-router';
import { RefreshControl, View } from 'react-native';

import { StreamList } from '~/components/stream/StreamList';
import { makeStyles, Text, useThemeColors } from '~/components/theme';
import AppIcon from '~/components/ui/icon';
import { IconButton } from '~/components/ui/icon-button';
import { getTaskScheduleRoute } from '~/services/navigation/routes';
import { useTasksQuery } from '~/services/tasks/use-tasks-query';

import { getUnscheduledTasks } from './time-utils';

export function UnscheduledTasksScreen() {
  const router = useRouter();
  const styles = useStyles();
  const themeColors = useThemeColors();
  const { data: tasks = [], isFetching, refetch } = useTasksQuery();
  const unscheduledTasks = getUnscheduledTasks(tasks);

  return (
    <View style={styles.container} testID="unscheduled-tasks-screen">
      <Stack.Screen options={{ headerShown: true, title: 'Unscheduled' }} />
      <StreamList
        contentPaddingTop={16}
        data={unscheduledTasks}
        keyExtractor={(task) => task.id}
        ListEmptyComponent={
          !isFetching ? (
            <Text color="text-secondary" style={styles.emptyCopy}>
              Every open task has a time or deadline.
            </Text>
          ) : null
        }
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} />}
        renderItem={({ item }) => (
          <View style={styles.row} testID={`unscheduled-task-${item.id}`}>
            <View style={styles.leading}>
              <AppIcon name="circle" size={22} tintColor={themeColors.success} />
            </View>
            <View style={styles.copy}>
              <Text variant="body">{item.title}</Text>
              {item.durationMinutes ? (
                <Text color="text-secondary" variant="caption1">
                  {item.durationMinutes} min
                </Text>
              ) : null}
            </View>
            <IconButton
              accessibilityLabel={`Schedule ${item.title}`}
              icon="calendar.badge.plus"
              onPress={() => router.push(getTaskScheduleRoute(item.id))}
              testID={`unscheduled-task-${item.id}-schedule`}
            />
          </View>
        )}
        testID="unscheduled-task-list"
      />
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  container: { backgroundColor: theme.colors.background, flex: 1 },
  copy: { flex: 1, gap: theme.spacing.sm },
  emptyCopy: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl },
  headerCopy: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm },
  leading: { alignItems: 'center', justifyContent: 'center', width: 24 },
  row: {
    alignItems: 'center',
    borderBottomColor: theme.colors['border-default'],
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    minHeight: 64,
    paddingVertical: theme.spacing.sm,
  },
}));
