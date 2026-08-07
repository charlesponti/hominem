import type { Task } from '@hominem/rpc/types';
import { Pressable, View } from 'react-native';
import { Text } from 'react-native';
import { useCSSVariable } from 'uniwind';

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
  const [primary, tertiary, destructive, success] = useCSSVariable([
    '--color-primary',
    '--color-tertiary',
    '--color-destructive',
    '--color-success',
  ]) as string[];
  const isCompleted = task.status === 'completed';
  const isList = (task.childCount ?? 0) > 0;
  const overdue = !isCompleted && task.dueAt !== null && isOverdue(task.dueAt);

  return (
    <View className="items-center border-b-border border-b flex-row gap-2 min-h-[52px] py-3">
      <Pressable
        accessibilityLabel={
          isCompleted ? `${task.title}, completed` : `${task.title}, mark complete`
        }
        accessibilityRole="checkbox"
        hitSlop={8}
        onPress={onToggleComplete}
        testID={`task-checkbox-${task.id}`}
      >
        <AppIcon
          name={isCompleted ? 'checkmark.circle.fill' : 'circle'}
          size={22}
          tintColor={isCompleted ? primary : tertiary}
        />
      </Pressable>

      <Pressable
        accessibilityLabel={task.title}
        accessibilityRole="button"
        disabled={!onPress}
        onPress={onPress}
        className="flex-1 gap-0.5 min-w-0"
        style={({ pressed }) => [pressed && onPress && { opacity: 0.6 }]}
        testID={`task-item-${task.id}`}
      >
        <View className="items-center flex-row gap-1.5">
          {!isCompleted && task.priority !== 'medium' ? (
            <View
              className="rounded h-1.5 w-1.5"
              style={{
                backgroundColor: task.priority === 'high' ? destructive : success,
              }}
            />
          ) : null}
          <Text
            numberOfLines={1}
            className={`text-base ${isCompleted ? 'line-through' : ''} ${isCompleted ? 'text-tertiary' : 'text-foreground'}`}
          >
            {task.title}
          </Text>
        </View>
        {isList ? (
          <Text className="text-muted-foreground text-footnote">
            {t.tasks.tasksCount(task.childCount ?? 0)}
          </Text>
        ) : task.dueAt ? (
          <Text
            className={`text-footnote ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {formatDueDate(task.dueAt)}
          </Text>
        ) : null}
      </Pressable>

      {isList ? <AppIcon name="chevron.right" size={12} tintColor={tertiary} /> : null}
    </View>
  );
}
