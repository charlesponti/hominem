import { MenuView, type MenuAction, type NativeActionEvent } from '@expo/ui/community/menu';
import { IconButton, nativeShadows } from '@ponti-studios/ui/native';
import * as Clipboard from 'expo-clipboard';
import { useIsFocused, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { getTimeBlockRoute, UNSCHEDULED_ROUTE } from '~/services/navigation/routes';

import AppIcon from '../ui/icon';
import { useTimePreview } from './time-preview-context';
import { TimeComposer } from './TimeComposer';
import { TimeStream } from './TimeStream';
import { useTimeScreen } from './use-time-screen';

export function TimeScreen() {
  const isFocused = useIsFocused();
  const router = useRouter();
  const viewModel = useTimeScreen({
    isFocused,
    onOpenEvent: (event) => router.push(getTimeBlockRoute('event', event.id)),
  });
  const { calendar } = viewModel;

  return (
    <View className="bg-background flex-1" testID="time-screen">
      <TimeStream
        calendarPermission={calendar.permission}
        isLoadingEvents={calendar.isLoadingEvents}
        onConnectCalendar={() => void calendar.connectCalendar()}
        onEndReached={() => void calendar.loadNextPage()}
        onOpenItem={(item) => router.push(getTimeBlockRoute(item.kind, item.value.id))}
        onRefresh={calendar.reset}
        onScrollOffsetChange={viewModel.onScrollOffsetChange}
        onToggleTask={viewModel.onToggleTask}
        restoredScrollOffset={viewModel.restoredScrollOffset}
        rows={viewModel.rows}
        unscheduledTaskCount={viewModel.unscheduledTaskCount}
      />
      {calendar.hasLoadedEvents ? <View testID="time-events-ready" /> : null}
      {viewModel.errorToast !== null ? (
        <View
          key={viewModel.toastKey}
          className="flex-row items-start gap-1 mx-4 mb-1 p-2 border-destructive"
          style={{ borderCurve: 'continuous', boxShadow: nativeShadows.md }}
        >
          <Pressable
            accessibilityLabel={`Error: ${viewModel.errorToast}`}
            accessibilityRole="button"
            onPress={viewModel.onExpandError}
            className="flex-1 flex-row items-center gap-1"
          >
            <Text
              className="text-destructive flex-1 text-footnote"
              numberOfLines={viewModel.toastExpanded ? undefined : 1}
            >
              {viewModel.errorToast}
            </Text>
            <IconButton
              accessibilityLabel="Copy error"
              onPress={() => void Clipboard.setStringAsync(viewModel.errorToast ?? '')}
            >
              <AppIcon name="doc.on.doc" size={20} />
            </IconButton>
          </Pressable>
          <IconButton accessibilityLabel="Dismiss error" onPress={viewModel.onDismissError}>
            <AppIcon name="xmark" size={20} />
          </IconButton>
        </View>
      ) : null}
      <TimeComposer
        disabled={viewModel.interaction.kind === 'parsing' || viewModel.isSaving}
        isSaving={viewModel.isSaving}
        onChangeText={viewModel.setPrompt}
        onCancel={viewModel.cancelResult}
        onChooseEvent={(id) => router.push(getTimeBlockRoute('event', id))}
        onChooseOpening={viewModel.chooseOpening}
        onEditField={viewModel.updateDraft}
        onSubmit={() => void viewModel.ask()}
        onSubmitDraft={() => void viewModel.submitDraft()}
        state={viewModel.interaction}
        value={viewModel.prompt}
      />
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
