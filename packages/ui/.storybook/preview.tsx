import type { Preview } from '@storybook/react'
import { HonoProvider } from '@hominem/rpc/react'
import { initialize, mswLoader } from 'msw-storybook-addon'
import { MemoryRouter } from 'react-router'
import { handlers } from '../src/mocks/handlers'
import '../src/styles/globals.css'
import '../src/styles/animations.css'

initialize()

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'base',
      values: [
        { name: 'base', value: '#ffffff' },
        { name: 'surface', value: '#f5f5f7' },
        { name: 'elevated', value: '#f2f2f7' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    msw: {
      handlers,
    },
  },
  loaders: [mswLoader],
  decorators: [
    (Story) => (
      <HonoProvider config={{ baseUrl: 'http://localhost:3000', getAuthToken: async () => null }}>
        <MemoryRouter>
          <div className="p-8 min-h-screen">
            <Story />
          </div>
        </MemoryRouter>
      </HonoProvider>
    ),
  ],
}

export default preview
