import { parseInboxTimestamp } from '@hominem/chat';
import type { Note } from '@hominem/rpc/types';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';

import { InlineEnhancePanel } from '~/components/ai/InlineEnhancePanel';
import { NOTE_TOOLBAR_ID, NoteToolbar } from '~/components/notes/NoteToolbar';
import { Text, makeStyles, useThemeColors } from '~/components/theme';
import { EmptyState } from '~/components/ui/EmptyState';
import AppIcon from '~/components/ui/icon';
import { useNoteEditor } from '~/hooks/use-note-editor';
import { useNoteFormatting } from '~/hooks/use-note-formatting';
import { useInlineEnhance } from '~/services/ai';
import { normalizeChatTitle, useStartChatFromInbox } from '~/services/chat';
import { writeResumeTarget } from '~/services/navigation/launch-state';
import { INBOX_ROUTE } from '~/services/navigation/routes';
import { useNoteDelete } from '~/services/notes/use-note-delete';
import { useNoteQuery } from '~/services/notes/use-note-query';
import t from '~/translations';

const COMPOSER_CLEARANCE = 220;

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
  const styles = useNoteStyles();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.placeholderTitle} />
      <View style={styles.placeholderDateline} />
      <View style={styles.divider} />
      <View style={styles.placeholderBody}>
        {Array.from({ length: 6 }, (_, index) => (
          <View
            key={`note-placeholder-line-${index.toString()}`}
            style={[styles.placeholderLine, index === 5 ? styles.placeholderLineShort : null]}
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
  const styles = useNoteStyles();
  const router = useRouter();
  const navigation = useNavigation();
  const homeRoute = INBOX_ROUTE;
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
            onSuccess: () => router.replace(homeRoute),
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
          style={styles.container}
          contentContainerStyle={styles.content}
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
  homeRoute: typeof INBOX_ROUTE;
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
  const styles = useNoteStyles();
  const themeColors = useThemeColors();
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
        style={styles.container}
        contentContainerStyle={styles.content}
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
        <TextInput
          multiline
          value={draft.title}
          onChangeText={handleTitleChange}
          placeholder={t.notes.editor.titlePlaceholder}
          placeholderTextColor={themeColors['tertiary']}
          scrollEnabled={false}
          selectionColor={themeColors.primary}
          style={styles.titleInput}
          testID="note-title-input"
          textAlignVertical="top"
        />

        <Text variant="overline" style={styles.dateline}>
          {dateline}
        </Text>

        <View style={styles.divider} />

        {isPreviewing ? (
          draft.content.trim().length > 0 ? (
            <Markdown style={markdownStyles(themeColors)}>{draft.content}</Markdown>
          ) : (
            <Text style={styles.previewEmpty}>{t.notes.editor.previewEmpty}</Text>
          )
        ) : (
          <TextInput
            ref={contentInputRef}
            multiline
            value={draft.content}
            selection={formatting.controlledSelection}
            onChangeText={handleContentChange}
            onSelectionChange={formatting.onSelectionChange}
            onFocus={() => formatting.onFocus(draft.content)}
            placeholder={t.notes.editor.contentPlaceholder}
            placeholderTextColor={themeColors['tertiary']}
            cursorColor={themeColors.primary}
            selectionColor={themeColors.primary}
            style={styles.contentInput}
            textAlignVertical="top"
            scrollEnabled={false}
            accessibilityLabel={t.notes.editor.contentA11yLabel}
            inputAccessoryViewID={NOTE_TOOLBAR_ID}
          />
        )}

        {note.files.length > 0 ? (
          <View style={styles.filesSection}>
            <Text style={styles.filesLabel}>{t.notes.editor.attachments}</Text>
            <View style={styles.filesList}>
              {note.files.map((file) => (
                <View key={file.id} style={styles.filePill}>
                  <Image
                    source="sf:paperclip"
                    style={styles.filePillIcon}
                    tintColor={themeColors['text-secondary']}
                    contentFit="contain"
                  />
                  <Text style={styles.filePillName} numberOfLines={1}>
                    {file.originalName}
                  </Text>
                  <Pressable
                    accessibilityLabel={t.notes.editor.removeFile(file.originalName)}
                    accessibilityRole="button"
                    hitSlop={6}
                    onPress={() => void handleDetach(file.id)}
                    style={({ pressed }) => [
                      styles.filePillDetachButton,
                      pressed ? styles.filePillDetachButtonPressed : null,
                    ]}
                  >
                    <AppIcon name="xmark" size={12} tintColor={themeColors['tertiary']} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {isEnhanceOpen ? (
        <View style={styles.enhanceTray}>
          <InlineEnhancePanel
            enhance={{
              isEnhanceOpen,
              enhanceInstruction,
              setEnhanceInstruction,
              closeEnhance,
              isEnhancing,
              enhanceError,
              runEnhance,
            }}
            text={draft.content}
            onCancel={handleToggleEnhance}
            onEnhanced={(enhanced) => {
              commitDraft({ title: draft.title, content: enhanced });
              requestAnimationFrame(() => contentInputRef.current?.focus());
            }}
          />
        </View>
      ) : null}

      <NoteToolbar
        onAction={(command) => handleContentChange(formatting.applyFormat(draft.content, command))}
      />
    </>
  );
}

const useNoteStyles = makeStyles((theme) => ({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: COMPOSER_CLEARANCE,
  },
  enhanceTray: {
    backgroundColor: theme.colors['background'],
    paddingHorizontal: 16,
    paddingBottom: theme.spacing.xl * 2,
  },
  titleInput: {
    alignSelf: 'stretch',
    color: theme.colors['text-primary'],
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    marginBottom: 6,
    minHeight: 36,
    paddingVertical: 0,
  },
  placeholderTitle: {
    alignSelf: 'stretch',
    borderRadius: theme.borderRadii.sm,
    height: 32,
    marginBottom: 12,
    width: '72%',
  },
  placeholderDateline: {
    backgroundColor: theme.colors['border-default'],
    borderRadius: theme.borderRadii.sm,
    height: 12,
    marginBottom: 14,
    width: '36%',
  },
  placeholderBody: {
    gap: 14,
    paddingTop: 4,
  },
  placeholderLine: {
    backgroundColor: theme.colors['border-default'],
    borderRadius: theme.borderRadii.sm,
    height: 16,
    width: '100%',
  },
  placeholderLineShort: {
    width: '58%',
  },
  dateline: {
    color: theme.colors['tertiary'],
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors['border-default'],
    marginBottom: 20,
  },
  contentInput: {
    fontSize: 17,
    lineHeight: 28,
    letterSpacing: -0.1,
    color: theme.colors['text-primary'],
    paddingVertical: 0,
    paddingHorizontal: 0,
    minHeight: 240,
  },
  previewEmpty: {
    color: theme.colors['tertiary'],
    fontStyle: 'italic',
    minHeight: 240,
  },
  filesSection: {
    marginTop: 24,
    gap: 8,
  },
  filesLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.4,
    color: theme.colors['tertiary'],
    textTransform: 'uppercase',
  },
  filesList: {
    gap: 6,
  },
  filePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors['popover'],
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  filePillIcon: {
    width: 14,
    height: 14,
    flexShrink: 0,
  },
  filePillName: {
    flex: 1,
    fontSize: 13,
    color: theme.colors['text-secondary'],
  },
  filePillDetachButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  filePillDetachButtonPressed: {
    opacity: 0.65,
  },
}));

function markdownStyles(colors: ReturnType<typeof useThemeColors>) {
  return {
    body: { color: colors['text-primary'], fontSize: 17, lineHeight: 28 },
    heading1: {
      color: colors['text-primary'],
      fontSize: 24,
      fontWeight: '700' as const,
      marginTop: 12,
    },
    heading2: {
      color: colors['text-primary'],
      fontSize: 20,
      fontWeight: '700' as const,
      marginTop: 10,
    },
    heading3: {
      color: colors['text-primary'],
      fontSize: 18,
      fontWeight: '600' as const,
      marginTop: 8,
    },
    strong: { color: colors['text-primary'], fontWeight: '700' as const },
    em: { color: colors['text-primary'], fontStyle: 'italic' as const },
    link: { color: colors.primary, textDecorationLine: 'underline' as const },
    bullet_list: { marginVertical: 6 },
    ordered_list: { marginVertical: 6 },
    code_inline: {
      color: colors['text-primary'],
      backgroundColor: colors['popover'],
      borderRadius: 4,
      fontFamily: 'Menlo',
      paddingHorizontal: 4,
    },
    code_block: {
      color: colors['text-primary'],
      backgroundColor: colors['popover'],
      borderRadius: 8,
      fontFamily: 'Menlo',
      padding: 12,
    },
    fence: {
      color: colors['text-primary'],
      backgroundColor: colors['popover'],
      borderRadius: 8,
      fontFamily: 'Menlo',
      padding: 12,
    },
    blockquote: {
      color: colors['text-secondary'],
      backgroundColor: 'transparent',
      borderColor: colors['border-default'],
      borderLeftWidth: 3,
      marginVertical: 6,
      paddingLeft: 12,
    },
    hr: { backgroundColor: colors['border-default'], height: 1, marginVertical: 12 },
  };
}
