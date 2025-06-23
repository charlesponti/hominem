import { render, screen } from '@testing-library/react'
import type { Message } from 'ai'
import { describe, expect, it } from 'vitest'
import { ChatMessage } from '../chat/ChatMessage.js'

describe('ChatMessage Component', () => {
  const mockMessage: Message = {
    id: '1',
    role: 'assistant',
    content: 'Hello world',
    createdAt: new Date(),
  }

  it('renders assistant message correctly', () => {
    render(<ChatMessage message={mockMessage} />)

    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('renders user message correctly', () => {
    const userMessage: Message = {
      id: '2',
      role: 'user',
      content: 'Hi there',
      createdAt: new Date(),
    }

    render(<ChatMessage message={userMessage} />)

    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText('Hi there')).toBeInTheDocument()
  })

  it('renders streaming indicator when isStreaming is true', () => {
    render(<ChatMessage message={mockMessage} isStreaming={true} />)

    // Check for the streaming cursor (animated element)
    const streamingCursor = document.querySelector('.animate-pulse')
    expect(streamingCursor).toBeInTheDocument()
  })

  it('renders message parts when available', () => {
    const messageWithParts: Message = {
      id: '3',
      role: 'assistant',
      content: 'Test content',
      createdAt: new Date(),
      parts: [
        {
          type: 'text',
          text: 'Part 1',
        },
        {
          type: 'text',
          text: 'Part 2',
        },
      ],
    }

    render(<ChatMessage message={messageWithParts} />)

    expect(screen.getByText('Part 1')).toBeInTheDocument()
    expect(screen.getByText('Part 2')).toBeInTheDocument()
  })

  it('renders tool invocation parts correctly', () => {
    const messageWithTool: Message = {
      id: '4',
      role: 'assistant',
      content: 'Tool result',
      createdAt: new Date(),
      parts: [
        {
          type: 'tool-invocation',
          toolInvocation: {
            toolName: 'test-tool',
            toolCallId: 'tc-1',
            state: 'call',
            args: { test: 'arg' },
          },
        },
      ],
    }

    render(<ChatMessage message={messageWithTool} />)

    expect(screen.getByText('🔧 Calling test-tool...')).toBeInTheDocument()
    expect(screen.getByText('{"test":"arg"}')).toBeInTheDocument()
  })

  it('renders reasoning parts correctly', () => {
    const messageWithReasoning: Message = {
      id: '5',
      role: 'assistant',
      content: 'Reasoned response',
      createdAt: new Date(),
      parts: [
        {
          type: 'reasoning',
          reasoning: 'I need to think about this',
          details: [
            {
              type: 'text',
              text: 'Detailed reasoning process',
            },
          ],
        },
      ],
    }

    render(<ChatMessage message={messageWithReasoning} />)

    expect(screen.getByText('🤔 Reasoning:')).toBeInTheDocument()
    expect(screen.getByText('I need to think about this')).toBeInTheDocument()
  })

  it('handles empty content gracefully', () => {
    const emptyMessage: Message = {
      id: '6',
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    }

    render(<ChatMessage message={emptyMessage} />)

    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    // Should not crash with empty content
  })
})
