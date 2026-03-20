import type { Note } from '@hominem/hono-rpc/types/notes.types'

import type { ComposerPosture } from './composer-presentation'

interface CreateNoteInput {
  content: string
  title?: string
}

interface UpdateNoteInput {
  id: string
  content: string
}

interface CreateChatInput {
  seedText: string
  title: string
}

interface ComposerAction {
  execute: () => Promise<void>
}

export interface ResolvedComposerActions {
  canSubmit: boolean
  primary: ComposerAction
  secondary: ComposerAction
}

export interface ResolveComposerActionsInput {
  posture: ComposerPosture
  draftText: string
  noteId: string | null
  noteTitle: string | null
  chatId: string | null
  attachedNotes: Note[]
  isSubmitting: boolean
  createNote: (input: CreateNoteInput) => Promise<unknown>
  updateNote: (input: UpdateNoteInput) => Promise<unknown>
  sendMessage: (input: { chatId: string; message: string }) => Promise<unknown>
  createChat: (input: CreateChatInput) => Promise<{ id: string }>
  clearDraft: () => void
  clearAttachedNotes: () => void
  navigate: (path: string) => void
  runWithSubmitLock: (task: () => Promise<void>) => Promise<void>
}

export function resolveComposerActions(
  input: ResolveComposerActionsInput,
): ResolvedComposerActions {
  const text = input.draftText.trim()
  const canSubmit = text.length > 0 && !input.isSubmitting

  return {
    canSubmit,
    primary: {
      execute: async () => {
        if (!text) return

        await input.runWithSubmitLock(async () => {
          if (input.posture === 'reply' && input.chatId) {
            const prefix = buildNoteContext(input.attachedNotes)
            const message = prefix ? `${prefix}${text}` : text
            await input.sendMessage({ chatId: input.chatId, message })
            input.clearDraft()
            input.clearAttachedNotes()
            return
          }

          if (input.posture === 'draft' && input.noteId) {
            await input.updateNote({ id: input.noteId, content: text })
            input.clearDraft()
            return
          }

          const title = text.slice(0, 64)
          await input.createNote({ content: text, ...(title ? { title } : {}) })
          input.clearDraft()
        })
      },
    },
    secondary: {
      execute: async () => {
        if (!text) return

        await input.runWithSubmitLock(async () => {
          if (input.posture === 'reply') {
            const title = text.slice(0, 64)
            await input.createNote({ content: text, ...(title ? { title } : {}) })
            input.clearDraft()
            return
          }

          const seedText = input.posture === 'draft' && input.noteTitle
            ? `[Regarding note: "${input.noteTitle}"]\n\n${text}`
            : text
          const title = text.slice(0, 64) || (input.posture === 'draft' ? 'Note chat' : 'New session')
          const chat = await input.createChat({ seedText, title })
          input.clearDraft()
          input.navigate(`/chat/${chat.id}`)
        })
      },
    },
  }
}

function buildNoteContext(attachedNotes: Note[]): string {
  if (attachedNotes.length === 0) return ''

  const sections = attachedNotes.map((note) => `### ${note.title ?? 'Untitled note'}\n\n${note.content}`)
  return `<context>\n${sections.join('\n\n---\n\n')}\n</context>\n\n`
}
