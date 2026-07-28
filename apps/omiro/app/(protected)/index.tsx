import { Stack, useIsFocused } from 'expo-router';

import { WorkspaceScreen } from '~/components/workspace/WorkspaceScreen';

export default function ProtectedIndexRoute() {
  const isFocused = useIsFocused();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WorkspaceScreen isFocused={isFocused} />
    </>
  );
}
