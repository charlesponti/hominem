import { HonoProvider } from '@hominem/rpc/react'
import type { Preview } from '@storybook/react-vite'
import { initialize, mswLoader } from 'msw-storybook-addon'
import { MemoryRouter } from 'react-router'
import { handlers } from '../src/mocks/handlers'
import '../src/styles/animations.css'
import '../src/styles/globals.css'

initialize()

const preview: Preview = {
  parameters: {
    backgrounds: {
      options: {
        base: { name: 'base', value: '#ffffff' },
        surface: { name: 'surface', value: '#f5f5f7' },
        elevated: { name: 'elevated', value: '#f2f2f7' }
      }
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
          <div className="p-8">
            <Story />
          </div>
        </MemoryRouter>
      </HonoProvider>
    ),
  ],

  initialGlobals: {
    backgrounds: {
      value: 'base'
    }
  }
}

export default preview
