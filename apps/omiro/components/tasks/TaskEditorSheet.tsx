import { TextField } from '@ponti-studios/ui/native';
import { transitionDurations } from '@ponti-studios/ui/tokens';
import { useRef, useState } from 'react';
import { Pressable, View, type TextInput } from 'react-native';
import { Text } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';

import { Button } from '~/components/ui/button';
import { ModalOverlay } from '~/components/ui/modal-overlay';
import t from '~/translations';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskEditorValues {
  title: string;
  description: string | null;
  priority: TaskPriority;
  dueAt: string | null;
}

interface TaskEditorSheetProps {
  visible: boolean;
  mode: 'create' | 'edit';
  initialValues?: TaskEditorValues;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: TaskEditorValues) => void;
}

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

const PRIORITY_EMOJI: Record<TaskPriority, string> = {
  low: '🟢',
  medium: '🟡',
  high: '🔴',
};

function quickDueDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(23, 59, 0, 0);
  return date.toISOString();
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function formatDueDate(dueAt: string): string {
  return new Date(dueAt).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

const EMPTY_VALUES: TaskEditorValues = {
  title: '',
  description: null,
  priority: 'medium',
  dueAt: null,
};

export function TaskEditorSheet({
  visible,
  mode,
  initialValues,
  isSubmitting = false,
  onClose,
  onSubmit,
}: TaskEditorSheetProps) {
  const [primary] = useCSSVariable(['--color-primary']) as string[];
  const insets = useSafeAreaInsets();
  const titleInputRef = useRef<TextInput>(null);

  const [prevVisible, setPrevVisible] = useState(visible);
  const [title, setTitle] = useState(initialValues?.title ?? EMPTY_VALUES.title);
  const [description, setDescription] = useState(
    initialValues?.description ?? EMPTY_VALUES.description,
  );
  const [priority, setPriority] = useState<TaskPriority>(
    initialValues?.priority ?? EMPTY_VALUES.priority,
  );
  const [dueAt, setDueAt] = useState<string | null>(initialValues?.dueAt ?? EMPTY_VALUES.dueAt);

  if (prevVisible !== visible) {
    setPrevVisible(visible);
    if (visible) {
      setTitle(initialValues?.title ?? EMPTY_VALUES.title);
      setDescription(initialValues?.description ?? EMPTY_VALUES.description);
      setPriority(initialValues?.priority ?? EMPTY_VALUES.priority);
      setDueAt(initialValues?.dueAt ?? EMPTY_VALUES.dueAt);
    }
  }

  const canSubmit = title.trim().length > 0 && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      title: title.trim(),
      description: description?.trim() || null,
      priority,
      dueAt,
    });
  };

  const dueDateOptions: { label: string; value: string }[] = [
    { label: t.tasks.editor.dueToday, value: quickDueDate(0) },
    { label: t.tasks.editor.dueTomorrow, value: quickDueDate(1) },
    { label: t.tasks.editor.dueNextWeek, value: quickDueDate(7) },
  ];

  return (
    <ModalOverlay
      visible={visible}
      onClose={onClose}
      dismissOnBackdropPress={!isSubmitting}
      backdropToken="overlay-scrim"
      position="bottom"
      animationType="none"
      statusBarTranslucent
    >
      <KeyboardAvoidingView behavior="padding">
        <Animated.View
          entering={FadeInUp.duration(transitionDurations[150])}
          className="bg-card border-border rounded-t-md border-t gap-4 p-5"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="self-center bg-border rounded-sm h-1 mb-1 w-9" />

          <View className="gap-3">
            <TextField
              ref={titleInputRef}
              autoFocus
              value={title}
              onChangeText={setTitle}
              placeholder={t.tasks.editor.titlePlaceholder}
              cursorColor={primary}
              selectionColor={primary}
              style={{
                borderRadius: 0,
                borderWidth: 0,
                fontSize: 16,
                minHeight: 0,
                paddingHorizontal: 0,
                paddingVertical: 8,
              }}
              testID="task-editor-title-input"
            />

            <View className="bg-border h-px" />

            <TextField
              multiline
              value={description ?? ''}
              onChangeText={setDescription}
              placeholder={t.tasks.editor.descriptionPlaceholder}
              cursorColor={primary}
              selectionColor={primary}
              style={{
                borderRadius: 0,
                borderWidth: 0,
                fontSize: 14,
                maxHeight: 96,
                minHeight: 44,
                paddingHorizontal: 0,
                paddingVertical: 8,
              }}
              testID="task-editor-description-input"
            />

            <View className="bg-border h-px" />

            <View className="items-center flex-row justify-between">
              <Text className="text-muted-foreground text-footnote font-medium uppercase tracking-[0.5]">
                {t.tasks.editor.priorityLabel}
              </Text>
              <View className="flex-row gap-1">
                {PRIORITIES.map((option) => {
                  const selected = priority === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityLabel={t.tasks.editor.priority[option]}
                      accessibilityState={{ selected }}
                      hitSlop={8}
                      onPress={() => setPriority(option)}
                      testID={'task-editor-priority-' + option}
                      className={
                        'items-center rounded-sm justify-center px-2 py-1 ' +
                        (selected ? 'bg-popover opacity-100' : 'opacity-35')
                      }
                    >
                      <Text className="text-base">{PRIORITY_EMOJI[option]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="bg-border h-px" />

            <View>
              <View className="items-center flex-row justify-between mb-2">
                <Text className="text-muted-foreground text-footnote font-medium uppercase tracking-[0.5]">
                  {t.tasks.editor.dueDateLabel}
                </Text>
                {dueAt ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.tasks.editor.clearDueDate}
                    hitSlop={8}
                    onPress={() => setDueAt(null)}
                    testID="task-editor-due-clear"
                  >
                    <Text className="text-destructive text-footnote font-semibold">
                      {formatDueDate(dueAt)} ✕
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <View className="flex-row flex-wrap gap-2 mt-2">
                {dueDateOptions.map((option) => (
                  <Chip
                    key={option.label}
                    label={option.label}
                    selected={dueAt !== null && isSameDay(dueAt, option.value)}
                    onPress={() => setDueAt(option.value)}
                    testID={'task-editor-due-' + option.label}
                  />
                ))}
              </View>
            </View>
          </View>

          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button label={t.tasks.editor.cancel} onPress={onClose} variant="secondary" />
            </View>
            <View className="flex-1">
              <Button
                testID="task-editor-submit"
                label={mode === 'edit' ? t.tasks.editor.save : t.tasks.editor.create}
                onPress={handleSubmit}
                variant="primary"
                disabled={!canSubmit}
                loading={isSubmitting}
              />
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </ModalOverlay>
  );
}

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

function Chip({ label, selected, onPress, testID }: ChipProps) {
  const [primary] = useCSSVariable(['--color-primary']) as string[];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      testID={testID}
      className="border border-border rounded-lg px-3 py-2"
      style={({ pressed }) => [
        selected && { backgroundColor: primary, borderColor: primary },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        className={`text-footnote font-medium ${selected ? 'text-primary-foreground' : 'text-muted-foreground'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
