import { BoltExportSchema } from '@hominem/utils/services'
import fs from 'node:fs'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { typingMindBase, validTypingMindInput } from '../__tests__/typingmind.mock'
import { command } from './typingmind-to-bolt'

const PATH = '../convert/typingmind-to-bolt'

// Update fs mock to handle both named and default exports
vi.mock('node:fs', () => {
  const actual = vi.importActual('node:fs') as object
  const existsSync = vi.fn(() => true)
  const writeFileSync = vi.fn()
  const readFileSync = vi.fn(() => JSON.stringify(validTypingMindInput))
  return {
    ...actual,
    readFileSync,
    writeFileSync,
    existsSync,
    default: {
      ...actual,
      readFileSync,
      writeFileSync,
      existsSync,
      mkdirSync: vi.fn(),
    },
  }
})

describe('convert-typingmind-to-bolt command', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    // Mock readFileSync to return valid data
    const mockData = JSON.stringify(validTypingMindInput)
    ;(fs.readFileSync as Mock).mockReturnValue(mockData)
    vi.mocked(fs.readFileSync).mockReturnValue(mockData)

    // Mock writeFileSync
    ;(fs.readFileSync as Mock).mockImplementation(() => undefined)
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined)
  })

  it('should convert valid TypingMind export to Bolt format', async () => {
    const input = validTypingMindInput
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(input))
    await command.parseAsync(['node', 'test', 'input.json'])

    // Get the spy and check its calls
    expect(fs.writeFileSync).toHaveBeenCalled()
    const writeCalls = vi.mocked(fs.writeFileSync).mock.calls
    expect(writeCalls.length).toBeGreaterThan(0)

    const writtenData = JSON.parse(writeCalls[0][1] as string)

    // Validate against Bolt schema
    expect(() => BoltExportSchema.parse(writtenData)).not.toThrow()

    // Check specific conversion results
    expect(writtenData.chats).toHaveLength(1)
    expect(writtenData.chats[0].messages).toHaveLength(2) // System message filtered out
    expect(writtenData.version).toBe(3)
  })

  it('should handle array-type message content', async () => {
    const input = {
      data: {
        ...typingMindBase.data,
        chats: [
          {
            ...validTypingMindInput.data.chats[0],
            messages: [
              {
                role: 'assistant',
                content: [
                  { type: 'text', text: 'Part 1' },
                  { type: 'text', text: 'Part 2' },
                ],
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
          },
        ],
      },
    }

    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(input))
    const writeSpy = vi.spyOn(fs, 'writeFileSync')

    await command.parseAsync(['node', 'test', 'input.json'])

    const writtenData = JSON.parse(writeSpy.mock.calls[0][1] as string)
    expect(writtenData.chats[0].messages[0].content).toBe('Part 1\nPart 2')
  })

  it('should handle missing createdAt timestamps', async () => {
    const input = {
      data: {
        ...typingMindBase.data,
        chats: [
          {
            ...validTypingMindInput.data.chats[0],
            messages: [
              {
                role: 'user',
                content: 'Hello',
              },
            ],
          },
        ],
      },
    }

    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(input))
    const writeSpy = vi.spyOn(fs, 'writeFileSync')

    await command.parseAsync(['node', 'test', 'input.json'])

    const writtenData = JSON.parse(writeSpy.mock.calls[0][1] as string)
    expect(writtenData.chats[0].messages[0].createdAt).toBeDefined()
  })

  it('should use output path from options when provided', async () => {
    const writeSpy = vi.spyOn(fs, 'writeFileSync')
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(validTypingMindInput))

    await command.parseAsync(['node', 'test', 'input.json', '-o', 'custom-output.json'])

    expect(writeSpy).toHaveBeenCalledWith('custom-output.json', expect.any(String))
  })

  it('should handle invalid input JSON', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue('invalid json')

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    await command.parseAsync(['node', 'test', 'input.json'])

    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})

describe('helper functions', () => {
  describe('guessProvider', () => {
    it.each([
      ['gpt-4', 'OpenAI'],
      ['claude-2', 'AnthropicAI'],
      ['gemini-pro', 'GoogleAI'],
      ['llama-2', 'Meta'],
      ['unknown-model', 'Unknown'],
      ['', 'Unknown'],
    ])('should correctly identify provider for %s', async (model, expected) => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const impo = (await vi.importActual(PATH)) as any
      expect(impo.guessProvider(model)).toBe(expected)
    })
  })

  describe('getCustomModelId', () => {
    it.each([
      ['gpt-4', 3],
      ['claude-2', 2],
      ['gemini-pro', 1],
      ['unknown-model', 0],
      ['', 0],
    ])('should return correct custom model ID for %s', async (model, expected) => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const impo = (await vi.importActual(PATH)) as any
      expect(impo.getCustomModelId(model)).toBe(expected)
    })
  })
})
