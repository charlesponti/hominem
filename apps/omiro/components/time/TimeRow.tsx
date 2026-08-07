import { View } from 'react-native';

import { StreamItem } from '~/components/stream/StreamItem';
import { makeStyles, Text, useThemeColors } from '~/components/theme';
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
      <StreamItem
        accessibilityLabel={item.value.title}
        actionTestID={`time-item-${item.kind}-${item.value.id}-open`}
        eyebrow={isTask ? formatTaskTime(item.value) : formatEventTime(item.value)}
        leading={
          <AppIcon
            name={isTask ? (completed ? 'checkmark.circle.fill' : 'circle') : 'calendar'}
            size={24}
            tintColor={isTask ? themeColors.success : themeColors.primary}
          />
        }
        onPress={onOpen}
        testID={`time-item-${item.kind}-${item.value.id}`}
        title={item.value.title}
        titleStyle={completed ? styles.completedTitle : undefined}
        trailing={
          isTask ? (
            <IconButton
              accessibilityLabel={completed ? 'Mark task incomplete' : 'Mark task complete'}
              icon={completed ? 'checkmark.circle.fill' : 'circle'}
              testID={`time-item-task-${item.value.id}-toggle`}
              onPress={onToggleTask}
            />
          ) : null
        }
      />
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  completedTitle: { textDecorationLine: 'line-through' },
  dayHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
}));
