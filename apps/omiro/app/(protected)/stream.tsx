import { Stack } from 'expo-router';
import { useState } from 'react';

import { StreamScreen, streamFilterOptions, type StreamFilter } from '~/components/inbox/StreamScreen';
import { NavDrawerMenuButton } from '~/components/navigation/NavDrawerMenuButton';
import { RootSceneGesture } from '~/components/navigation/RootSceneGesture';
import { SegmentedControl } from '~/components/ui';

export default function StreamRoute() {
  const [filter, setFilter] = useState<StreamFilter>('all');

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Stream',
          headerLeft: () => <NavDrawerMenuButton />,
          headerTitle: () => (
            <SegmentedControl
              onChange={setFilter}
              options={streamFilterOptions}
              testID="stream-filter"
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
