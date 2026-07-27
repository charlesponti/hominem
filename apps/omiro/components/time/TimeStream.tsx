import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { StreamList } from '~/components/stream/StreamList';
import { makeStyles, spacing, Text } from '~/components/theme';
import { Button } from '~/components/ui/button';
import { getTimeBlockRoute } from '~/services/navigation/routes';

import type { TimeItem, TimeStreamRow } from './time-types';
import { dayKey } from './time-utils';
import { TimeRow } from './TimeRow';

interface TimeStreamProps {
  bottomPadding: number;
  error: string;
  hasScheduledItems: boolean;
  isLoadingEvents: boolean;
  isWriting: boolean;
  onConnectCalendar: () => void;
  onEndReached: () => void;
  onRefresh: () => void;
  onScrollOffsetChange: (offset: number) => void;
  onToggleEarlier: () => void;
  onToggleTask: (item: Extract<TimeItem, { kind: 'task' }>) => void;
  restoredScrollOffset: number;
  rows: TimeStreamRow[];
  showEarlier: boolean;
  unscheduledTaskCount: number;
}

export function TimeStream({
  bottomPadding,
  error,
  hasScheduledItems,
  isLoadingEvents,
  isWriting,
  onConnectCalendar,
  onEndReached,
  onRefresh,
  onScrollOffsetChange,
  onToggleEarlier,
  onToggleTask,
  restoredScrollOffset,
  rows,
  showEarlier,
  unscheduledTaskCount,
}: TimeStreamProps) {
  const router = useRouter();
  const styles = useStyles();
  const renderItem = useCallback(
    ({ item, index }: { item: TimeStreamRow; index: number }) => {
      if (item.kind === 'now') {
        return (
          <View style={styles.nowMarker} testID="time-now-marker">
            <Text variant="caption1" color="text-secondary">
              Now
            </Text>
          </View>
        );
      }
      if (item.kind === 'permission-notice') {
        return (
          <View style={styles.permissionNotice} testID="time-calendar-permission-notice">
            <Text variant="subhead" color="text-primary">
              Connect your iOS Calendar to include scheduled events.
            </Text>
            <Text color="text-secondary">
              Tasks and flexible planning remain available in Time.
            </Text>
            <Button
              label={item.status === 'denied' ? 'Open Settings' : 'Connect Calendar'}
              onPress={onConnectCalendar}
              size="sm"
              testID="time-calendar-connect"
              variant="secondary"
            />
          </View>
        );
      }
      if (item.kind === 'section') {
        return item.id === 'earlier' ? (
          <Pressable
            accessibilityLabel={showEarlier ? 'Hide earlier time' : 'Show earlier time'}
            onPress={onToggleEarlier}
            style={styles.earlierHeader}
            testID="time-earlier-toggle"
          >
            <Text variant="subhead" color="text-secondary">
              {showEarlier ? 'Hide earlier' : `Earlier · ${item.count ?? 0}`}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.unscheduledHeader} testID="time-unscheduled-section">
            <Text variant="title2" color="text-primary">
              Unscheduled
            </Text>
            <Text variant="caption1" color="text-secondary">
              {unscheduledTaskCount} {unscheduledTaskCount === 1 ? 'task' : 'tasks'}
            </Text>
          </View>
        );
      }

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
          onOpen={() => router.push(getTimeBlockRoute(item.kind, item.value.id))}
          onToggleTask={() => {
            if (item.kind === 'task') onToggleTask(item);
          }}
          showDayLabel={!previous || dayKey(item) !== dayKey(previous)}
        />
      );
    },
    [
      onConnectCalendar,
      onToggleEarlier,
      onToggleTask,
      router,
      rows,
      showEarlier,
      styles,
      unscheduledTaskCount,
    ],
  );

  const scheduledRows = rows.filter((row) => row.kind === 'task' || row.kind === 'event');
  return (
    <StreamList
      contentPaddingBottom={bottomPadding}
      contentPaddingTop={spacing[2]}
      data={rows}
      keyExtractor={(row) =>
        row.kind === 'section'
          ? row.id
          : row.kind === 'now'
            ? 'now'
            : row.kind === 'permission-notice'
              ? 'calendar-permission'
              : `${row.kind}:${row.value.id}:${row.kind === 'event' ? row.value.startDate : ''}`
      }
      ListEmptyComponent={
        !isLoadingEvents && scheduledRows.length === 0 && unscheduledTaskCount === 0 ? (
          <Text color="text-secondary" style={styles.emptyText}>
            Nothing scheduled yet.
          </Text>
        ) : null
      }
      ListFooterComponent={
        isLoadingEvents ? (
          <View style={styles.skeletons} testID="time-loading-state">
            <View style={styles.skeletonRow} />
            <View style={styles.skeletonRow} />
            <View style={styles.skeletonRow} />
          </View>
        ) : null
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text variant="title2">Time</Text>
          <Text color="text-secondary">Everything that has a place in your day.</Text>
          {!hasScheduledItems && unscheduledTaskCount > 0 ? (
            <Text color="text-secondary">No scheduled time yet.</Text>
          ) : null}
          {error ? (
            <Text color="destructive" testID="time-error">
              {error}
            </Text>
          ) : null}
        </View>
      }
      onEndReached={onEndReached}
      onScrollOffsetChange={onScrollOffsetChange}
      refreshControl={
        <RefreshControl
          refreshing={isWriting || (isLoadingEvents && rows.length > 0)}
          onRefresh={onRefresh}
        />
      }
      renderItem={renderItem}
      restoredScrollOffset={restoredScrollOffset}
      testID="time-stream"
    />
  );
}

const useStyles = makeStyles((theme) => ({
  earlierHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  emptyText: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
  },
  header: {
    gap: spacing[2],
    padding: spacing[4],
  },
  nowMarker: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  permissionNotice: {
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  skeletonRow: {
    backgroundColor: theme.colors['muted'],
    borderRadius: 8,
    height: 56,
  },
  skeletons: {
    gap: spacing[2],
    padding: spacing[4],
  },
  unscheduledHeader: {
    backgroundColor: theme.colors['muted'],
    borderTopColor: theme.colors['border-default'],
    borderTopWidth: 1,
    gap: spacing[1],
    marginTop: spacing[4],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
}));
