import { memo, useCallback } from 'react';
import { Text, View } from 'react-native';

import { makeStyles, useThemeColor } from '~/components/theme';
import { TextField } from '~/components/ui';
import t from '~/translations';

import type { ComposerProps } from './composer.types';
import { getComposerSubmissionConfig } from './composerSubmission.helpers';
import type { ComposerEntryKind } from './composerInference';
import { inferComposerEntryKind } from './composerInference';
import type { ComposerMessageStore } from './useComposerMessageStore';
import { useComposerMessageSelector } from './useComposerMessageStore';

// A generous ceiling meant to stop pathological pastes (megabytes of text)
// from bloating the draft/optimistic message and jamming layout/markdown
// rendering -- not a meaningful constraint for normal chat messages. The
// counter only appears once the user is close to it.
const MAX_MESSAGE_LENGTH = 8000;
const LENGTH_WARNING_THRESHOLD = MAX_MESSAGE_LENGTH - 200;

interface ComposerInputProps {
  composerProps: ComposerProps;
  messageStore: ComposerMessageStore;
  entryMode: 'mixed' | ComposerEntryKind;
  manualEntryKind: ComposerEntryKind | null;
  onFocus: () => void;
  onBlur: () => void;
  // Wraps messageStore.setMessage with the draft-persistence side effect
  // (writeChatDraft / inbox onDraftChange) -- must be used for the TextField's
  // onChangeText instead of calling messageStore.setMessage directly.
  onChangeMessage: (message: string) => void;
}

// The message-store-subscribed text field -- typing re-renders this
// component alone, not Composer.tsx or ComposerToolbar (see
// useComposerMessageStore.ts).
function ComposerInputComponent({
  composerProps,
  messageStore,
  entryMode,
  manualEntryKind,
  onFocus,
  onBlur,
  onChangeMessage,
}: ComposerInputProps) {
  const message = useComposerMessageSelector(messageStore, (value) => value);
  const inferredEntryKind = useComposerMessageSelector(messageStore, inferComposerEntryKind);
  const selectedEntryKind =
    manualEntryKind ?? (entryMode === 'mixed' ? inferredEntryKind : entryMode);
  const [destructive, tertiary] = useThemeColor([
    '--color-destructive',
    '--color-tertiary',
  ]) as string[];
  const handleChangeMessage = useCallback(
    (text: string) =>
      onChangeMessage(text.length > MAX_MESSAGE_LENGTH ? text.slice(0, MAX_MESSAGE_LENGTH) : text),
    [onChangeMessage],
  );

  const presentation = getComposerSubmissionConfig(composerProps, selectedEntryKind);

  return (
    <View style={styles.s0}>
      <TextField
        value={message}
        onChangeText={handleChangeMessage}
        placeholder={presentation.placeholder}
        testID={presentation.inputTestID}
        onFocus={onFocus}
        onBlur={onBlur}
        multiline
        focusBorder={false}
        numberOfLines={5}
        style={{
          borderRadius: 0,
          borderWidth: 5,
          minHeight: 0,
          paddingHorizontal: 0,
          paddingVertical: 0,
        }}
      />
      {message.length >= LENGTH_WARNING_THRESHOLD ? (
        <Text
          accessibilityLabel={t.chat.input.messageTooLongA11y}
          style={{
            alignSelf: 'flex-end',
            color: message.length >= MAX_MESSAGE_LENGTH ? destructive : tertiary,
            fontSize: 11,
          }}
        >
          {message.length}/{MAX_MESSAGE_LENGTH}
        </Text>
      ) : null}
    </View>
  );
}

export const ComposerInput = memo(ComposerInputComponent);

const styles = makeStyles(() => ({
  s0: { gap: 16 },
}));
