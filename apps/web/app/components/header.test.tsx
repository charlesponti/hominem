import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import NotesHeader from './header'

const { mockedUseInboxStream } = vi.hoisted(() => ({
  mockedUseInboxStream: vi.fn<
    () => {
      items: Array<{ kind: 'note' | 'chat'; id: string }>
      isLoading: boolean
    }
  >(),
}))

vi.mock('@hominem/ui', () => ({
  Header: ({
    navItems = [],
  }: {
    navItems?: Array<{ title: string; url: string }>
  }) => (
    <nav>
      {navItems.map((item) => (
        <a key={item.title} href={item.url}>
          {item.title}
        </a>
      ))}
    </nav>
  ),
}))

vi.mock('~/hooks/use-inbox-stream', () => ({
  useInboxStream: mockedUseInboxStream,
}))

describe('NotesHeader', () => {
  it('links notes and chats to the latest actual destinations', () => {
    mockedUseInboxStream.mockReturnValue({
      items: [
        { kind: 'chat', id: 'chat-123' },
        { kind: 'note', id: 'note-456' },
      ],
      isLoading: false,
    })

    render(<NotesHeader />)

    expect(screen.getByRole('link', { name: 'Notes' })).toHaveAttribute('href', '/notes/note-456')
    expect(screen.getByRole('link', { name: 'Chats' })).toHaveAttribute('href', '/chat/chat-123')
  })

  it('falls back to note creation when no note exists', () => {
    mockedUseInboxStream.mockReturnValue({
      items: [],
      isLoading: false,
    })

    render(<NotesHeader />)

    expect(screen.getByRole('link', { name: 'Notes' })).toHaveAttribute('href', '/notes/new')
  })
})
