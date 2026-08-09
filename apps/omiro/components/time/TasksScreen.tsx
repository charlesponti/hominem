import { IconButton, ListRow } from '@ponti-studios/ui/native';
import { Stack, useRouter } from 'expo-router';
import { RefreshControl, Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { StreamList } from '~/components/stream/StreamList';
import AppIcon from '~/components/ui/icon';
import { getTaskDetailRoute, getTaskScheduleRoute } from '~/services/navigation/routes';
import { useTasksQuery } from '~/services/tasks/use-tasks-query';

import { getUnscheduledTasks } from './time-utils';

export function TasksScreen() {
  const router = useRouter();
  const successColor = useCSSVariable('--color-success') as string;
  const { data: tasks = [], isFetching, refetch } = useTasksQuery();
  const unscheduledTasks = getUnscheduledTasks(tasks);

  return (
    <View className="flex-1 bg-background" testID="unscheduled-tasks-screen">
      <Stack.Screen options={{ headerShown: true, title: 'Tasks' }} />
      <StreamList
        contentPaddingTop={16}
        data={unscheduledTasks}
        keyExtractor={(task) => task.id}
        ListEmptyComponent={
          !isFetching ? (
            <Text className="text-muted-foreground px-4 pt-6">
              Every open task has a time or deadline.
            </Text>
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
