import { MenuView, type MenuAction, type NativeActionEvent } from '@expo/ui/community/menu';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ComposerDock, useComposerDockMetrics } from '~/components/composer/ComposerDock';
import { useAppTheme, useStyles } from '~/components/theme';
import { IconButton } from '~/components/ui';
import { getTimeBlockRoute, UNSCHEDULED_ROUTE } from '~/services/navigation/routes';

import AppIcon from '../ui/icon';
import { useTimePreview } from './time-preview-store';
import { TimeComposer } from './TimeComposer';
import { TimeStream } from './TimeStream';

export function TimeScreen() {
  const router = useRouter();
  const { inset: composerInset, safeAreaBottom } = useComposerDockMetrics();
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);
  const [toastExpanded, setToastExpanded] = useState(false);
  const showError = useCallback((message: string) => {
    setToastExpanded(false);
    setToastKey((key) => key + 1);
    setErrorToast(message);
  }, []);
  const openItem = useCallback(
    (item: { kind: 'event' | 'task'; value: { id: string } }) =>
      router.push(getTimeBlockRoute(item.kind, item.value.id)),
    [router],
  );
  const openEvent = useCallback(
    (event: { id: string }) => router.push(getTimeBlockRoute('event', event.id)),
    [router],
  );
  const theme = useAppTheme();
  const styles = useStyles((theme) => ({
    container: { backgroundColor: theme.colors.background, flex: 1 },
    errorToast: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 4,
      marginHorizontal: 16,
      marginBottom: 4,
      padding: 8,
      borderColor: theme.colors.destructive,
    },
    errorContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
    errorText: { ...theme.textVariants.footnote, color: theme.colors.destructive, flex: 1 },
  }));

  return (
    <View style={styles.container} testID="time-screen">
      <TimeStream contentPaddingBottom={composerInset} onError={showError} onOpenItem={openItem} />
      {errorToast !== null ? (
        <View
          key={toastKey}
          style={[styles.errorToast, { borderCurve: 'continuous', boxShadow: theme.shadows.md }]}
        >
          <Pressable
            accessibilityLabel={`Error: ${errorToast}`}
            accessibilityRole="button"
            onPress={() => setToastExpanded((expanded) => !expanded)}
            style={styles.errorContent}
          >
            <Text style={styles.errorText} numberOfLines={toastExpanded ? undefined : 1}>
              {errorToast}
            </Text>
            <IconButton
              accessibilityLabel="Copy error"
              onPress={() => {
                void Clipboard.setStringAsync(errorToast);
              }}
            >
              <AppIcon name="doc.on.doc" size={20} />
            </IconButton>
          </Pressable>
          <IconButton
            accessibilityLabel="Dismiss error"
            onPress={() => {
              setErrorToast(null);
              setToastExpanded(false);
            }}
          >
            <AppIcon name="xmark" size={20} />
          </IconButton>
        </View>
      ) : null}
      <ComposerDock safeAreaBottom={safeAreaBottom} testID="time-composer-dock">
        <TimeComposer onOpenEvent={openEvent} />
      </ComposerDock>
    </View>
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

// __DEV__ only: lets a dev preview the Time stream's design with fixture
// data (multiple events per day, overlapping times, empty state, etc.)
// without needing a real calendar/task backend. See time-preview-scenarios.ts.
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
    <MenuView actions={actions} onPressAction={onPressAction} testID="time-preview-menu-button">
      <IconButton
        accessibilityLabel="Preview Time with fixture data"
        testID="time-preview-menu-button"
        variant="plain"
      >
        <AppIcon name={scenario ? 'flask.fill' : 'flask'} size={22} />
      </IconButton>
    </MenuView>
  );
}
