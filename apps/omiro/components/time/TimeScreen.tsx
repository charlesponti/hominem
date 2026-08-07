import { useIsFocused, useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { Text } from '~/components/theme';
import { getTimeBlockRoute, UNSCHEDULED_ROUTE } from '~/services/navigation/routes';
import { useTasksQuery } from '~/services/tasks/use-tasks-query';

import { getUnscheduledTasks } from './time-utils';
import { TimeWorkspace } from './TimeWorkspace';

export function TimeScreen() {
  const isFocused = useIsFocused();
  const router = useRouter();

  return (
    <TimeWorkspace
      isFocused={isFocused}
      onOpenItem={(item) => router.push(getTimeBlockRoute(item.kind, item.value.id))}
    />
  );
}

export function TimeHeaderActions() {
  const router = useRouter();
  const { data: tasks = [] } = useTasksQuery();
  const unscheduledCount = getUnscheduledTasks(tasks).length;

  return (
    <Pressable
      accessibilityLabel="Open unscheduled tasks"
      accessibilityRole="button"
      onPress={() => router.push(UNSCHEDULED_ROUTE)}
      testID="time-unscheduled-button"
    >
      <Text color="primary" variant="subhead">
        {unscheduledCount > 0 ? `Unscheduled ${unscheduledCount}` : 'Unscheduled'}
      </Text>
    </Pressable>
  );
}
