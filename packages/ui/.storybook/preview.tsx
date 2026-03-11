import type { Preview } from '@storybook/react'
import '../src/styles/globals.css'
import '../src/styles/animations.css'

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'base',
      values: [
        { name: 'base', value: '#0f1113' },
        { name: 'surface', value: '#14171a' },
        { name: 'elevated', value: '#1a1e22' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="p-8 min-h-screen">
        <Story />
      </div>
    ),
  ],
}

export default preview
