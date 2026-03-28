import type { Preview } from '@storybook/react-vite'
import { initialize, mswLoader } from 'msw-storybook-addon'
import { handlers } from '../src/mocks/handlers'
import '../src/styles/animations.css'
import '../src/styles/globals.css'

const ignoredMswRequestPattern = /\.(avif|css|gif|ico|jpeg|jpg|png|svg|webp)$/i

initialize({
  quiet: true,
  onUnhandledRequest: ({ url }, print) => {
    if (ignoredMswRequestPattern.test(String(url))) {
      return
    }

    print.warning()
  }
})

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
      <div className="p-8">
        <Story />
      </div>
    ),
  ],

  initialGlobals: {
    backgrounds: {
      value: 'base'
    }
  }
}

export default preview
