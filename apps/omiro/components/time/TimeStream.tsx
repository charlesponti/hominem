import { useCallback } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { StreamList } from '~/components/stream/StreamList';
import { makeStyles, spacing, Text } from '~/components/theme';
import { Button } from '~/components/ui/button';
import type { CalendarPermissionStatus } from '~/modules/on-device-ai';

import type { TimeItem, TimeSection, TimeStreamRow } from './time-types';
import { dayKey } from './time-utils';
import { TimeRow } from './TimeRow';

interface TimeStreamProps {
  calendarPermission: CalendarPermissionStatus | null;
  hasScheduledItems: boolean;
  isLoadingEvents: boolean;
  isWriting: boolean;
  onConnectCalendar: () => void;
  onEndReached: () => void;
  onOpenItem: (item: TimeItem) => void;
  onRefresh: () => void;
  onScrollOffsetChange: (offset: number) => void;
  onSectionChange: (section: TimeSection) => void;
  onToggleTask: (item: Extract<TimeItem, { kind: 'task' }>) => void;
  restoredScrollOffset: number;
  rows: TimeStreamRow[];
  section: TimeSection;
  unscheduledTaskCount: number;
}

export function TimeStream({
  calendarPermission,
  hasScheduledItems,
  isLoadingEvents,
  isWriting,
  onConnectCalendar,
  onEndReached,
  onOpenItem,
  onRefresh,
  onScrollOffsetChange,
  onSectionChange,
  onToggleTask,
  restoredScrollOffset,
  rows,
  section,
  unscheduledTaskCount,
}: TimeStreamProps) {
  const styles = useStyles();
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
    <View style={styles.container}>
      {calendarPermission && calendarPermission !== 'authorized' ? (
        <View style={styles.permissionNotice} testID="time-calendar-permission-notice">
          <Text variant="subhead" color="text-primary">
            Connect your iOS Calendar to include scheduled events.
          </Text>
          <Text color="text-secondary">Tasks and flexible planning remain available in Time.</Text>
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
        key={section}
        contentPaddingTop={spacing[2]}
        data={rows}
        keyExtractor={(row) =>
          `${row.kind}:${row.value.id}:${row.kind === 'event' ? row.value.startDate : ''}`
        }
        ListEmptyComponent={
          !isLoadingEvents && scheduledRows.length === 0 ? (
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
            <Text variant="title1">Time</Text>
            <View accessibilityRole="tablist" style={styles.sectionSwitch}>
              {(['now', 'past', 'unscheduled'] as const).map((option) => {
                const selected = section === option;
                const label =
                  option === 'past' ? 'Past' : option[0].toUpperCase() + option.slice(1);
                return (
                  <Pressable
                    accessibilityLabel={label}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    key={option}
                    onPress={() => onSectionChange(option)}
                    style={({ pressed }) => [
                      styles.sectionButton,
                      selected && styles.sectionButtonActive,
                      pressed && styles.pressed,
                    ]}
                    testID={`time-section-${option}`}
                  >
                    <Text
                      color={selected ? 'text-primary' : 'text-secondary'}
                      style={styles.sectionLabel}
                      variant="caption1"
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {!hasScheduledItems && unscheduledTaskCount > 0 ? (
              <Text color="text-secondary">No scheduled time yet.</Text>
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
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  container: { flex: 1 },
  emptyText: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
  },
  header: {
    gap: spacing[2],
    padding: spacing[4],
  },
  permissionNotice: {
    borderColor: theme.colors['border-default'],
    borderRadius: theme.borderRadii.md,
    borderWidth: 1,
    gap: spacing[2],
    margin: spacing[4],
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
  pressed: {
    opacity: 0.6,
  },
  sectionButton: {
    alignItems: 'center',
    borderRadius: theme.borderRadii.sm,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  sectionButtonActive: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors['border-default'],
    borderWidth: 1,
  },
  sectionLabel: {
    fontWeight: '600',
  },
  sectionSwitch: {
    backgroundColor: theme.colors.muted,
    borderColor: theme.colors['border-default'],
    borderRadius: theme.borderRadii.md,
    borderWidth: 1,
    flexDirection: 'row',
    height: 40,
    padding: 2,
  },
}));
