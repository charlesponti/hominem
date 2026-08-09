import { Stack } from 'expo-router';

import { NavDrawerMenuButton } from '~/components/navigation/NavDrawerMenuButton';
import { RootSceneGesture } from '~/components/navigation/RootSceneGesture';
import { TimeHeaderActions, TimeScreen } from '~/components/time/TimeScreen';

export default function TimeRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Time',
          headerLargeTitle: false,
          headerLeft: () => <NavDrawerMenuButton />,
          headerRight: () => <TimeHeaderActions />,
        }}
      />
      <RootSceneGesture>
        <TimeScreen />
      </RootSceneGesture>
    </>
  );
}
