import { Pressable, View } from 'react-native';

import { makeStyles, spacing, Text, useThemeColors } from '~/components/theme';
import AppIcon from '~/components/ui/icon';
import { IconButton } from '~/components/ui/icon-button';

import type { TimeItem } from './time-types';
import { dayLabel, formatEventTime, formatTaskTime, itemDate } from './time-utils';

interface TimeRowProps {
  item: TimeItem;
  onOpen: () => void;
  onToggleTask: () => void;
  showDayLabel: boolean;
}

export function TimeRow({ item, onOpen, onToggleTask, showDayLabel }: TimeRowProps) {
  const styles = useStyles();
  const themeColors = useThemeColors();
  const isTask = item.kind === 'task';
  const completed = isTask && item.value.status === 'completed';
  const supportingText = isTask
    ? item.value.location
    : (item.value.location ?? item.value.calendarTitle);

  return (
    <View>
      {showDayLabel ? (
        <View style={styles.dayHeader}>
          <Text variant="body" color="text-primary">
            {dayLabel(item)}
          </Text>
          <Text variant="caption1" color="text-secondary">
            {new Date(itemDate(item) ?? 0).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
      ) : null}
      <View style={styles.row} testID={`time-item-${item.kind}-${item.value.id}`}>
        <View style={styles.icon}>
          <AppIcon
            name={isTask ? (completed ? 'checkmark.circle.fill' : 'circle') : 'calendar'}
            size={24}
            tintColor={isTask ? themeColors.success : themeColors.primary}
          />
        </View>
        <Pressable
          accessibilityLabel={item.value.title}
          accessibilityRole="button"
          onPress={onOpen}
          style={styles.copy}
          testID={`time-item-${item.kind}-${item.value.id}-open`}
        >
          <Text variant="caption2" color="text-secondary" style={styles.eyebrow}>
            {isTask ? formatTaskTime(item.value) : formatEventTime(item.value)}
          </Text>
          <Text
            variant="body"
            color={completed ? 'tertiary' : 'text-primary'}
            style={completed ? styles.completedTitle : undefined}
          >
            {item.value.title}
          </Text>
          {supportingText ? (
            <Text ellipsizeMode="tail" numberOfLines={1} variant="caption1" color="text-secondary">
              {supportingText}
            </Text>
          ) : null}
        </Pressable>
        {isTask ? (
          <IconButton
            accessibilityLabel={completed ? 'Mark task incomplete' : 'Mark task complete'}
            icon={completed ? 'checkmark.circle.fill' : 'circle'}
            iconSize={20}
            size={44}
            testID={`time-item-task-${item.value.id}-toggle`}
            tintColor={completed ? themeColors.success : themeColors.tertiary}
            onPress={onToggleTask}
          />
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  completedTitle: { textDecorationLine: 'line-through' },
  copy: {
    flex: 1,
    gap: spacing[1],
    minWidth: 0,
  },
  dayHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing[2],
    paddingBottom: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  eyebrow: { letterSpacing: 0.2 },
  icon: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 72,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
}));
