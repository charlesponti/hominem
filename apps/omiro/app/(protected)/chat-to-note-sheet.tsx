import { MenuView, type NativeActionEvent } from '@expo/ui/community/menu';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { Pressable, Text, View } from 'react-native';

import { PRESET_INSTRUCTIONS } from '~/components/chat/build-note-draft';
import { ComposerSendButton } from '~/components/composer/ComposerSendButton';
import { NoteDraftPreview } from '~/components/notes/NoteDraftPreview';
import { makeStyles, useThemeColor } from '~/components/theme';
import { TextField } from '~/components/ui';
import { Button } from '~/components/ui/button';
import AppIcon from '~/components/ui/icon';
import { updateChatTitleCaches } from '~/services/chat';
import { invalidateInboxQueries } from '~/services/inbox/inbox-refresh';
import { useCreateNote } from '~/services/notes/use-create-note';
import { useGenerateNote } from '~/services/notes/use-generate-note';
import t from '~/translations';

type NotePreset = (typeof t.chat.noteDraft.presets)[number];

type NoteDraftPhase =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'preview'; text: string }
  | { kind: 'error'; message: string };

export default function ChatToNoteSheetScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    transcript: string;
    title: string;
    isTruncated: string;
    chatId: string;
  }>();

  const transcript = params.transcript ?? '';
  const title = params.title ?? '';
  const chatId = params.chatId ?? '';

  const { generate, isGenerating } = useGenerateNote();
  const createNote = useCreateNote();
  const [phase, setPhase] = useState<NoteDraftPhase>({ kind: 'idle' });
  const [selectedPreset, setSelectedPreset] = useState<NotePreset>(t.chat.noteDraft.presets[0]);
  const [instruction, setInstruction] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const customInputRef = useRef<TextInput>(null);
  const [mutedForeground] = useThemeColor(['--color-muted-foreground']) as string[];

  const isLoading = phase.kind === 'loading';

  const runGeneration = useCallback(
    async (preset: NotePreset, customText: string) => {
      if (isGenerating) return;
      setSaveError(null);
      setPhase({ kind: 'loading' });
      const trimmedCustom = customText.trim();
      const combinedInstruction = trimmedCustom
        ? `${PRESET_INSTRUCTIONS[preset]}\n\nAdditional user instructions:\n${trimmedCustom}`
        : PRESET_INSTRUCTIONS[preset];
      try {
        const text = await generate({
          transcript,
          instruction: combinedInstruction,
        });
        setPhase({ kind: 'preview', text });
      } catch (error) {
        setPhase({
          kind: 'error',
          message: error instanceof Error ? error.message : t.chat.noteDraft.generateError,
        });
      }
    },
    [generate, isGenerating, transcript],
  );

  const handleSelectPreset = (event: NativeActionEvent) => {
    if (isLoading) return;
    setSelectedPreset(event.nativeEvent.event as NotePreset);
  };

  const handleSubmit = () => {
    if (isLoading) return;
    void runGeneration(selectedPreset, instruction);
  };

  const handleDiscardPreview = () => {
    setSaveError(null);
    setPhase({ kind: 'idle' });
  };

  const handleAccept = async () => {
    if (phase.kind !== 'preview') return;

    setSaveError(null);
    try {
      const note = await createNote.mutateAsync({ text: phase.text, title });
      updateChatTitleCaches(queryClient, {
        chatId,
        title: note.title ?? title,
        updatedAt: note.updatedAt,
      });
      await invalidateInboxQueries(queryClient);
      router.back();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t.chat.noteDraft.saveError);
    }
  };

  const showForm = phase.kind === 'idle' || phase.kind === 'error';
  const showPreview = phase.kind === 'loading' || phase.kind === 'preview';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.chat.noteDraft.title}</Text>

      {showForm ? (
        <>
          <Text style={styles.label}>{t.chat.noteDraft.typeLabel}</Text>
          <MenuView
            actions={t.chat.noteDraft.presets.map((preset) => ({
              id: preset,
              title: preset,
              state: preset === selectedPreset ? ('on' as const) : undefined,
            }))}
            onPressAction={handleSelectPreset}
          >
            <Pressable
              style={styles.selectRow}
              accessibilityRole="button"
              accessibilityLabel={`${t.chat.noteDraft.typeLabel}, ${selectedPreset}`}
            >
              <Text style={styles.selectRowLabel}>{selectedPreset}</Text>
              <AppIcon name="chevron.up.chevron.down" size={14} tintColor={mutedForeground} />
            </Pressable>
          </MenuView>

          <Text style={styles.label}>{t.chat.noteDraft.instructionsLabel}</Text>
          <TextField
            ref={customInputRef}
            multiline
            value={instruction}
            onChangeText={setInstruction}
            placeholder={t.chat.noteDraft.instructionPlaceholder}
            style={styles.customInput}
            accessibilityLabel={t.chat.noteDraft.instructionsA11y}
          />

          {phase.kind === 'error' ? <Text style={styles.error}>{phase.message}</Text> : null}

          <View style={styles.footer}>
            <Button
              label={t.chat.noteDraft.cancel}
              onPress={() => router.back()}
              variant="outline"
              size="sm"
            />
            <Button
              label={t.chat.noteDraft.submit}
              onPress={handleSubmit}
              style={styles.submitButton}
            />
          </View>
        </>
      ) : null}

      {showPreview ? (
        <>
          <NoteDraftPreview
            text={phase.kind === 'preview' ? phase.text : ''}
            isLoading={isLoading}
            testID="note-draft-preview"
          />

          {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

          {phase.kind === 'preview' ? (
            <View style={styles.footer}>
              <Button
                label={t.chat.noteDraft.cancel}
                onPress={handleDiscardPreview}
                variant="outline"
                size="sm"
              />
              <ComposerSendButton
                accessibilityLabel={t.chat.noteDraft.acceptA11y}
                icon="checkmark"
                disabled={createNote.isPending}
                testID="note-draft-accept"
                onPress={() => void handleAccept()}
              />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = makeStyles((theme) => ({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 36, paddingBottom: 24, gap: 24 },
  title: {
    ...theme.typography.headline,
    color: theme.colors.foreground,
    ...theme.typography.title1,
  },
  label: {
    ...theme.typography.footnote,
    color: theme.colors.mutedForeground,
    marginTop: 4,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.popover,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectRowLabel: { ...theme.typography.body, color: theme.colors.foreground },
  customInput: {
    backgroundColor: theme.colors.popover,
    borderRadius: 12,
    color: theme.colors.foreground,
    fontSize: 15,
    lineHeight: 20,
    minHeight: 88,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  error: { ...theme.typography.footnote, color: theme.colors.destructive },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  submitButton: { flex: 1 },
}));
