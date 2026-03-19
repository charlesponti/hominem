import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'

import Sherpa from '../../app/(protected)/(tabs)/sherpa/index'
import {
  MobileWorkspaceProvider,
  useMobileWorkspace,
} from '../../components/workspace/mobile-workspace-context'

const mockPush = vi.fn()
const mockRefetch = vi.fn()

let workspaceContext = 'inbox'

vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ chatId: 'chat-1' }),
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('../../components/chat/blurred-background', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../../components/chat/chat', () => ({
  Chat: () => null,
}))

vi.mock('../../components/LoadingFull', () => ({
  LoadingFull: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../../theme', () => ({
  Text: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../../utils/services/chat', () => ({
  useActiveChat: () => ({
    isPending: false,
    refetch: mockRefetch,
  }),
  useStartChat: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

function WorkspaceProbe() {
  const { activeContext } = useMobileWorkspace()
  workspaceContext = activeContext

  return null
}

describe('mobile chat workspace context', () => {
  beforeEach(() => {
    workspaceContext = 'inbox'
    mockPush.mockReset()
    mockRefetch.mockResolvedValue({
      data: {
        id: 'chat-1',
      },
    })
  })

  it('switches the shared workspace context to chat when the sherpa route mounts', async () => {
    await act(async () => {
      TestRenderer.create(
        <MobileWorkspaceProvider>
          <WorkspaceProbe />
          <Sherpa />
        </MobileWorkspaceProvider>,
      )
    })

    expect(workspaceContext).toBe('chat')
  })
})
