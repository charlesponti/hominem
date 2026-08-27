import { useTheme } from '@shopify/restyle';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '~/components/theme';
import { IconButton } from '~/components/ui';
import AppIcon from '~/components/ui/icon';

import type { TimeItem } from './time-types';
import { accentTokenIndex, dayLabel, eventTimeParts, itemDate, taskTimeParts } from './time-utils';

interface TimeRowProps {
  item: TimeItem;
  onOpen: (item: TimeItem) => void;
  onToggleTask: (item: TimeItem) => void;
  showDayLabel: boolean;
}

export const TimeRow = memo(function TimeRow({
  item,
  onOpen,
  onToggleTask,
  showDayLabel,
}: TimeRowProps) {
  const {
    chart1,
    chart2,
    chart3,
    chart4,
    chart5,
    success: successColor,
    muted,
  } = useTheme().colors;
  const isTask = item.kind === 'task';
  const completed = isTask && item.value.status === 'completed';
  const supportingText = isTask
    ? item.value.location
    : (item.value.location ?? item.value.calendarTitle);
  const timeParts = isTask ? taskTimeParts(item.value) : eventTimeParts(item.value);
  const accentColors = [chart1, chart2, chart3, chart4, chart5];
  const accentColor = isTask
    ? successColor
    : accentColors[accentTokenIndex(item.value.calendarTitle ?? item.value.title)];

  return (
    <View>
      {showDayLabel ? (
        <View style={styles.dayHeader}>
          <Text style={styles.dayLabel}>{dayLabel(item)}</Text>
          <Text style={styles.dayDate}>
            {new Date(itemDate(item) ?? 0).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
      ) : null}
      <Pressable
        accessibilityLabel={item.value.title}
        accessibilityRole="button"
        onPress={() => onOpen(item)}
        style={({ pressed }) => [styles.itemRow, pressed && { backgroundColor: muted }]}
        testID={`time-item-${item.kind}-${item.value.id}`}
      >
        <View style={styles.timeColumn}>
          <Text style={styles.timePrimary} numberOfLines={1}>
            {timeParts.primary}
          </Text>
          {timeParts.secondary ? (
            <Text style={styles.timeSecondary} numberOfLines={1}>
              {timeParts.secondary}
            </Text>
          ) : null}
        </View>
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
        <View style={styles.itemContent}>
          <Text
            style={[
              styles.itemTitle,
              completed ? { opacity: 0.5, textDecorationLine: 'line-through' } : undefined,
            ]}
          >
            {item.value.title}
          </Text>
          {supportingText ? (
            <Text style={styles.itemSupportingText} numberOfLines={1}>
              {supportingText}
            </Text>
          ) : null}
        </View>
        {isTask ? (
          <IconButton
            accessibilityLabel={completed ? 'Mark task incomplete' : 'Mark task complete'}
            onPress={() => onToggleTask(item)}
            testID={`time-item-task-${item.value.id}-toggle`}
            variant="plain"
          >
            <AppIcon
              name={completed ? 'checkmark.circle.fill' : 'circle'}
              size={20}
              tintColor={completed ? successColor : undefined}
            />
          </IconButton>
        ) : null}
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 20,
  },
  dayLabel: {
    ...theme.typography.caption2,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0,
    color: theme.colors.foreground,
  },
  dayDate: {
    ...theme.typography.caption2,
    textTransform: 'uppercase',
    letterSpacing: 0,
    color: theme.colors.mutedForeground,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timeColumn: { width: 64, alignItems: 'flex-end', paddingTop: 2 },
  timePrimary: {
    ...theme.typography.caption2,
    fontFamily: 'Menlo',
    letterSpacing: 0,
    color: theme.colors.mutedForeground,
  },
  timeSecondary: {
    ...theme.typography.caption2,
    fontFamily: 'Menlo',
    letterSpacing: 0,
    color: theme.colors.mutedForeground,
    opacity: 0.6,
  },
  accentBar: { width: 4, borderRadius: 999 },
  itemContent: { minWidth: 0, flex: 1, gap: 2, paddingTop: 2 },
  itemTitle: { ...theme.typography.body, color: theme.colors.foreground },
  itemSupportingText: { ...theme.typography.caption2, color: theme.colors.mutedForeground },
});
