import { usePasskeyAuth, useSafeAuth } from '@hominem/auth';
import { useRpcMutation } from '@hominem/rpc/react';
import { PasskeyEnrollmentBanner, useToast } from '@hominem/ui';
import { Toaster } from '@hominem/ui/components/ui/toaster';
import {
  Composer,
  ComposerProvider,
  ComposerStore,
  type ComposerActions,
} from '@hominem/ui/composer';
import React, { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { Outlet, useNavigate, useNavigation, useSearchParams } from 'react-router';

import NotesHeader from '~/components/header';
import { LoadingScreen } from '~/components/loading';
import { useComposerMode } from '~/hooks/use-composer-mode';
import { useCreateNote, useNote, useNotesList, useUpdateNote } from '~/hooks/use-notes';
import { useHasPasskeys } from '~/hooks/use-passkeys';
import { useTranscribe } from '~/hooks/use-transcribe';
import { useFeatureFlag } from '~/lib/hooks/use-feature-flags';
import { useFileUpload } from '~/lib/hooks/use-file-upload';
import { useSendMessage } from '~/lib/hooks/use-send-message';

export default function Layout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigationState = useNavigation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const auth = useSafeAuth();
  const { register } = usePasskeyAuth();
  const { mode, noteId, chatId } = useComposerMode();
  const transcribeMutation = useTranscribe();
  const voiceInputInlineEnabled = useFeatureFlag('voiceInputInline', true);
  const hasPasskeys = useHasPasskeys();
  const isNavigating = navigationState.state !== 'idle';
  const isAuthenticated = Boolean(auth?.isAuthenticated && auth.user);

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const { mutateAsync: createNote } = useCreateNote();
  const { mutateAsync: updateNote } = useUpdateNote();
  const sendMessageHook = useSendMessage({ chatId: chatId ?? '' });
  const { uploadFiles: performUpload } = useFileUpload();

  const createChatMutation = useRpcMutation<{ id: string }, { seedText: string; title: string }>(
    async ({ chats }, body) => {
      const chat = await chats.create({ title: body.title });
      if (body.seedText.trim()) {
        await chats.send({ chatId: chat.id, message: body.seedText });
      }
      return chat;
    },
  );

  // ─── Note title (no useEffect — read from cache via useNote) ───────────────
  // When noteId is null/empty, enabled:false means no network request.
  // The note is already fetched by the note route, so this is a cache hit.

  const { data: currentNote } = useNote(noteId ?? '');
  const noteTitle = currentNote?.title ?? null;

  // ─── Notes list for note picker ────────────────────────────────────────────

  const { data: notesList = [] } = useNotesList(
    {
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      limit: 100,
    },
    {
      enabled: isAuthenticated,
    },
  );

  // ─── ComposerStore (created once, stable identity) ─────────────────────────

  const store = useMemo(() => new ComposerStore(), []);

  // ─── actionsRef — stable ref, .current updated each render ─────────────────
  // The form action closes over actionsRef (not over individual functions), so
  // it always calls the latest mutation without being recreated each render.

  const actionsRef = useRef<ComposerActions>(null!);
  actionsRef.current = {
    createNote,
    updateNote,
    sendMessage: sendMessageHook.mutateAsync,
    createChat: createChatMutation.mutateAsync,
    uploadFiles: async (files) => {
      store.dispatch({ type: 'SET_UPLOADING', isUploading: true });
      try {
        const uploaded = await performUpload(files);
        return uploaded;
      } catch (err) {
        store.dispatch({
          type: 'SET_UPLOAD_ERRORS',
          errors: [err instanceof Error ? err.message : 'Upload failed'],
        });
        return [];
      } finally {
        store.dispatch({ type: 'SET_UPLOADING', isUploading: false });
      }
    },
    navigate,
  };

  // ─── Auth error toast ───────────────────────────────────────────────────────

  useEffect(() => {
    const error = searchParams.get('error');
    const description = searchParams.get('description') || searchParams.get('error_description');

    if (error) {
      toast({
        variant: 'destructive',
        title: error,
        description: description ?? undefined,
      });

      const newParams = new URLSearchParams(searchParams);
      newParams.delete('error');
      newParams.delete('description');
      newParams.delete('error_description');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, toast, setSearchParams]);

  const handleEnroll = useCallback(async () => {
    await register();
  }, [register]);

  return (
    <ComposerProvider store={store} actionsRef={actionsRef}>
      <div
        style={
          {
            '--composer-resting-height': 'calc(env(safe-area-inset-bottom) + 112px)',
          } as React.CSSProperties
        }
      >
        <PasskeyEnrollmentBanner hasPasskeys={hasPasskeys ?? undefined} onEnroll={handleEnroll} />
        {isNavigating && (
          <div
            className="fixed top-0 left-0 z-50 w-full"
            aria-label="Navigation progress"
            role="status"
          >
            <div className="h-0.5 animate-pulse bg-foreground/40" />
          </div>
        )}
        <div className="flex min-h-dvh flex-col bg-background">
          <NotesHeader />
          <main
            id="main-content"
            className="mt-14 flex-1 pb-[calc(env(safe-area-inset-bottom)+112px)] md:mt-16"
          >
            <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
              <Suspense fallback={<LoadingScreen />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>
        {isAuthenticated ? (
          <Composer
            mode={mode}
            noteId={noteId}
            chatId={chatId}
            noteTitle={noteTitle}
            navigate={navigate}
            inlineVoiceEnabled={voiceInputInlineEnabled}
            transcribeMutation={transcribeMutation}
            notes={notesList}
          />
        ) : null}
        <Toaster />
      </div>
    </ComposerProvider>
  );
}
