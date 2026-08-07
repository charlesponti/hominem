import { Stack } from 'expo-router';

import { UnscheduledTasksScreen } from '~/components/time/UnscheduledTasksScreen';

export default function UnscheduledTasksRoute() {
  return (
    <>
      <Stack.Screen options={{ headerBackButtonDisplayMode: 'minimal' }} />
      <UnscheduledTasksScreen />
    </>
  );
}
