import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import type { TextInput as RNTextInput } from 'react-native';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';

import { useComposerSurfaceStyles } from '~/components/composer/composer.styles';
import { ComposerDock } from '~/components/composer/ComposerDock';
import { useVoiceComposerInput } from '~/components/composer/useVoiceComposerInput';
import { getVoiceComposerErrorPresentation } from '~/components/composer/voiceComposerInput.helpers';
import { makeStyles, spacing, Text, useTheme } from '~/components/theme';
import { IconButton } from '~/components/ui/icon-button';
import { InlineErrorBanner } from '~/components/ui/InlineErrorBanner';
import { TextField } from '~/components/ui/text-field';
import { VoiceRecordingPanel } from '~/components/voice/VoiceRecordingPanel';
import t from '~/translations';

import type { EditableTimeBlockField, TimeInteractionState, TimeOpening } from './time-types';
import { formatDraftDetails } from './time-utils';

interface TimeComposerProps {
  disabled: boolean;
  isSaving: boolean;
  onChangeText: (value: string) => void;
  onCancel: () => void;
  onChooseEvent: (id: string) => void;
  onChooseOpening: (opening: TimeOpening) => void;
  onEditField: (field: EditableTimeBlockField, value: string) => void;
  onSubmit: () => void;
  onSubmitDraft: () => void;
  state: TimeInteractionState;
  value: string;
}

export function TimeComposer({
  disabled,
  isSaving,
  onChangeText,
  onCancel,
  onChooseEvent,
  onChooseOpening,
  onEditField,
  onSubmit,
  onSubmitDraft,
  state,
  value,
}: TimeComposerProps) {
  const theme = useTheme();
  const inputRef = useRef<RNTextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const surfaceStyles = useComposerSurfaceStyles();

  const valueRef = useRef(value);
  valueRef.current = value;

  const voice = useVoiceComposerInput({
    getMessage: () => valueRef.current,
    setMessage: onChangeText,
  });

  const canSubmit = value.trim().length > 0;
  const isIdle = state.kind === 'idle';
  const isParsing = state.kind === 'parsing';

  useEffect(() => {
    if (isIdle && value) inputRef.current?.focus();
  }, [isIdle, value]);

  const voiceErrorBanner =
    voice.voiceState === 'failed' && voice.error ? (
      <InlineErrorBanner
        message={getVoiceComposerErrorPresentation(voice.error.code).message}
        onDismiss={voice.clearError}
      />
    ) : undefined;

  return (
    <ComposerDock testID="time-composer-dock">
      {!isIdle && !isParsing ? (
        <ResultSurface
          isSaving={isSaving}
          onCancel={onCancel}
          onChooseEvent={onChooseEvent}
          onChooseOpening={onChooseOpening}
          onEditField={onEditField}
          onSubmitDraft={onSubmitDraft}
          state={state}
          testID="time-result"
        />
      ) : null}

      {isIdle ? (
        <View
          style={[
            surfaceStyles.surface,
            {
              borderColor: isFocused
                ? theme.colors.primary
                : voice.isRecording
                  ? theme.colors.destructive
                  : theme.colors['border-default'],
            },
          ]}
          testID="time-composer"
        >
          {voiceErrorBanner}
          {voice.isRecording ? (
            <VoiceRecordingPanel
              startedAt={voice.recordingStartedAt}
              onCancel={() => void voice.cancelVoiceRecording()}
              onDone={() => void voice.handleVoicePress()}
            />
          ) : (
            <TextField
              editable={!disabled}
              ref={inputRef}
              onBlur={() => setIsFocused(false)}
              onChangeText={onChangeText}
              onFocus={() => setIsFocused(true)}
              onSubmitEditing={onSubmit}
              placeholder="Add or search anything..."
              returnKeyType="send"
              submitBehavior="submit"
              testID="time-composer-input"
              value={value}
              multiline
              numberOfLines={5}
              style={surfaceStyles.input}
            />
          )}
          {voice.isRecording ? null : (
            <View style={surfaceStyles.row}>
              <IconButton
                accessibilityLabel="Start voice input"
                disabled={voice.isRecordingElsewhere}
                icon="mic.fill"
                testID="time-composer-mic-button"
                onPress={() => void voice.handleVoicePress()}
              />
              <IconButton
                accessibilityLabel={
                  isParsing ? 'Interpreting time request' : 'Interpret time request'
                }
                disabled={disabled || !canSubmit || voice.isBusy}
                icon="arrow.up"
                testID="time-composer-submit"
                onPress={onSubmit}
              />
            </View>
          )}
        </View>
      ) : isParsing ? (
        <ResultSurface accessibilityLabel="Interpreting time request" testID="time-result-parsing">
          <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 44 }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        </ResultSurface>
      ) : null}
    </ComposerDock>
  );
}

interface ResultSurfaceProps {
  accessibilityLabel?: string;
  children?: React.ReactNode;
  isSaving?: boolean;
  onCancel?: () => void;
  onChooseEvent?: (id: string) => void;
  onChooseOpening?: (opening: TimeOpening) => void;
  onEditField?: (field: EditableTimeBlockField, value: string) => void;
  onSubmitDraft?: () => void;
  state?: TimeInteractionState;
  testID: string;
}

function ResultSurface({
  accessibilityLabel,
  children,
  isSaving,
  onCancel,
  onChooseEvent,
  onChooseOpening,
  onEditField,
  onSubmitDraft,
  state,
  testID,
}: ResultSurfaceProps) {
  const _theme = useTheme();
  const surfaceStyles = useComposerSurfaceStyles();
  const styles = useResultStyles();
  const reducedMotion = useReducedMotion();
  const isSimple = !state || state.kind === 'parsing';

  const inner = isSimple ? (
    children
  ) : state.kind === 'answer' ? (
    <Text variant="body" color="text-primary">
      {state.answer}
    </Text>
  ) : state.kind === 'event-choice' ? (
    <>
      <Text variant="headline">Which event did you mean?</Text>
      {state.candidates.map((event) => (
        <Pressable
          key={`${event.id}:${event.startDate}`}
          accessibilityLabel={`${event.title}, ${new Date(event.startDate).toLocaleString()}`}
          onPress={() => onChooseEvent?.(event.id)}
          style={styles.choice}
          testID="time-event-choice"
        >
          <Text variant="body">{event.title}</Text>
          <Text color="text-secondary">
            {new Date(event.startDate).toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </Pressable>
      ))}
      <View style={styles.row}>
        <IconButton
          accessibilityLabel="Cancel"
          icon="xmark"
          testID="time-event-choice-cancel"
          onPress={onCancel}
        />
      </View>
    </>
  ) : state.kind === 'availability' ? (
    <>
      <Text variant="headline">Possible times</Text>
      {state.openings.map((opening) => (
        <Pressable
          key={opening.start}
          accessibilityLabel={`Use ${new Date(opening.start).toLocaleString()}`}
          onPress={() => onChooseOpening?.(opening)}
          style={styles.choice}
          testID="time-availability-opening"
        >
          <Text variant="body">
            {new Date(opening.start).toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
          <Text color="text-secondary">
            until{' '}
            {new Date(opening.end).toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </Pressable>
      ))}
      <View style={styles.row}>
        <IconButton
          accessibilityLabel="Cancel"
          icon="xmark"
          testID="time-availability-cancel"
          onPress={onCancel}
        />
      </View>
    </>
  ) : (
    (() => {
      const draft = state as Extract<TimeInteractionState, { kind: 'draft' }>;
      const { block } = draft;
      const canSubmit =
        block.primary_intent === 'add_task' ||
        ((block.primary_intent === 'add_event' || block.primary_intent === 'add_recurring_event') &&
          !!block.start_time &&
          !!block.end_time);
      const intentLabel = {
        add_task: 'Task',
        add_event: 'Event',
        add_recurring_event: 'Recurring event',
        edit_event: 'Edit event',
        cancel_event: 'Cancel event',
        search: 'Search',
        schedule_gap_fill: 'Find time',
      }[block.primary_intent];
      const details = formatDraftDetails(block);

      return (
        <>
          <Text color="text-secondary" variant="caption1">
            {intentLabel}
          </Text>
          <TextField
            accessibilityLabel="Edit title"
            autoFocus
            onChangeText={(value) => onEditField?.('title', value)}
            placeholder={t.timeResult.fieldLabels.title}
            testID="time-draft-edit-title"
            value={block.title ?? ''}
          />
          {details ? (
            <Text color="text-secondary" variant="body">
              {details}
            </Text>
          ) : null}
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <IconButton
              accessibilityLabel="Cancel"
              icon="xmark"
              testID="time-draft-cancel"
              onPress={onCancel}
            />
            <IconButton
              accessibilityLabel="Confirm"
              disabled={isSaving || !canSubmit}
              icon="arrow.up"
              testID="time-draft-submit"
              onPress={onSubmitDraft}
            />
          </View>
        </>
      );
    })()
  );

  return (
    <Animated.View
      accessibilityLabel={
        accessibilityLabel ??
        (state && state.kind === 'draft'
          ? state.block.primary_intent === 'add_task'
            ? 'Draft task ready'
            : 'Draft event ready'
          : undefined)
      }
      entering={reducedMotion ? undefined : FadeInUp.duration(220)}
      style={[surfaceStyles.surface, styles.card]}
      testID={testID}
    >
      {inner}
    </Animated.View>
  );
}

const useResultStyles = makeStyles(() => ({
  choice: {
    gap: spacing[1],
    minHeight: 44,
    paddingVertical: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  card: {
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { height: 8, width: 0 },
  },
}));
