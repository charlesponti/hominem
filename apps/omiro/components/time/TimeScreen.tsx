import { MenuView, type MenuAction, type NativeActionEvent } from '@expo/ui/community/menu';
import { IconButton } from '@ponti-studios/ui/native';
import { useIsFocused, useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { getTimeBlockRoute, UNSCHEDULED_ROUTE } from '~/services/navigation/routes';

import AppIcon from '../ui/icon';
import { TimePreviewProvider, useTimePreview } from './time-preview-context';
import { TimeWorkspace } from './TimeWorkspace';

export function TimeScreen() {
  const isFocused = useIsFocused();
  const router = useRouter();

  return (
    <TimePreviewProvider>
      <TimeWorkspace
        isFocused={isFocused}
        onOpenItem={(item) => router.push(getTimeBlockRoute(item.kind, item.value.id))}
      />
    </TimePreviewProvider>
  );
}

export function TimeHeaderActions() {
  const router = useRouter();

  return (
    <>
      {__DEV__ ? <TimePreviewMenuButton /> : null}
      <Pressable
        accessibilityLabel="Open unscheduled tasks"
        accessibilityRole="button"
        onPress={() => router.push(UNSCHEDULED_ROUTE)}
        testID="time-unscheduled-button"
      >
        <AppIcon name="checkmark.circle.dotted" size={24} />
      </Pressable>
    </>
  );
}

// __DEV__-only: lets a dev preview the Time stream's design with fixture data
// (multiple events per day, overlapping times, empty state, etc.) without a
// real calendar/task backend. See time-preview-scenarios.ts.
function TimePreviewMenuButton() {
  const { scenario, scenarios, setScenarioId } = useTimePreview();

  const actions: MenuAction[] = [
    ...scenarios.map((candidate) => ({
      id: candidate.id,
      title: candidate.label,
      state: scenario?.id === candidate.id ? ('on' as const) : undefined,
    })),
    {
      id: 'real-data',
      title: 'Real data',
      state: scenario == null ? ('on' as const) : undefined,
    },
  ];

  const onPressAction = (event: NativeActionEvent) => {
    const id = event.nativeEvent.event;
    setScenarioId(id === 'real-data' ? null : id);
  };

  return (
    <MenuView
      actions={actions}
      onPressAction={onPressAction}
      testID="time-preview-menu-button"
    >
      <IconButton accessibilityLabel="Preview Time with fixture data" variant="plain">
        <AppIcon name={scenario ? 'flask.fill' : 'flask'} size={22} />
      </IconButton>
    </MenuView>
  );
}
