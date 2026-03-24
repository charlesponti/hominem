import { usePasskeyAuth } from '@hominem/auth';
import { PasskeyEnrollmentBanner, useToast } from '@hominem/ui';
import { Composer, ComposerProvider, type ComposerDataDeps } from '@hominem/ui/composer';
import { Toaster } from '@hominem/ui/components/ui/toaster';
import React, { Suspense, useCallback, useEffect } from 'react';
import { Outlet, useNavigate, useNavigation, useSearchParams } from 'react-router';

import NotesHeader from '~/components/header';
import { LoadingScreen } from '~/components/loading';
import { useComposerMode } from '~/hooks/use-composer-mode';
import { useCreateNote, useNotesList as _useNotesList, useUpdateNote } from '~/hooks/use-notes';
import { useTranscribe } from '~/hooks/use-transcribe';
import { useHasPasskeys } from '~/hooks/use-passkeys';
import { useFileUpload } from '~/lib/hooks/use-file-upload';
import { useFeatureFlag } from '~/lib/hooks/use-feature-flags';
import { useSendMessage } from '~/lib/hooks/use-send-message';

const useNotesListForComposer: ComposerDataDeps['useNotesList'] = (options) => {
  const result = _useNotesList(options)
  return result.data !== undefined ? { data: result.data } : {}
}

export default function Layout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigationState = useNavigation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register } = usePasskeyAuth();
  const { mode, noteId, chatId } = useComposerMode();
  const transcribeMutation = useTranscribe();
  const voiceInputInlineEnabled = useFeatureFlag('voiceInputInline', true)
  const hasPasskeys = useHasPasskeys();
  const isNavigating = navigationState.state !== 'idle';
  const handleEnroll = useCallback(async () => {
    await register();
  }, [register]);

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

  return (
    // CSS var consumed by all Notes route scroll containers for bottom padding
    <ComposerProvider
      uploadHook={useFileUpload}
      dataDeps={{
        useCreateNote,
        useUpdateNote,
        useSendMessage: (args) => useSendMessage(args),
        useNotesList: useNotesListForComposer,
      }}
    >
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
            className="mt-14 flex-1 pb-[calc(56px+env(safe-area-inset-bottom))] md:mt-16 md:pb-12"
          >
            <div className="mx-auto w-full max-w-5xl px-4 sm:px-8 lg:px-12">
              <Suspense fallback={<LoadingScreen />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>
        <Composer
          mode={mode}
          noteId={noteId}
          chatId={chatId}
          navigate={navigate}
          inlineVoiceEnabled={voiceInputInlineEnabled}
          transcribeMutation={transcribeMutation}
        />
        <Toaster />
      </div>
    </ComposerProvider>
  );
}
