import { IconButton } from '@ponti-studios/ui/native';
import { Pressable, Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import AppIcon from '~/components/ui/icon';

import type { TimeItem } from './time-types';
import { accentTokenIndex, dayLabel, eventTimeParts, itemDate, taskTimeParts } from './time-utils';

interface TimeRowProps {
  item: TimeItem;
  onOpen: () => void;
  onToggleTask: () => void;
  showDayLabel: boolean;
}

export function TimeRow({ item, onOpen, onToggleTask, showDayLabel }: TimeRowProps) {
  const [chart1, chart2, chart3, chart4, chart5, successColor, muted] = useCSSVariable([
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
        <View className="flex-row items-baseline gap-2 px-4 pb-2 pt-5">
          <Text className="text-caption2 font-semibold uppercase tracking-wider text-foreground">
            {dayLabel(item)}
          </Text>
          <Text className="text-caption2 uppercase tracking-wider text-muted-foreground">
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
        className="flex-row gap-3 border-b border-border px-4 py-3"
        onPress={onOpen}
        style={({ pressed }) => pressed && { backgroundColor: muted }}
        testID={`time-item-${item.kind}-${item.value.id}`}
      >
        <View className="w-16 items-end pt-0.5">
          <Text
            className="font-mono text-caption2 tracking-tight text-muted-foreground"
            numberOfLines={1}
          >
            {timeParts.primary}
          </Text>
          {timeParts.secondary ? (
            <Text
              className="font-mono text-caption2 tracking-tight text-muted-foreground opacity-60"
              numberOfLines={1}
            >
              {timeParts.secondary}
            </Text>
          ) : null}
        </View>
        <View className="w-1 rounded-full" style={{ backgroundColor: accentColor }} />
        <View className="min-w-0 flex-1 gap-0.5 pt-0.5">
          <Text
            className="text-body text-foreground"
            numberOfLines={2}
            style={completed ? { opacity: 0.5, textDecorationLine: 'line-through' } : undefined}
          >
            {item.value.title}
          </Text>
          {supportingText ? (
            <Text className="text-caption2 text-muted-foreground" numberOfLines={1}>
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
}
