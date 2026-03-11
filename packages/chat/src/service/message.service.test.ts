import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MessageService } from './message.service'

type InsertMessageRow = {
  id: string
  chat_id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  files: null
  tool_calls: null
  reasoning: string | null
  parent_message_id: string | null
}

type InsertMessageRows = InsertMessageRow[]

const mockInsertExecute = vi.fn()
const mockChatUpdateExecute = vi.fn()
const mockTransactionExecute = vi.fn()
const mockSelectExecute = vi.fn()

vi.mock('@hominem/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

vi.mock('@hominem/db', () => {
  const transactionContext = {
    insertInto: vi.fn(() => ({
      values: vi.fn((values: InsertMessageRows) => ({
        returningAll: vi.fn(() => ({
          execute: mockInsertExecute.mockImplementation(async () => values),
        })),
      })),
    })),
    updateTable: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          execute: mockChatUpdateExecute,
        })),
      })),
    })),
  }

  const selectChain = {
    selectAll: vi.fn(() => selectChain),
    where: vi.fn(() => selectChain),
    limit: vi.fn(() => selectChain),
    offset: vi.fn(() => selectChain),
    orderBy: vi.fn(() => ({
      execute: mockSelectExecute,
    })),
  }

  return {
    db: {
      transaction: vi.fn(() => ({
        execute: mockTransactionExecute.mockImplementation(async (callback) => callback(transactionContext)),
      })),
      selectFrom: vi.fn(() => selectChain),
    },
  }
})

describe('MessageService', () => {
  const service = new MessageService()

  beforeEach(() => {
    vi.clearAllMocks()
    mockInsertExecute.mockImplementation(async (values) => values)
    mockTransactionExecute.mockImplementation(async (callback) =>
      callback({
        insertInto: () => ({
          values: (values: InsertMessageRows) => ({
            returningAll: () => ({
              execute: mockInsertExecute.mockImplementation(async () => values),
            }),
          }),
        }),
        updateTable: () => ({
          set: () => ({
            where: () => ({
              execute: mockChatUpdateExecute,
            }),
          }),
        }),
      }),
    )
  })

  it('serializes database Date timestamps without replacing them with now', async () => {
    const createdAt = new Date('2026-03-10T12:00:00.000Z')
    const updatedAt = new Date('2026-03-10T12:00:01.000Z')
    mockSelectExecute.mockResolvedValueOnce([
      {
        id: 'message-1',
        chat_id: 'chat-1',
        user_id: 'user-1',
        role: 'assistant',
        content: 'hello',
        files: null,
        tool_calls: null,
        reasoning: null,
        parent_message_id: null,
        created_at: createdAt,
        updated_at: updatedAt,
      },
    ])

    const result = await service.getChatMessages('chat-1')

    expect(result).toEqual([
      expect.objectContaining({
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      }),
    ])
  })

  it('normalizes blank parent ids to null when persisting batched messages', async () => {
    await service.addMessages([
      {
        chatId: 'chat-1',
        userId: 'user-1',
        role: 'user',
        content: 'hello',
        parentMessageId: '   ',
      },
    ])

    expect(mockInsertExecute).toHaveBeenCalled()
    const insertedValues = (await mockInsertExecute.mock.results[0]?.value) as InsertMessageRows
    expect(insertedValues).toEqual([
      expect.objectContaining({
        parent_message_id: null,
      }),
    ])
  })

  it('throws a database error instead of returning an empty message list on query failure', async () => {
    mockSelectExecute.mockRejectedValueOnce(new Error('db unavailable'))

    await expect(service.getChatMessages('chat-1')).rejects.toMatchObject({
      type: 'DATABASE_ERROR',
    })
  })
})
