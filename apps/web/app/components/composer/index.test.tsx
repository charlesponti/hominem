import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Note } from '@hominem/hono-rpc/types/notes.types'

import { ComposerProvider, useComposer } from './composer-provider'
import { Composer } from './index'

const mocks = vi.hoisted(() => {
  const createNoteMutateAsync = vi.fn<(input: { content: string; title?: string }) => Promise<unknown>>()
  const updateNoteMutateAsync = vi.fn<(input: { id: string; content: string }) => Promise<unknown>>()
  const sendMessageMutateAsync = vi.fn<(input: { chatId: string; message: string }) => Promise<unknown>>()
  const createChatMutateAsync = vi.fn<(input: { seedText: string; title: string }) => Promise<{ id: string }>>()
  const navigate = vi.fn()
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
    navigate,
    composerMode,
  }
})

vi.mock('react-router', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('@hominem/hono-client/react', () => ({
  useHonoMutation: () => ({
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

vi.mock('./use-composer-mode', () => ({
  useComposerMode: () => mocks.composerMode,
}))

vi.mock('./note-picker', () => ({
  NotePicker: () => null,
}))

vi.mock('~/components/chat/ChatModals', () => ({
  ChatModals: ({
    onAudioTranscribed,
    onCloseAudioRecorder,
    showAudioRecorder,
  }: {
    onAudioTranscribed: (transcript: string) => void
    onCloseAudioRecorder: () => void
    showAudioRecorder: boolean
  }) => (showAudioRecorder
    ? (
        <div>
          <button type="button" onClick={() => onAudioTranscribed('Voice draft')}>
            Transcribe audio
          </button>
          <button type="button" onClick={onCloseAudioRecorder}>
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
  const { attachNote } = useComposer()

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

function renderComposer({ attachedNotes }: { attachedNotes?: Note[] } = {}) {
  return render(
    <ComposerProvider>
      <ComposerStateInitializer attachedNotes={attachedNotes ?? []} />
      <Composer />
    </ComposerProvider>,
  )
}

describe('Composer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('disables unavailable tool actions and empty submit state', () => {
    renderComposer()

    expect(screen.getByRole('button', { name: 'Add attachment' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Take photo' })).toBeDisabled()
    expect(screen.getByTestId('composer-primary')).toBeDisabled()
  })
})
