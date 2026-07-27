import type { Task } from '@hominem/rpc/types';
import { Pressable, View } from 'react-native';

import { Text, fontSizes, makeStyles, themeSpacing, useThemeColors } from '~/components/theme';
import AppIcon from '~/components/ui/icon';
import t from '~/translations';

export interface TaskListItemData extends Task {
  childCount?: number;
}

interface TaskListItemProps {
  task: TaskListItemData;
  onPress?: () => void;
  onToggleComplete: () => void;
}

function formatDueDate(dueAt: string): string {
  return new Date(dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isOverdue(dueAt: string): boolean {
  return new Date(dueAt).getTime() < Date.now();
}

export function TaskListItem({ task, onPress, onToggleComplete }: TaskListItemProps) {
  const styles = useStyles();
  const themeColors = useThemeColors();
  const isCompleted = task.status === 'completed';
  const isList = (task.childCount ?? 0) > 0;
  const overdue = !isCompleted && task.dueAt !== null && isOverdue(task.dueAt);

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={
          isCompleted ? `${task.title}, completed` : `${task.title}, mark complete`
        }
        accessibilityRole="checkbox"
        hitSlop={themeSpacing.sm}
        onPress={onToggleComplete}
        testID={`task-checkbox-${task.id}`}
      >
        <AppIcon
          name={isCompleted ? 'checkmark.circle.fill' : 'circle'}
          size={22}
          tintColor={isCompleted ? themeColors.primary : themeColors['tertiary']}
        />
      </Pressable>

      <Pressable
        accessibilityLabel={task.title}
        accessibilityRole="button"
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [styles.content, pressed && onPress && styles.pressed]}
        testID={`task-item-${task.id}`}
      >
        <View style={styles.titleRow}>
          {!isCompleted && task.priority !== 'medium' ? (
            <View
              style={[
                styles.priorityDot,
                {
                  backgroundColor:
                    task.priority === 'high' ? themeColors.destructive : themeColors.success,
                },
              ]}
            />
          ) : null}
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              { color: isCompleted ? themeColors['tertiary'] : themeColors['text-primary'] },
              isCompleted && styles.titleCompleted,
            ]}
          >
            {task.title}
          </Text>
        </View>
        {isList ? (
          <Text style={[styles.meta, { color: themeColors['text-secondary'] }]}>
            {t.tasks.tasksCount(task.childCount ?? 0)}
          </Text>
        ) : task.dueAt ? (
          <Text
            style={[
              styles.meta,
              { color: overdue ? themeColors.destructive : themeColors['text-secondary'] },
            ]}
          >
            {formatDueDate(task.dueAt)}
          </Text>
        ) : null}
      </Pressable>

      {isList ? (
        <AppIcon name="chevron.right" size={12} tintColor={themeColors['tertiary']} />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  content: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  meta: {
    fontSize: fontSizes.footnote,
  },
  pressed: {
    opacity: 0.6,
  },
  priorityDot: {
    borderRadius: 4,
    height: 6,
    width: 6,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: theme.colors['border-default'],
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: themeSpacing.sm,
    minHeight: 52,
    paddingVertical: 12,
  },
  title: {
    fontSize: fontSizes.md,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
  },
}));
