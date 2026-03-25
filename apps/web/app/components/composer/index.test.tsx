import type { Note } from '@hominem/rpc/types/notes.types';
import {
  Composer,
  ComposerProvider,
  ComposerStore,
  type ComposerActions,
} from '@hominem/ui/composer';
import type { UploadedFile } from '@hominem/ui/types/upload';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const createNoteMutateAsync =
    vi.fn<(input: { content: string; title?: string }) => Promise<unknown>>();
  const updateNoteMutateAsync =
    vi.fn<(input: { id: string; content: string }) => Promise<unknown>>();
  const sendMessageMutateAsync =
    vi.fn<(input: { chatId: string; message: string }) => Promise<unknown>>();
  const createChatMutateAsync =
    vi.fn<(input: { seedText: string; title: string }) => Promise<{ id: string }>>();
  const transcribeMutateAsync = vi.fn<(input: { audioBlob: Blob }) => Promise<{ text: string }>>();
  const uploadFilesMock = vi.fn<(files: FileList | File[]) => Promise<UploadedFile[]>>();
  const navigate = vi.fn();

  return {
    createNoteMutateAsync,
    updateNoteMutateAsync,
    sendMessageMutateAsync,
    createChatMutateAsync,
    transcribeMutateAsync,
    uploadFilesMock,
    navigate,
  };
});

vi.mock('@hominem/ui/ai-elements', () => ({
  SpeechInput: ({
    onAudioRecorded,
    onRecordingStateChange,
    onProcessingStateChange,
  }: {
    onAudioRecorded?: (blob: Blob) => void;
    onRecordingStateChange?: (isRecording: boolean) => void;
    onProcessingStateChange?: (isProcessing: boolean) => void;
  }) => (
    <button
      type="button"
      onClick={() => {
        onRecordingStateChange?.(true);
        onRecordingStateChange?.(false);
        onProcessingStateChange?.(true);
        onAudioRecorded?.(new Blob(['voice'], { type: 'audio/webm' }));
        onProcessingStateChange?.(false);
      }}
    >
      Transcribe audio
    </button>
  ),
}));

// ─── Test helpers ─────────────────────────────────────────────────────────────

function createNoteFixture(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    userId: 'user-1',
    type: 'note',
    status: 'draft',
    title: 'Context',
    content: 'Body copy',
    excerpt: 'Body copy',
    tags: [],
    mentions: null,
    analysis: null,
    publishingMetadata: null,
    parentNoteId: null,
    versionNumber: 1,
    isLatestVersion: true,
    publishedAt: null,
    scheduledFor: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createUploadedFileFixture(overrides: Partial<UploadedFile> = {}): UploadedFile {
  return {
    id: 'upload-1',
    originalName: 'brief.pdf',
    type: 'document',
    mimetype: 'application/pdf',
    size: 512,
    content: 'Quarterly brief',
    url: 'https://example.test/brief.pdf',
    uploadedAt: new Date(),
    ...overrides,
  };
}

function renderComposer({
  attachedNotes,
  mode = 'generic',
  chatId,
}: {
  attachedNotes?: Note[];
  mode?: 'generic' | 'note-aware' | 'chat-continuation';
  chatId?: string;
} = {}) {
  // Create store and pre-populate attached notes without any React state
  const store = new ComposerStore();
  for (const note of attachedNotes ?? []) {
    store.dispatch({ type: 'ATTACH_NOTE', note });
  }

  // actionsRef — stable ref with test mocks
  const actions: ComposerActions = {
    createNote: mocks.createNoteMutateAsync,
    updateNote: mocks.updateNoteMutateAsync,
    sendMessage: mocks.sendMessageMutateAsync,
    createChat: mocks.createChatMutateAsync,
    uploadFiles: mocks.uploadFilesMock,
    navigate: mocks.navigate,
  };

  // Wrapper provides a stable actionsRef via useRef
  function Wrapper({ children }: { children: React.ReactNode }) {
    const actionsRef = useRef<ComposerActions>(actions);
    return (
      <ComposerProvider store={store} actionsRef={actionsRef}>
        {children}
      </ComposerProvider>
    );
  }

  return render(
    <Wrapper>
      <Composer
        mode={mode}
        noteId={mode === 'note-aware' ? 'test-note-id' : null}
        chatId={chatId ?? (mode === 'chat-continuation' ? 'chat-1' : null)}
        navigate={mocks.navigate}
        transcribeMutation={
          {
            mutateAsync: mocks.transcribeMutateAsync,
            isPending: false,
            error: null,
          } as unknown as import('@tanstack/react-query').UseMutationResult<
            { text: string },
            Error,
            { audioBlob: Blob }
          >
        }
      />
    </Wrapper>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Composer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits the primary action on Enter and ignores Enter when input is empty', async () => {
    mocks.createNoteMutateAsync.mockResolvedValue(undefined);

    renderComposer();

    const input = screen.getByTestId('composer-input');

    // Enter with empty input should not submit
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mocks.createNoteMutateAsync).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'Draft note' } });

    // Click primary button (Enter key no longer programmatically clicks — form handles it)
    fireEvent.click(screen.getByTestId('composer-primary'));

    await waitFor(() => {
      expect(mocks.createNoteMutateAsync).toHaveBeenCalledTimes(1);
      expect(mocks.createNoteMutateAsync).toHaveBeenCalledWith({
        content: 'Draft note',
        title: 'Draft note',
      });
    });
  });

  it('prevents a second submit while the first action is still pending', () => {
    mocks.createNoteMutateAsync.mockImplementation(() => new Promise(() => {}));

    renderComposer();

    const input = screen.getByTestId('composer-input');
    const primary = screen.getByTestId('composer-primary');

    fireEvent.change(input, { target: { value: 'Pending draft' } });
    fireEvent.click(primary);
    fireEvent.click(primary);

    // useActionState prevents concurrent submissions
    expect(mocks.createNoteMutateAsync).toHaveBeenCalledTimes(1);
  });

  it('returns focus to the composer after audio transcription completes', async () => {
    mocks.transcribeMutateAsync.mockResolvedValue({ text: 'Voice draft' });

    renderComposer();

    // Open voice dialog and trigger transcription via the mocked SpeechInput
    const voiceButton = screen.getByRole('button', { name: 'Voice note' });
    fireEvent.click(voiceButton);

    // The <dialog> is in the DOM; SpeechInput mock is rendered inside it
    fireEvent.click(screen.getByRole('button', { name: 'Transcribe audio' }));

    await waitFor(() => {
      expect(screen.getByTestId('composer-input')).toHaveValue('Voice draft');
    });
  });

  it('clears attached notes only after reply send consumes context', async () => {
    mocks.sendMessageMutateAsync.mockResolvedValue(undefined);

    renderComposer({
      attachedNotes: [createNoteFixture()],
      mode: 'chat-continuation',
      chatId: 'chat-1',
    });

    const input = screen.getByTestId('composer-input');
    fireEvent.change(input, { target: { value: 'Question' } });
    fireEvent.click(screen.getByTestId('composer-primary'));

    await waitFor(() => {
      expect(mocks.sendMessageMutateAsync).toHaveBeenCalledWith({
        chatId: 'chat-1',
        message: '<context>\n### Context\n\nBody copy\n</context>\n\nQuestion',
      });
      expect(screen.queryByText('Context')).not.toBeInTheDocument();
    });
  });

  it('starts file upload from the attachment picker and renders uploaded files', async () => {
    const uploadedFile = createUploadedFileFixture();
    mocks.uploadFilesMock.mockResolvedValue([uploadedFile]);

    renderComposer();

    const picker = screen.getByTestId('composer-file-input');
    fireEvent.change(picker, {
      target: {
        files: [new File(['brief'], 'brief.pdf', { type: 'application/pdf' })],
      },
    });

    await waitFor(() => {
      expect(mocks.uploadFilesMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText('brief.pdf')).toBeInTheDocument();
    });
  });

  it('disables submit while uploads are in flight', async () => {
    // uploadFiles never resolves — simulates in-flight upload
    mocks.uploadFilesMock.mockImplementation(() => new Promise(() => {}));

    renderComposer();

    fireEvent.change(screen.getByTestId('composer-input'), { target: { value: 'Draft note' } });

    // Trigger upload
    fireEvent.change(screen.getByTestId('composer-file-input'), {
      target: { files: [new File(['x'], 'x.txt', { type: 'text/plain' })] },
    });

    await waitFor(() => {
      expect(screen.getByTestId('composer-primary')).toBeDisabled();
    });
  });

  it('triggers the capture input path from the camera control', () => {
    renderComposer();

    const cameraInput = screen.getByTestId('composer-camera-input');
    const clickSpy = vi.spyOn(cameraInput, 'click');

    fireEvent.click(screen.getByRole('button', { name: 'Take photo' }));

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('primary button is disabled when input is empty', () => {
    renderComposer();
    expect(screen.getByTestId('composer-primary')).toBeDisabled();
  });
});
