import { useApiClient } from '@hominem/hono-client/react';
import { fontSizes } from '@hominem/ui/tokens';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '~/components/Button';
import TextArea from '~/components/text-input-autogrow';
import { makeStyles } from '~/theme';
import { useStartChat } from '~/utils/services/chat/use-chat-messages-new';

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      marginHorizontal: t.spacing.sm_12,
      marginTop: t.spacing.sm_12,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      borderRadius: t.borderRadii.sm_6,
      backgroundColor: t.colors.background,
      padding: t.spacing.sm_12,
      gap: t.spacing.sm_8,
    },
    input: {
      color: t.colors.foreground,
      fontSize: fontSizes.sm,
      fontFamily: 'Geist Mono',
      minHeight: 40,
    },
    actions: {
      flexDirection: 'row',
      gap: t.spacing.sm_8,
    },
    primaryAction: {
      backgroundColor: t.colors.foreground,
      borderColor: t.colors.foreground,
    },
    secondaryAction: {
      backgroundColor: t.colors.muted,
    },
  }),
);

/**
 * CaptureBar — inline quick-capture input mounted at the top of HomeView (focus).
 *
 * "Think through it" seeds a new sherpa session with the typed text.
 * "SAVE" persists the text as a note directly (no session required).
 */
export const CaptureBar = () => {
  const router = useRouter();
  const client = useApiClient();
  const [text, setText] = useState('');
  const styles = useStyles();

  const { mutate: startChat, isPending: isStarting } = useStartChat({
    userMessage: text,
    _sherpaMessage: "Let's think through it.",
    onSuccess: () => {
      setText('');
      router.push('/(protected)/(tabs)/sherpa' as RelativePathString);
    },
  });

  const saveNote = useMutation({
    mutationFn: () => {
      const trimmed = text.trim();
      return client.notes.create({
        content: trimmed,
        title: trimmed.slice(0, 64) || undefined,
      });
    },
    onSuccess: () => {
      setText('');
    },
  });

  const handleThinkThroughIt = useCallback(() => {
    if (!text.trim()) return;
    startChat();
  }, [text, startChat]);

  const handleSave = useCallback(() => {
    if (!text.trim()) return;
    saveNote.mutate();
  }, [text, saveNote]);

  const hasInput = text.trim().length > 0;
  const isBusy = isStarting || saveNote.isPending;

  return (
    <View style={styles.container}>
      <TextArea
        label="Capture your thought"
        placeholder="What's on your mind?"
        style={styles.input}
        value={text}
        onChange={(event) => setText(event.nativeEvent.text)}
        testID="capture-bar-input"
      />
      {hasInput && (
        <View style={styles.actions}>
          <Button
            variant="primary"
            size="sm"
            style={styles.primaryAction}
            onPress={handleThinkThroughIt}
            disabled={isBusy}
            testID="capture-bar-think"
          >
            THINK THROUGH IT
          </Button>
          <Button
            variant="outline"
            size="sm"
            style={styles.secondaryAction}
            onPress={handleSave}
            disabled={isBusy}
            testID="capture-bar-save"
          >
            {saveNote.isPending ? 'SAVING…' : 'SAVE'}
          </Button>
        </View>
      )}
    </View>
  );
};
