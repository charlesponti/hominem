import userEvent from '@testing-library/user-event'
import { beforeEach } from 'vitest'

import { render, screen } from '../../test-utils'
import { Sidebar, useSidebar } from '../ui/sidebar'
import { AppLayout } from './app-layout'

function SidebarStateProbe() {
  const { state } = useSidebar()

  return <div>{state}</div>
}

function setDesktopViewport() {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1024,
    writable: true,
  })

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: query === '(max-width: 767px)' ? false : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

function renderSidebarLayout(children: React.ReactNode = <SidebarStateProbe />) {
  return render(
    <AppLayout sidebar={<Sidebar><div>Sidebar</div></Sidebar>} contentMode="full-bleed">
      {children}
    </AppLayout>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('AppLayout', () => {
  it('shows the sidebar-owned trigger in sidebar mode', async () => {
    setDesktopViewport()

    renderSidebarLayout(<div>Content</div>)

    expect(screen.getByRole('button', { name: 'Toggle Sidebar' })).toBeInTheDocument()
  })

  it('toggles the shared sidebar state with Mod+B', async () => {
    setDesktopViewport()
    const user = userEvent.setup()

    renderSidebarLayout()

    expect(screen.getByText('expanded')).toBeInTheDocument()

    await user.keyboard('{Control>}b{/Control}')

    expect(screen.getByText('collapsed')).toBeInTheDocument()
  })

  it('restores the saved desktop sidebar state from browser storage', async () => {
    setDesktopViewport()
    window.localStorage.setItem('sidebar_state', 'false')

    renderSidebarLayout()

    expect(screen.getByText('collapsed')).toBeInTheDocument()
  })

  it('saves the desktop sidebar state to browser storage when toggled', async () => {
    setDesktopViewport()
    const user = userEvent.setup()

    renderSidebarLayout()

    await user.click(screen.getByRole('button', { name: 'Toggle Sidebar' }))

    expect(window.localStorage.getItem('sidebar_state')).toBe('false')
  })

  it('renders the desktop sidebar motion structure for shared GSAP animation', async () => {
    setDesktopViewport()
    const { container } = renderSidebarLayout()

    expect(container.querySelector('[data-sidebar="gap"]')).toBeInTheDocument()
    expect(container.querySelector('[data-sidebar="panel"]')).toBeInTheDocument()
    expect(container.querySelector('[data-sidebar="floating-trigger"]')).toBeInTheDocument()
  })
})
