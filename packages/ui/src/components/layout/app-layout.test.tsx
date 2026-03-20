import { describe, expect, it, vi } from 'vitest'

import { render, screen } from '../../test-utils'
import { AppLayout } from './app-layout'

const mocks = vi.hoisted(() => ({
  navigationState: {
    state: 'idle' as 'idle' | 'loading' | 'submitting',
  },
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')

  return {
    ...actual,
    useNavigation: () => mocks.navigationState,
  }
})

describe('AppLayout', () => {
  it('renders navigation and children in the single top-header shell', () => {
    render(
      <AppLayout navigation={<div>Header</div>}>
        <div>Content</div>
      </AppLayout>,
    )

    expect(screen.getByText('Header')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('shows the navigation progress bar when routing is pending', () => {
    mocks.navigationState.state = 'loading'

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    )

    expect(screen.getByLabelText('Navigation progress')).toBeInTheDocument()
  })
})
