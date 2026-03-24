import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useCallback, useEffect, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Note } from '@hominem/rpc/types/notes.types'
import { Composer, ComposerProvider, useComposerAttachedNotes, type ComposerDataDeps } from '@hominem/ui/composer'
import type { UploadedFile } from '@hominem/ui/types/upload'

import { useCreateNote, useUpdateNote } from '~/hooks/use-notes'
import { useFileUpload } from '~/lib/hooks/use-file-upload'

const mocks = vi.hoisted(() => {
  const createNoteMutateAsync = vi.fn<(input: { content: string; title?: string }) => Promise<unknown>>()
  const updateNoteMutateAsync = vi.fn<(input: { id: string; content: string }) => Promise<unknown>>()
  const sendMessageMutateAsync = vi.fn<(input: { chatId: string; message: string }) => Promise<unknown>>()
  const createChatMutateAsync = vi.fn<(input: { seedText: string; title: string }) => Promise<{ id: string }>>()
  const transcribeMutateAsync = vi.fn<(input: { audioBlob: Blob }) => Promise<{ text: string }>>()
  const navigate = vi.fn()
  const uploadState = {
    isUploading: false,
    progress: 0,
    uploadedFiles: [] as UploadedFile[],
    errors: [] as string[],
  }
  const uploadFiles = vi.fn<(files: FileList | File[]) => Promise<UploadedFile[]>>()
  const removeFile = vi.fn<(fileId: string) => void>()
  const clearAllUploads = vi.fn<() => void>()
  const composerMode = {
    mode: 'generic' as 'generic' | 'note-aware' | 'chat-continuation',
    noteId: null as string | null,
    chatId: null as string | null,
  }

  return {
    createNoteMutateAsync,
    updateNoteMutateAsync,
    sendMessageMutateAsync,
    createChatMutateAsync,
    transcribeMutateAsync,
    navigate,
    uploadState,
    uploadFiles,
    removeFile,
    clearAllUploads,
    composerMode,
  }
})

vi.mock('react-router', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('@hominem/rpc/react', () => ({
  useRpcMutation: () => ({
    mutateAsync: mocks.createChatMutateAsync,
  }),
}))

vi.mock('~/hooks/use-notes', () => ({
  useCreateNote: () => ({
    mutateAsync: mocks.createNoteMutateAsync,
  }),
  useUpdateNote: () => ({
    mutateAsync: mocks.updateNoteMutateAsync,
  }),
}))

vi.mock('~/lib/hooks/use-send-message', () => ({
  useSendMessage: () => ({
    mutateAsync: mocks.sendMessageMutateAsync,
    isPending: false,
    status: 'idle',
    stop: vi.fn(),
    error: null,
  }),
}))

vi.mock('~/lib/hooks/use-file-upload', () => ({
  useFileUpload: () => {
    const [, rerender] = useState(0)

    const uploadFiles = useCallback(async (files: FileList | File[]) => {
      const result = await mocks.uploadFiles(files)
      rerender((value) => value + 1)
      return result
    }, [])

    const removeFile = useCallback((fileId: string) => {
      mocks.removeFile(fileId)
      rerender((value) => value + 1)
    }, [])

    const clearAll = useCallback(() => {
      mocks.clearAllUploads()
      rerender((value) => value + 1)
    }, [])

    return {
      uploadState: mocks.uploadState,
      uploadFiles,
      removeFile,
      clearAll,
    }
  },
}))

const composerDataDeps: ComposerDataDeps = {
  useCreateNote,
  useUpdateNote,
  useSendMessage: () => ({
    mutateAsync: mocks.sendMessageMutateAsync,
    isPending: false,
    status: 'idle',
    stop: vi.fn(),
    error: null,
  }),
  useNotesList: () => ({}),
}

vi.mock('./use-composer-mode', () => ({
  useComposerMode: () => mocks.composerMode,
}))

vi.mock('./note-picker', () => ({
  NotePicker: () => null,
}))

vi.mock('@hominem/ui/chat', () => ({
  ChatVoiceModal: ({
    onTranscribed,
    onClose,
    show,
    transcribeMutation: _transcribeMutation,
  }: {
    onTranscribed: (transcript: string) => void
    onClose: () => void
    show: boolean
    transcribeMutation: { mutateAsync: typeof mocks.transcribeMutateAsync }
  }) => (show
    ? (
        <div>
          <button type="button" onClick={() => onTranscribed('Voice draft')}>
            Transcribe audio
          </button>
          <button type="button" onClick={onClose}>
            Close voice input
          </button>
        </div>
      )
    : null),
}))

function ComposerStateInitializer({
  attachedNotes = [],
}: {
  attachedNotes: Note[]
}) {
  const { attachNote } = useComposerAttachedNotes()

  useEffect(() => {
    for (const note of attachedNotes) {
      attachNote(note)
    }
  }, [attachNote, attachedNotes])

  return null
}

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
  }
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
  }
}

function renderComposer({ attachedNotes, mode = 'generic' }: { attachedNotes?: Note[], mode?: 'generic' | 'note-aware' | 'chat-continuation' } = {}) {
  return render(
    <ComposerProvider uploadHook={useFileUpload} dataDeps={composerDataDeps}>
      <ComposerStateInitializer attachedNotes={attachedNotes ?? []} />
      <Composer 
        mode={mode}
        noteId={mode === 'note-aware' ? 'test-note-id' : null}
        chatId={mode === 'chat-continuation' ? 'chat-1' : null}
        navigate={mocks.navigate}
        transcribeMutation={{
          mutateAsync: mocks.transcribeMutateAsync,
          isPending: false,
          error: null,
        } as unknown as import('@tanstack/react-query').UseMutationResult<{ text: string }, Error, { audioBlob: Blob }>}
      />
    </ComposerProvider>,
  )
}

describe('Composer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.uploadState.isUploading = false
    mocks.uploadState.progress = 0
    mocks.uploadState.uploadedFiles = []
    mocks.uploadState.errors = []
    mocks.composerMode.mode = 'generic'
    mocks.composerMode.noteId = null
    mocks.composerMode.chatId = null
  })

  it('submits the primary action on Enter and ignores Enter when disabled', async () => {
    mocks.createNoteMutateAsync.mockResolvedValue(undefined)

    renderComposer()

    const input = screen.getByTestId('composer-input')

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(mocks.createNoteMutateAsync).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { value: 'Draft note' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(mocks.createNoteMutateAsync).toHaveBeenCalledTimes(1)
      expect(mocks.createNoteMutateAsync).toHaveBeenCalledWith({
        content: 'Draft note',
        title: 'Draft note',
      })
    })
  })

  it('prevents a second submit while the first action is still pending', () => {
    mocks.createNoteMutateAsync.mockImplementation(
      () => new Promise(() => {}),
    )

    renderComposer()

    const input = screen.getByTestId('composer-input')
    const primary = screen.getByTestId('composer-primary')

    fireEvent.change(input, { target: { value: 'Pending draft' } })
    fireEvent.click(primary)
    fireEvent.click(primary)

    expect(mocks.createNoteMutateAsync).toHaveBeenCalledTimes(1)
  })

  it('returns focus to the composer after audio transcription completes', async () => {
    renderComposer()

    const voiceButton = screen.getByRole('button', { name: 'Voice note' })
    fireEvent.click(voiceButton)
    fireEvent.click(screen.getByRole('button', { name: 'Transcribe audio' }))

    await waitFor(() => {
      expect(screen.getByTestId('composer-input')).toHaveFocus()
      expect(screen.getByTestId('composer-input')).toHaveValue('Voice draft')
      expect(screen.getByRole('button', { name: 'Voice note' })).toBeInTheDocument()
    })
  })

  it('clears attached notes only after reply send consumes context', async () => {
    mocks.composerMode.mode = 'chat-continuation'
    mocks.composerMode.chatId = 'chat-1'
    mocks.sendMessageMutateAsync.mockResolvedValue(undefined)

    renderComposer({
      attachedNotes: [createNoteFixture()],
      mode: 'chat-continuation',
    })

    const input = screen.getByTestId('composer-input')
    fireEvent.change(input, { target: { value: 'Question' } })
    fireEvent.click(screen.getByTestId('composer-primary'))

    await waitFor(() => {
      expect(mocks.sendMessageMutateAsync).toHaveBeenCalledWith({
        chatId: 'chat-1',
        message: '<context>\n### Context\n\nBody copy\n</context>\n\nQuestion',
      })
      expect(screen.queryByText('Context')).not.toBeInTheDocument()
    })
  })

  it('starts file upload from the attachment picker and renders uploaded files', async () => {
    const uploadedFile = createUploadedFileFixture()
    mocks.uploadFiles.mockImplementation(async () => {
      mocks.uploadState.uploadedFiles = [uploadedFile]
      return [uploadedFile]
    })

    renderComposer()

    const picker = screen.getByTestId('composer-file-input')
    fireEvent.change(picker, {
      target: {
        files: [new File(['brief'], 'brief.pdf', { type: 'application/pdf' })],
      },
    })

    await waitFor(() => {
      expect(mocks.uploadFiles).toHaveBeenCalledTimes(1)
      expect(screen.getByText('brief.pdf')).toBeInTheDocument()
    })
  })

  it('disables submit while uploads are in flight', () => {
    mocks.uploadState.isUploading = true

    renderComposer()

    fireEvent.change(screen.getByTestId('composer-input'), { target: { value: 'Draft note' } })

    expect(screen.getByRole('button', { name: 'Add attachment' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Take photo' })).toBeEnabled()
    expect(screen.getByTestId('composer-primary')).toBeDisabled()
  })

  it('triggers the capture input path from the camera control', () => {
    renderComposer()

    const cameraInput = screen.getByTestId('composer-camera-input')
    const clickSpy = vi.spyOn(cameraInput, 'click')

    fireEvent.click(screen.getByRole('button', { name: 'Take photo' }))

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })
})
