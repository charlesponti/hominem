import { useIsFocused } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { RefreshControl, Text, View } from 'react-native';

import { StreamList } from '~/components/stream/StreamList';
import { Button } from '~/components/ui/button';
import {
  useCalendarEvents,
  useCalendarPermission,
  useConnectCalendar,
} from '~/services/calendar/calendar-queries';
import { useTaskComplete } from '~/services/tasks/use-task-complete';
import { useTasksQuery } from '~/services/tasks/use-tasks-query';

import { useTimePreview } from './time-preview-store';
import type { TimeItem } from './time-types';
import { buildTimeStreamRows, dayKey, getUnscheduledTasks } from './time-utils';
import { TimeRow } from './TimeRow';

interface TimeStreamProps {
  contentPaddingBottom: number;
  onOpenItem: (item: TimeItem) => void;
  onError: (message: string) => void;
}

interface TimeStreamRenderRow {
  item: TimeItem;
  showDayLabel: boolean;
}

export const TimeStream = memo(function TimeStream({
  contentPaddingBottom,
  onOpenItem,
  onError,
}: TimeStreamProps) {
  const isFocused = useIsFocused();
  const { scenario } = useTimePreview();
  const { data: permission = null } = useCalendarPermission({ enabled: isFocused });
  const calendar = useCalendarEvents({ enabled: isFocused && permission === 'authorized' });
  const { data: tasks = [] } = useTasksQuery({ enabled: isFocused });
  const { mutate: toggleTask } = useTaskComplete();
  const connectCalendar = useConnectCalendar();
  const scrollOffsetRef = useRef(0);
  const errorRef = useRef<string | null>(null);
  const previewEvents = scenario ? scenario.events : calendar.events;
  const previewTasks = scenario ? scenario.tasks : tasks;
  const rows = useMemo(
    () =>
      buildTimeStreamRows({
        events: previewEvents,
        loadedUntil: scenario
          ? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
          : calendar.loadedUntil,
        tasks: previewTasks,
      }),
    [calendar.loadedUntil, previewEvents, previewTasks, scenario],
  );
  const renderRows = useMemo<TimeStreamRenderRow[]>(() => {
    let previous: TimeItem | null = null;
    return rows.map((item) => {
      const showDayLabel = !previous || dayKey(item) !== dayKey(previous);
      previous = item;
      return { item, showDayLabel };
    });
  }, [rows]);
  const unscheduledTaskCount = getUnscheduledTasks(previewTasks).length;
  const error = calendar.error ?? connectCalendar.error;

  useEffect(() => {
    const message = error instanceof Error ? error.message : null;
    if (!message || message === errorRef.current) return;
    errorRef.current = message;
    onError(message);
  }, [error, onError]);

  const renderItem = useCallback(
    ({ item }: { item: TimeStreamRenderRow }) => {
      return (
        <TimeRow
          item={item.item}
          onOpen={() => onOpenItem(item.item)}
          onToggleTask={() => {
            if (item.item.kind === 'task') {
              toggleTask({
                completed: item.item.value.status !== 'completed',
                taskId: item.item.value.id,
              });
            }
          }}
          showDayLabel={item.showDayLabel}
        />
      );
    },
    [onOpenItem, toggleTask],
  );

  const isLoadingEvents = scenario ? false : calendar.isLoadingEvents;
  const scheduledRows = renderRows;

  return (
    <View className="flex-1">
      {calendar.hasLoadedEvents ? <View testID="time-events-ready" /> : null}
      {permission && permission !== 'authorized' ? (
        <View
          className="border border-border rounded-md gap-2 m-4 px-4 py-3"
          testID="time-calendar-permission-notice"
        >
          <Text className="text-subhead text-foreground">
            Connect your iOS Calendar to include scheduled events.
          </Text>
          <Text className="text-muted-foreground">
            Tasks and flexible planning remain available in Time.
          </Text>
          <Button
            label={permission === 'denied' ? 'Open Settings' : 'Connect Calendar'}
            onPress={() => connectCalendar.mutate()}
            size="sm"
            testID="time-calendar-connect"
            variant="secondary"
          />
        </View>
      ) : null}
      <StreamList
        contentPaddingBottom={contentPaddingBottom}
        contentPaddingTop={8}
        data={renderRows}
        keyExtractor={({ item }) =>
          `${item.kind}:${item.value.id}:${item.kind === 'event' ? item.value.startDate : ''}`
        }
        ListEmptyComponent={
          !isLoadingEvents && scheduledRows.length === 0 ? (
            <Text className="text-muted-foreground px-4 pt-6">
              {unscheduledTaskCount > 0
                ? 'Nothing scheduled yet. Tasks are waiting to be placed \u2014 check Tasks.'
                : 'Nothing scheduled yet. Add a time block or plan one from your tasks.'}
            </Text>
          ) : null
        }
        ListFooterComponent={
          isLoadingEvents ? (
            <View className="gap-2 p-4" testID="time-loading-state">
              <View className="bg-muted rounded-lg h-14" />
              <View className="bg-muted rounded-lg h-14" />
              <View className="bg-muted rounded-lg h-14" />
            </View>
          ) : null
        }
        onEndReached={() => {
          if (permission === 'authorized' && !scenario) void calendar.loadNextPage();
        }}
        onScrollOffsetChange={(offset) => {
          scrollOffsetRef.current = offset;
        }}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingEvents && renderRows.length > 0}
            onRefresh={() => {
              if (permission === 'authorized' && !scenario) void calendar.refresh();
            }}
          />
        }
        renderItem={renderItem}
        restoredScrollOffset={scrollOffsetRef.current}
        testID="time-stream"
      />
    </View>
  );
});
