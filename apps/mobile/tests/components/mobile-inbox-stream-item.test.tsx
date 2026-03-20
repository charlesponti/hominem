import React from 'react'
import { render } from '@testing-library/react-native'
import { describe, expect, it, vi } from 'vitest'

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('../../components/animated/fade-in', () => ({
  FadeIn: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../../components/ui/icon', () => ({
  __esModule: true,
  default: () => null,
}))

vi.mock('../../theme', () => ({
  Text: ({ children }: { children: React.ReactNode }) => {
    const { Text } = require('react-native')
    return <Text>{children}</Text>
  },
  makeStyles: () => () => ({}),
}))

import { InboxStreamItem } from '../../components/workspace/inbox-stream-item'

function countNodesByType(node: { children?: Array<{ children?: unknown; type?: string }>; type?: string } | null, type: string): number {
  if (node === null) {
    return 0
  }

  let total = node.type === type ? 1 : 0

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      if (child !== null && typeof child === 'object') {
        total += countNodesByType(child, type)
      }
    }
  }

  return total
}

describe('InboxStreamItem', () => {
  it('does not render preview content when preview is null', () => {
    const { toJSON } = render(
      <InboxStreamItem
        item={{
          id: 'note-1',
          kind: 'note',
          title: 'Morning capture',
          preview: null,
          timestamp: '2026-03-20T09:30:00.000Z',
          route: '/(protected)/(tabs)/focus/note-1',
        }}
      />,
    )

    const json = toJSON() as { children?: Array<{ children?: unknown; type?: string }>; type?: string } | null
    const spans = countNodesByType(json, 'span')

    expect(spans).toBe(2)
    expect(JSON.stringify(json)).toContain('Morning capture')
    expect(JSON.stringify(json)).not.toContain('Note')
  })
})
