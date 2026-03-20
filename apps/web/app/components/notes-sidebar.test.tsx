import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  deleteChat: vi.fn(),
  deleteNote: vi.fn(),
  logout: vi.fn(),
  useInboxStream: vi.fn(),
}))

vi.mock('gsap', () => ({
  default: {
    fromTo: vi.fn(),
    set: vi.fn(),
  },
}))

vi.mock('@hominem/auth', () => ({
  useAuthContext: () => ({
    logout: mocks.logout,
    user: {
      email: 'notes@hominem.test',
      name: 'Notes User',
    },
  }),
}))

vi.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <svg className={className} />
  return {
    LogOut: Icon,
    MoreHorizontal: Icon,
    PenSquare: Icon,
    FileText: Icon,
    MessageSquare: Icon,
    Search: Icon,
    Settings: Icon,
    Trash2: Icon,
  }
})

vi.mock('~/lib/brand', () => ({
  WEB_BRAND: {
    appName: 'Hominem',
    logoPath: '/logo.png',
  },
}))

vi.mock('~/hooks/use-notes', () => ({
  useDeleteNote: () => ({
    mutate: mocks.deleteNote,
  }),
}))

vi.mock('~/hooks/use-chats', () => ({
  useDeleteChat: () => ({
    mutate: mocks.deleteChat,
  }),
}))

vi.mock('~/hooks/use-inbox-stream', () => ({
  useInboxStream: mocks.useInboxStream,
}))

vi.mock('@hominem/ui/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) => (
    <button onClick={onSelect} type="button">
      {children}
    </button>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@hominem/ui/components/ui/sidebar', () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => <aside>{children}</aside>,
  SidebarContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  SidebarFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
  SidebarGroup: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <section className={className}>{children}</section>
  ),
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <header className={className}>{children}</header>
  ),
  SidebarInput: ({ onChange, placeholder, value }: { onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; value?: string }) => (
    <input onChange={onChange} placeholder={placeholder} value={value} />
  ),
  useSidebar: () => ({ state: 'expanded' }),
}))

import NotesSidebar from './notes-sidebar'

describe('NotesSidebar', () => {
  beforeEach(() => {
    mocks.deleteChat.mockReset()
    mocks.deleteNote.mockReset()
    mocks.logout.mockReset()
    mocks.useInboxStream.mockReset()

    if (!window.matchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: () => ({
          addEventListener: () => {},
          addListener: () => {},
          dispatchEvent: () => false,
          matches: false,
          media: '',
          onchange: null,
          removeEventListener: () => {},
          removeListener: () => {},
        }),
      })
    }
  })

  it('renders mixed note and chat rows with stable destinations and visible timestamps', () => {
    mocks.useInboxStream.mockReturnValue({
      isLoading: false,
      items: [
        {
          id: 'note-1',
          kind: 'note',
          title: 'Captured note',
          updatedAt: '2026-03-20T09:00:00.000Z',
        },
        {
          id: 'chat-1',
          kind: 'chat',
          title: 'Planning thread',
          updatedAt: '2026-03-19T12:00:00.000Z',
        },
      ],
    })

    const { container } = render(
      <MemoryRouter initialEntries={['/notes/note-1']}>
        <NotesSidebar />
      </MemoryRouter>,
    )

    const noteLink = container.querySelector('a[href="/notes/note-1"]')
    const chatLink = container.querySelector('a[href="/chat/chat-1"]')

    expect(noteLink).toBeInTheDocument()
    expect(chatLink).toBeInTheDocument()
    expect(noteLink).toHaveTextContent('Captured note')
    expect(chatLink).toHaveTextContent('Planning thread')
    expect(screen.getByText('3/20')).toBeInTheDocument()
    expect(screen.getByText('3/19')).toBeInTheDocument()
  })
})
