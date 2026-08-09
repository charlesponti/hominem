import { Stack } from 'expo-router';

import { TasksScreen } from '~/components/time/TasksScreen';

export default function UnscheduledTasksRoute() {
  return (
    <>
      <Stack.Screen options={{ headerBackButtonDisplayMode: 'minimal' }} />
      <TasksScreen />
    </>
  );
}
