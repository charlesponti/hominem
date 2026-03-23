import { render, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useInboxStream, type InboxStreamItem } from './use-inbox-stream'

const mocks = vi.hoisted(() => ({
  focusList: vi.fn(),
}))

vi.mock('@hominem/rpc/react', () => ({
  useRpcQuery: (_fn: unknown, _opts: unknown) => ({
    data: { items: mocks.focusList() },
    isLoading: false,
  }),
}))

function HookProbe({ onValue }: { onValue: (items: InboxStreamItem[]) => void }) {
  const { items } = useInboxStream()
  useEffect(() => { onValue(items) }, [onValue, items])
  return null
}

describe('useInboxStream', () => {
  beforeEach(() => { mocks.focusList.mockReset() })

  it('returns items from the focus endpoint', async () => {
    mocks.focusList.mockReturnValue([
      { kind: 'chat', id: 'chat-1', title: 'Untitled session', preview: null, updatedAt: '2026-03-20T10:00:00.000Z' },
      { kind: 'note', id: 'note-1', title: 'Captured note', preview: null, updatedAt: '2026-03-20T09:00:00.000Z' },
    ])

    let captured: InboxStreamItem[] = []
    render(<HookProbe onValue={(v) => { captured = v }} />)

    await waitFor(() => expect(captured).toHaveLength(2))

    expect(captured.find((i) => i.kind === 'chat')?.title).toBe('Untitled session')
    expect(captured.find((i) => i.kind === 'note')?.preview).toBeNull()
  })
})
