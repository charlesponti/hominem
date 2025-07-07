import { render, screen } from '@testing-library/react'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '~/lib/trpc/routers'
import { describe, expect, it } from 'vitest'
import { ChatMessage } from '../chat/ChatMessage.js'

type Message =
  inferRouterOutputs<AppRouter>['messageOperations']['getChatMessages']['messages'][number]

describe('ChatMessage Component', () => {
  const mockMessage: Message = {
    id: '1',
    role: 'assistant',
    content: 'Hello world',
    createdAt: '2024-01-01T00:00:00.000Z',
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
      createdAt: '2024-01-01T00:00:00.000Z',
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

  it('handles empty content gracefully', () => {
    const emptyMessage: Message = {
      id: '6',
      role: 'assistant',
      content: '',
      createdAt: '2024-01-01T00:00:00.000Z',
    }

    render(<ChatMessage message={emptyMessage} />)

    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    // Should not crash with empty content
  })
})
