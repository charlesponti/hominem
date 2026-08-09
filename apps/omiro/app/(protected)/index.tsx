import { Stack } from 'expo-router';

import { HomeScreen } from '~/components/home/HomeScreen';
import { NavDrawerMenuButton } from '~/components/navigation/NavDrawerMenuButton';
import { RootSceneGesture } from '~/components/navigation/RootSceneGesture';

export default function HomeRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'All',
          headerLargeTitle: false,
          headerLeft: () => <NavDrawerMenuButton />,
        }}
      />
      <RootSceneGesture>
        <HomeScreen />
      </RootSceneGesture>
    </>
  );
}
