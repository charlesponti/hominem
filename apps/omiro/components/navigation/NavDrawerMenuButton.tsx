import { MenuView, type MenuAction, type NativeActionEvent } from '@expo/ui/community/menu';
import { IconButton } from '@ponti-studios/ui/native';
import { useRouter, useSegments } from 'expo-router';

import AppIcon from '~/components/ui/icon';
import { ALL_ROUTE, SETTINGS_ROUTE, TIME_ROUTE } from '~/services/navigation/routes';

type Destination = 'all' | 'time' | 'settings';

const destinations: {
  key: Destination;
  label: string;
  icon: MenuAction['image'];
  route: typeof ALL_ROUTE;
}[] = [
  { key: 'all', label: 'All', icon: 'tray.full.fill', route: ALL_ROUTE },
  { key: 'time', label: 'Time', icon: 'clock.fill', route: TIME_ROUTE },
];

const settingsDestination: { key: Destination; label: string; icon: MenuAction['image'] } = {
  key: 'settings',
  label: 'Settings',
  icon: 'person.crop.circle',
};

function getActiveDestination(segments: readonly string[]): Destination | null {
  const [root, section] = segments;
  if (root !== '(protected)') return null;
  if (!section) return 'all';
  if (section === 'time') return 'time';
  if (section === 'settings') return 'settings';
  return null;
}

export function NavDrawerMenuButton() {
  const segments = useSegments();
  const active = getActiveDestination(segments as string[]);
  const router = useRouter();

  const actions: MenuAction[] = [
    ...destinations.map((destination) => ({
      id: destination.key,
      title: destination.label,
      image: destination.icon,
      state: destination.key === active ? ('on' as const) : undefined,
    })),
    {
      id: settingsDestination.key,
      title: settingsDestination.label,
      image: settingsDestination.icon,
      state: settingsDestination.key === active ? ('on' as const) : undefined,
    },
  ];

  const onPressAction = (event: NativeActionEvent) => {
    const destination = event.nativeEvent.event as Destination;
    if (destination === 'settings') {
      router.push(SETTINGS_ROUTE as never);
      return;
    }

    const route = destinations.find((item) => item.key === destination)?.route;
    if (route) {
      router.replace(route as never);
    }
  };

  return (
    <MenuView actions={actions} onPressAction={onPressAction} testID="nav-drawer-menu-button">
      <IconButton accessibilityLabel="Open navigation menu" variant="plain">
        <AppIcon name="line.3.horizontal" size={20} />
      </IconButton>
    </MenuView>
  );
}
