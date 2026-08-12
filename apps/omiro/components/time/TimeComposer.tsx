import { Card, IconButton, nativeShadows, TextField } from '@ponti-studios/ui/native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import type { TextInput as RNTextInput } from 'react-native';
import { Text } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  useReducedMotion,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import { useVoiceComposerInput } from '~/components/composer/useVoiceComposerInput';
import { getVoiceComposerErrorPresentation } from '~/components/composer/voiceComposerInput.helpers';
import AppIcon from '~/components/ui/icon';
import { InlineErrorBanner } from '~/components/ui/InlineErrorBanner';
import { VoiceRecordingPanel } from '~/components/voice/VoiceRecordingPanel';
import t from '~/translations';

import type { EditableTimeBlockField, TimeInteractionState, TimeOpening } from './time-types';
import { formatDraftDetails } from './time-utils';
import { useTimeComposer } from './use-time-composer';

interface TimeComposerProps {
  onError: (message: string) => void;
  onOpenEvent: (event: { id: string }) => void;
}

export function TimeComposer({ onError, onOpenEvent }: TimeComposerProps) {
  const controller = useTimeComposer({ onError, onOpenEvent });
  const {
    ask,
    cancelResult,
    chooseEvent,
    chooseOpening,
    interaction: state,
    isSaving,
    prompt: value,
    setPrompt,
    submitDraft,
    updateDraft,
  } = controller;
  const disabled = state.kind === 'parsing' || isSaving;
  const [primaryColor, destructiveColor, borderDefaultColor] = useCSSVariable([
    '--color-primary',
    '--color-destructive',
    '--color-border',
  ]) as [string, string, string];
  const inputRef = useRef<RNTextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const reducedMotion = useReducedMotion();

  const valueRef = useRef(value);
  valueRef.current = value;

  const voice = useVoiceComposerInput({
    getMessage: () => valueRef.current,
    setMessage: setPrompt,
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
    <>
      {!isIdle && !isParsing ? (
        <ResultSurface
          isSaving={isSaving}
          onCancel={cancelResult}
          onChooseEvent={chooseEvent}
          onChooseOpening={chooseOpening}
          onEditField={updateDraft}
          onSubmitDraft={submitDraft}
          state={state}
          testID="time-result"
        />
      ) : null}

      {isIdle ? (
        <Animated.View
          entering={FadeIn.duration(reducedMotion ? 150 : 180)}
          exiting={FadeOut.duration(120)}
        >
          <Card
            className="w-full gap-2 p-3"
            style={{
              borderColor: isFocused
                ? primaryColor
                : voice.isRecording
                  ? destructiveColor
                  : borderDefaultColor,
              borderCurve: 'continuous',
              borderRadius: 24,
              boxShadow: nativeShadows.sm,
            }}
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
                onChangeText={setPrompt}
                onFocus={() => setIsFocused(true)}
                onSubmitEditing={ask}
                placeholder="Add or search anything..."
                returnKeyType="send"
                submitBehavior="submit"
                testID="time-composer-input"
                value={value}
                multiline
                numberOfLines={5}
                style={{
                  borderRadius: 0,
                  borderWidth: 0,
                  minHeight: 0,
                  paddingHorizontal: 0,
                  paddingVertical: 0,
                }}
              />
            )}
            {voice.isRecording ? null : (
              <View className="flex-row items-center justify-end gap-2">
                <IconButton
                  accessibilityLabel="Start voice input"
                  disabled={voice.isRecordingElsewhere}
                  testID="time-composer-mic-button"
                  onPress={() => void voice.handleVoicePress()}
                >
                  <AppIcon name="mic.fill" size={20} />
                </IconButton>
                <IconButton
                  accessibilityLabel={
                    isParsing ? 'Interpreting time request' : 'Interpret time request'
                  }
                  disabled={disabled || !canSubmit || voice.isBusy}
                  testID="time-composer-submit"
                  onPress={ask}
                >
                  <AppIcon name="arrow.up" size={20} />
                </IconButton>
              </View>
            )}
          </Card>
        </Animated.View>
      ) : isParsing ? (
        <ResultSurface accessibilityLabel="Interpreting time request" testID="time-result-parsing">
          <View className="items-center justify-center min-h-11">
            <ActivityIndicator color={primaryColor} />
          </View>
        </ResultSurface>
      ) : null}
    </>
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
  const reducedMotion = useReducedMotion();
  const { height: screenHeight } = useWindowDimensions();
  const isSimple = !state || state.kind === 'parsing';

  const inner = isSimple ? (
    children
  ) : state.kind === 'answer' ? (
    <Text className="text-body text-foreground">{state.answer}</Text>
  ) : state.kind === 'event-choice' ? (
    <>
      <Text className="text-headline">Which event did you mean?</Text>
      {state.candidates.map((event) => (
        <Pressable
          key={`${event.id}:${event.startDate}`}
          accessibilityLabel={`${event.title}, ${new Date(event.startDate).toLocaleString()}`}
          onPress={() => onChooseEvent?.(event.id)}
          className="gap-1 py-2 min-h-11"
          testID="time-event-choice"
        >
          <Text className="text-body">{event.title}</Text>
          <Text className="text-muted-foreground">
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
      <View className="flex-row items-center justify-end gap-2">
        <IconButton
          accessibilityLabel="Cancel"
          testID="time-event-choice-cancel"
          onPress={onCancel}
        >
          <AppIcon name="xmark" size={20} />
        </IconButton>
      </View>
    </>
  ) : state.kind === 'availability' ? (
    <>
      <Text className="text-headline">Possible times</Text>
      {state.openings.slice(0, 3).map((opening) => (
        <Pressable
          key={opening.start}
          accessibilityLabel={`Use ${new Date(opening.start).toLocaleString()}`}
          onPress={() => onChooseOpening?.(opening)}
          className="gap-1 py-2 min-h-11"
          testID="time-availability-opening"
        >
          <Text className="text-body">
            {new Date(opening.start).toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
          <Text className="text-muted-foreground">
            until{' '}
            {new Date(opening.end).toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </Pressable>
      ))}
      <View className="flex-row items-center justify-end gap-2">
        <IconButton
          accessibilityLabel="Cancel"
          testID="time-availability-cancel"
          onPress={onCancel}
        >
          <AppIcon name="xmark" size={20} />
        </IconButton>
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
          <Text className="text-muted-foreground text-caption1">{intentLabel}</Text>
          <TextField
            accessibilityLabel="Edit title"
            autoFocus
            onChangeText={(value) => onEditField?.('title', value)}
            placeholder={t.timeResult.fieldLabels.title}
            testID="time-draft-edit-title"
            value={block.title ?? ''}
          />
          {details ? <Text className="text-muted-foreground text-body">{details}</Text> : null}
          <View className="flex-row items-center justify-between gap-2">
            <IconButton accessibilityLabel="Cancel" testID="time-draft-cancel" onPress={onCancel}>
              <AppIcon name="xmark" size={20} />
            </IconButton>
            <IconButton
              accessibilityLabel="Confirm"
              disabled={isSaving || !canSubmit}
              testID="time-draft-submit"
              onPress={onSubmitDraft}
            >
              <AppIcon name="arrow.up" size={20} />
            </IconButton>
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
      entering={reducedMotion ? FadeIn.duration(180) : FadeInUp.duration(220)}
      exiting={reducedMotion ? FadeOut.duration(140) : FadeOutDown.duration(180)}
      className="w-full gap-3 px-1"
      testID={testID}
    >
      <ScrollView
        contentContainerStyle={{ gap: 12 }}
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: screenHeight * 0.4 }}
      >
        {inner}
      </ScrollView>
    </Animated.View>
  );
}
