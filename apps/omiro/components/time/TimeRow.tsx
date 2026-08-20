import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { makeStyles, withAlpha } from '~/components/theme';
import { useThemeColor } from '~/components/theme';
import { IconButton } from '~/components/ui';
import AppIcon from '~/components/ui/icon';

import type { TimeItem } from './time-types';
import { accentTokenIndex, dayLabel, eventTimeParts, itemDate, taskTimeParts } from './time-utils';

interface TimeRowProps {
  item: TimeItem;
  onOpen: () => void;
  onToggleTask: () => void;
  showDayLabel: boolean;
}

export const TimeRow = memo(function TimeRow({
  item,
  onOpen,
  onToggleTask,
  showDayLabel,
}: TimeRowProps) {
  const [chart1, chart2, chart3, chart4, chart5, successColor, muted] = useThemeColor([
    '--color-chart-1',
    '--color-chart-2',
    '--color-chart-3',
    '--color-chart-4',
    '--color-chart-5',
    '--color-success',
    '--color-muted',
  ]) as string[];
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
        <View style={styles.s0}>
          <Text style={styles.s1}>{dayLabel(item)}</Text>
          <Text style={styles.s2}>
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
        style={({ pressed }) => [styles.s3, pressed && { backgroundColor: muted }]}
        testID={`time-item-${item.kind}-${item.value.id}`}
      >
        <View style={styles.s4}>
          <Text style={styles.s5} numberOfLines={1}>
            {timeParts.primary}
          </Text>
          {timeParts.secondary ? (
            <Text style={styles.s6} numberOfLines={1}>
              {timeParts.secondary}
            </Text>
          ) : null}
        </View>
        <View style={[styles.s7, { backgroundColor: accentColor }]} />
        <View style={styles.s8}>
          <Text
            style={[
              styles.s9,
              completed ? { opacity: 0.5, textDecorationLine: 'line-through' } : undefined,
            ]}
          >
            {item.value.title}
          </Text>
          {supportingText ? (
            <Text style={styles.s10} numberOfLines={1}>
              {supportingText}
            </Text>
          ) : null}
        </View>
        {isTask ? (
          <IconButton
            accessibilityLabel={completed ? 'Mark task incomplete' : 'Mark task complete'}
            onPress={onToggleTask}
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

const styles = makeStyles((theme) => ({
  s0: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 20,
  },
  s1: {
    ...theme.typography.caption2,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0,
    color: theme.colors.foreground,
  },
  s2: {
    ...theme.typography.caption2,
    textTransform: 'uppercase',
    letterSpacing: 0,
    color: theme.colors.mutedForeground,
  },
  s3: {
    flexDirection: 'row',
    gap: 12,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  s4: { width: 64, alignItems: 'flex-end', paddingTop: 2 },
  s5: {
    ...theme.typography.caption2,
    fontFamily: 'Menlo',
    letterSpacing: 0,
    color: theme.colors.mutedForeground,
  },
  s6: {
    ...theme.typography.caption2,
    fontFamily: 'Menlo',
    letterSpacing: 0,
    color: theme.colors.mutedForeground,
    opacity: 0.6,
  },
  s7: { width: 4, borderRadius: 999 },
  s8: { minWidth: 0, flex: 1, gap: 2, paddingTop: 2 },
  s9: { ...theme.typography.body, color: theme.colors.foreground },
  s10: { ...theme.typography.caption2, color: theme.colors.mutedForeground },
}));
