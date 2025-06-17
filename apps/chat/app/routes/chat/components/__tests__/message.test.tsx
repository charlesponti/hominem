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
        toolCallId: 'tc-1',
        toolName: 'test-tool',
        args: { test: 'arg' },
        result: 'test result', // This will be overridden by a tool-result with same toolCallId if present
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
    expect(screen.getByTestId('tool-call-args')).toHaveTextContent('{"test":"arg"}') // Stringified JSON
    expect(screen.getByTestId('tool-call-result')).toHaveTextContent('test result')
  })

  it('correctly processes and renders tool-call and tool-result pairs', () => {
    const messageWithToolCallAndResult: ChatMessageSelect = {
      ...mockMessage,
      toolCalls: [
        {
          toolCallId: 'tc-2',
          toolName: 'another-tool',
          args: { query: 'search this' },
          type: 'tool-call',
          isError: false,
        },
        {
          toolCallId: 'tc-2',
          toolName: 'another-tool', // toolName might be redundant in tool-result if always paired
          result: 'search complete',
          type: 'tool-result',
          isError: false,
        },
      ],
    }
    render(<ChatMessage message={messageWithToolCallAndResult} />)

    // Ensure only one tool call component is rendered for tc-2
    const toolCalls = screen.getAllByTestId('tool-call')
    expect(toolCalls).toHaveLength(1)

    expect(screen.getByTestId('tool-call-args')).toHaveTextContent('{"query":"search this"}')
    expect(screen.getByTestId('tool-call-result')).toHaveTextContent('search complete')
    expect(screen.queryByText('Error')).not.toBeInTheDocument()
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
              toolCallId: 'tc-error-1', // Ensure it has a toolCallId
              result: 'Error occurred', // Result might contain error details
              isError: true,
            },
          ]
        : null,
    }

    render(<ChatMessage message={messageWithToolError} />)
    expect(screen.getByTestId('tool-call-error')).toBeInTheDocument()
    // Check if the result also shows the error message if applicable by ToolCall component
    expect(screen.getByTestId('tool-call-result')).toHaveTextContent('Error occurred')
  })
})
