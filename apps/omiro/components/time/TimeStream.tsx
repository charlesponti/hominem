import { useCallback } from 'react';
import { RefreshControl, Text, View } from 'react-native';

import { StreamList } from '~/components/stream/StreamList';
import { Button } from '~/components/ui/button';
import type { CalendarPermissionStatus } from '~/modules/on-device-ai';

import type { TimeItem, TimeStreamRow } from './time-types';
import { dayKey } from './time-utils';
import { TimeRow } from './TimeRow';

interface TimeStreamProps {
  calendarPermission: CalendarPermissionStatus | null;
  isLoadingEvents: boolean;
  onConnectCalendar: () => void;
  onEndReached: () => void;
  onOpenItem: (item: TimeItem) => void;
  onRefresh: () => void;
  onScrollOffsetChange: (offset: number) => void;
  onToggleTask: (item: Extract<TimeItem, { kind: 'task' }>) => void;
  restoredScrollOffset: number;
  rows: TimeStreamRow[];
  unscheduledTaskCount: number;
}

export function TimeStream({
  calendarPermission,
  isLoadingEvents,
  onConnectCalendar,
  onEndReached,
  onOpenItem,
  onRefresh,
  onScrollOffsetChange,
  onToggleTask,
  restoredScrollOffset,
  rows,
  unscheduledTaskCount,
}: TimeStreamProps) {
  const renderItem = useCallback(
    ({ item, index }: { item: TimeStreamRow; index: number }) => {
      const previous = rows
        .slice(0, index)
        .reverse()
        .find(
          (candidate): candidate is TimeItem =>
            candidate.kind === 'task' || candidate.kind === 'event',
        );

      return (
        <TimeRow
          item={item}
          onOpen={() => onOpenItem(item)}
          onToggleTask={() => {
            if (item.kind === 'task') onToggleTask(item);
          }}
          showDayLabel={!previous || dayKey(item) !== dayKey(previous)}
        />
      );
    },
    [onOpenItem, onToggleTask, rows],
  );

  const scheduledRows = rows.filter((row) => row.kind === 'task' || row.kind === 'event');

  return (
    <View className="flex-1">
      {calendarPermission && calendarPermission !== 'authorized' ? (
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
            label={calendarPermission === 'denied' ? 'Open Settings' : 'Connect Calendar'}
            onPress={onConnectCalendar}
            size="sm"
            testID="time-calendar-connect"
            variant="secondary"
          />
        </View>
      ) : null}
      <StreamList
        contentPaddingTop={8}
        data={rows}
        keyExtractor={(row) =>
          `${row.kind}:${row.value.id}:${row.kind === 'event' ? row.value.startDate : ''}`
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
        onEndReached={onEndReached}
        onScrollOffsetChange={onScrollOffsetChange}
        refreshControl={
          <RefreshControl refreshing={isLoadingEvents && rows.length > 0} onRefresh={onRefresh} />
        }
        renderItem={renderItem}
        restoredScrollOffset={restoredScrollOffset}
        testID="time-stream"
      />
    </View>
  );
}
