import React from 'react'
import { render, waitFor } from '@testing-library/react-native'

import Chat from '../../app/(protected)/(tabs)/chat/index'
import {
  MobileWorkspaceProvider,
  useMobileWorkspace,
} from '../../components/workspace/mobile-workspace-context'

const mockPush = vi.fn()
const mockRefetch = vi.fn()

let workspaceContext = 'inbox'

vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ chatId: 'chat-1' }),
  usePathname: () => '/(protected)/(tabs)/chat',
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('../../components/chat/blurred-background', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../../components/chat/chat', () => ({
  Chat: () => null,
}))

vi.mock('../../lib/use-chat-live-activity', () => ({
  useChatLiveActivity: () => ({
    stop: () => undefined,
  }),
}))

vi.mock('../../components/LoadingFull', () => ({
  LoadingFull: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../../theme', () => ({
  Text: ({ children }: { children: React.ReactNode }) => children,
  makeStyles: () => () => ({}),
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

  it('switches the shared workspace context to chat when the chat route mounts', async () => {
    await render(
      <MobileWorkspaceProvider>
        <WorkspaceProbe />
        <Chat />
      </MobileWorkspaceProvider>,
    )

    await waitFor(() => {
      expect(workspaceContext).toBe('chat')
    })
  })
})
