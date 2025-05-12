import type { ChatMessageSelect } from '@hominem/utils/types'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChatMessage } from '../chat-message.js'

describe('Message Component', () => {
  const mockMessage: ChatMessageSelect = {
    id: '1',
    role: 'assistant',
    content: 'Hello world',
    chatId: 'chat-1',
    userId: 'user-1',
    parentMessageId: 'parent-1',
    messageIndex: '0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    toolCalls: [
      {
        toolName: 'test-tool',
        args: { test: 'arg' },
        result: 'test result',
        isError: false,
        type: 'tool-call',
      },
    ],
    reasoning: 'Test reasoning',
    files: [
      {
        type: 'image',
        filename: 'test.png',
      },
      {
        type: 'file',
        filename: 'test.txt',
        mimeType: 'text/plain',
      },
    ],
  }

  it('renders all message components correctly', () => {
    render(<ChatMessage message={mockMessage} />)

    expect(screen.getByTestId('message-assistant')).toBeInTheDocument()
    expect(screen.getByTestId('message-header')).toHaveTextContent('Assistant')
    expect(screen.getByTestId('message-content')).toHaveTextContent('Hello world')
    expect(screen.getByTestId('message-details')).toBeInTheDocument()
  })

  it('renders tool calls correctly', () => {
    render(<ChatMessage message={mockMessage} />)

    const toolCall = screen.getByTestId('tool-call')
    expect(toolCall).toBeInTheDocument()
    expect(screen.getByTestId('tool-call-args')).toHaveTextContent('test')
    expect(screen.getByTestId('tool-call-result')).toHaveTextContent('test result')
  })

  it('renders reasoning when present', () => {
    render(<ChatMessage message={mockMessage} />)

    expect(screen.getByTestId('message-reasoning')).toBeInTheDocument()
    expect(screen.getByTestId('reasoning-content')).toHaveTextContent('Test reasoning')
  })

  it('renders file previews correctly', () => {
    render(<ChatMessage message={mockMessage} />)

    expect(screen.getByTestId('file-image')).toBeInTheDocument()
    expect(screen.getByTestId('file-preview')).toBeInTheDocument()
  })

  it('handles formatted content with html entities', () => {
    const messageWithFormattedContent = {
      ...mockMessage,
      content: 'Hello &amp; World',
    }

    render(<ChatMessage message={messageWithFormattedContent} />)
    expect(screen.getByTestId('message-content')).toHaveTextContent('Hello & World')
  })

  it('handles tool call errors', () => {
    const messageWithToolError = {
      ...mockMessage,
      toolCalls: mockMessage.toolCalls
        ? [
            {
              ...mockMessage.toolCalls[0],
              isError: true,
            },
          ]
        : null,
    }

    render(<ChatMessage message={messageWithToolError} />)
    expect(screen.getByTestId('tool-call-error')).toBeInTheDocument()
  })
})
