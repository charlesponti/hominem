import { Stack } from 'expo-router';

import { HomeScreen } from '~/components/home/HomeScreen';
import { NavDrawerMenuButton } from '~/components/navigation/NavDrawerMenuButton';
import { RootSceneGesture } from '~/components/navigation/RootSceneGesture';

export default function AllRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'All',
          headerLeft: () => <NavDrawerMenuButton />,
        }}
      />
      <RootSceneGesture>
        <HomeScreen />
      </RootSceneGesture>
    </>
  );
}
