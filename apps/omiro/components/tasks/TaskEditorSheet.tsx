import { useRef, useState } from 'react';
import { Pressable, View, type TextInput } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Text,
  transitionDurations,
  fontSizes,
  makeStyles,
  radii,
  spacing,
  useThemeColors,
} from '~/components/theme';
import { Button } from '~/components/ui/button';
import { ModalOverlay } from '~/components/ui/modal-overlay';
import { TextField } from '~/components/ui/text-field';
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
  const styles = useStyles();
  const themeColors = useThemeColors();
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
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
        >
          <View style={styles.handle} />

          <View style={styles.form}>
            <TextField
              ref={titleInputRef}
              autoFocus
              value={title}
              onChangeText={setTitle}
              placeholder={t.tasks.editor.titlePlaceholder}
              placeholderTextColor={themeColors['tertiary']}
              cursorColor={themeColors.primary}
              selectionColor={themeColors.primary}
              style={styles.titleInput}
              testID="task-editor-title-input"
            />

            <View style={styles.divider} />

            <TextField
              multiline
              value={description ?? ''}
              onChangeText={setDescription}
              placeholder={t.tasks.editor.descriptionPlaceholder}
              placeholderTextColor={themeColors['tertiary']}
              cursorColor={themeColors.primary}
              selectionColor={themeColors.primary}
              style={styles.descriptionInput}
              testID="task-editor-description-input"
            />

            <View style={styles.divider} />

            <View style={styles.priorityRow}>
              <Text color="text-secondary" style={styles.fieldLabel}>
                {t.tasks.editor.priorityLabel}
              </Text>
              <View style={styles.priorityEmojiRow}>
                {PRIORITIES.map((option) => {
                  const selected = priority === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityLabel={t.tasks.editor.priority[option]}
                      accessibilityState={{ selected }}
                      hitSlop={spacing[2]}
                      onPress={() => setPriority(option)}
                      testID={`task-editor-priority-${option}`}
                      style={[
                        styles.priorityEmojiButton,
                        selected && styles.priorityEmojiButtonSelected,
                      ]}
                    >
                      <Text style={styles.priorityEmoji}>{PRIORITY_EMOJI[option]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.divider} />

            <View>
              <View style={styles.fieldLabelRow}>
                <Text color="text-secondary" style={styles.fieldLabel}>
                  {t.tasks.editor.dueDateLabel}
                </Text>
                {dueAt ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.tasks.editor.clearDueDate}
                    hitSlop={spacing[2]}
                    onPress={() => setDueAt(null)}
                    testID="task-editor-due-clear"
                  >
                    <Text color="destructive" style={styles.dueDateValue}>
                      {formatDueDate(dueAt)} ✕
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.chipRow}>
                {dueDateOptions.map((option) => (
                  <Chip
                    key={option.label}
                    label={option.label}
                    selected={dueAt !== null && isSameDay(dueAt, option.value)}
                    onPress={() => setDueAt(option.value)}
                    testID={`task-editor-due-${option.label}`}
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <View style={styles.actionSlot}>
              <Button label={t.tasks.editor.cancel} onPress={onClose} variant="secondary" />
            </View>
            <View style={styles.actionSlot}>
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
  const styles = useStyles();
  const themeColors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.chip,
        selected && { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
        pressed && styles.chipPressed,
      ]}
    >
      <Text color={selected ? 'primary-foreground' : 'text-secondary'} style={styles.chipText}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  sheet: {
    backgroundColor: theme.colors['card'],
    borderColor: theme.colors['border-default'],
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    borderTopWidth: 1,
    gap: spacing[4],
    padding: spacing[5],
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: theme.colors['border-default'],
    borderRadius: radii.sm,
    height: 4,
    marginBottom: spacing[1],
    width: 36,
  },
  form: {
    gap: spacing[3],
  },
  divider: {
    backgroundColor: theme.colors['border-default'],
    height: 1,
  },
  titleInput: {
    borderRadius: 0,
    borderWidth: 0,
    color: theme.colors['text-primary'],
    fontSize: fontSizes.md,
    minHeight: 0,
    paddingHorizontal: 0,
    paddingVertical: spacing[2],
  },
  descriptionInput: {
    borderRadius: 0,
    borderWidth: 0,
    color: theme.colors['text-secondary'],
    fontSize: fontSizes.sm,
    maxHeight: 96,
    minHeight: 44,
    paddingHorizontal: 0,
    paddingVertical: spacing[2],
  },
  fieldLabel: {
    fontSize: fontSizes.footnote,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  priorityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityEmojiRow: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  priorityEmojiButton: {
    alignItems: 'center',
    borderRadius: radii.sm,
    justifyContent: 'center',
    opacity: 0.35,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  priorityEmojiButtonSelected: {
    backgroundColor: theme.colors['popover'],
    opacity: 1,
  },
  priorityEmoji: {
    fontSize: fontSizes.md,
  },
  dueDateValue: {
    fontSize: fontSizes.footnote,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  chip: {
    borderColor: theme.colors['border-default'],
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipText: {
    fontSize: fontSizes.footnote,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionSlot: {
    flex: 1,
  },
}));
