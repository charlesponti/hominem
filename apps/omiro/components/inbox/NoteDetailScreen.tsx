import { parseInboxTimestamp } from '@hominem/chat';
import type { Note } from '@hominem/rpc/types';
import { TextField } from '@ponti-studios/ui/native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import Markdown from 'react-native-markdown-display';
import { useCSSVariable } from 'uniwind';

import { InlineEnhanceTray } from '~/components/ai/InlineEnhanceTray';
import { NOTE_TOOLBAR_ID, NoteToolbar } from '~/components/notes/NoteToolbar';
import { EmptyState } from '~/components/ui/EmptyState';
import AppIcon from '~/components/ui/icon';
import { useNoteEditor } from '~/hooks/use-note-editor';
import { useNoteFormatting } from '~/hooks/use-note-formatting';
import { useInlineEnhance } from '~/services/ai';
import { normalizeChatTitle, useStartChatFromInbox } from '~/services/chat';
import { writeResumeTarget } from '~/services/navigation/launch-state';
import { HOME_ROUTE } from '~/services/navigation/routes';
import { useNoteDelete } from '~/services/notes/use-note-delete';
import { useNoteQuery } from '~/services/notes/use-note-query';
import t from '~/translations';

interface NoteDraft {
  title: string;
  content: string;
}

function formatNoteDateline(
  note: { createdAt?: string | null; updatedAt?: string | null } | null,
): string {
  const timestamp = note?.updatedAt ?? note?.createdAt;
  if (!timestamp) {
    return '';
  }

  try {
    const date = parseInboxTimestamp(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function NoteDetailPlaceholder() {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16 }}
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
    >
      <View className="self-stretch rounded-sm h-8 mb-3 w-[72%]" />
      <View className="bg-border rounded-sm h-3 mb-3.5 w-[36%]" />
      <View className="h-px bg-border mb-5" />
      <View className="gap-3.5 pt-1">
        {Array.from({ length: 6 }, (_, index) => (
          <View
            key={`note-placeholder-line-${index.toString()}`}
            className={`bg-border rounded-sm h-4 ${index === 5 ? 'w-[58%]' : 'w-full'}`}
          />
        ))}
      </View>
    </ScrollView>
  );
}

export function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const noteId = String(id ?? '');
  if (!noteId) {
    return null;
  }

  return <NoteDetailEditor key={noteId} noteId={noteId} />;
}

function NoteDetailEditor({ noteId }: { noteId: string }) {
  const router = useRouter();
  const navigation = useNavigation();
  const homeRoute = HOME_ROUTE;
  const canGoBack = navigation.canGoBack();

  const { data: note, error, isInitialLoading, isRefreshing, refetch } = useNoteQuery({ noteId });
  const { save, flushSave, updateCache, detachFile } = useNoteEditor(noteId);
  const { mutate: deleteNote } = useNoteDelete({ noteId });

  const handleDeleteNote = useCallback(() => {
    Alert.alert(t.inbox.item.deleteNote.title, t.inbox.item.deleteNote.message, [
      { text: t.inbox.item.deleteNote.cancel, style: 'cancel' },
      {
        text: t.inbox.item.deleteNote.confirm,
        style: 'destructive',
        onPress: () => {
          deleteNote(undefined, {
            onSuccess: () => router.dismissTo(homeRoute),
          });
        },
      },
    ]);
  }, [deleteNote, homeRoute, router]);

  if (isInitialLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: '',
            headerBackButtonDisplayMode: 'minimal',
            headerBackVisible: canGoBack,
          }}
        />
        {!canGoBack ? (
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button icon="chevron.left" onPress={() => router.replace(homeRoute)}>
              Inbox
            </Stack.Toolbar.Button>
          </Stack.Toolbar>
        ) : null}
        <NoteDetailPlaceholder />
      </>
    );
  }

  if (!note) {
    return (
      <>
        <Stack.Screen
          options={{
            title: '',
            headerBackButtonDisplayMode: 'minimal',
            headerBackVisible: canGoBack,
          }}
        />
        {!canGoBack ? (
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button icon="chevron.left" onPress={() => router.replace(homeRoute)}>
              Inbox
            </Stack.Toolbar.Button>
          </Stack.Toolbar>
        ) : null}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                void refetch();
              }}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <EmptyState
            action={{ label: t.notes.editor.loadErrorRetry, onPress: () => void refetch() }}
            sfSymbol="arrow.clockwise.circle"
            title={error ? t.notes.editor.loadErrorTitle : t.notes.editor.missingNoteTitle}
          />
        </ScrollView>
      </>
    );
  }

  return (
    <NoteEditorBody
      note={note}
      canGoBack={canGoBack}
      homeRoute={homeRoute}
      isRefreshing={isRefreshing}
      refetch={refetch}
      save={save}
      flushSave={flushSave}
      updateCache={updateCache}
      detachFile={detachFile}
      onDeleteNote={handleDeleteNote}
    />
  );
}

interface NoteEditorBodyProps {
  note: Note;
  canGoBack: boolean;
  homeRoute: typeof HOME_ROUTE;
  isRefreshing: boolean;
  refetch: () => void;
  save: ReturnType<typeof useNoteEditor>['save'];
  flushSave: ReturnType<typeof useNoteEditor>['flushSave'];
  updateCache: ReturnType<typeof useNoteEditor>['updateCache'];
  detachFile: ReturnType<typeof useNoteEditor>['detachFile'];
  onDeleteNote: () => void;
}

function NoteEditorBody({
  note,
  canGoBack,
  homeRoute,
  isRefreshing,
  refetch,
  save,
  flushSave,
  updateCache,
  detachFile,
  onDeleteNote,
}: NoteEditorBodyProps) {
  const router = useRouter();
  const contentInputRef = useRef<TextInput>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [draft, setDraft] = useState<NoteDraft>(() => ({
    title: note.title ?? '',
    content: note.content,
  }));

  const formatting = useNoteFormatting();
  const {
    isEnhanceOpen,
    enhanceInstruction,
    setEnhanceInstruction,
    enhanceError,
    isEnhancing,
    toggleEnhance,
    closeEnhance,
    runEnhance,
  } = useInlineEnhance();

  const { startChat, isStartingChat } = useStartChatFromInbox();

  const [tertiary, primaryColor, textPrimary, textSecondary, borderDefault, popover] =
    useCSSVariable([
      '--color-tertiary',
      '--color-primary',
      '--color-foreground',
      '--color-muted-foreground',
      '--color-border',
      '--color-popover',
    ]) as string[];

  const mdColors: Record<string, string> = {
    primary: primaryColor,
    foreground: textPrimary,
    'muted-foreground': textSecondary,
    border: borderDefault,
    popover,
  };

  useEffect(() => {
    writeResumeTarget({
      kind: 'note',
      id: note.id,
      title: draft.title.trim() || t.notes.editor.titleFallback,
      updatedAt: note.updatedAt ?? null,
    });
  }, [draft.title, note.id, note.updatedAt]);

  const fileIds = note.files.map((file) => file.id);

  const commitDraft = useCallback(
    (next: NoteDraft) => {
      setDraft(next);
      updateCache({ title: next.title, content: next.content });
      save(next.title, next.content, fileIds);
    },
    [fileIds, save, updateCache],
  );

  const handleTitleChange = useCallback(
    (value: string) => commitDraft({ title: value, content: draft.content }),
    [commitDraft, draft.content],
  );

  const handleContentChange = useCallback(
    (value: string) => commitDraft({ title: draft.title, content: value }),
    [commitDraft, draft.title],
  );

  const handleDetach = (fileId: string) =>
    detachFile(fileId, note.files, draft.title, draft.content);

  const handleToggleEnhance = useCallback(() => {
    if (isEnhanceOpen) {
      closeEnhance();
      requestAnimationFrame(() => contentInputRef.current?.focus());
      return;
    }

    Keyboard.dismiss();
    toggleEnhance();
  }, [closeEnhance, isEnhanceOpen, toggleEnhance]);

  const handleEnhanced = useCallback(
    (enhanced: string) => {
      commitDraft({ title: draft.title, content: enhanced });
      requestAnimationFrame(() => contentInputRef.current?.focus());
    },
    [commitDraft, draft.title],
  );

  const handleStartChat = useCallback(async () => {
    if (isStartingChat) return;

    closeEnhance();

    try {
      await flushSave(draft.title, draft.content, fileIds);
      await startChat({
        title: normalizeChatTitle(draft.title || draft.content),
        message: t.notes.editor.startChatMessage,
        noteIds: [note.id],
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message === 'offline_unavailable'
          ? t.notes.editor.startChatErrorOffline
          : t.notes.editor.startChatErrorGeneric;
      Alert.alert(t.notes.editor.startChatErrorTitle, message, [{ text: 'OK' }]);
    }
  }, [
    closeEnhance,
    draft.content,
    draft.title,
    fileIds,
    flushSave,
    isStartingChat,
    note.id,
    startChat,
  ]);

  const dateline = formatNoteDateline(note);

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerBackButtonDisplayMode: 'minimal',
          headerBackVisible: canGoBack,
        }}
      />
      {!canGoBack ? (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button icon="chevron.left" onPress={() => router.replace(homeRoute)}>
            Inbox
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel={isPreviewing ? t.notes.editor.editMode : t.notes.editor.previewMode}
          icon={isPreviewing ? 'pencil' : 'eye'}
          onPress={() => setIsPreviewing((current) => !current)}
        />
        <Stack.Toolbar.Menu accessibilityLabel={t.notes.editor.actionsLabel} icon="ellipsis.circle">
          <Stack.Toolbar.MenuAction icon="sparkles" onPress={handleToggleEnhance}>
            {t.enhance.confirm}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            disabled={isStartingChat}
            icon="bubble.left"
            onPress={() => void handleStartChat()}
          >
            {t.notes.editor.startChat}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction destructive icon="trash" onPress={onDeleteNote}>
            {t.inbox.item.deleteNote.title}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16 }}
        keyboardDismissMode="interactive"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void refetch();
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <TextField
          multiline
          value={draft.title}
          onChangeText={handleTitleChange}
          placeholder={t.notes.editor.titlePlaceholder}
          scrollEnabled={false}
          selectionColor={primaryColor}
          style={{
            alignSelf: 'stretch',
            borderRadius: 0,
            borderWidth: 0,
            color: textPrimary,
            fontSize: 28,
            fontWeight: '700' as const,
            lineHeight: 34,
            marginBottom: 6,
            minHeight: 36,
            paddingHorizontal: 0,
            paddingVertical: 0,
          }}
          testID="note-title-input"
          textAlignVertical="top"
        />

        <Text className="text-overline text-tertiary mb-3.5">{dateline}</Text>

        <View className="h-px bg-border mb-5" />

        {isPreviewing ? (
          draft.content.trim().length > 0 ? (
            <Markdown style={markdownStyles(mdColors)}>{draft.content}</Markdown>
          ) : (
            <Text className="text-tertiary italic min-h-60">{t.notes.editor.previewEmpty}</Text>
          )
        ) : (
          <TextField
            ref={contentInputRef}
            multiline
            value={draft.content}
            selection={formatting.controlledSelection}
            onChangeText={handleContentChange}
            onSelectionChange={formatting.onSelectionChange}
            onFocus={() => formatting.onFocus(draft.content)}
            placeholder={t.notes.editor.contentPlaceholder}
            cursorColor={primaryColor}
            selectionColor={primaryColor}
            style={{
              borderRadius: 0,
              borderWidth: 0,
              fontSize: 17,
              lineHeight: 28,
              letterSpacing: -0.1,
              color: textPrimary,
              paddingVertical: 0,
              paddingHorizontal: 0,
              minHeight: 240,
            }}
            textAlignVertical="top"
            scrollEnabled={false}
            accessibilityLabel={t.notes.editor.contentA11yLabel}
            inputAccessoryViewID={NOTE_TOOLBAR_ID}
          />
        )}

        {note.files.length > 0 ? (
          <View className="mt-6 gap-2">
            <Text className="text-xs font-medium tracking-[0.4px] text-tertiary uppercase">
              {t.notes.editor.attachments}
            </Text>
            <View className="gap-1.5">
              {note.files.map((file) => (
                <View
                  key={file.id}
                  className="flex-row items-center gap-2 px-3 py-2 bg-popover rounded-[10px]"
                  style={{ borderCurve: 'continuous' }}
                >
                  <Image
                    source="sf:paperclip"
                    className="w-3.5 h-3.5 shrink-0"
                    tintColor={textSecondary}
                    contentFit="contain"
                  />
                  <Text className="flex-1 text-[13px] text-muted-foreground" numberOfLines={1}>
                    {file.originalName}
                  </Text>
                  <Pressable
                    accessibilityLabel={t.notes.editor.removeFile(file.originalName)}
                    accessibilityRole="button"
                    hitSlop={6}
                    onPress={() => void handleDetach(file.id)}
                    className="items-center justify-center w-6 h-6 active:opacity-65"
                  >
                    <AppIcon name="xmark" size={12} tintColor={tertiary} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {isEnhanceOpen ? (
        <KeyboardStickyView className="bg-background pt-4 pb-12 px-4 border-t border-muted-foreground/10">
          <InlineEnhanceTray
            instruction={enhanceInstruction}
            onInstructionChange={setEnhanceInstruction}
            onPresetSelect={(instruction) =>
              void runEnhance({ instruction, text: draft.content, onEnhanced: handleEnhanced })
            }
            onCancel={handleToggleEnhance}
            onConfirm={() => void runEnhance({ text: draft.content, onEnhanced: handleEnhanced })}
            isEnhancing={isEnhancing}
            error={enhanceError}
          />
        </KeyboardStickyView>
      ) : null}

      <NoteToolbar
        onAction={(command) => handleContentChange(formatting.applyFormat(draft.content, command))}
      />
    </>
  );
}

function markdownStyles(mdColors: Record<string, string>) {
  return {
    body: { color: mdColors['foreground'], fontSize: 17, lineHeight: 28 },
    heading1: {
      color: mdColors['foreground'],
      fontSize: 24,
      fontWeight: '700' as const,
      marginTop: 12,
    },
    heading2: {
      color: mdColors['foreground'],
      fontSize: 20,
      fontWeight: '700' as const,
      marginTop: 10,
    },
    heading3: {
      color: mdColors['foreground'],
      fontSize: 18,
      fontWeight: '600' as const,
      marginTop: 8,
    },
    strong: { color: mdColors['foreground'], fontWeight: '700' as const },
    em: { color: mdColors['foreground'], fontStyle: 'italic' as const },
    link: { color: mdColors.primary, textDecorationLine: 'underline' as const },
    bullet_list: { marginVertical: 6 },
    ordered_list: { marginVertical: 6 },
    code_inline: {
      color: mdColors['foreground'],
      backgroundColor: mdColors['popover'],
      borderRadius: 4,
      fontFamily: 'Menlo',
      paddingHorizontal: 4,
    },
    code_block: {
      color: mdColors['foreground'],
      backgroundColor: mdColors['popover'],
      borderRadius: 8,
      fontFamily: 'Menlo',
      padding: 12,
    },
    fence: {
      color: mdColors['foreground'],
      backgroundColor: mdColors['popover'],
      borderRadius: 8,
      fontFamily: 'Menlo',
      padding: 12,
    },
    blockquote: {
      color: mdColors['muted-foreground'],
      backgroundColor: 'transparent',
      borderColor: mdColors['border'],
      borderLeftWidth: 3,
      marginVertical: 6,
      paddingLeft: 12,
    },
    hr: { backgroundColor: mdColors['border'], height: 1, marginVertical: 12 },
  };
}
