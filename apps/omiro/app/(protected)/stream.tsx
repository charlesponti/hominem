import { Stack } from 'expo-router';
import { useState } from 'react';

import {
  StreamScreen,
  streamFilterOptions,
  type StreamFilter,
} from '~/components/inbox/StreamScreen';
import { NavDrawerMenuButton } from '~/components/navigation/NavDrawerMenuButton';
import { RootSceneGesture } from '~/components/navigation/RootSceneGesture';
import { useThemeColor, withAlpha } from '~/components/theme';
import { SegmentedControl } from '~/components/ui';

export default function StreamRoute() {
  const [filter, setFilter] = useState<StreamFilter>('all');
  const [primary, mutedForeground, foreground] = useThemeColor([
    '--color-primary',
    '--color-muted-foreground',
    '--color-foreground',
  ]) as string[];

  return (
    <>
      <Stack.Screen
        options={{
          // The parent (protected) layout sets headerShown: false for the
          // whole "stream" group — this screen re-enables its own header.
          // Transparent/blur/shadow are already set globally in the root
          // layout's screenOptions.
          headerShown: true,
          title: 'Stream',
          headerTintColor: primary,
          headerLeft: () => <NavDrawerMenuButton />,
          headerTitle: () => (
            <SegmentedControl
              activeColor={primary}
              inactiveColor={mutedForeground}
              onChange={setFilter}
              options={streamFilterOptions}
              style={{ maxWidth: 280 }}
              testID="stream-filter"
              trackColor={withAlpha(foreground, 0.12)}
              value={filter}
            />
          ),
        }}
      />
      <RootSceneGesture>
        <StreamScreen filter={filter} />
      </RootSceneGesture>
    </>
  );
}
