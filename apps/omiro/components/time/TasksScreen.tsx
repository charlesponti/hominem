import { Stack, useRouter } from 'expo-router';
import { RefreshControl, Text, View } from 'react-native';

import { StreamList } from '~/components/stream/StreamList';
import { makeStyles, useThemeColor } from '~/components/theme';
import { IconButton, ListRow } from '~/components/ui';
import AppIcon from '~/components/ui/icon';
import { getTaskDetailRoute, getTaskScheduleRoute } from '~/services/navigation/routes';
import { useTasksQuery } from '~/services/tasks/use-tasks-query';

import { getUnscheduledTasks } from './time-utils';

export function TasksScreen() {
  const router = useRouter();
  const successColor = useThemeColor('--color-success') as string;
  const { data: tasks = [], isFetching, refetch } = useTasksQuery();
  const unscheduledTasks = getUnscheduledTasks(tasks);

  return (
    <View style={styles.container} testID="unscheduled-tasks-screen">
      <Stack.Screen options={{ headerShown: true, title: 'Tasks' }} />
      <StreamList
        contentPaddingTop={16}
        data={unscheduledTasks}
        keyExtractor={(task) => task.id}
        ListEmptyComponent={
          !isFetching ? (
            <Text style={styles.emptyStateText}>Every open task has a time or deadline.</Text>
          ) : null
        }
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} />}
        renderItem={({ item }) => (
          <ListRow
            accessibilityLabel={item.title}
            leading={<AppIcon name="circle" size={20} tintColor={successColor} />}
            onPress={() => router.push(getTaskDetailRoute(item.id))}
            subtitle={item.durationMinutes ? `${item.durationMinutes} min` : null}
            testID={`unscheduled-task-${item.id}`}
            title={item.title}
            trailing={
              <IconButton
                accessibilityLabel={`Schedule ${item.title}`}
                onPress={() => router.push(getTaskScheduleRoute(item.id))}
                testID={`unscheduled-task-${item.id}-schedule`}
              >
                <AppIcon name="calendar.badge.plus" size={20} />
              </IconButton>
            }
          />
        )}
        testID="unscheduled-task-list"
      />
    </View>
  );
}

const styles = makeStyles((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  emptyStateText: { color: theme.colors.mutedForeground, paddingHorizontal: 16, paddingTop: 24 },
}));
